const mongoose = require('mongoose');
const User = require('./models/user');
const { sendNewOrderNotification } = require('./routes/fcm_admin');

// Connect to MongoDB
mongoose.connect("mongodb+srv://imene:04042004irir@cluster0.htrt15u.mongodb.net/myDatabase?retryWrites=true&w=majority")
  .then(() => {
    console.log("✅ Connected to MongoDB");
    testNotificationFix();
  })
  .catch((e) => {
    console.log("❌ MongoDB connection failed:", e);
  });

const testNotificationFix = async () => {
  try {
    console.log('🧪 Testing notification fix...\n');
    
    // 1. Check FCM tokens for admin users
    console.log('📊 Checking FCM tokens for admin users...');
    const adminUsers = await User.find({ type: 'admin' });
    
    console.log(`👨‍💼 Total admin users: ${adminUsers.length}`);
    
    let adminsWithTokens = 0;
    let adminsWithoutTokens = 0;
    
    adminUsers.forEach((admin, index) => {
      const hasToken = admin.fcmToken && admin.fcmToken.length > 0;
      if (hasToken) {
        adminsWithTokens++;
        console.log(`✅ Admin ${index + 1}: ${admin.email} - HAS FCM TOKEN`);
      } else {
        adminsWithoutTokens++;
        console.log(`❌ Admin ${index + 1}: ${admin.email} - NO FCM TOKEN`);
      }
    });
    
    console.log(`\n📈 Summary:`);
    console.log(`✅ Admins with FCM tokens: ${adminsWithTokens}`);
    console.log(`❌ Admins without FCM tokens: ${adminsWithoutTokens}`);
    
    if (adminsWithTokens === 0) {
      console.log('\n⚠️  WARNING: No admin users have FCM tokens!');
      console.log('⚠️  This means notifications will not work.');
      console.log('⚠️  Solution: Admin users need to log in to the app to save FCM tokens.');
      return;
    }
    
    // 2. Test notification with first admin who has FCM token
    const adminWithToken = adminUsers.find(admin => admin.fcmToken && admin.fcmToken.length > 0);
    
    if (adminWithToken) {
      console.log(`\n🧪 Testing notification with admin: ${adminWithToken.email}`);
      console.log(`🏪 Restaurant ID: ${adminWithToken.restaurant}`);
      
      // Test notification
      try {
        await sendNewOrderNotification('test_order_123', adminWithToken.restaurant.toString());
        console.log('✅ Notification test completed');
      } catch (error) {
        console.log('❌ Notification test failed:', error.message);
      }
    }
    
  } catch (error) {
    console.error('❌ Error in test:', error);
  } finally {
    mongoose.connection.close();
  }
};
