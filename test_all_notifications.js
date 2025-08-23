const mongoose = require('mongoose');
const User = require('./models/user');
const Order = require('./models/order');
const Product = require('./models/product');
const Restaurant = require('./models/restaurant');
const admin = require('firebase-admin');

// Initialize Firebase Admin SDK
let serviceAccount;
try {
  serviceAccount = require('./serviceAccountKey.json');
  console.log('✅ Firebase Admin SDK initialized from serviceAccountKey.json');
} catch (error) {
  console.log('❌ Firebase Admin SDK initialization failed');
  console.log('❌ Error:', error.message);
  process.exit(1);
}

if (serviceAccount) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: 'food-64e2d'
  });
  console.log('✅ Firebase Admin SDK initialized');
}

// Connect to MongoDB
mongoose.connect("mongodb+srv://imene:04042004irir@cluster0.htrt15u.mongodb.net/myDatabase?retryWrites=true&w=majority")
  .then(() => {
    console.log("✅ Connected to MongoDB");
    testAllNotifications();
  })
  .catch((e) => {
    console.log("❌ MongoDB connection failed:", e);
  });

const testAllNotifications = async () => {
  try {
    console.log('🧪 Testing all notification types...\n');
    
    // Find test users
    const adminUser = await User.findOne({ type: 'admin' });
    const regularUser = await User.findOne({ type: 'user' });
    const deliveryUser = await User.findOne({ type: 'delivery' });
    
    if (!adminUser || !regularUser || !deliveryUser) {
      console.log('❌ Missing test users');
      console.log(`Admin: ${adminUser ? '✅' : '❌'}`);
      console.log(`User: ${regularUser ? '✅' : '❌'}`);
      console.log(`Delivery: ${deliveryUser ? '✅' : '❌'}`);
      return;
    }
    
    console.log('✅ Found all test users:');
    console.log(`👨‍💼 Admin: ${adminUser.email} (FCM: ${adminUser.fcmToken ? '✅' : '❌'})`);
    console.log(`👤 User: ${regularUser.email} (FCM: ${regularUser.fcmToken ? '✅' : '❌'})`);
    console.log(`🚗 Delivery: ${deliveryUser.email} (FCM: ${deliveryUser.fcmToken ? '✅' : '❌'})`);
    
    // Test 1: New Order Notification (Admin)
    console.log('\n🔔 Test 1: New Order Notification (Admin)');
    await testNewOrderNotification(adminUser);
    
    // Test 2: Order Status Update Notification (User)
    console.log('\n🔔 Test 2: Order Status Update Notification (User)');
    await testOrderStatusNotification(regularUser);
    
    // Test 3: Delivery Assignment Notification (Delivery)
    console.log('\n🔔 Test 3: Delivery Assignment Notification (Delivery)');
    await testDeliveryAssignmentNotification(deliveryUser);
    
    // Test 4: Delivery Broadcast Notification
    console.log('\n🔔 Test 4: Delivery Broadcast Notification');
    await testDeliveryBroadcastNotification();
    
    console.log('\n✅ All notification tests completed!');
    
  } catch (error) {
    console.error('❌ Error in test:', error);
  } finally {
    mongoose.connection.close();
  }
};

