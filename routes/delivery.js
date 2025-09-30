const express = require('express');
const auth = require('../middlewares/auth');
const User = require('../models/user');
const Order = require('../models/order');
const { calculateDistance } = require('../utils/delivery');

const deliveryRouter = express.Router();

// Test endpoint to check if delivery router is working
deliveryRouter.get('/delivery/test', (req, res) => {
    res.json({ 
        message: 'Delivery router is working', 
        timestamp: new Date().toISOString(),
        endpoints: {
            profile: 'GET /delivery/profile',
            status: 'PUT /delivery/status',
            initialize: 'POST /delivery/profile/initialize',
            update: 'PUT /delivery/profile',
            orders: 'GET /delivery/orders',
            acceptOrder: 'POST /delivery/accept-order/:orderId',
            rejectOrder: 'POST /delivery/reject-order/:orderId'
        }
    });
});

// Get orders assigned to delivery person
deliveryRouter.get('/delivery/orders', auth, async (req, res) => {
    try {
        const deliveryPerson = await User.findById(req.user);
        if (!deliveryPerson || deliveryPerson.type !== 'delivery') {
            return res.status(403).json({ message: 'Access denied. Delivery person only.' });
        }

        // Find orders assigned to this delivery person (only active orders)
        const orders = await Order.find({
            deliveryPersonId: req.user,
            status: { $in: [2, 3, 5, 6, 7] } // assigned, accepted, preparing, ready, on_the_way (active orders only)
        }).populate('products.product')
          .populate('restaurantId', 'name address latitude longitude')
          .populate('userId', 'name address');

        // Transform orders to match frontend expectations
        const transformedOrders = orders.map(order => {
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
            
            // Add restaurant location information
            if (orderObj.restaurantId) {
                orderObj.restaurantLocation = {
                    name: orderObj.restaurantId.name,
                    address: orderObj.restaurantId.address,
                    latitude: orderObj.restaurantId.latitude,
                    longitude: orderObj.restaurantId.longitude
                };
            }
            
            // Add customer location information
            orderObj.customerLocation = {
                name: orderObj.userId ? orderObj.userId.name : 'عميل',
                address: orderObj.address,
                latitude: orderObj.latitude,
                longitude: orderObj.longitude
            };
            
            return orderObj;
        });

        res.json(transformedOrders);
    } catch (error) {
        console.error('Error fetching delivery orders:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Accept order
deliveryRouter.post('/delivery/accept-order/:orderId', auth, async (req, res) => {
    try {
        const deliveryPerson = await User.findById(req.user);
        if (!deliveryPerson || deliveryPerson.type !== 'delivery') {
            return res.status(403).json({ message: 'Access denied. Delivery person only.' });
        }

        const order = await Order.findById(req.params.orderId);
        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }

        if (order.deliveryPersonId.toString() !== req.user) {
            return res.status(403).json({ message: 'Order not assigned to you' });
        }

        if (order.status !== 2) {
            return res.status(400).json({ message: 'Order cannot be accepted' });
        }

        // Accept the order
        order.status = 3; // delivery_accepted
        order.deliveryAcceptedAt = new Date();
        await order.save();

        // Update delivery person status
        deliveryPerson.currentOrder = order._id;
        deliveryPerson.isAvailable = false;
        await deliveryPerson.save();

        res.json({ message: 'Order accepted successfully' });
    } catch (error) {
        console.error('Error accepting order:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Reject order
deliveryRouter.post('/delivery/reject-order/:orderId', auth, async (req, res) => {
    try {
        const { reason } = req.body;
        const deliveryPerson = await User.findById(req.user);
        
        if (!deliveryPerson || deliveryPerson.type !== 'delivery') {
            return res.status(403).json({ message: 'Access denied. Delivery person only.' });
        }

        const order = await Order.findById(req.params.orderId);
        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }

        if (order.deliveryPersonId.toString() !== req.user) {
            return res.status(403).json({ message: 'Order not assigned to you' });
        }

        // Reject the order
        order.status = 4; // delivery_rejected
        order.deliveryRejectedAt = new Date();
        order.deliveryRejectionReason = reason;
        order.deliveryPersonId = null;
        await order.save();

        // Reset delivery person status
        deliveryPerson.currentOrder = null;
        deliveryPerson.isAvailable = true;
        await deliveryPerson.save();

        // Try to find another delivery person
        const availableDeliveryPersons = await User.find({
            type: 'delivery',
            status: 'accepted',
            isOnline: true,
            isAvailable: true,
            currentOrder: null
        });

        if (availableDeliveryPersons.length > 0) {
            // Find nearest delivery person
            const restaurantLocation = { latitude: 25.2048, longitude: 55.2708 }; // Dubai as default
            
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

            deliveryPersonsWithDistance.sort((a, b) => a.distance - b.distance);
            const nearestDelivery = deliveryPersonsWithDistance[0].deliveryPerson;

            // Reassign to new delivery person
            order.deliveryPersonId = nearestDelivery._id;
            order.status = 2; // assigned_to_delivery
            order.assignedAt = new Date();
            await order.save();

            // Update new delivery person status
            nearestDelivery.currentOrder = order._id;
            nearestDelivery.isAvailable = false;
            await nearestDelivery.save();
        }

        res.json({ message: 'Order rejected successfully' });
    } catch (error) {
        console.error('Error rejecting order:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Update delivery person location
deliveryRouter.put('/delivery/location', auth, async (req, res) => {
    try {
        console.log('DEBUG: Location update request received');
        console.log('DEBUG: Request body:', req.body);
        console.log('DEBUG: User ID:', req.user);
        
        const { latitude, longitude } = req.body;
        const deliveryPerson = await User.findById(req.user);
        
        console.log('DEBUG: Found delivery person:', deliveryPerson ? deliveryPerson.name : 'Not found');
        
        if (!deliveryPerson || deliveryPerson.type !== 'delivery') {
            console.log('DEBUG: Access denied - user type:', deliveryPerson?.type);
            return res.status(403).json({ message: 'Access denied. Delivery person only.' });
        }

        // Validate coordinates
        if (typeof latitude !== 'number' || typeof longitude !== 'number') {
            console.log('DEBUG: Invalid coordinates type - latitude:', typeof latitude, 'longitude:', typeof longitude);
            return res.status(400).json({ message: 'Invalid coordinates' });
        }

        if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
            console.log('DEBUG: Coordinates out of range - lat:', latitude, 'lng:', longitude);
            return res.status(400).json({ message: 'Coordinates out of range' });
        }

        console.log('DEBUG: Updating location for user:', deliveryPerson.name);
        console.log('DEBUG: Old location:', deliveryPerson.currentLocation);
        console.log('DEBUG: New location:', { latitude, longitude });

        // Update current location using findByIdAndUpdate to avoid validation issues
        const updatedDeliveryPerson = await User.findByIdAndUpdate(
            req.user,
            {
                currentLocation: { 
                    latitude, 
                    longitude,
                    lastUpdated: new Date()
                }
            },
            { new: true, runValidators: false }
        );

        console.log('DEBUG: Location updated successfully');
        console.log('DEBUG: New saved location:', updatedDeliveryPerson.currentLocation);

        res.json({
            message: 'Location updated successfully',
            location: { latitude, longitude },
            lastUpdated: updatedDeliveryPerson.currentLocation.lastUpdated
        });
    } catch (error) {
        console.error('Error updating delivery location:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Update delivery person online status
deliveryRouter.put('/delivery/online-status', auth, async (req, res) => {
    try {
        const { isOnline } = req.body;
        const deliveryPerson = await User.findById(req.user);
        
        if (!deliveryPerson || deliveryPerson.type !== 'delivery') {
            return res.status(403).json({ message: 'Access denied. Delivery person only.' });
        }

        deliveryPerson.isOnline = isOnline;
        if (!isOnline) {
            deliveryPerson.isAvailable = false;
        }
        await deliveryPerson.save();

        res.json({
            message: 'Online status updated successfully',
            isOnline: deliveryPerson.isOnline
        });
    } catch (error) {
        console.error('Error updating online status:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Update delivery person status (alias for online-status)
deliveryRouter.put('/delivery/status', auth, async (req, res) => {
    try {
        const { isOnline, isAvailable } = req.body;
        const deliveryPerson = await User.findById(req.user);
        
        if (!deliveryPerson || deliveryPerson.type !== 'delivery') {
            return res.status(403).json({ message: 'Access denied. Delivery person only.' });
        }

        deliveryPerson.isOnline = isOnline;
        deliveryPerson.isAvailable = isAvailable !== undefined ? isAvailable : isOnline;
        await deliveryPerson.save();

        res.json({
            success: true,
            message: 'Status updated successfully',
            isOnline: deliveryPerson.isOnline,
            isAvailable: deliveryPerson.isAvailable
        });
    } catch (error) {
        console.error('Error updating delivery status:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

// Get delivery person profile
deliveryRouter.get('/delivery/profile', auth, async (req, res) => {
    try {
        const deliveryPerson = await User.findById(req.user);
        
        if (!deliveryPerson || deliveryPerson.type !== 'delivery') {
            return res.status(403).json({ success: false, message: 'Access denied. Delivery person only.' });
        }

        // Get delivery statistics
        const completedOrders = await Order.countDocuments({
            deliveryPersonId: req.user,
            status: 8 // delivered
        });

        const totalEarnings = await Order.aggregate([
            {
                $match: {
                    deliveryPersonId: deliveryPerson._id,
                    status: 8 // delivered
                }
            },
            {
                $group: {
                    _id: null,
                    total: { $sum: '$deliveryPrice' }
                }
            }
        ]);

        const profile = {
            id: deliveryPerson._id,
            name: deliveryPerson.name,
            email: deliveryPerson.email,
            phone: deliveryPerson.phone || deliveryPerson.address,
            rating: deliveryPerson.rating || 0,
            totalDeliveries: deliveryPerson.totalDeliveries || 0,
            vehicleType: deliveryPerson.vehicleType || 'motorcycle',
            isOnline: deliveryPerson.isOnline || false,
            isAvailable: deliveryPerson.isAvailable || false,
            currentLocation: deliveryPerson.currentLocation,
            statistics: {
                completedOrders,
                totalEarnings: totalEarnings.length > 0 ? totalEarnings[0].total : 0
            }
        };

        res.json({ success: true, profile });
    } catch (error) {
        console.error('Error fetching delivery profile:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

// Initialize delivery person profile
deliveryRouter.post('/delivery/profile/initialize', auth, async (req, res) => {
    try {
        const deliveryPerson = await User.findById(req.user);
        
        if (!deliveryPerson || deliveryPerson.type !== 'delivery') {
            return res.status(403).json({ success: false, message: 'Access denied. Delivery person only.' });
        }

        // Update basic profile information
        const updateData = {};
        
        if (req.body.name) updateData.name = req.body.name;
        if (req.body.email) updateData.email = req.body.email;
        if (req.body.phone) updateData.phone = req.body.phone;
        if (req.body.vehicleType) updateData.vehicleType = req.body.vehicleType;
        
        // Set default values if not present
        if (!deliveryPerson.rating) updateData.rating = 0;
        if (!deliveryPerson.totalDeliveries) updateData.totalDeliveries = 0;
        if (deliveryPerson.isOnline === undefined) updateData.isOnline = false;
        if (deliveryPerson.isAvailable === undefined) updateData.isAvailable = true;

        if (Object.keys(updateData).length > 0) {
            await User.findByIdAndUpdate(req.user, updateData);
        }

        res.json({ success: true, message: 'Profile initialized successfully' });
    } catch (error) {
        console.error('Error initializing delivery profile:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

// Update delivery person profile
deliveryRouter.put('/delivery/profile', auth, async (req, res) => {
    try {
        const deliveryPerson = await User.findById(req.user);
        
        if (!deliveryPerson || deliveryPerson.type !== 'delivery') {
            return res.status(403).json({ success: false, message: 'Access denied. Delivery person only.' });
        }

        // Update profile information
        const updateData = {};
        
        if (req.body.name) updateData.name = req.body.name;
        if (req.body.email) updateData.email = req.body.email;
        if (req.body.phone) updateData.phone = req.body.phone;
        if (req.body.vehicleType) updateData.vehicleType = req.body.vehicleType;
        if (req.body.rating !== undefined) updateData.rating = req.body.rating;
        if (req.body.totalDeliveries !== undefined) updateData.totalDeliveries = req.body.totalDeliveries;
        if (req.body.isOnline !== undefined) updateData.isOnline = req.body.isOnline;
        if (req.body.isAvailable !== undefined) updateData.isAvailable = req.body.isAvailable;

        if (Object.keys(updateData).length > 0) {
            await User.findByIdAndUpdate(req.user, updateData);
        }

        res.json({ success: true, message: 'Profile updated successfully' });
    } catch (error) {
        console.error('Error updating delivery profile:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

// Update order status by delivery person
deliveryRouter.put('/delivery/update-order-status/:orderId', auth, async (req, res) => {
    try {
        const { status } = req.body;
        const deliveryPerson = await User.findById(req.user);
        
        if (!deliveryPerson || deliveryPerson.type !== 'delivery') {
            return res.status(403).json({ success: false, message: 'Access denied. Delivery person only.' });
        }

        const order = await Order.findById(req.params.orderId);
        if (!order) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }

        if (order.deliveryPersonId.toString() !== req.user) {
            return res.status(403).json({ success: false, message: 'Order not assigned to you' });
        }

        // Validate status transition
        const validTransitions = {
            3: [6], // delivery_accepted -> ready (only when restaurant prepares food)
            6: [7], // ready -> on_the_way
            7: [8], // on_the_way -> delivered
        };

        if (!validTransitions[order.status] || !validTransitions[order.status].includes(status)) {
            return res.status(400).json({ 
                success: false, 
                message: `Invalid status transition from ${order.status} to ${status}` 
            });
        }

        // Update order status
        order.status = status;
        
        // Add timestamps based on status
        switch (status) {
            case 6: // ready (restaurant prepared the food)
                order.readyAt = new Date();
                break;
            case 7: // on_the_way
                order.onTheWayAt = new Date();
                break;
            case 8: // delivered
                order.deliveredAt = new Date();
                // Update delivery person statistics
                deliveryPerson.totalDeliveries = (deliveryPerson.totalDeliveries || 0) + 1;
                deliveryPerson.currentOrder = null;
                deliveryPerson.isAvailable = true;
                await deliveryPerson.save();
                break;
        }

        await order.save();

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
                2: 'طلبك قيد التحضير 👨‍🍳',
                3: 'تم قبول طلبك من المندوب 🚗',
                5: 'تم رفض طلبك ❌',
                6: 'طلبك جاهز للاستلام 🚀',
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

        res.json({ 
            success: true, 
            message: 'Order status updated successfully',
            order: order
        });
    } catch (error) {
        console.error('Error updating order status:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

module.exports = deliveryRouter; 