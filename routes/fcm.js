const express = require('express');
const auth = require('../middlewares/auth');
const User = require('../models/user');
const Order = require('../models/order');
const admin = require('firebase-admin');
const fcmRouter = express.Router();

// Save FCM token for user
fcmRouter.post('/api/save-fcm-token', auth, async (req, res) => {
  try {
    const { fcmToken, userType } = req.body;
    const userId = req.user;

    if (!fcmToken) {
      return res.status(400).json({ error: 'FCM token is required' });
    }

    // Update user with FCM token
    const user = await User.findByIdAndUpdate(
      userId,
      { 
        fcmToken: fcmToken,
        userType: userType || 'user'
      },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    console.log(`✅ FCM token saved for user: ${user.email}`);
    res.json({ message: 'FCM token saved successfully', user: user });
  } catch (error) {
    console.error('❌ Error saving FCM token:', error);
    res.status(500).json({ error: error.message });
  }
});

// Send notification message to specific user
fcmRouter.post('/api/send-notification', auth, async (req, res) => {
  try {
    const { userId, title, body, data, type } = req.body;
    const senderId = req.user;

    // Get user's FCM token
    const user = await User.findById(userId);
    if (!user || !user.fcmToken) {
      return res.status(404).json({ error: 'User not found or no FCM token' });
    }

    // Send notification message via FCM
    const notification = {
      token: user.fcmToken,
      notification: {
        title: title,
        body: body,
      },
      data: {
        type: type,
        ...data,
      },
      android: {
        priority: 'high',
        notification: {
          channelId: 'food_delivery_channel',
          priority: 'high',
          defaultSound: true,
          defaultVibrateTimings: true,
          icon: '@mipmap/ic_launcher',
        },
      },
      apns: {
        payload: {
          aps: {
            sound: 'default',
            badge: 1,
            alert: {
              title: title,
              body: body,
            },
          },
        },
      },
    };

    // Send via FCM
    const fcmResponse = await sendFCMNotification(notification);
    
    console.log(`✅ Notification message sent to user: ${user.email}`);
    res.json({ message: 'Notification sent successfully', fcmResponse });
  } catch (error) {
    console.error('❌ Error sending notification:', error);
    res.status(500).json({ error: error.message });
  }
});

// Send notification message to topic (all users of specific type)
fcmRouter.post('/api/send-topic-notification', auth, async (req, res) => {
  try {
    const { topic, title, body, data, type } = req.body;
    const senderId = req.user;

    if (!topic) {
      return res.status(400).json({ error: 'Topic is required' });
    }

    // Send notification message to topic via FCM
    const notification = {
      topic: topic,
      notification: {
        title: title,
        body: body,
      },
      data: {
        type: type,
        ...data,
      },
      android: {
        priority: 'high',
        notification: {
          channelId: 'food_delivery_channel',
          priority: 'high',
          defaultSound: true,
          defaultVibrateTimings: true,
          icon: '@mipmap/ic_launcher',
        },
      },
      apns: {
        payload: {
          aps: {
            sound: 'default',
            badge: 1,
            alert: {
              title: title,
              body: body,
            },
          },
        },
      },
    };

    // Send via FCM
    const fcmResponse = await sendFCMNotification(notification);
    
    console.log(`✅ Topic notification message sent to: ${topic}`);
    res.json({ message: 'Topic notification sent successfully', fcmResponse });
  } catch (error) {
    console.error('❌ Error sending topic notification:', error);
    res.status(500).json({ error: error.message });
  }
});

// Helper function to send FCM notification message (via Firebase Admin SDK)
async function sendFCMNotification(message) {
  try {
    if (!admin?.apps?.length) {
      throw new Error('Firebase Admin SDK is not initialized');
    }

    // Support token or topic messages
    const response = await admin.messaging().send(message);
    return { messageId: response };
  } catch (error) {
    console.error('❌ FCM Error:', error);
    throw error;
  }
}

// Auto-notification functions for different events

// Send notification when new order is placed
async function sendNewOrderNotification(orderId, restaurantId, orderDetails = {}) {
  try {
    // Get restaurant admin
    const restaurant = await User.findOne({ 
      restaurant: restaurantId, 
      type: 'admin' 
    });

    if (restaurant && restaurant.fcmToken) {
      // Get order details for rich notification
      const order = await Order.findById(orderId).lean();
      const totalAmount = order?.totalPrice?.toString() || orderDetails.totalAmount || '';
      const deliveryAddress = order?.address || orderDetails.deliveryAddress || '';
      const customerName = order?.userName || orderDetails.customerName || '';
      const customerPhone = order?.userPhone || orderDetails.customerPhone || '';

      const notification = {
        token: restaurant.fcmToken,
        notification: {
          title: 'طلب جديد! 🍕',
          body: `طلب جديد بقيمة ${totalAmount} دج من ${customerName}`,
        },
        data: {
          type: 'new_order',
          orderId: orderId,
          restaurantId: restaurantId,
          totalAmount: totalAmount,
          deliveryAddress: deliveryAddress,
          customerName: customerName,
          customerPhone: customerPhone,
        },
        android: {
          priority: 'high',
          notification: {
            channelId: 'food_delivery_channel',
            priority: 'high',
            defaultSound: true,
            defaultVibrateTimings: true,
            icon: '@mipmap/ic_launcher',
          },
        },
        apns: {
          payload: {
            aps: {
              sound: 'default',
              badge: 1,
              alert: {
                title: 'طلب جديد! 🍕',
                body: 'لديك طلب جديد ينتظر التأكيد',
              },
            },
          },
        },
      };

      await sendFCMNotification(notification);
      console.log(`✅ New order notification sent to restaurant: ${restaurant.email}`);
    }
  } catch (error) {
    console.error('❌ Error sending new order notification:', error);
  }
}

// Send notification when order status changes
async function sendOrderStatusNotification(orderId, userId, status) {
  try {
    const user = await User.findById(userId);
    if (!user || !user.fcmToken) return;

    // Enrich payload with order details
    const order = await Order.findById(orderId).lean();
    const totalAmount = order?.totalPrice?.toString?.() || '';
    const deliveryAddress = order?.address || '';

    // Normalize status to string for mapping
    const statusKey = String(status);

    const statusMessages = {
      // Numeric codes
      '1': 'تم تأكيد طلبك! ✅',
      '2': 'تم تعيين مندوب للطلب 🚗',
      '3': 'المندوب قبل طلبك 🚗',
      '5': 'تم رفض طلبك ❌',
      '6': 'المطعم يحضر طلبك الآن 👨‍🍳',
      '7': 'طلبك في الطريق إليك 🚚',
      '8': 'تم تسليم طلبك 🎉',
      '9': 'تم إلغاء طلبك ❌',
      // String states (fallbacks)
      'confirmed': 'تم تأكيد طلبك! ✅',
      'preparing': 'المطعم يحضر طلبك الآن 👨‍🍳',
      'ready': 'طلبك في الطريق إليك 🚚',
      'delivering': 'طلبك في الطريق إليك 🚚',
      'delivered': 'تم تسليم طلبك! 🎉',
      'cancelled': 'تم إلغاء طلبك ❌',
      'rejected': 'تم رفض طلبك ❌',
    };

    const notification = {
      token: user.fcmToken,
      notification: {
        title: 'تحديث حالة الطلب',
        body: statusMessages[statusKey] || 'تم تحديث حالة طلبك',
      },
      data: {
        type: 'order_status_update',
        orderId: orderId,
        status: statusKey,
        totalAmount: totalAmount,
        deliveryAddress: deliveryAddress,
      },
      android: {
        priority: 'high',
        notification: {
          channelId: 'food_delivery_channel',
          priority: 'high',
          defaultSound: true,
          defaultVibrateTimings: true,
          icon: '@mipmap/ic_launcher',
        },
      },
      apns: {
        payload: {
          aps: {
            sound: 'default',
            badge: 1,
            alert: {
              title: 'تحديث حالة الطلب',
              body: statusMessages[statusKey] || 'تم تحديث حالة طلبك',
            },
          },
        },
      },
    };

    await sendFCMNotification(notification);
    console.log(`✅ Order status notification sent to user: ${user.email}`);
  } catch (error) {
    console.error('❌ Error sending order status notification:', error);
  }
}

// Send notification to delivery person when order is assigned
async function sendDeliveryAssignmentNotification(orderId, deliveryId) {
  try {
    const delivery = await User.findById(deliveryId);
    if (!delivery || !delivery.fcmToken) return;

    const notification = {
      token: delivery.fcmToken,
      notification: {
        title: 'طلب توصيل جديد! 🚗',
        body: 'تم تعيين طلب جديد لك',
      },
      data: {
        type: 'delivery_assigned',
        orderId: orderId,
      },
      android: {
        priority: 'high',
        notification: {
          channelId: 'food_delivery_channel',
          priority: 'high',
          defaultSound: true,
          defaultVibrateTimings: true,
          icon: '@mipmap/ic_launcher',
        },
      },
      apns: {
        payload: {
          aps: {
            sound: 'default',
            badge: 1,
            alert: {
              title: 'طلب توصيل جديد! 🚗',
              body: 'تم تعيين طلب جديد لك',
            },
          },
        },
      },
    };

    await sendFCMNotification(notification);
    console.log(`✅ Delivery assignment notification sent to: ${delivery.email}`);
  } catch (error) {
    console.error('❌ Error sending delivery assignment notification:', error);
  }
}

// Send notification to all delivery persons
async function sendDeliveryBroadcastNotification(title, body, data = {}) {
  try {
    const notification = {
      topic: 'delivery_orders',
      notification: {
        title: title,
        body: body,
      },
      data: {
        type: 'delivery_broadcast',
        ...data,
      },
      android: {
        priority: 'high',
        notification: {
          channelId: 'food_delivery_channel',
          priority: 'high',
          defaultSound: true,
          defaultVibrateTimings: true,
          icon: '@mipmap/ic_launcher',
        },
      },
      apns: {
        payload: {
          aps: {
            sound: 'default',
            badge: 1,
            alert: {
              title: title,
              body: body,
            },
          },
        },
      },
    };

    await sendFCMNotification(notification);
    console.log('✅ Delivery broadcast notification sent');
  } catch (error) {
    console.error('❌ Error sending delivery broadcast notification:', error);
  }
}

// Send notification to superadmin when new registration request is made
async function sendNewRegistrationNotification(userId, userType, userName, userPhone) {
  try {
    // Find superadmin user
    const superadmin = await User.findOne({ type: 'superadmin' });
    
    if (!superadmin || !superadmin.fcmToken) {
      console.log('⚠️ Superadmin not found or no FCM token');
      return;
    }

    // Prepare notification content based on user type
    let title = '';
    let body = '';
    
    if (userType === 'admin') {
      title = 'طلب تسجيل مطعم جديد! 🏪';
      body = `مطعم جديد يطلب الانضمام: ${userName} (${userPhone})`;
    } else if (userType === 'delivery') {
      title = 'طلب تسجيل مندوب توصيل جديد! 🚗';
      body = `مندوب توصيل جديد يطلب الانضمام: ${userName} (${userPhone})`;
    } else {
      title = 'طلب تسجيل جديد! 👤';
      body = `مستخدم جديد يطلب الانضمام: ${userName} (${userPhone})`;
    }

    const notification = {
      token: superadmin.fcmToken,
      notification: {
        title: title,
        body: body,
      },
      data: {
        type: 'new_registration',
        userId: userId,
        userType: userType,
        userName: userName,
        userPhone: userPhone,
      },
      android: {
        priority: 'high',
        notification: {
          channelId: 'food_delivery_channel',
          priority: 'high',
          defaultSound: true,
          defaultVibrateTimings: true,
          icon: '@mipmap/ic_launcher',
        },
      },
      apns: {
        payload: {
          aps: {
            sound: 'default',
            badge: 1,
            alert: {
              title: title,
              body: body,
            },
          },
        },
      },
    };

    await sendFCMNotification(notification);
    console.log(`✅ New registration notification sent to superadmin for ${userType}: ${userName}`);
  } catch (error) {
    console.error('❌ Error sending new registration notification:', error);
  }
}

module.exports = {
  fcmRouter,
  sendNewOrderNotification,
  sendOrderStatusNotification,
  sendDeliveryAssignmentNotification,
  sendDeliveryBroadcastNotification,
  sendNewRegistrationNotification,
}; 