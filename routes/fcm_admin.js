const express = require('express');
const auth = require('../middlewares/auth');
const User = require('../models/user');
const Order = require('../models/order');
const admin = require('firebase-admin');
const fcmAdminRouter = express.Router();

// Initialize Firebase Admin SDK
// Try to load from environment variables first, then from file
let serviceAccount;
let firebaseInitialized = false;

try {
  // Try to load from environment variables (for production)
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    console.log('✅ Firebase Admin SDK initialized from environment variables');
    firebaseInitialized = true;
  } else {
    // Try to load from file (for development)
    try {
      serviceAccount = require('../serviceAccountKey.json');
      console.log('✅ Firebase Admin SDK initialized from serviceAccountKey.json');
      firebaseInitialized = true;
    } catch (fileError) {
      console.log('⚠️ serviceAccountKey.json not found, trying alternative paths...');
      
      // Try alternative paths for Render
      const path = require('path');
      const fs = require('fs');
      
      const possiblePaths = [
        path.join(__dirname, '../serviceAccountKey.json'),
        path.join(__dirname, '../../serviceAccountKey.json'),
        path.join(process.cwd(), 'serviceAccountKey.json'),
        path.join(process.cwd(), 'server/serviceAccountKey.json'),
      ];
      
      for (const filePath of possiblePaths) {
        try {
          if (fs.existsSync(filePath)) {
            serviceAccount = JSON.parse(fs.readFileSync(filePath, 'utf8'));
            console.log(`✅ Firebase Admin SDK initialized from: ${filePath}`);
            firebaseInitialized = true;
            break;
          }
        } catch (pathError) {
          console.log(`⚠️ Could not load from: ${filePath}`);
        }
      }
    }
  }
} catch (error) {
  console.log('❌ Firebase Admin SDK initialization failed');
  console.log('📝 Error details:', error.message);
  console.log('📝 Please set FIREBASE_SERVICE_ACCOUNT environment variable in Render');
  console.log('📝 Or place serviceAccountKey.json in: server/serviceAccountKey.json');
  console.log('📝 Current working directory:', process.cwd());
  console.log('📝 Available files in current directory:', require('fs').readdirSync(process.cwd()));
}

