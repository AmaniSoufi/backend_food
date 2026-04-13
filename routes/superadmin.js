const express = require('express');
const superadminRouter = express.Router();
const superadmin = require('../middlewares/superadmin');
const Order = require('../models/order');
const Restaurant = require('../models/restaurant');
const User = require('../models/user');
const JoinRequest = require('../models/joinRequest');
const { sendJoinRequestResultNotification } = require('../utils/fcmJoinResult');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

function generateTempJoinPassword() {
 return crypto.randomBytes(8).toString('base64url').slice(0, 12);
}

function mapJoinVehicleToEnum(vehicleLabel) {
    const v = vehicleLabel ? String(vehicleLabel) : '';
    if (v.includes('سيارة')) return 'car';
    return 'motorcycle';
}

// =====================================
// Super Admin Login
// =====================================
superadminRouter.post('/api/superadmin/login', async (req, res) => {
    try {
        const { phone, password } = req.body;
        console.log('📱 SuperAdmin login attempt for phone:', phone);

        // Find user
        const user = await User.findOne({ phone: phone });
        if (!user) {
            console.log('❌ User not found');
            return res.status(400).json({ msg: 'رقم الهاتف أو كلمة السر غير صحيحة' });
        }

        console.log('✅ User found:', user.name, 'Type:', user.type);

        // Check if user is superadmin
        if (user.type !== 'superadmin') {
            console.log('❌ User is not superadmin');
            return res.status(403).json({ msg: 'ليس لديك صلاحية الدخول' });
        }

        // Check password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            console.log('❌ Password mismatch');
            return res.status(400).json({ msg: 'رقم الهاتف أو كلمة السر غير صحيحة' });
        }

        console.log('✅ Password matched!');

        // Create JWT token
        const token = jwt.sign({ id: user._id }, "passwordKey");
        
        // Return user data with token
        res.json({
            token: token,
            _id: user._id,
            name: user.name,
            email: user.email,
            phone: user.phone,
            type: user.type,
            status: user.status,
            address: user.address || '',
            cart: user.cart || []
        });

        console.log('✅ SuperAdmin login successful!');
    } catch (error) {
        console.error('❌ Error in superadmin login:', error);
        res.status(500).json({ error: error.message });
    }
});

// =====================================
// Get all users
// =====================================
superadminRouter.get('/api/superadmin/users', superadmin, async (req, res) => {
    try {
        console.log('🔍 SuperAdmin requesting all users');
        
        let users = await User.find({})
            .select('-password')
            .populate('restaurant', 'name address') // ✅ جلب بيانات المطعم
            .sort({ createdAt: -1 });

        // ✅ ترتيب المستخدمين: المعلقين (pending) أولاً
        users = users.sort((a, b) => {
            const statusOrder = { 'pending': 0, 'rejected': 1, 'accepted': 2, 'active': 3 };
            const statusA = statusOrder[a.status] ?? 3;
            const statusB = statusOrder[b.status] ?? 3;
            return statusA - statusB;
        });

        console.log('✅ Found', users.length, 'users (sorted: pending first)');
        res.json(users);
    } catch (error) {
        console.error('❌ Error fetching users:', error);
        res.status(500).json({ error: error.message });
    }
});

// =====================================
// Approve user (for admins and delivery)
// =====================================
superadminRouter.post('/api/superadmin/users/:userId/approve', superadmin, async (req, res) => {
    try {
        const { userId } = req.params;
        console.log('✅ Approving user:', userId);

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ msg: 'المستخدم غير موجود' });
        }

        // Only admin and delivery users need approval
        if (user.type !== 'admin' && user.type !== 'delivery') {
            return res.status(400).json({ msg: 'هذا المستخدم لا يحتاج موافقة' });
        }

        user.status = 'accepted';
        await user.save();

        console.log('✅ User approved:', user.name);
        res.json({ msg: 'تم قبول المستخدم بنجاح', user });
    } catch (error) {
        console.error('❌ Error approving user:', error);
        res.status(500).json({ error: error.message });
    }
});