// Test 1: New Order Notification
async function testNewOrderNotification(adminUser) {
  try {
    if (!adminUser.fcmToken) {
      console.log('❌ Admin user has no FCM token');
      return;
    }
    
    const message = {
      token: adminUser.fcmToken,
      notification: {
        title: 'طلب جديد! 🍕',
        body: 'لديك طلب جديد ينتظر التأكيد',
      },
      data: {
        type: 'new_order',
        orderId: 'test_order_123',
        restaurantId: adminUser.restaurant?.toString() || 'test_restaurant',
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
    console.log(`✅ New order notification sent to admin: ${adminUser.email}`);
    console.log(`✅ FCM Response: ${response}`);
    
  } catch (error) {
    console.error('❌ Error sending new order notification:', error);
  }
}

// Test 2: Order Status Update Notification
async function testOrderStatusNotification(user) {
  try {
    if (!user.fcmToken) {
      console.log('❌ User has no FCM token');
      return;
    }
    
    const statusMessages = {
      'confirmed': 'تم تأكيد طلبك! ✅',
      'preparing': 'طلبك قيد التحضير 👨‍🍳',
      'ready': 'طلبك جاهز! 🚀',
      'delivering': 'طلبك في الطريق إليك 🚗',
      'delivered': 'تم توصيل طلبك! 🎉',
    };
    
    // Test different status updates
    for (const [status, message] of Object.entries(statusMessages)) {
      const notificationMessage = {
        token: user.fcmToken,
        notification: {
          title: 'تحديث حالة الطلب',
          body: message,
        },
        data: {
          type: 'order_status_update',
          orderId: 'test_order_123',
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
      };
      
      const response = await admin.messaging().send(notificationMessage);
      console.log(`✅ Status update notification sent (${status}): ${message}`);
      console.log(`✅ FCM Response: ${response}`);
      
      // Wait 2 seconds between notifications
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
  } catch (error) {
    console.error('❌ Error sending status update notification:', error);
  }
}

// Test 3: Delivery Assignment Notification
async function testDeliveryAssignmentNotification(deliveryUser) {
  try {
    if (!deliveryUser.fcmToken) {
      console.log('❌ Delivery user has no FCM token');
      return;
    }
    
    const message = {
      token: deliveryUser.fcmToken,
      notification: {
        title: 'طلب توصيل جديد! 🚗',
        body: 'تم تعيين طلب جديد لك',
      },
      data: {
        type: 'delivery_assigned',
        orderId: 'test_order_123',
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
    console.log(`✅ Delivery assignment notification sent to: ${deliveryUser.email}`);
    console.log(`✅ FCM Response: ${response}`);
    
  } catch (error) {
    console.error('❌ Error sending delivery assignment notification:', error);
  }
}

// Test 4: Delivery Broadcast Notification
async function testDeliveryBroadcastNotification() {
  try {
    const message = {
      topic: 'delivery_orders',
      notification: {
        title: 'إشعار عام للمندوبين 📢',
        body: 'هناك طلبات جديدة متاحة للتوصيل',
      },
      data: {
        type: 'delivery_broadcast',
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
    console.log('✅ Delivery broadcast notification sent to topic: delivery_orders');
    console.log(`✅ FCM Response: ${response}`);
    
  } catch (error) {
    console.error('❌ Error sending delivery broadcast notification:', error);
  }
}

// Test FCM token status
async function checkFCMTokens() {
  try {
    console.log('\n🔍 Checking FCM token status...');
    
    const users = await User.find({});
    let adminWithToken = 0;
    let userWithToken = 0;
    let deliveryWithToken = 0;
    
    users.forEach(user => {
      if (user.fcmToken) {
        switch (user.type) {
          case 'admin':
            adminWithToken++;
            break;
          case 'user':
            userWithToken++;
            break;
          case 'delivery':
            deliveryWithToken++;
            break;
        }
      }
    });
    
    console.log(`📊 FCM Token Summary:`);
    console.log(`👨‍💼 Admin users with FCM token: ${adminWithToken}`);
    console.log(`👤 Regular users with FCM token: ${userWithToken}`);
    console.log(`🚗 Delivery users with FCM token: ${deliveryWithToken}`);
    
    if (adminWithToken === 0) {
      console.log('⚠️  WARNING: No admin users have FCM tokens!');
    }
    if (userWithToken === 0) {
      console.log('⚠️  WARNING: No regular users have FCM tokens!');
    }
    if (deliveryWithToken === 0) {
      console.log('⚠️  WARNING: No delivery users have FCM tokens!');
    }
    
  } catch (error) {
    console.error('❌ Error checking FCM tokens:', error);
  }
}

// Run FCM token check first
checkFCMTokens().then(() => {
  console.log('\n' + '='.repeat(50));
  console.log('🚀 Starting notification tests...');
}); 