const mongoose = require('mongoose');
const User = require('./models/user');
const { sendNewOrderNotification, sendOrderStatusNotification, sendDeliveryAssignmentNotification } = require('./routes/fcm_admin');

// Connect to MongoDB
mongoose.connect("mongodb+srv://imene:04042004irir@cluster0.htrt15u.mongodb.net/myDatabase?retryWrites=true&w=majority")
  .then(() => {
    console.log("✅ Connected to MongoDB");
    testAllUserRoles();
  })
  .catch((e) => {
    console.log("❌ MongoDB connection failed:", e);
  });

const testAllUserRoles = async () => {
  try {
    console.log('🧪 Testing notifications for all user roles...\n');
    
    // 1. Check all user types and their FCM tokens
    console.log('📊 Checking FCM tokens for all user types...');
    
    const adminUsers = await User.find({ type: 'admin' });
    const regularUsers = await User.find({ type: 'user' });
    const deliveryUsers = await User.find({ type: 'delivery' });
    
    console.log(`👨‍💼 Admin users: ${adminUsers.length}`);
    console.log(`👤 Regular users: ${regularUsers.length}`);
    console.log(`🚗 Delivery users: ${deliveryUsers.length}\n`);
    
    // Check FCM tokens for each role
    let adminWithTokens = 0;
    let userWithTokens = 0;
    let deliveryWithTokens = 0;
    
    console.log('🔍 Admin users FCM tokens:');
    adminUsers.forEach((admin, index) => {
      const hasToken = admin.fcmToken && admin.fcmToken.length > 0;
      if (hasToken) adminWithTokens++;
      console.log(`  ${index + 1}. ${admin.email} - FCM Token: ${hasToken ? '✅ YES' : '❌ NO'}`);
    });
    
    console.log('\n🔍 Regular users FCM tokens:');
    regularUsers.forEach((user, index) => {
      const hasToken = user.fcmToken && user.fcmToken.length > 0;
      if (hasToken) userWithTokens++;
      console.log(`  ${index + 1}. ${user.email} - FCM Token: ${hasToken ? '✅ YES' : '❌ NO'}`);
    });
    
    console.log('\n🔍 Delivery users FCM tokens:');
    deliveryUsers.forEach((delivery, index) => {
      const hasToken = delivery.fcmToken && delivery.fcmToken.length > 0;
      if (hasToken) deliveryWithTokens++;
      console.log(`  ${index + 1}. ${delivery.email} - FCM Token: ${hasToken ? '✅ YES' : '❌ NO'}`);
    });
    
    console.log('\n📈 Summary:');
    console.log(`👨‍💼 Admins with FCM tokens: ${adminWithTokens}/${adminUsers.length}`);
    console.log(`👤 Users with FCM tokens: ${userWithTokens}/${regularUsers.length}`);
    console.log(`🚗 Delivery with FCM tokens: ${deliveryWithTokens}/${deliveryUsers.length}`);
    
    // 2. Test notifications for each role
    console.log('\n🧪 Testing notifications...\n');
    
    // Test admin notification (new order)
    if (adminWithTokens > 0) {
      const adminWithToken = adminUsers.find(admin => admin.fcmToken && admin.fcmToken.length > 0);
      if (adminWithToken) {
        console.log(`🔔 Testing new order notification for admin: ${adminWithToken.email}`);
        try {
          await sendNewOrderNotification('test_order_123', adminWithToken.restaurant?.toString() || 'test_restaurant');
          console.log('✅ Admin notification test completed');
        } catch (error) {
          console.log('❌ Admin notification test failed:', error.message);
        }
      }
    } else {
      console.log('⚠️  No admin users with FCM tokens - cannot test admin notifications');
    }
    
    // Test user notification (order status update)
    if (userWithTokens > 0) {
      const userWithToken = regularUsers.find(user => user.fcmToken && user.fcmToken.length > 0);
      if (userWithToken) {
        console.log(`🔔 Testing order status notification for user: ${userWithToken.email}`);
        try {
          await sendOrderStatusNotification('test_order_123', userWithToken._id.toString(), 'confirmed');
          console.log('✅ User notification test completed');
        } catch (error) {
          console.log('❌ User notification test failed:', error.message);
        }
      }
    } else {
      console.log('⚠️  No regular users with FCM tokens - cannot test user notifications');
    }
    
    // Test delivery notification (delivery assignment)
    if (deliveryWithTokens > 0) {
      const deliveryWithToken = deliveryUsers.find(delivery => delivery.fcmToken && delivery.fcmToken.length > 0);
      if (deliveryWithToken) {
        console.log(`🔔 Testing delivery assignment notification for delivery: ${deliveryWithToken.email}`);
        try {
          await sendDeliveryAssignmentNotification('test_order_123', deliveryWithToken._id.toString());
          console.log('✅ Delivery notification test completed');
        } catch (error) {
          console.log('❌ Delivery notification test failed:', error.message);
        }
      }
    } else {
      console.log('⚠️  No delivery users with FCM tokens - cannot test delivery notifications');
    }
    
    // 3. Recommendations
    console.log('\n💡 Recommendations:');
    
    if (adminWithTokens === 0) {
      console.log('⚠️  Admin users need to log in to the app to save FCM tokens');
    }
    
    if (userWithTokens === 0) {
      console.log('⚠️  Regular users need to log in to the app to save FCM tokens');
    }
    
    if (deliveryWithTokens === 0) {
      console.log('⚠️  Delivery users need to log in to the app to save FCM tokens');
    }
    
    if (adminWithTokens > 0 && userWithTokens > 0 && deliveryWithTokens > 0) {
      console.log('✅ All user roles have FCM tokens - notifications should work properly');
    }
    
  } catch (error) {
    console.error('❌ Error in test:', error);
  } finally {
    mongoose.connection.close();
  }
};