// =====================================
// Reject user (for admins and delivery)
// =====================================
superadminRouter.post('/api/superadmin/users/:userId/reject', superadmin, async (req, res) => {
    try {
        const { userId } = req.params;
        console.log('❌ Rejecting user:', userId);

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ msg: 'المستخدم غير موجود' });
        }

        // Only admin and delivery users need approval
        if (user.type !== 'admin' && user.type !== 'delivery') {
            return res.status(400).json({ msg: 'هذا المستخدم لا يحتاج موافقة' });
        }

        user.status = 'rejected';
        await user.save();

        console.log('❌ User rejected:', user.name);
        res.json({ msg: 'تم رفض المستخدم', user });
    } catch (error) {
        console.error('❌ Error rejecting user:', error);
        res.status(500).json({ error: error.message });
    }
});

// =====================================
// Delete user (any type)
// =====================================
superadminRouter.delete('/api/superadmin/users/:userId', superadmin, async (req, res) => {
    try {
        const { userId } = req.params;
        console.log('🗑️ Deleting user:', userId);

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ msg: 'المستخدم غير موجود' });
        }

        console.log('🗑️ User found:', user.name, 'Type:', user.type);

        // ✅ إذا كان المستخدم admin (صاحب مطعم)، احذف المطعم أيضاً
        if (user.type === 'admin' && user.restaurant) {
            try {
                console.log('🗑️ Deleting associated restaurant:', user.restaurant);
                await Restaurant.findByIdAndDelete(user.restaurant);
                console.log('✅ Restaurant deleted successfully');
            } catch (restaurantError) {
                console.error('⚠️ Error deleting restaurant:', restaurantError);
                // نكمل حذف المستخدم حتى لو فشل حذف المطعم
            }
        }

        // ✅ حذف جميع الطلبات المرتبطة بالمستخدم (اختياري)
        // يمكنك إلغاء التعليق إذا أردت حذف الطلبات أيضاً
        /*
        try {
            await Order.deleteMany({ userId: userId });
            console.log('✅ User orders deleted');
        } catch (orderError) {
            console.error('⚠️ Error deleting orders:', orderError);
        }
        */

        // ✅ حذف المستخدم
        await User.findByIdAndDelete(userId);
        console.log('✅ User deleted successfully:', user.name);

        res.json({ 
            msg: 'تم حذف المستخدم بنجاح', 
            deletedUser: {
                id: user._id,
                name: user.name,
                type: user.type
            }
        });
    } catch (error) {
        console.error('❌ Error deleting user:', error);
        res.status(500).json({ error: error.message });
    }
});