if (serviceAccount && firebaseInitialized) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: 'food-64e2d'
    });
    console.log('✅ Firebase Admin SDK initialized successfully');
    console.log('✅ Project ID: food-64e2d');
    console.log('✅ Service Account Email:', serviceAccount.client_email);
  } catch (initError) {
    console.log('❌ Firebase Admin SDK initialization failed:', initError.message);
    firebaseInitialized = false;
  }
} else {
  console.log('❌ Firebase Admin SDK not initialized - no service account found');
  console.log('📝 Firebase notifications will not work until this is fixed');
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
    if (!firebaseInitialized || !admin.apps.length) {
      console.log('❌ Firebase Admin SDK not initialized - cannot send notification');
      return res.status(500).json({ 
        error: 'Firebase Admin SDK not initialized',
        details: 'Please check Firebase configuration'
      });
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
    if (!firebaseInitialized || !admin.apps.length) {
      console.log('❌ Firebase Admin SDK not initialized - cannot send topic notification');
      return res.status(500).json({ 
        error: 'Firebase Admin SDK not initialized',
        details: 'Please check Firebase configuration'
      });
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
    console.log('🔔 SENDING NEW ORDER NOTIFICATION...');
    console.log('🔔 Order ID:', orderId);
    console.log('🔔 Restaurant ID:', restaurantId);
    
    // Check if Firebase is initialized
    if (!firebaseInitialized) {
      console.log('❌ Firebase Admin SDK not initialized - cannot send new order notification');
      console.log('🔧 Attempting to initialize Firebase Admin SDK...');
      
      // Try to initialize Firebase Admin SDK
      try {
        if (process.env.FIREBASE_SERVICE_ACCOUNT) {
          const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
          admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
            projectId: 'food-64e2d'
          });
          firebaseInitialized = true;
          console.log('✅ Firebase Admin SDK initialized from environment variables');
        } else {
          console.log('❌ No Firebase service account found in environment variables');
          return;
        }
      } catch (initError) {
        console.log('❌ Failed to initialize Firebase Admin SDK:', initError.message);
        return;
      }
    }

    // Get all restaurant admins (not just one)
    const restaurantAdmins = await User.find({ 
      restaurant: restaurantId, 
      type: 'admin' 
    });

    console.log('🔔 Found restaurant admins:', restaurantAdmins.length);
    restaurantAdmins.forEach((admin, index) => {
      console.log(`🔔 Admin ${index + 1}: ${admin.email} - FCM Token: ${admin.fcmToken ? 'YES' : 'NO'}`);
    });

    // Send notification to all admins who have FCM tokens
    for (const restaurant of restaurantAdmins) {
      if (restaurant && restaurant.fcmToken) {
      // Use FCM Server Key if available, otherwise use Admin SDK
      const FCM_SERVER_KEY = process.env.FCM_SERVER_KEY;
      
      if (FCM_SERVER_KEY) {
        console.log('🔔 Using FCM Server Key method...');
        await sendNotificationWithServerKey(
          restaurant.fcmToken,
          'طلب جديد! 🍕',
          'لديك طلب جديد ينتظر التأكيد',
          {
            type: 'new_order',
            orderId: orderId,
            restaurantId: restaurantId,
          }
        );
      } else if (admin.apps.length) {
        console.log('🔔 Using Firebase Admin SDK...');
        // Send to specific user token
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

        try {
          const response = await admin.messaging().send(message);
          console.log(`✅ New order notification sent to restaurant: ${restaurant.email}`);
          console.log(`✅ FCM Response: ${response}`);
        } catch (err) {
          console.error('❌ Error sending new order notification:', err);
          // If token is invalid/unregistered, clear it so app will re-register next launch
          const code = (err && err.errorInfo && err.errorInfo.code) || err.code;
          const message = (err && err.message) || '';
          if (code === 'messaging/registration-token-not-registered' || message.includes('Requested entity was not found')) {
            try {
              await User.updateOne({ _id: restaurant._id }, { $unset: { fcmToken: '' } });
              console.log(`🗑️ Cleared invalid FCM token for user ${restaurant.email}`);
            } catch (clearErr) {
              console.error('❌ Failed clearing invalid FCM token:', clearErr);
            }
          }
        }
      } else {
        console.log('❌ No FCM_SERVER_KEY and Firebase Admin SDK not initialized');
      }
      } else {
        console.log(`❌ Restaurant admin ${restaurant.email} has no FCM token`);
      }
    }
    
    if (restaurantAdmins.length === 0) {
      console.log('❌ No restaurant admins found for this restaurant');
    }
  } catch (error) {
    console.error('❌ Error sending new order notification:', error);
    console.error('❌ Error details:', error.message);
  }
}

