const mongoose = require('mongoose');
const User = require('./models/user');
const Restaurant = require('./models/restaurant');

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/amzone', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

async function assignRestaurantToAdmin() {
  try {
    console.log('🔍 Looking for admin users...');
    
    // Find admin users
    const adminUsers = await User.find({ type: 'admin' });
    console.log(`Found ${adminUsers.length} admin users:`, adminUsers.map(u => ({ id: u._id, name: u.name, email: u.email, restaurant: u.restaurant })));
    
    // Find the restaurant
    const restaurant = await Restaurant.findOne({ name: 'pizzeria orania' });
    if (!restaurant) {
      console.log('❌ Restaurant "pizzeria orania" not found');
      return;
    }
    console.log('✅ Found restaurant:', restaurant);
    
    // Update admin users to have this restaurant
    for (const adminUser of adminUsers) {
      if (!adminUser.restaurant) {
        console.log(`🔧 Assigning restaurant to admin: ${adminUser.name} (${adminUser.email})`);
        adminUser.restaurant = restaurant._id;
        await adminUser.save();
        console.log(`✅ Restaurant assigned to ${adminUser.name}`);
      } else {
        console.log(`ℹ️ Admin ${adminUser.name} already has restaurant: ${adminUser.restaurant}`);
      }
    }
    
    console.log('✅ All admin users updated');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    mongoose.connection.close();
  }
}

assignRestaurantToAdmin(); 