// =====================================
// Delete restaurant (with owner and all orders)
// =====================================
superadminRouter.delete('/api/superadmin/restaurants/:restaurantId', superadmin, async (req, res) => {
    try {
        const { restaurantId } = req.params;
        console.log('🗑️ Deleting restaurant:', restaurantId);

        const restaurant = await Restaurant.findById(restaurantId);
        if (!restaurant) {
            return res.status(404).json({ msg: 'المطعم غير موجود' });
        }

        console.log('🗑️ Restaurant found:', restaurant.name);

        // ✅ 1. حذف صاحب المطعم (admin user)
        try {
            const owner = await User.findOne({ restaurant: restaurantId, type: 'admin' });
            if (owner) {
                console.log('🗑️ Deleting restaurant owner:', owner.name);
                await User.findByIdAndDelete(owner._id);
                console.log('✅ Restaurant owner deleted');
            } else {
                console.log('⚠️ No owner found for this restaurant');
            }
        } catch (ownerError) {
            console.error('⚠️ Error deleting owner:', ownerError);
        }

        // ✅ 2. حذف جميع الطلبات المرتبطة بالمطعم
        try {
            const deletedOrders = await Order.deleteMany({ restaurantId: restaurantId });
            console.log(`✅ Deleted ${deletedOrders.deletedCount} orders for restaurant`);
        } catch (orderError) {
            console.error('⚠️ Error deleting orders:', orderError);
        }

        // ✅ 3. حذف جميع المنتجات المرتبطة بالمطعم
        try {
            const Product = require('../models/product');
            const deletedProducts = await Product.deleteMany({ restaurantId: restaurantId });
            console.log(`✅ Deleted ${deletedProducts.deletedCount} products for restaurant`);
        } catch (productError) {
            console.error('⚠️ Error deleting products:', productError);
        }

        // ✅ 4. حذف المطعم نفسه
        await Restaurant.findByIdAndDelete(restaurantId);
        console.log('✅ Restaurant deleted successfully:', restaurant.name);

        res.json({ 
            msg: 'تم حذف المطعم وصاحبه وجميع الطلبات والمنتجات بنجاح', 
            deletedRestaurant: {
                id: restaurant._id,
                name: restaurant.name
            }
        });
    } catch (error) {
        console.error('❌ Error deleting restaurant:', error);
        res.status(500).json({ error: error.message });
    }
});

// =====================================
// Get restaurants with stats
// =====================================
superadminRouter.get('/api/superadmin/restaurants/stats', superadmin, async (req, res) => {
    try {
        console.log('🔍 Requesting restaurants with stats');
        
        const restaurants = await Restaurant.find({});
        const restaurantsWithStats = [];

        for (const restaurant of restaurants) {
            const orders = await Order.find({ restaurantId: restaurant._id, status: 8 }); // delivered orders
            
            const totalOrders = orders.length;
            const totalRevenue = orders.reduce((sum, order) => sum + (order.totalPrice || 0), 0);
            const deliveryFees = orders.reduce((sum, order) => sum + (order.deliveryPrice || 0), 0);
            const netRevenue = totalRevenue - deliveryFees;
            const commission = netRevenue * 0.07;

            // Get owner phone
            const owner = await User.findOne({ type: 'admin', restaurant: restaurant._id });

            restaurantsWithStats.push({
                _id: restaurant._id,
                name: restaurant.name,
                address: restaurant.address,
                phone: restaurant.phone || '',
                ownerPhone: owner?.phone || '',
                isActive: restaurant.isActive,
                stats: {
                    totalOrders,
                    totalRevenue,
                    netRevenue,
                    commission
                }
            });
        }

        console.log('✅ Sending', restaurantsWithStats.length, 'restaurants with stats');
        res.json(restaurantsWithStats);
    } catch (error) {
        console.error('❌ Error fetching restaurants with stats:', error);
        res.status(500).json({ error: error.message });
    }
});

// =====================================
// Get deliveries with stats
// =====================================
superadminRouter.get('/api/superadmin/deliveries/stats', superadmin, async (req, res) => {
    try {
        console.log('🔍 Requesting deliveries with stats');
        
        const deliveryUsers = await User.find({ type: 'delivery' }).select('-password');
        const deliveriesWithStats = [];

        for (const delivery of deliveryUsers) {
            // Fixed: use deliveryPersonId instead of deliveryPerson
            const allOrders = await Order.find({ deliveryPersonId: delivery._id });
            const completedOrders = await Order.find({ deliveryPersonId: delivery._id, status: 8 });
            const pendingOrders = await Order.find({ 
                deliveryPersonId: delivery._id, 
                status: { $in: [1, 2, 3, 4, 5, 6, 7] } 
            });

            const totalEarnings = completedOrders.reduce((sum, order) => sum + (order.deliveryPrice || 0), 0);
            
            console.log(`📊 Delivery ${delivery.name}:`);
            console.log(`  - Total Orders: ${allOrders.length}`);
            console.log(`  - Completed Orders: ${completedOrders.length}`);
            console.log(`  - Total Earnings: ${totalEarnings}`);

            deliveriesWithStats.push({
                _id: delivery._id,
                name: delivery.name,
                phone: delivery.phone,
                email: delivery.email,
                status: delivery.status,
                stats: {
                    totalDeliveries: allOrders.length,
                    completedDeliveries: completedOrders.length,
                    pendingDeliveries: pendingOrders.length,
                    totalEarnings
                }
            });
        }

        console.log('✅ Sending', deliveriesWithStats.length, 'deliveries with stats');
        res.json(deliveriesWithStats);
    } catch (error) {
        console.error('❌ Error fetching deliveries with stats:', error);
        res.status(500).json({ error: error.message });
    }
});

