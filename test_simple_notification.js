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

// Test simple notification
const testSimpleNotification = async () => {
  try {
    console.log('🧪 Testing simple notification...');
    
    if (!admin.apps.length) {
      console.log('❌ Firebase Admin SDK not initialized');
      return;
    }

    // Simple test message
    const message = {
      notification: {
        title: 'Test Notification',
        body: 'This is a simple test notification',
      },
      topic: 'user', // Send to all users
    };

    console.log('📤 Sending simple message...');
    console.log('📤 Message:', JSON.stringify(message, null, 2));

    const response = await admin.messaging().send(message);
    console.log('✅ Simple notification sent successfully!');
    console.log('✅ Response:', response);
    
  } catch (error) {
    console.error('❌ Error sending simple notification:', error);
    console.error('❌ Error details:', error.message);
  }
};

// Run the test
console.log('🚀 Starting simple notification test...');
testSimpleNotification().then(() => {
  console.log('🏁 Test completed');
  process.exit(0);
}).catch((error) => {
  console.error('💥 Test failed:', error);
  process.exit(1);
}); 