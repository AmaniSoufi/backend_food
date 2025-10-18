const express = require('express');
const adminRouter = express.Router();
const admin = require('../middlewares/admin');
const {Product} = require('../models/product');
const Order = require('../models/order');
const User = require('../models/user');
const Restaurant = require('../models/restaurant');

// get all the products
adminRouter.get('/admin/get-products', admin, async (req, res) => {
    try {
        // Find the admin user to get their restaurant
        const adminUser = await User.findById(req.user);
        if (!adminUser || !adminUser.restaurant) {
            return res.status(403).json({ error: 'Admin does not have a restaurant assigned.' });
        }
        const products = await Product.find({ restaurant: adminUser.restaurant });
        res.json(products);
    } catch(e) {
        res.status(500).json({error: e.message});
    }
});

adminRouter.post('/admin/delete-products', admin, async (req, res) => {
    try {
        const {id} = req.body;
        let product = await Product.findByIdAndDelete(id);
        res.json(product);
    } catch(e) {
        res.status(500).json({error: e.message});
    }
});

// create admin Middleware
adminRouter.post('/admin/add-product', admin, async (req, res) => {
    try {
        const { name, description, quantity, images, price, category } = req.body;
        
        if (!name || !description || !quantity || !images || !price || !category) {
            return res.status(400).json({
                error: 'Missing required fields. Please provide: name, description, quantity, images, price, category'
            });
        }
        
        if (!Array.isArray(images) || images.length === 0) {
            return res.status(400).json({
                error: 'Images must be a non-empty array'
            });
        }
        // Find the admin user to get their restaurant
        const adminUser = await User.findById(req.user);
        if (!adminUser || !adminUser.restaurant) {
            return res.status(403).json({ error: 'Admin does not have a restaurant assigned.' });
        }
        let product = new Product({
            name,
            description,
            quantity: Number(quantity),
            images,
            price: Number(price),
            category,
            restaurant: adminUser.restaurant,
        });
        
        product = await product.save();
        res.json(product);
    } catch (e) {
        console.error('Error adding product:', e);
        res.status(500).json({ error: e.message });
    }
});

