const mongoose = require('mongoose');
const User = require('./models/user');
const Order = require('./models/order');
const Notification = require('./models/notification');

// Connect to MongoDB
mongoose.connect("mongodb+srv://imene:04042004irir@cluster0.htrt15u.mongodb.net/myDatabase?retryWrites=true&w=majority")
  .then(() => {
    console.log("✅ Connected to MongoDB");
    startMonitoring();
  })
  .catch((e) => {
    console.log("❌ MongoDB connection failed:", e);
  });

let lastOrderCount = 0;
let lastNotificationCount = 0;

const startMonitoring = async () => {
  try {
    console.log('🔍 Starting real-time notification monitoring...\n');
    
    // Get initial counts
    const initialOrderCount = await Order.countDocuments();
    const initialNotificationCount = await Notification.countDocuments();
    lastOrderCount = initialOrderCount;
    lastNotificationCount = initialNotificationCount;
    
    console.log(`📊 Initial Status:`);
    console.log(`   Orders: ${initialOrderCount}`);
    console.log(`   Notifications: ${initialNotificationCount}`);
    console.log('');
    
    // Start monitoring loop
    setInterval(async () => {
      await checkForNewActivity();
    }, 2000); // Check every 2 seconds
    
    console.log('👀 Monitoring started... Waiting for activity...\n');
    console.log('📱 Test Instructions:');
    console.log('1. Login as customer in Emulator 1');
    console.log('2. Login as restaurant owner in Emulator 2');
    console.log('3. Place an order from customer');
    console.log('4. Watch for notifications here...\n');
    
  } catch (error) {
    console.error('❌ Error starting monitoring:', error);
  }
};

const checkForNewActivity = async () => {
  try {
    // Check for new orders
    const currentOrderCount = await Order.countDocuments();
    if (currentOrderCount > lastOrderCount) {
      const newOrders = await Order.find().sort({ createdAt: -1 }).limit(currentOrderCount - lastOrderCount);
      console.log('🆕 NEW ORDER DETECTED!');
      newOrders.forEach(order => {
        console.log(`   📦 Order ID: ${order._id}`);
        console.log(`   👤 Customer: ${order.userId}`);
        console.log(`   🏪 Restaurant: ${order.restaurantId}`);
        console.log(`   💰 Total: ${order.totalPrice}`);
        console.log(`   📍 Address: ${order.address}`);
        console.log(`   ⏰ Time: ${new Date(order.createdAt).toLocaleTimeString()}`);
        console.log('');
      });
      lastOrderCount = currentOrderCount;
    }
    
    // Check for new notifications
    const currentNotificationCount = await Notification.countDocuments();
    if (currentNotificationCount > lastNotificationCount) {
      const newNotifications = await Notification.find()
        .populate('recipientId', 'name email type')
        .sort({ createdAt: -1 })
        .limit(currentNotificationCount - lastNotificationCount);
      
      console.log('🔔 NEW NOTIFICATION DETECTED!');
      newNotifications.forEach(notification => {
        console.log(`   📨 ID: ${notification._id}`);
        console.log(`   👤 Recipient: ${notification.recipientId?.name} (${notification.recipientId?.email})`);
        console.log(`   🏷️ Type: ${notification.recipientId?.type}`);
        console.log(`   📋 Title: ${notification.title}`);
        console.log(`   💬 Message: ${notification.message}`);
        console.log(`   🔗 Order ID: ${notification.orderId || 'N/A'}`);
        console.log(`   ⏰ Time: ${new Date(notification.createdAt).toLocaleTimeString()}`);
        console.log('');
      });
      lastNotificationCount = currentNotificationCount;
    }
    
  } catch (error) {
    console.error('❌ Error checking activity:', error);
  }
};

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Monitoring stopped');
  mongoose.connection.close();
  process.exit(0);
});

// Show current FCM token status
const showFCMStatus = async () => {
  try {
    console.log('\n📊 Current FCM Token Status:');
    
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
    
    console.log(`   👨‍💼 Admin users with FCM token: ${adminWithToken}`);
    console.log(`   👤 Regular users with FCM token: ${userWithToken}`);
    console.log(`   🚗 Delivery users with FCM token: ${deliveryWithToken}`);
    console.log('');
    
    if (adminWithToken === 0) {
      console.log('⚠️  WARNING: No admin users have FCM tokens!');
      console.log('💡 Solution: Restaurant owner needs to login to the app');
    }
    if (userWithToken === 0) {
      console.log('⚠️  WARNING: No regular users have FCM tokens!');
      console.log('💡 Solution: Customer needs to login to the app');
    }
    
  } catch (error) {
    console.error('❌ Error showing FCM status:', error);
  }
};

// Show FCM status on startup
setTimeout(showFCMStatus, 1000); 