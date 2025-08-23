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

// Test sending notification to admin topic
const testAdminTopic = async () => {
  try {
    console.log('🧪 Testing admin topic notification...');
    
    if (!admin.apps.length) {
      console.log('❌ Firebase Admin SDK not initialized');
      return;
    }

    // Test message to admin topic
    const message = {
      topic: 'admin',
      notification: {
        title: 'طلب جديد! 🍕',
        body: 'لديك طلب جديد ينتظر التأكيد',
      },
      data: {
        type: 'new_order',
        orderId: 'test_order_123',
        restaurantId: 'test_restaurant_456',
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

    console.log('📤 Sending admin topic message...');
    console.log('📤 Message:', JSON.stringify(message, null, 2));

    const response = await admin.messaging().send(message);
    console.log('✅ Admin topic notification sent successfully!');
    console.log('✅ Response:', response);
    
  } catch (error) {
    console.error('❌ Error sending admin topic notification:', error);
    console.error('❌ Error details:', error.message);
  }
};

// Run the test
console.log('🚀 Starting admin topic test...');
testAdminTopic().then(() => {
  console.log('🏁 Test completed');
  process.exit(0);
}).catch((error) => {
  console.error('💥 Test failed:', error);
  process.exit(1);
}); 