// Endpoint to create a new restaurant
adminRouter.post('/admin/create-restaurant', async (req, res) => {
    try {
        const { name, address, minimumOrderPrice } = req.body;
        if (!name) {
            return res.status(400).json({ error: 'Restaurant name is required' });
        }
        // Prevent duplicate restaurant names
        const existing = await Restaurant.findOne({ name });
        if (existing) {
            return res.status(400).json({ error: 'Restaurant with this name already exists' });
        }
        const restaurant = new Restaurant({ name, address, minimumOrderPrice });
        await restaurant.save();
        res.json(restaurant);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Endpoint for admin to update restaurant profile
adminRouter.post('/admin/update-restaurant-profile', admin, async (req, res) => {
    try {
        console.log('🔍 DEBUG: Update restaurant profile request body:', req.body);
        const { name, openingTime, closingTime, logo } = req.body;
        console.log('🔍 DEBUG: Received data - name:', name, 'openingTime:', openingTime, 'closingTime:', closingTime, 'logo:', logo ? 'present' : 'not present');
        
        const adminUser = await User.findById(req.user);
        console.log('🔍 DEBUG: Admin user:', adminUser);
        
        if (!adminUser || !adminUser.restaurant) {
            console.log('🔍 DEBUG: No restaurant assigned to admin');
            return res.status(403).json({ error: 'Admin does not have a restaurant assigned.' });
        }
        
        const restaurant = await Restaurant.findById(adminUser.restaurant);
        console.log('🔍 DEBUG: Current restaurant data:', restaurant);
        
        if (!restaurant) {
            console.log('🔍 DEBUG: Restaurant not found');
            return res.status(404).json({ error: 'Restaurant not found.' });
        }
        
        // Update restaurant data
        if (name) {
            console.log('🔍 DEBUG: Updating name from', restaurant.name, 'to', name);
            restaurant.name = name;
        }
        if (openingTime) {
            console.log('🔍 DEBUG: Updating openingTime from', restaurant.openingTime, 'to', openingTime);
            restaurant.openingTime = openingTime;
        }
        if (closingTime) {
            console.log('🔍 DEBUG: Updating closingTime from', restaurant.closingTime, 'to', closingTime);
            restaurant.closingTime = closingTime;
        }
        if (logo) {
            console.log('🔍 DEBUG: Updating logo from', restaurant.logo ? 'existing' : 'none', 'to new logo');
            restaurant.logo = logo;
        }
        
        console.log('🔍 DEBUG: Saving restaurant with updated data...');
        await restaurant.save();
        console.log('🔍 DEBUG: Restaurant saved successfully:', restaurant);
        res.json(restaurant);
    } catch (e) {
        console.error('Error updating restaurant profile:', e);
        res.status(500).json({ error: e.message });
    }
});

// Endpoint to initialize restaurant with default working hours
adminRouter.post('/admin/initialize-restaurant', admin, async (req, res) => {
    try {
        const adminUser = await User.findById(req.user);
        if (!adminUser || !adminUser.restaurant) {
            return res.status(403).json({ error: 'Admin does not have a restaurant assigned.' });
        }
        
        const restaurant = await Restaurant.findById(adminUser.restaurant);
        if (!restaurant) {
            return res.status(404).json({ error: 'Restaurant not found.' });
        }
        
        // Set default working hours if not already set
        if (!restaurant.openingTime) {
            restaurant.openingTime = '08:00';
        }
        if (!restaurant.closingTime) {
            restaurant.closingTime = '22:00';
        }
        
        await restaurant.save();
        console.log('🔍 DEBUG: Restaurant initialized with default hours:', restaurant);
        res.json(restaurant);
    } catch (e) {
        console.error('Error initializing restaurant:', e);
        res.status(500).json({ error: e.message });
    }
});

// Endpoint for admin to get restaurant profile
adminRouter.get('/admin/get-restaurant-profile', admin, async (req, res) => {
    try {
        console.log('🔍 DEBUG: Getting restaurant profile for user:', req.user);
        const adminUser = await User.findById(req.user);
        console.log('🔍 DEBUG: Admin user:', adminUser);
        
        if (!adminUser || !adminUser.restaurant) {
            console.log('🔍 DEBUG: No restaurant assigned to admin, trying to assign one...');
            
            // Try to find the restaurant and assign it to the admin
            const restaurant = await Restaurant.findOne({ name: 'pizzeria orania' });
            if (restaurant) {
                console.log('🔍 DEBUG: Found restaurant, assigning to admin...');
                adminUser.restaurant = restaurant._id;
                await adminUser.save();
                console.log('🔍 DEBUG: Restaurant assigned to admin');
            } else {
                console.log('🔍 DEBUG: Restaurant not found');
                return res.status(404).json({ error: 'Restaurant not found.' });
            }
        }
        
        console.log('🔍 DEBUG: Restaurant ID:', adminUser.restaurant);
        const restaurant = await Restaurant.findById(adminUser.restaurant);
        console.log('🔍 DEBUG: Found restaurant:', restaurant);
        
        if (!restaurant) {
            console.log('🔍 DEBUG: Restaurant not found');
            return res.status(404).json({ error: 'Restaurant not found.' });
        }
        
        console.log('🔍 DEBUG: Sending restaurant data:', restaurant);
        res.json(restaurant);
    } catch (e) {
        console.error('Error getting restaurant profile:', e);
        res.status(500).json({ error: e.message });
    }
});

// Endpoint for admin to update minimum order price
adminRouter.post('/admin/set-minimum-order-price', admin, async (req, res) => {
    try {
        const { minimumOrderPrice } = req.body;
        const adminUser = await User.findById(req.user);
        if (!adminUser || !adminUser.restaurant) {
            return res.status(403).json({ error: 'Admin does not have a restaurant assigned.' });
        }
        const restaurant = await Restaurant.findById(adminUser.restaurant);
        if (!restaurant) {
            return res.status(404).json({ error: 'Restaurant not found' });
        }
        restaurant.minimumOrderPrice = minimumOrderPrice;
        await restaurant.save();
        res.json({ success: true, minimumOrderPrice: restaurant.minimumOrderPrice });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Public endpoint to get all restaurants
adminRouter.get('/admin/get-all-restaurants', async (req, res) => {
    try {
        const restaurants = await Restaurant.find({}).select('name address latitude longitude minimumOrderPrice isActive createdAt');
        res.json(restaurants);
    } catch (e) {
        console.error('Error fetching restaurants:', e);
        res.status(500).json({ error: e.message });
    }
});

// Public endpoint to get a restaurant by ID (for minimum order price, etc.)
adminRouter.get('/admin/get-restaurant/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const restaurant = await Restaurant.findById(id);
        if (!restaurant) {
            return res.status(404).json({ error: 'Restaurant not found' });
        }
        res.json(restaurant);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// FIXED: Get orders with proper structure for frontend
adminRouter.get('/admin/get-orders', admin, async (req, res) => {
    try {
        // Find the admin user to get their restaurant
        const adminUser = await User.findById(req.user);
        if (!adminUser || !adminUser.restaurant) {
            return res.status(403).json({ error: 'Admin does not have a restaurant assigned.' });
        }
        // Find all orders that contain at least one product from the admin's restaurant
        const orders = await Order.find({}).populate('products.product');
        // Filter orders to only those with at least one product from the admin's restaurant
        const filteredOrders = orders.filter(order =>
            order.products.some(item => item.product && item.product.restaurant && item.product.restaurant.equals(adminUser.restaurant))
        );
        // Transform the orders to match frontend expectations
        const transformedOrders = filteredOrders.map(order => {
            const orderObj = order.toObject();
            orderObj.products = orderObj.products.map(item => {
                if (!item.product) {
                    return { quantity: item.quantity };
                }
                return {
                    ...item.product,
                    quantity: item.quantity
                };
            });
            return orderObj;
        });
        res.json(transformedOrders);
    } catch (e) {
        console.error('Error fetching orders:', e);
        res.status(500).json({ error: e.message });
    }
});

// Get order statistics for admin dashboard
adminRouter.get('/admin/order-stats', admin, async (req, res) => {
    try {
        const adminUser = await User.findById(req.user);
        if (!adminUser || !adminUser.restaurant) {
            return res.status(403).json({ error: 'Admin does not have a restaurant assigned.' });
        }

        // Get all orders for this restaurant
        const orders = await Order.find({}).populate('products.product');
        const filteredOrders = orders.filter(order =>
            order.products.some(item => item.product && item.product.restaurant && item.product.restaurant.equals(adminUser.restaurant))
        );

        // Calculate statistics
        const totalOrders = filteredOrders.length;
        const pendingOrders = filteredOrders.filter(order => order.status === 0).length;
        const acceptedOrders = filteredOrders.filter(order => order.status === 1).length;
        const completedOrders = filteredOrders.filter(order => order.status === 2).length;
        const cancelledOrders = filteredOrders.filter(order => order.status === 3).length;
        const rejectedOrders = filteredOrders.filter(order => order.status === 9).length;
        
        // Calculate total revenue
        const totalRevenue = filteredOrders
            .filter(order => order.status === 8) // Only delivered orders
            .reduce((sum, order) => sum + order.totalPrice, 0);
        
        // Calculate total delivery revenue
        const totalDeliveryRevenue = filteredOrders
            .filter(order => order.status === 8) // Only delivered orders
            .reduce((sum, order) => sum + (order.deliveryPrice || 0), 0);
        
        // Calculate average delivery distance
        const ordersWithDelivery = filteredOrders.filter(order => order.deliveryDistance > 0);
        const averageDeliveryDistance = ordersWithDelivery.length > 0 
            ? ordersWithDelivery.reduce((sum, order) => sum + order.deliveryDistance, 0) / ordersWithDelivery.length
            : 0;

        const stats = {
            totalOrders,
            pendingOrders,
            acceptedOrders,
            completedOrders,
            cancelledOrders,
            rejectedOrders,
            totalRevenue,
            totalDeliveryRevenue,
            averageDeliveryDistance: Math.round(averageDeliveryDistance * 100) / 100, // Round to 2 decimal places
            recentOrders: filteredOrders
                .sort((a, b) => b.orderAt - a.orderAt)
                .slice(0, 5) // Get 5 most recent orders
                .map(order => ({
                    id: order._id,
                    totalPrice: order.totalPrice,
                    deliveryPrice: order.deliveryPrice,
                    deliveryDistance: order.deliveryDistance,
                    status: order.status,
                    orderAt: order.orderAt,
                    address: order.address
                }))
        };

        console.log('=== DEBUG: Order Statistics ===');
        console.log('Total Orders:', totalOrders);
        console.log('Pending Orders:', pendingOrders);
        console.log('Accepted Orders:', acceptedOrders);
        console.log('Completed Orders:', completedOrders);
        console.log('Cancelled Orders:', cancelledOrders);
        console.log('Rejected Orders:', rejectedOrders);
        console.log('Total Revenue:', totalRevenue);
        console.log('Total Delivery Revenue:', totalDeliveryRevenue);
        console.log('Average Delivery Distance:', stats.averageDeliveryDistance);

        res.json(stats);
    } catch (e) {
        console.error('Error fetching order stats:', e);
        res.status(500).json({ error: e.message });
    }
});

// FIXED: Change order status with proper response structure
adminRouter.post("/admin/change-order-status", admin, async (req, res) => {
    console.log('Request body:', req.body);
    try {
        const { id, status } = req.body;
        
        // Validate the request
        if (!id || status === undefined) {
            return res.status(400).json({
                error: 'Missing required fields: id and status'
            });
        }
        
        // Validate status value (should be 0, 1, 2, 3, 5, 6, 7, 8, or 9)
        if (status < 0 || (status > 3 && status < 5) || status > 9) {
            return res.status(400).json({
                error: 'Invalid status. Status must be 0, 1, 2, 3, 5, 6, 7, 8, or 9'
            });
        }
        
        // Find and update the order
        let order = await Order.findById(id);
        if (!order) {
            return res.status(404).json({ error: 'Order not found' });
        }
        
        // Update the status
        console.log(`Updating order ${id} status from ${order.status} to ${status}`);
        order.status = Number(status);
        order = await order.save();
        console.log(`Order ${id} status updated successfully to ${order.status}`);
        
        // Get the updated order with populated products
        const populatedOrder = await Order.findById(order._id).populate('products.product');
        
        // Transform response to match frontend expectations
        const orderObj = populatedOrder.toObject();
        orderObj.products = orderObj.products.map(item => {
          if (!item.product) {
            return { quantity: item.quantity };
          }
          return {
            ...item.product,
            quantity: item.quantity
          };
        });
        
        console.log('Order status updated:', {
            orderId: id,
            oldStatus: order.status,
            newStatus: status
        });
        
        // إرسال إشعار FCM للمشتري عند تحديث حالة الطلب
        try {
            const { sendOrderStatusNotification } = require('./fcm');
            await sendOrderStatusNotification(order._id.toString(), order.userId.toString(), status);
            console.log('✅ FCM status update notification sent to customer');
        } catch (fcmError) {
            console.error('❌ Error sending FCM status update notification:', fcmError);
            // لا نريد أن نفشل العملية إذا فشل FCM
        }
        
        // إنشاء إشعار في قاعدة البيانات للمشتري
        try {
            const { createNotification } = require('./notification.js');
            const title = 'تحديث حالة الطلب';
            const msgMap = {
                1: 'تم تأكيد طلبك ✅',
                2: 'تم تعيين مندوب للطلب 🚗',
                3: 'المندوب قبل طلبك 🚗',
                5: 'تم رفض طلبك ❌',
                6: 'المطعم يحضر طلبك الآن 👨‍🍳',
                7: 'طلبك في الطريق إليك 🚚',
                8: 'تم تسليم طلبك 🎉',
                9: 'تم إلغاء طلبك ❌',
            };
            const message = msgMap[Number(status)] || 'تم تحديث حالة طلبك';
            await createNotification(
                order.userId,
                'status_update',
                title,
                message,
                order._id,
                order.restaurantId,
                { status: Number(status) }
            );
            console.log('✅ DB status notification created for customer');
        } catch (dbNotiErr) {
            console.error('❌ Error creating DB status notification:', dbNotiErr);
        }
        
        res.json(orderObj);
    } catch (e) {
        console.error('Error changing order status:', e);
        res.status(500).json({ error: e.message });
    }
});

// FIXED: Get order by ID with proper structure
adminRouter.get('/admin/get-order-by-id/:id', admin, async (req, res) => {
    try {
        const { id } = req.params;
        const order = await Order.findById(id).populate('products.product');
        
        if (!order) {
            return res.status(404).json({ error: 'Order not found' });
        }
        
        // Transform response to match frontend expectations
        const orderObj = order.toObject();
        orderObj.products = orderObj.products.map(item => {
          if (!item.product) {
            return { quantity: item.quantity };
          }
          return {
            ...item.product,
            quantity: item.quantity
          };
        });
        
        res.json(orderObj);
    } catch (e) {
        console.error('Error fetching order by ID:', e);
        res.status(500).json({ error: e.message });
    }
});

// Get all pending delivery requests for the admin's restaurant
adminRouter.get('/admin/delivery-requests', admin, async (req, res) => {
    try {
        const adminUser = await User.findById(req.user);
        if (!adminUser || !adminUser.restaurant) {
            return res.status(403).json({ error: 'Admin does not have a restaurant assigned.' });
        }
        const pendingDeliveries = await User.find({
            type: 'delivery',
            restaurant: adminUser.restaurant,
            status: 'pending',
        });
        res.json(pendingDeliveries);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Approve or reject a delivery request
adminRouter.post('/admin/handle-delivery-request', admin, async (req, res) => {
    try {
        const { deliveryId, action } = req.body; // action: 'accept' or 'reject'
        const adminUser = await User.findById(req.user);
        if (!adminUser || !adminUser.restaurant) {
            return res.status(403).json({ error: 'Admin does not have a restaurant assigned.' });
        }
        const deliveryUser = await User.findOne({
            _id: deliveryId,
            type: 'delivery',
            restaurant: adminUser.restaurant,
            status: 'pending',
        });
        if (!deliveryUser) {
            return res.status(404).json({ error: 'Delivery request not found' });
        }
        if (action === 'accept') {
            deliveryUser.status = 'accepted';
        } else if (action === 'reject') {
            deliveryUser.status = 'rejected';
        } else {
            return res.status(400).json({ error: 'Invalid action' });
        }
        await deliveryUser.save();
        res.json({ success: true, status: deliveryUser.status });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Auto-assign delivery person to order
adminRouter.post('/admin/auto-assign-delivery/:orderId', admin, async (req, res) => {
    try {
        console.log('🚚 بدء عملية تعيين السائق التلقائي');
        
        const order = await Order.findById(req.params.orderId);
        if (!order) {
            return res.status(404).json({ message: 'الطلب غير موجود' });
        }

        // التحقق من أن الطلب مقبول من المطعم
        if (order.status !== 1) {
            return res.status(400).json({ 
                message: 'يجب أن يكون الطلب مقبول من المطعم أولاً' 
            });
        }

        // البحث عن أقرب سائق متاح
        const availableDeliveryPersons = await User.find({
            type: 'delivery',
            status: 'accepted',
            isOnline: true,
            isAvailable: true,
            currentOrder: null
        });

        if (availableDeliveryPersons.length === 0) {
            return res.status(404).json({ 
                message: 'لا يوجد سائقين متاحين حالياً. سيتم إعادة المحاولة تلقائياً.' 
            });
        }

        // حساب المسافة لكل سائق (استخدام موقع افتراضي للمطعم)
        const restaurantLocation = { latitude: 25.2048, longitude: 55.2708 }; // دبي كموقع افتراضي
        
        const deliveryPersonsWithDistance = availableDeliveryPersons.map(delivery => {
            const distance = calculateDistance(
                { latitude: order.latitude || restaurantLocation.latitude, longitude: order.longitude || restaurantLocation.longitude },
                { latitude: delivery.currentLocation?.latitude || restaurantLocation.latitude, longitude: delivery.currentLocation?.longitude || restaurantLocation.longitude }
            );
            
            return {
                deliveryPerson: delivery,
                distance: distance
            };
        });

        // ترتيب حسب المسافة (الأقرب أولاً)
        deliveryPersonsWithDistance.sort((a, b) => a.distance - b.distance);

        const nearestDelivery = deliveryPersonsWithDistance[0].deliveryPerson;

        // تعيين السائق للطلب
        order.deliveryPersonId = nearestDelivery._id;
        order.status = 2; // assigned_to_delivery
        order.assignedAt = new Date();
        await order.save();

        // تحديث حالة السائق
        nearestDelivery.currentOrder = order._id;
        nearestDelivery.isAvailable = false;
        await nearestDelivery.save();

        console.log(`✅ تم تعيين السائق ${nearestDelivery.name} للطلب ${order._id}`);

        // إرسال إشعار FCM للمندوب عند تعيينه للطلب
        try {
            const { sendDeliveryAssignmentNotification, sendDriverAssignedNotificationToRestaurant } = require('./fcm_admin');
            await sendDeliveryAssignmentNotification(order._id.toString(), nearestDelivery._id.toString());
            console.log('✅ FCM delivery assignment notification sent to delivery person');
            
            // إرسال إشعار للمطعم أيضاً
            await sendDriverAssignedNotificationToRestaurant(order._id.toString(), nearestDelivery._id.toString());
            console.log('✅ FCM driver assigned notification sent to restaurant');
        } catch (fcmError) {
            console.error('❌ Error sending FCM notifications:', fcmError);
            // لا نريد أن نفشل العملية إذا فشل FCM
        }

        res.json({
            success: true,
            message: 'تم تعيين السائق بنجاح',
            deliveryPerson: {
                id: nearestDelivery._id,
                name: nearestDelivery.name,
                phone: nearestDelivery.phone,
                distance: deliveryPersonsWithDistance[0].distance
            }
        });

    } catch (error) {
        console.error('❌ خطأ في تعيين السائق:', error);
        res.status(500).json({ message: 'خطأ في الخادم' });
    }
});

// Get available drivers with distances for an order
adminRouter.get('/admin/available-drivers/:orderId', admin, async (req, res) => {
    try {
        console.log('🚚 جلب السائقين المتاحين');
        
        const order = await Order.findById(req.params.orderId);
        if (!order) {
            return res.status(404).json({ message: 'الطلب غير موجود' });
        }

        // البحث عن جميع السائقين المسجلين (بغض النظر عن حالة القبول)
        const allDeliveryPersons = await User.find({
            type: 'delivery'
        });

        if (allDeliveryPersons.length === 0) {
            return res.json({
                success: true,
                drivers: [],
                message: 'لا يوجد سائقين مسجلين في النظام (البحث يشمل جميع السائقين)'
            });
        }

        // حساب المسافة وحالة كل سائق
        const restaurantLocation = { latitude: 25.2048, longitude: 55.2708 }; // دبي كموقع افتراضي
        
        const driversWithDistance = allDeliveryPersons.map(delivery => {
            const distance = calculateDistance(
                { latitude: order.latitude || restaurantLocation.latitude, longitude: order.longitude || restaurantLocation.longitude },
                { latitude: delivery.currentLocation?.latitude || restaurantLocation.latitude, longitude: delivery.currentLocation?.longitude || restaurantLocation.longitude }
            );
            
            // تحديد حالة السائق (جميع السائقين قابلين للتعيين)
            let statusText = '';
            let statusColor = '';
            let isAssignable = true; // جميع السائقين قابلين للتعيين
            
            if (!delivery.isOnline) {
                statusText = 'غير متصل';
                statusColor = 'offline';
            } else if (!delivery.isAvailable) {
                statusText = 'مشغول';
                statusColor = 'busy';
            } else if (delivery.currentOrder) {
                statusText = 'لديه طلب';
                statusColor = 'busy';
            } else {
                statusText = 'متاح';
                statusColor = 'available';
            }
            
            return {
                id: delivery._id,
                name: delivery.name,
                phone: delivery.phone,
                rating: delivery.rating || 5.0,
                totalDeliveries: delivery.totalDeliveries || 0,
                vehicleType: delivery.vehicleType || 'motorcycle',
                distance: distance,
                isOnline: delivery.isOnline || false,
                isAvailable: delivery.isAvailable || false,
                currentOrder: delivery.currentOrder,
                currentLocation: delivery.currentLocation,
                statusText: statusText,
                statusColor: statusColor,
                isAssignable: isAssignable,
                accountStatus: delivery.status || 'pending' // حالة الحساب (pending/accepted/rejected)
            };
        });

        // ترتيب حسب الحالة أولاً (المتاحين أولاً) ثم حسب المسافة
        driversWithDistance.sort((a, b) => {
            // المتاحين أولاً (available)
            if (a.statusColor === 'available' && b.statusColor !== 'available') return -1;
            if (a.statusColor !== 'available' && b.statusColor === 'available') return 1;
            
            // ثم المشغولين (busy)
            if (a.statusColor === 'busy' && b.statusColor === 'offline') return -1;
            if (a.statusColor === 'offline' && b.statusColor === 'busy') return 1;
            
            // إذا كانت الحالة متشابهة، رتب حسب المسافة
            return a.distance - b.distance;
        });

        const availableCount = driversWithDistance.filter(d => d.statusColor === 'available').length;
        const busyCount = driversWithDistance.filter(d => d.statusColor === 'busy').length;
        const offlineCount = driversWithDistance.filter(d => d.statusColor === 'offline').length;
        
        res.json({
            success: true,
            drivers: driversWithDistance,
            totalDrivers: driversWithDistance.length,
            availableDrivers: availableCount,
            busyDrivers: busyCount,
            offlineDrivers: offlineCount,
            message: `إجمالي ${driversWithDistance.length} سائق (${availableCount} متاح، ${busyCount} مشغول، ${offlineCount} غير متصل) - جميعهم قابلين للتعيين`
        });

    } catch (error) {
        console.error('❌ خطأ في جلب السائقين:', error);
        res.status(500).json({ message: 'خطأ في الخادم' });
    }
});

// Manually assign specific driver to order
adminRouter.post('/admin/assign-driver/:orderId/:driverId', admin, async (req, res) => {
    try {
        console.log('🚚 تعيين سائق محدد للطلب');
        
        const { orderId, driverId } = req.params;
        
        const order = await Order.findById(orderId);
        if (!order) {
            return res.status(404).json({ message: 'الطلب غير موجود' });
        }

        const driver = await User.findById(driverId);
        if (!driver || driver.type !== 'delivery') {
            return res.status(404).json({ message: 'السائق غير موجود' });
        }

        if (!driver.isAvailable || driver.currentOrder) {
            return res.status(400).json({ message: 'السائق غير متاح حالياً' });
        }

        // تعيين السائق للطلب
        order.deliveryPersonId = driver._id;
        order.status = 2; // assigned_to_delivery
        order.assignedAt = new Date();
        await order.save();

        // تحديث حالة السائق
        driver.currentOrder = order._id;
        driver.isAvailable = false;
        await driver.save();

        console.log(`✅ تم تعيين السائق ${driver.name} للطلب ${order._id}`);

        // إرسال إشعار FCM للمندوب عند تعيينه للطلب
        try {
            const { sendDeliveryAssignmentNotification, sendDriverAssignedNotificationToRestaurant } = require('./fcm_admin');
            await sendDeliveryAssignmentNotification(order._id.toString(), driver._id.toString());
            console.log('✅ FCM delivery assignment notification sent to delivery person');
            
            // إرسال إشعار للمطعم أيضاً
            await sendDriverAssignedNotificationToRestaurant(order._id.toString(), driver._id.toString());
            console.log('✅ FCM driver assigned notification sent to restaurant');
        } catch (fcmError) {
            console.error('❌ Error sending FCM notifications:', fcmError);
            // لا نريد أن نفشل العملية إذا فشل FCM
        }

        res.json({
            success: true,
            message: 'تم تعيين السائق بنجاح',
            deliveryPerson: {
                id: driver._id,
                name: driver.name,
                phone: driver.phone
            }
        });

    } catch (error) {
        console.error('❌ خطأ في تعيين السائق:', error);
        res.status(500).json({ message: 'خطأ في الخادم' });
    }
});

// Helper function to calculate distance
function calculateDistance(point1, point2) {
    const earthRadius = 6371; // Earth's radius in kilometers
    const pi = Math.PI;
    
    const lat1Rad = point1.latitude * pi / 180;
    const lat2Rad = point2.latitude * pi / 180;
    const deltaLat = (point2.latitude - point1.latitude) * pi / 180;
    const deltaLng = (point2.longitude - point1.longitude) * pi / 180;
    
    const a = Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
        Math.cos(lat1Rad) * Math.cos(lat2Rad) * Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    
    return earthRadius * c; // Distance in kilometers
}

module.exports = adminRouter;