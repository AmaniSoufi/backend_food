const User = require('./models/user');

async function checkFCMTokens() {
  try {
    console.log('🔍 فحص FCM Tokens في الخادم البعيد...\n');
    
    // Find all admin users
    const adminUsers = await User.find({ type: 'admin' });
    console.log(`👨‍🍳 عدد أصحاب المطاعم: ${adminUsers.length}\n`);
    
    if (adminUsers.length === 0) {
      console.log('❌ لا يوجد أصحاب مطاعم مسجلين');
      return;
    }
    
    adminUsers.forEach((admin, index) => {
      console.log(`${index + 1}. ${admin.name} (${admin.email})`);
      console.log(`   المطعم: ${admin.restaurant || 'غير محدد'}`);
      console.log(`   FCM Token: ${admin.fcmToken ? '✅ موجود' : '❌ مفقود'}`);
      if (admin.fcmToken) {
        console.log(`   Token: ${admin.fcmToken.substring(0, 30)}...`);
      }
      console.log('');
    });
    
    // Find all regular users
    const regularUsers = await User.find({ type: 'user' });
    console.log(`👤 عدد العملاء: ${regularUsers.length}`);
    
    const usersWithToken = regularUsers.filter(user => user.fcmToken);
    console.log(`   لديهم FCM Token: ${usersWithToken.length}`);
    console.log(`   بدون FCM Token: ${regularUsers.length - usersWithToken.length}\n`);
    
  } catch (error) {
    console.error('❌ خطأ:', error);
  }
}

checkFCMTokens().then(() => {
  console.log('🏁 انتهى الفحص');
  process.exit(0);
}); 