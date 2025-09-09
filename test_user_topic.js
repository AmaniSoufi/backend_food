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

// Test sending notification to user topic
const testUserTopic = async () => {
  try {
    console.log('🧪 Testing user topic notification...');
    
    if (!admin.apps.length) {
      console.log('❌ Firebase Admin SDK not initialized');
      return;
    }

    // Test message to user topic
    const message = {
      topic: 'user',
      notification: {
        title: 'Test User Notification',
        body: 'This is a test notification for all users',
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

    console.log('📤 Sending user topic message...');
    console.log('📤 Message:', JSON.stringify(message, null, 2));

    const response = await admin.messaging().send(message);
    console.log('✅ User topic notification sent successfully!');
    console.log('✅ Response:', response);
    
  } catch (error) {
    console.error('❌ Error sending user topic notification:', error);
    console.error('❌ Error details:', error.message);
  }
};

// Run the test
console.log('🚀 Starting user topic test...');
testUserTopic().then(() => {
  console.log('🏁 Test completed');
  process.exit(0);
}).catch((error) => {
  console.error('💥 Test failed:', error);
  process.exit(1);
}); 