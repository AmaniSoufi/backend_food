const express = require('express');
const auth = require('../middlewares/auth');
const User = require('../models/user');
const admin = require('firebase-admin');
const fcmAdminRouter = express.Router();

// Initialize Firebase Admin SDK
// Try to load from environment variables first, then from file
let serviceAccount;
try {
  // Try to load from environment variables (for production)
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    console.log('✅ Firebase Admin SDK initialized from environment variables');
  } else {
    // Try to load from file (for development)
    serviceAccount = require('../serviceAccountKey.json');
    console.log('✅ Firebase Admin SDK initialized from serviceAccountKey.json');
  }
} catch (error) {
  console.log('❌ Firebase Admin SDK initialization failed');
  console.log('📝 Please set FIREBASE_SERVICE_ACCOUNT environment variable in Render');
  console.log('📝 Or place serviceAccountKey.json in: server/serviceAccountKey.json');
}

if (serviceAccount) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: 'food-64e2d'
  });
  console.log('✅ Firebase Admin SDK initialized');
}

// Save FCM token for user
fcmAdminRouter.post('/api/save-fcm-token', auth, async (req, res) => {
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

// Send notification using Admin SDK
fcmAdminRouter.post('/api/send-notification', auth, async (req, res) => {
  try {
    if (!admin.apps.length) {
      return res.status(500).json({ error: 'Firebase Admin SDK not initialized' });
    }

    const { userId, title, body, data, type } = req.body;
    const senderId = req.user;

    // Get user's FCM token
    const user = await User.findById(userId);
    if (!user || !user.fcmToken) {
      return res.status(404).json({ error: 'User not found or no FCM token' });
    }

    // Send notification using Admin SDK
    const message = {
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

    const response = await admin.messaging().send(message);
    
    console.log(`✅ Notification sent to user: ${user.email}`);
    res.json({ message: 'Notification sent successfully', response });
  } catch (error) {
    console.error('❌ Error sending notification:', error);
    res.status(500).json({ error: error.message });
  }
});

// Send notification to topic
fcmAdminRouter.post('/api/send-topic-notification', auth, async (req, res) => {
  try {
    if (!admin.apps.length) {
      return res.status(500).json({ error: 'Firebase Admin SDK not initialized' });
    }

    const { topic, title, body, data, type } = req.body;
    const senderId = req.user;

    if (!topic) {
      return res.status(400).json({ error: 'Topic is required' });
    }

    const message = {
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

    const response = await admin.messaging().send(message);
    
    console.log(`✅ Topic notification sent to: ${topic}`);
    res.json({ message: 'Topic notification sent successfully', response });
  } catch (error) {
    console.error('❌ Error sending topic notification:', error);
    res.status(500).json({ error: error.message });
  }
});

// Auto-notification functions for different events

// Send notification when new order is placed
async function sendNewOrderNotification(orderId, restaurantId) {
  try {
    if (!admin.apps.length) return;

    console.log('🔔 SENDING NEW ORDER NOTIFICATION...');
    console.log('🔔 Order ID:', orderId);
    console.log('🔔 Restaurant ID:', restaurantId);

    // Get restaurant admin
    const restaurant = await User.findOne({ 
      restaurant: restaurantId, 
      type: 'admin' 
    });

    console.log('🔔 Found restaurant admin:', restaurant ? restaurant.email : 'NOT FOUND');
    console.log('🔔 FCM Token exists:', restaurant?.fcmToken ? 'YES' : 'NO');

    if (restaurant && restaurant.fcmToken) {
      const message = {
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

      const response = await admin.messaging().send(message);
      console.log(`✅ New order notification sent to restaurant: ${restaurant.email}`);
      console.log(`✅ FCM Response: ${response}`);
    } else {
      console.log('❌ Restaurant admin not found or no FCM token');
    }
  } catch (error) {
    console.error('❌ Error sending new order notification:', error);
    console.error('❌ Error details:', error.message);
  }
}

// Send notification when order status changes
async function sendOrderStatusNotification(orderId, userId, status) {
  try {
    if (!admin.apps.length) return;

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

    const message = {
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

    await admin.messaging().send(message);
    console.log(`✅ Order status notification sent to user: ${user.email}`);
  } catch (error) {
    console.error('❌ Error sending order status notification:', error);
  }
}

// Send notification to delivery person when order is assigned
async function sendDeliveryAssignmentNotification(orderId, deliveryId) {
  try {
    if (!admin.apps.length) return;

    const delivery = await User.findById(deliveryId);
    if (!delivery || !delivery.fcmToken) return;

    const message = {
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

    await admin.messaging().send(message);
    console.log(`✅ Delivery assignment notification sent to: ${delivery.email}`);
  } catch (error) {
    console.error('❌ Error sending delivery assignment notification:', error);
  }
}

// Send notification to all delivery persons
async function sendDeliveryBroadcastNotification(title, body, data = {}) {
  try {
    if (!admin.apps.length) return;

    const message = {
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

    await admin.messaging().send(message);
    console.log('✅ Delivery broadcast notification sent');
  } catch (error) {
    console.error('❌ Error sending delivery broadcast notification:', error);
  }
}

// Test notification route
fcmAdminRouter.post('/api/test-notification', async (req, res) => {
  try {
    console.log('🧪 Testing FCM notification...');
    
    if (!admin.apps.length) {
      console.log('❌ Firebase Admin SDK not initialized');
      return res.status(500).json({ error: 'Firebase Admin SDK not initialized' });
    }

    // Get all admin users with FCM tokens
    const adminUsers = await User.find({ 
      type: 'admin',
      fcmToken: { $exists: true, $ne: null }
    });

    console.log(`🧪 Found ${adminUsers.length} admin users with FCM tokens`);

    if (adminUsers.length === 0) {
      return res.status(404).json({ error: 'No admin users with FCM tokens found' });
    }

    const results = [];
    
    for (const adminUser of adminUsers) {
      try {
        const message = {
          token: adminUser.fcmToken,
          notification: {
            title: 'Test Notification 🧪',
            body: 'This is a test notification from the server!',
          },
          data: {
            type: 'test_notification',
            timestamp: new Date().toISOString(),
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
        };

        const response = await admin.messaging().send(message);
        console.log(`✅ Test notification sent to: ${adminUser.email}`);
        results.push({
          user: adminUser.email,
          success: true,
          response: response
        });
      } catch (error) {
        console.error(`❌ Error sending to ${adminUser.email}:`, error.message);
        results.push({
          user: adminUser.email,
          success: false,
          error: error.message
        });
      }
    }

    res.json({
      message: 'Test notification completed',
      results: results
    });

  } catch (error) {
    console.error('❌ Error in test notification:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = { 
  fcmAdminRouter,
  sendNewOrderNotification,
  sendOrderStatusNotification,
  sendDeliveryAssignmentNotification,
  sendDeliveryBroadcastNotification,
}; 