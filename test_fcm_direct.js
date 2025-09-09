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

// Test FCM notification directly
const testFCMDirect = async () => {
  try {
    console.log('🧪 Testing FCM notification directly...');
    
    if (!admin.apps.length) {
      console.log('❌ Firebase Admin SDK not initialized');
      return;
    }

    // Test message
    const message = {
      notification: {
        title: 'Test Notification 🧪',
        body: 'This is a direct test notification from the server!',
      },
      data: {
        type: 'test_notification',
        timestamp: new Date().toISOString(),
      },
      topic: 'user', // Send to all users subscribed to 'user' topic
    };

    console.log('📤 Sending test message...');
    console.log('📤 Message:', JSON.stringify(message, null, 2));

    const response = await admin.messaging().send(message);
    console.log('✅ Test notification sent successfully!');
    console.log('✅ Response:', response);
    
  } catch (error) {
    console.error('❌ Error sending test notification:', error);
    console.error('❌ Error details:', error.message);
  }
};

// Run the test
console.log('🚀 Starting direct FCM test...');
testFCMDirect().then(() => {
  console.log('🏁 Test completed');
  process.exit(0);
}).catch((error) => {
  console.error('💥 Test failed:', error);
  process.exit(1);
}); 