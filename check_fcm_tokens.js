const mongoose = require('mongoose');
const User = require('./models/user');

// Connect to MongoDB
mongoose.connect("mongodb+srv://imene:04042004irir@cluster0.htrt15u.mongodb.net/myDatabase?retryWrites=true&w=majority")
  .then(() => {
    console.log("✅ Connected to MongoDB");
    checkFCMTokens();
  })
  .catch((e) => {
    console.log("❌ MongoDB connection failed:", e);
  });

const checkFCMTokens = async () => {
  try {
    console.log('🔍 Checking FCM tokens for all users...');
    
    const users = await User.find({});
    
    console.log(`📊 Found ${users.length} users total`);
    
    let adminUsers = 0;
    let adminWithToken = 0;
    let userUsers = 0;
    let userWithToken = 0;
    
    users.forEach(user => {
      if (user.type === 'admin') {
        adminUsers++;
        if (user.fcmToken) {
          adminWithToken++;
          console.log(`✅ Admin with FCM token: ${user.email}`);
        } else {
          console.log(`❌ Admin without FCM token: ${user.email}`);
        }
      } else if (user.type === 'user') {
        userUsers++;
        if (user.fcmToken) {
          userWithToken++;
          console.log(`✅ User with FCM token: ${user.email}`);
        } else {
          console.log(`❌ User without FCM token: ${user.email}`);
        }
      }
    });
    
    console.log('\n📈 Summary:');
    console.log(`👨‍💼 Admin users: ${adminUsers}`);
    console.log(`👨‍💼 Admin with FCM token: ${adminWithToken}`);
    console.log(`👤 Regular users: ${userUsers}`);
    console.log(`👤 Users with FCM token: ${userWithToken}`);
    
    if (adminWithToken === 0) {
      console.log('\n⚠️  WARNING: No admin users have FCM tokens!');
      console.log('⚠️  This means notifications will not be sent to restaurant owners.');
      console.log('⚠️  Make sure admin users log in to the app to save their FCM tokens.');
    }
    
  } catch (error) {
    console.error('❌ Error checking FCM tokens:', error);
  } finally {
    mongoose.connection.close();
  }
}; 