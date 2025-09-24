const express = require('express');
const auth = require('../middlewares/auth');
const User = require('../models/user');
const Order = require('../models/order');
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

// Helper function to send FCM notification message
async function sendFCMNotification(notification) {
  try {
    // Get FCM server key from environment variables or use your actual key
    const FCM_SERVER_KEY = process.env.FCM_SERVER_KEY || 'AIzaSyBcbF8aDwcydSevWFW7YxZRVspFI01iq64';
    
    const response = await fetch('https://fcm.googleapis.com/fcm/send', {
      method: 'POST',
      headers: {
        'Authorization': `key=${FCM_SERVER_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(notification),
    });

    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(`FCM Error: ${result.error}`);
    }

    return result;
  } catch (error) {
    console.error('❌ FCM Error:', error);
    throw error;
  }
}

// Auto-notification functions for different events

// Send notification when new order is placed
async function sendNewOrderNotification(orderId, restaurantId) {
  try {
    // Get restaurant admin
    const restaurant = await User.findOne({ 
      restaurant: restaurantId, 
      type: 'admin' 
    });

    if (restaurant && restaurant.fcmToken) {
      const notification = {
        token: restaurant.fcmToken,
        notification: {
          title: 'طلب جديد! 🍕',
          body: 'لديك طلب جديد ينتظر التأكيد',
        },
        data: {
          type: 'new_order',
          orderId: orderId,
          restaurantId: restaurantId,
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

    const statusMessages = {
      'confirmed': 'تم تأكيد طلبك! ✅',
      'preparing': 'طلبك قيد التحضير 👨‍🍳',
      'ready': 'طلبك جاهز! 🚀',
      'delivering': 'طلبك في الطريق إليك 🚗',
      'delivered': 'تم توصيل طلبك! 🎉',
      'cancelled': 'تم إلغاء طلبك ❌',
    };

    const notification = {
      token: user.fcmToken,
      notification: {
        title: 'تحديث حالة الطلب',
        body: statusMessages[status] || 'تم تحديث حالة طلبك',
      },
      data: {
        type: 'order_status_update',
        orderId: orderId,
        status: status,
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
              body: statusMessages[status] || 'تم تحديث حالة طلبك',
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

module.exports = {
  fcmRouter,
  sendNewOrderNotification,
  sendOrderStatusNotification,
  sendDeliveryAssignmentNotification,
  sendDeliveryBroadcastNotification,
}; 