const mongoose = require('mongoose');
const User = require('./models/user');
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
    testExistingUsers();
  })
  .catch((e) => {
    console.log("❌ MongoDB connection failed:", e);
  });

const testExistingUsers = async () => {
  try {
    console.log('🧪 Testing notifications with existing users...\n');
    
    // Find users with FCM tokens
    const usersWithTokens = await User.find({ fcmToken: { $exists: true, $ne: null } });
    
    console.log(`📊 Found ${usersWithTokens.length} users with FCM tokens:\n`);
    
    usersWithTokens.forEach((user, index) => {
      console.log(`${index + 1}. ${user.name} (${user.email})`);
      console.log(`   Type: ${user.type}`);
      console.log(`   FCM Token: ${user.fcmToken.substring(0, 30)}...`);
      console.log('');
    });
    
    if (usersWithTokens.length === 0) {
      console.log('❌ No users with FCM tokens found!');
      console.log('💡 Solution: Users need to log in to the app to save their FCM tokens.');
      return;
    }
    
    // Test notifications for each user
    for (const user of usersWithTokens) {
      console.log(`🔔 Testing notifications for: ${user.name} (${user.email})`);
      
      // Test based on user type
      switch (user.type) {
        case 'admin':
          await testAdminNotifications(user);
          break;
        case 'user':
          await testUserNotifications(user);
          break;
        case 'delivery':
          await testDeliveryNotifications(user);
          break;
      }
      
      console.log('');
      // Wait 3 seconds between users
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
    
    console.log('✅ All tests completed!');
    
  } catch (error) {
    console.error('❌ Error in test:', error);
  } finally {
    mongoose.connection.close();
  }
};

// Test admin notifications
async function testAdminNotifications(adminUser) {
  try {
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
    console.log(`✅ Admin notification sent: ${response}`);
    
  } catch (error) {
    console.error('❌ Error sending admin notification:', error);
  }
}

// Test user notifications
async function testUserNotifications(user) {
  try {
    const statusMessages = {
      'confirmed': 'تم تأكيد طلبك! ✅',
      'preparing': 'طلبك قيد التحضير 👨‍🍳',
      'ready': 'طلبك جاهز! 🚀',
    };
    
    // Send one test notification
    const message = {
      token: user.fcmToken,
      notification: {
        title: 'تحديث حالة الطلب',
        body: 'طلبك قيد التحضير 👨‍🍳',
      },
      data: {
        type: 'order_status_update',
        orderId: 'test_order_123',
        status: 'preparing',
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
    console.log(`✅ User notification sent: ${response}`);
    
  } catch (error) {
    console.error('❌ Error sending user notification:', error);
  }
}

// Test delivery notifications
async function testDeliveryNotifications(deliveryUser) {
  try {
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
    console.log(`✅ Delivery notification sent: ${response}`);
    
  } catch (error) {
    console.error('❌ Error sending delivery notification:', error);
  }
} 