// Send notification using FCM Server Key
async function sendNotificationWithServerKey(fcmToken, title, body, data) {
  try {
    const FCM_SERVER_KEY = process.env.FCM_SERVER_KEY;
    
    if (!FCM_SERVER_KEY) {
      console.log('❌ FCM_SERVER_KEY not found in environment variables');
      return;
    }

    console.log('🔔 Sending notification with FCM Server Key...');
    console.log('🔔 FCM Token:', fcmToken);
    console.log('🔔 Title:', title);
    console.log('🔔 Body:', body);

    const response = await fetch('https://fcm.googleapis.com/fcm/send', {
      method: 'POST',
      headers: {
        'Authorization': `key=${FCM_SERVER_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: fcmToken,
        notification: {
          title: title,
          body: body,
        },
        data: data,
        priority: 'high',
      }),
    });

    const result = await response.json();
    console.log('✅ FCM notification sent successfully:', result);
    return result;
  } catch (error) {
    console.error('❌ Error sending FCM notification with Server Key:', error);
    throw error;
  }
}

// Send notification when order status changes
async function sendOrderStatusNotification(orderId, userId, status) {
  try {
    if (!firebaseInitialized || !admin.apps.length) {
      console.log('❌ Firebase Admin SDK not initialized - cannot send order status notification');
      return;
    }

    const user = await User.findById(userId);
    if (!user || !user.fcmToken) return;

    const statusMessages = {
      '1': 'تم تأكيد طلبك! ✅',
      '2': 'تم تعيين مندوب للطلب 🚗',
      '3': 'المندوب قبل طلبك 🚗',
      '4': 'المندوب رفض طلبك ❌',
      '5': 'المطعم يحضر طلبك الآن 👨‍🍳',
      '6': 'طلبك في الطريق إليك 🚚',
      '7': 'طلبك في الطريق إليك 🚚',
      '8': 'تم تسليم طلبك! 🎉',
      '9': 'تم إلغاء طلبك ❌',
      // String fallbacks
      'confirmed': 'تم تأكيد طلبك! ✅',
      'preparing': 'المطعم يحضر طلبك الآن 👨‍🍳',
      'ready': 'طلبك في الطريق إليك 🚚',
      'delivering': 'طلبك في الطريق إليك 🚚',
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
    if (!firebaseInitialized || !admin.apps.length) {
      console.log('❌ Firebase Admin SDK not initialized - cannot send delivery assignment notification');
      return;
    }

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
    if (!firebaseInitialized || !admin.apps.length) {
      console.log('❌ Firebase Admin SDK not initialized - cannot send delivery broadcast notification');
      return;
    }

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

// Send notification to restaurant when delivery person accepts order
async function sendDeliveryAcceptedNotificationToRestaurant(orderId, deliveryId) {
  try {
    console.log('🔔 SENDING DELIVERY ACCEPTED NOTIFICATION TO RESTAURANT...');
    console.log('🔔 Order ID:', orderId);
    console.log('🔔 Delivery ID:', deliveryId);
    
    if (!firebaseInitialized || !admin.apps.length) {
      console.log('❌ Firebase Admin SDK not initialized - cannot send notification');
      return;
    }

    // Get order details
    const order = await Order.findById(orderId);
    if (!order) {
      console.log('❌ Order not found');
      return;
    }
    console.log('🔔 Order found:', order.orderId, 'Restaurant ID:', order.restaurantId);

    // Get delivery person details
    const delivery = await User.findById(deliveryId);
    if (!delivery) {
      console.log('❌ Delivery person not found');
      return;
    }
    console.log('🔔 Delivery person found:', delivery.name, delivery.email);

    // Get restaurant admin
    const restaurant = await User.findOne({ 
      restaurant: order.restaurantId, 
      type: 'admin' 
    });

    if (!restaurant || !restaurant.fcmToken) {
      console.log('❌ Restaurant admin or FCM token not found');
      console.log('🔔 Restaurant found:', restaurant ? 'YES' : 'NO');
      console.log('🔔 FCM Token:', restaurant ? (restaurant.fcmToken ? 'YES' : 'NO') : 'N/A');
      return;
    }
    console.log('🔔 Restaurant admin found:', restaurant.email, 'FCM Token:', restaurant.fcmToken ? 'YES' : 'NO');

    const message = {
      token: restaurant.fcmToken,
      notification: {
        title: 'المندوب قبل الطلب! ✅',
        body: `المندوب ${delivery.name} قبل طلب التوصيل`,
      },
      data: {
        type: 'delivery_accepted',
        orderId: orderId,
        deliveryId: deliveryId,
        deliveryName: delivery.name,
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
              title: 'المندوب قبل الطلب! ✅',
              body: `المندوب ${delivery.name} قبل طلب التوصيل`,
            },
          },
        },
      },
    };

    await admin.messaging().send(message);
    console.log(`✅ Delivery accepted notification sent to restaurant: ${restaurant.email}`);
  } catch (error) {
    console.error('❌ Error sending delivery accepted notification to restaurant:', error);
  }
}

// Send notification to restaurant when delivery person rejects order
async function sendDeliveryRejectedNotificationToRestaurant(orderId, deliveryId, reason) {
  try {
    console.log('🔔 SENDING DELIVERY REJECTED NOTIFICATION TO RESTAURANT...');
    console.log('🔔 Order ID:', orderId);
    console.log('🔔 Delivery ID:', deliveryId);
    console.log('🔔 Reason:', reason);
    
    if (!firebaseInitialized || !admin.apps.length) {
      console.log('❌ Firebase Admin SDK not initialized - cannot send notification');
      return;
    }

    // Get order details
    const order = await Order.findById(orderId);
    if (!order) {
      console.log('❌ Order not found');
      return;
    }
    console.log('🔔 Order found:', order.orderId, 'Restaurant ID:', order.restaurantId);

    // Get delivery person details
    const delivery = await User.findById(deliveryId);
    if (!delivery) {
      console.log('❌ Delivery person not found');
      return;
    }
    console.log('🔔 Delivery person found:', delivery.name, delivery.email);

    // Get restaurant admin
    const restaurant = await User.findOne({ 
      restaurant: order.restaurantId, 
      type: 'admin' 
    });

    if (!restaurant || !restaurant.fcmToken) {
      console.log('❌ Restaurant admin or FCM token not found');
      console.log('🔔 Restaurant found:', restaurant ? 'YES' : 'NO');
      console.log('🔔 FCM Token:', restaurant ? (restaurant.fcmToken ? 'YES' : 'NO') : 'N/A');
      return;
    }
    console.log('🔔 Restaurant admin found:', restaurant.email, 'FCM Token:', restaurant.fcmToken ? 'YES' : 'NO');

    const message = {
      token: restaurant.fcmToken,
      notification: {
        title: 'المندوب رفض الطلب! ❌',
        body: `المندوب ${delivery.name} رفض طلب التوصيل${reason ? ` - السبب: ${reason}` : ''}`,
      },
      data: {
        type: 'delivery_rejected',
        orderId: orderId,
        deliveryId: deliveryId,
        deliveryName: delivery.name,
        reason: reason || '',
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
              title: 'المندوب رفض الطلب! ❌',
              body: `المندوب ${delivery.name} رفض طلب التوصيل${reason ? ` - السبب: ${reason}` : ''}`,
            },
          },
        },
      },
    };

    await admin.messaging().send(message);
    console.log(`✅ Delivery rejected notification sent to restaurant: ${restaurant.email}`);
  } catch (error) {
    console.error('❌ Error sending delivery rejected notification to restaurant:', error);
  }
}

// Send notification to restaurant when driver is assigned
async function sendDriverAssignedNotificationToRestaurant(orderId, deliveryId) {
  try {
    console.log('🔔 SENDING DRIVER ASSIGNED NOTIFICATION TO RESTAURANT...');
    console.log('🔔 Order ID:', orderId);
    console.log('🔔 Delivery ID:', deliveryId);
    
    if (!firebaseInitialized || !admin.apps.length) {
      console.log('❌ Firebase Admin SDK not initialized - cannot send notification');
      return;
    }

    // Get order details
    const order = await Order.findById(orderId);
    if (!order) {
      console.log('❌ Order not found');
      return;
    }
    console.log('🔔 Order found:', order.orderId, 'Restaurant ID:', order.restaurantId);

    // Get delivery person details
    const delivery = await User.findById(deliveryId);
    if (!delivery) {
      console.log('❌ Delivery person not found');
      return;
    }
    console.log('🔔 Delivery person found:', delivery.name, delivery.email);

    // Get restaurant admin
    const restaurant = await User.findOne({ 
      restaurant: order.restaurantId, 
      type: 'admin' 
    });

    if (!restaurant || !restaurant.fcmToken) {
      console.log('❌ Restaurant admin or FCM token not found');
      console.log('🔔 Restaurant found:', restaurant ? 'YES' : 'NO');
      console.log('🔔 FCM Token:', restaurant ? (restaurant.fcmToken ? 'YES' : 'NO') : 'N/A');
      return;
    }
    console.log('🔔 Restaurant admin found:', restaurant.email, 'FCM Token:', restaurant.fcmToken ? 'YES' : 'NO');

    const message = {
      token: restaurant.fcmToken,
      notification: {
        title: 'تم تعيين المندوب! 🚗',
        body: `تم تعيين المندوب ${delivery.name} للطلب بنجاح`,
      },
      data: {
        type: 'driver_assigned',
        orderId: orderId,
        deliveryId: deliveryId,
        deliveryName: delivery.name,
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
              title: 'تم تعيين المندوب! 🚗',
              body: `تم تعيين المندوب ${delivery.name} للطلب بنجاح`,
            },
          },
        },
      },
    };

    await admin.messaging().send(message);
    console.log(`✅ Driver assigned notification sent to restaurant: ${restaurant.email}`);
  } catch (error) {
    console.error('❌ Error sending driver assigned notification to restaurant:', error);
  }
}

module.exports = { 
  fcmAdminRouter,
  sendNewOrderNotification,
  sendOrderStatusNotification,
  sendDeliveryAssignmentNotification,
  sendDeliveryBroadcastNotification,
  sendDeliveryAcceptedNotificationToRestaurant,
  sendDeliveryRejectedNotificationToRestaurant,
  sendDriverAssignedNotificationToRestaurant,
};