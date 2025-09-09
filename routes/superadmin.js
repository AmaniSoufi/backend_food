const express = require('express');
const superadminRouter = express.Router();
const superadmin = require('../middlewares/superadmin');
const Order = require('../models/order');
const Restaurant = require('../models/restaurant');
const User = require('../models/user');

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
        
        const allOrders = await Order.find({});
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

module.exports = superadminRouter; 