// =====================================
// Get overall platform stats
// =====================================
superadminRouter.get('/api/superadmin/stats/overview', superadmin, async (req, res) => {
    try {
        console.log('🔍 Requesting overall platform stats');
        
        // Platform stats
        const totalUsers = await User.countDocuments({ type: 'user' });
        const totalRestaurants = await Restaurant.countDocuments();
        const totalDeliveries = await User.countDocuments({ type: 'delivery' });
        const activeRestaurants = await Restaurant.countDocuments({ isActive: true });

        // Orders stats
        const totalOrders = await Order.countDocuments();
        const completedOrders = await Order.countDocuments({ status: 8 });
        const pendingOrders = await Order.countDocuments({ status: { $in: [0, 1, 2, 3, 4, 5, 6, 7] } });
        const cancelledOrders = await Order.countDocuments({ status: 9 });

        // Revenue stats
        const completedOrdersList = await Order.find({ status: 8 });
        const totalRevenue = completedOrdersList.reduce((sum, order) => sum + (order.totalPrice || 0), 0);
        const deliveryFeesTotal = completedOrdersList.reduce((sum, order) => sum + (order.deliveryPrice || 0), 0);
        const platformCommission = (totalRevenue - deliveryFeesTotal) * 0.07;
        const restaurantsRevenue = (totalRevenue - deliveryFeesTotal) * 0.93;
        const deliveriesRevenue = deliveryFeesTotal;

        // Monthly stats
        const now = new Date();
        const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

        const monthlyOrders = await Order.find({
            createdAt: { $gte: firstDayOfMonth, $lte: lastDayOfMonth },
            status: 8
        });

        const thisMonthRevenue = monthlyOrders.reduce((sum, order) => sum + (order.totalPrice || 0), 0);
        const thisMonthDeliveryFees = monthlyOrders.reduce((sum, order) => sum + (order.deliveryPrice || 0), 0);
        const thisMonthCommission = (thisMonthRevenue - thisMonthDeliveryFees) * 0.07;

        const stats = {
            platform: {
                totalUsers,
                totalRestaurants,
                totalDeliveries,
                activeRestaurants
            },
            orders: {
                totalOrders,
                completedOrders,
                pendingOrders,
                cancelledOrders
            },
            revenue: {
                totalRevenue,
                restaurantsRevenue,
                deliveriesRevenue,
                platformCommission
            },
            monthly: {
                thisMonthRevenue,
                thisMonthOrders: monthlyOrders.length,
                thisMonthCommission
            }
        };

        console.log('✅ Sending overall platform stats');
        res.json(stats);
    } catch (error) {
        console.error('❌ Error fetching overall stats:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get all restaurants with their statistics
superadminRouter.get('/superadmin/restaurants', superadmin, async (req, res) => {
    try {
        console.log('🔍 DEBUG: SuperAdmin requesting restaurants data');
        
        const restaurants = await Restaurant.find({});
        console.log('🔍 DEBUG: Found', restaurants.length, 'restaurants');
        
        const restaurantsWithStats = [];

        for (const restaurant of restaurants) {
            console.log('🔍 DEBUG: Processing restaurant:', restaurant.name);
            
            // Get all orders for this restaurant
            const orders = await Order.find({ restaurantId: restaurant._id });
            console.log('🔍 DEBUG: Found', orders.length, 'orders for restaurant:', restaurant.name);
            
            // Calculate statistics
            const totalOrders = orders.length;
            const completedOrders = orders.filter(order => order.status === 8).length; // delivered orders
            const totalRevenue = orders
                .filter(order => order.status === 8) // Only delivered orders
                .reduce((sum, order) => sum + (order.totalPrice || 0), 0);
            const totalDeliveryRevenue = orders
                .filter(order => order.status === 8) // Only delivered orders
                .reduce((sum, order) => sum + (order.deliveryPrice || 0), 0);
            const netRevenue = totalRevenue - totalDeliveryRevenue;
            const commission = netRevenue * 0.07; // 7% commission
            const restaurantProfit = netRevenue * 0.93; // 93% for restaurant

            console.log('🔍 DEBUG: Restaurant stats for', restaurant.name + ':');
            console.log('  - Total Orders:', totalOrders);
            console.log('  - Completed Orders:', completedOrders);
            console.log('  - Total Revenue:', totalRevenue);
            console.log('  - Commission:', commission);

            restaurantsWithStats.push({
                _id: restaurant._id,
                name: restaurant.name,
                address: restaurant.address,
                isActive: restaurant.isActive,
                statistics: {
                    totalOrders,
                    completedOrders,
                    totalRevenue,
                    totalDeliveryRevenue,
                    netRevenue,
                    commission,
                    restaurantProfit
                }
            });
        }

        console.log('🔍 DEBUG: Sending', restaurantsWithStats.length, 'restaurants with stats');
        res.json(restaurantsWithStats);
    } catch (error) {
        console.error('❌ Error fetching restaurants with stats:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get total platform statistics
superadminRouter.get('/superadmin/platform-stats', superadmin, async (req, res) => {
    try {
        console.log('🔍 DEBUG: SuperAdmin requesting platform stats');
        
        // Get month and year from query parameters (optional)
        const { year, month } = req.query;
        let dateFilter = {};
        
        if (year && month) {
            // Filter by specific month and year
            const startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
            const endDate = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59, 999);
            dateFilter = {
                orderAt: {
                    $gte: startDate,
                    $lte: endDate
                }
            };
            console.log('🔍 DEBUG: Filtering by month:', month, 'year:', year);
        }
        
        const allOrders = await Order.find(dateFilter);
        const allRestaurants = await Restaurant.find({});
        const allUsers = await User.find({});

        console.log('🔍 DEBUG: Found', allOrders.length, 'orders');
        console.log('🔍 DEBUG: Found', allRestaurants.length, 'restaurants');
        console.log('🔍 DEBUG: Found', allUsers.length, 'users');

        // Calculate total platform statistics
        const totalOrders = allOrders.length;
        const completedOrders = allOrders.filter(order => order.status === 8).length; // delivered orders
        const pendingOrders = allOrders.filter(order => order.status === 0).length;
        const totalRevenue = allOrders
            .filter(order => order.status === 8) // Only delivered orders
            .reduce((sum, order) => sum + (order.totalPrice || 0), 0);
        const totalDeliveryRevenue = allOrders
            .filter(order => order.status === 8) // Only delivered orders
            .reduce((sum, order) => sum + (order.deliveryPrice || 0), 0);
        const netRevenue = totalRevenue - totalDeliveryRevenue;
        const totalCommission = netRevenue * 0.07; // 7% commission
        const totalRestaurantProfit = netRevenue * 0.93; // 93% for restaurants

        console.log('🔍 DEBUG: Platform stats:');
        console.log('  - Total Orders:', totalOrders);
        console.log('  - Completed Orders:', completedOrders);
        console.log('  - Total Revenue:', totalRevenue);
        console.log('  - Net Revenue:', netRevenue);
        console.log('  - Total Commission:', totalCommission);

        const stats = {
            platform: {
                totalRestaurants: allRestaurants.length,
                activeRestaurants: allRestaurants.filter(r => r.isActive === true).length,
                totalUsers: allUsers.filter(user => user.type === 'user').length,
                totalDeliveryDrivers: allUsers.filter(user => user.type === 'delivery').length,
                totalAdmins: allUsers.filter(user => user.type === 'admin').length,
            },
            orders: {
                totalOrders,
                completedOrders,
                pendingOrders,
                completionRate: totalOrders > 0 ? (completedOrders / totalOrders * 100).toFixed(2) : 0,
            },
            revenue: {
                totalRevenue,
                totalDeliveryRevenue,
                netRevenue,
                totalCommission,
                totalRestaurantProfit,
                averageOrderValue: totalOrders > 0 ? (totalRevenue / totalOrders).toFixed(2) : 0,
            }
        };

        console.log('🔍 DEBUG: Sending platform stats');
        res.json(stats);
    } catch (error) {
        console.error('❌ Error fetching platform stats:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get commission details for specific date range
superadminRouter.get('/superadmin/commission-details', superadmin, async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        
        let dateFilter = {};
        if (startDate && endDate) {
            dateFilter = {
                orderAt: {
                    $gte: new Date(startDate),
                    $lte: new Date(endDate)
                }
            };
        }

        const orders = await Order.find(dateFilter);
        
        // Group by restaurant
        const restaurantCommissions = {};
        
        for (const order of orders) {
            if (order.restaurantId) {
                const restaurantId = order.restaurantId.toString();
                
                if (!restaurantCommissions[restaurantId]) {
                    restaurantCommissions[restaurantId] = {
                        restaurantId,
                        restaurantName: 'Unknown Restaurant',
                        totalOrders: 0,
                        totalRevenue: 0,
                        totalDeliveryRevenue: 0,
                        netRevenue: 0,
                        commission: 0,
                        restaurantProfit: 0
                    };
                }
                
                restaurantCommissions[restaurantId].totalOrders++;
                restaurantCommissions[restaurantId].totalRevenue += order.totalPrice || 0;
                restaurantCommissions[restaurantId].totalDeliveryRevenue += order.deliveryPrice || 0;
            }
        }

        // Calculate net revenue, commission, and profit for each restaurant
        for (const restaurantId in restaurantCommissions) {
            const restaurant = restaurantCommissions[restaurantId];
            restaurant.netRevenue = restaurant.totalRevenue - restaurant.totalDeliveryRevenue;
            restaurant.commission = restaurant.netRevenue * 0.07;
            restaurant.restaurantProfit = restaurant.netRevenue * 0.93;
            
            // Get restaurant name
            try {
                const restaurantDoc = await Restaurant.findById(restaurantId);
                if (restaurantDoc) {
                    restaurant.restaurantName = restaurantDoc.name;
                }
            } catch (error) {
                console.error('Error fetching restaurant name:', error);
            }
        }

        // Calculate totals
        const totalCommission = Object.values(restaurantCommissions)
            .reduce((sum, restaurant) => sum + restaurant.commission, 0);
        
        const totalRestaurantProfit = Object.values(restaurantCommissions)
            .reduce((sum, restaurant) => sum + restaurant.restaurantProfit, 0);

        res.json({
            dateRange: { startDate, endDate },
            restaurantCommissions: Object.values(restaurantCommissions),
            totals: {
                totalCommission,
                totalRestaurantProfit,
                totalRestaurants: Object.keys(restaurantCommissions).length
            }
        });
    } catch (error) {
        console.error('Error fetching commission details:', error);
        res.status(500).json({ error: error.message });
    }
});

// =====================================
// Join requests (delivery / restaurant applications)
// =====================================
superadminRouter.get('/api/superadmin/join-requests', superadmin, async (req, res) => {
    try {
        const { status } = req.query;
        const filter = {};
        if (status && ['pending', 'accepted', 'rejected'].includes(status)) {
            filter.status = status;
        }
        const list = await JoinRequest.find(filter).sort({ createdAt: -1 }).lean();
        res.json(list);
    } catch (error) {
        console.error('Error listing join requests:', error);
        res.status(500).json({ error: error.message });
    }
});

superadminRouter.post('/api/superadmin/join-requests/:id/approve', superadmin, async (req, res) => {
    try {
        const jr = await JoinRequest.findById(req.params.id);
        if (!jr) {
            return res.status(404).json({ msg: 'الطلب غير موجود' });
        }
        if (jr.status !== 'pending') {
            return res.status(400).json({ msg: 'تمت معالجة هذا الطلب مسبقاً' });
        }

        const phone = String(jr.phone || '').trim();
        if (!phone) {
            return res.status(400).json({ msg: 'رقم الهاتف غير صالح في الطلب' });
        }

        const existingPhone = await User.findOne({ phone });
        if (existingPhone) {
            return res.status(400).json({ msg: 'يوجد حساب مسجّل بنفس رقم الهاتف' });
        }

        const loginEmail =
            jr.email && String(jr.email).trim()
                ? String(jr.email).trim()
                : `user_${phone}@app.com`;

        const existingEmail = await User.findOne({ email: loginEmail });
        if (existingEmail) {
            return res.status(400).json({ msg: 'البريد الإلكتروني مستخدم مسبقاً' });
        }

        const temporaryPassword = generateTempJoinPassword();
        const hashedPassword = await bcrypt.hash(temporaryPassword, 10);

        let createdUser;

        if (jr.type === 'delivery') {
            createdUser = await User.create({
                name: jr.fullName,
                email: loginEmail,
                phone,
                password: hashedPassword,
                type: 'delivery',
                status: 'accepted',
                vehicleType: mapJoinVehicleToEnum(jr.vehicleType),
                address: '',
                cart: [],
                fcmToken: jr.fcmToken || null,
            });
        } else if (jr.type === 'restaurant') {
            const restaurant = await Restaurant.create({
                name: jr.restaurantName || `${jr.fullName}`,
                address: '',
                minimumOrderPrice: 0,
            });
            createdUser = await User.create({
                name: jr.fullName,
                email: loginEmail,
                phone,
                password: hashedPassword,
                type: 'admin',
                restaurant: restaurant._id,
                status: 'accepted',
                address: '',
                cart: [],
                fcmToken: jr.fcmToken || null,
            });
        } else {
            return res.status(400).json({ msg: 'نوع الطلب غير مدعوم' });
        }

        jr.status = 'accepted';
        jr.reviewedAt = new Date();
        jr.createdUserId = createdUser._id;
        await jr.save();
        await sendJoinRequestResultNotification(jr.fcmToken, true);

        res.json({
            msg: 'تم قبول طلب الانضمام وإنشاء الحساب',
            temporaryPassword,
            loginEmail,
            loginPhone: phone,
            joinRequest: jr,
        });
    } catch (error) {
        console.error('Error approving join request:', error);
        res.status(500).json({ error: error.message });
    }
});

superadminRouter.post('/api/superadmin/join-requests/:id/reject', superadmin, async (req, res) => {
    try {
        const jr = await JoinRequest.findById(req.params.id);
        if (!jr) {
            return res.status(404).json({ msg: 'الطلب غير موجود' });
        }
        if (jr.status !== 'pending') {
            return res.status(400).json({ msg: 'تمت معالجة هذا الطلب مسبقاً' });
        }
        jr.status = 'rejected';
        jr.reviewedAt = new Date();
        await jr.save();
        await sendJoinRequestResultNotification(jr.fcmToken, false);
        res.json({ msg: 'تم رفض طلب الانضمام', joinRequest: jr });
    } catch (error) {
        console.error('Error rejecting join request:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = superadminRouter;
