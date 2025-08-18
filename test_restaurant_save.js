const mongoose = require('mongoose');
const Restaurant = require('./models/restaurant');
const User = require('./models/user');

// Connect to MongoDB
mongoose.connect("mongodb+srv://imene:04042004irir@cluster0.htrt15u.mongodb.net/myDatabase?retryWrites=true&w=majority")
  .then(() => {
    console.log("Connected to MongoDB");
    testRestaurantSave();
  })
  .catch((e) => {
    console.log("MongoDB connection error:", e);
  });

async function testRestaurantSave() {
  try {
    console.log('🧪 Testing restaurant address save...\n');
    
    // Find the admin user
    const adminUser = await User.findOne({ email: 'admin@gmail.com' });
    if (!adminUser) {
      console.log('❌ Admin user not found');
      return;
    }
    
    console.log('👤 Admin user found:');
    console.log(`   Name: ${adminUser.name}`);
    console.log(`   Email: ${adminUser.email}`);
    console.log(`   Restaurant ID: ${adminUser.restaurant}`);
    
    // Find the restaurant
    let restaurant = await Restaurant.findById(adminUser.restaurant);
    if (!restaurant) {
      console.log('❌ Restaurant not found');
      return;
    }
    
    console.log('\n🏪 Current restaurant data:');
    console.log(`   Name: ${restaurant.name}`);
    console.log(`   Address: "${restaurant.address}"`);
    console.log(`   Latitude: ${restaurant.latitude}`);
    console.log(`   Longitude: ${restaurant.longitude}`);
    console.log(`   ID: ${restaurant._id}`);
    
    // Test the exact same logic as user address saving
    console.log('\n🧪 Testing address save with user logic...');
    
    const testAddress = 'Test Address from User Logic, El Bayadh, Algeria';
    const testLatitude = 33.6844;
    const testLongitude = 1.0193;
    
    console.log(`   Setting address to: "${testAddress}"`);
    console.log(`   Setting coordinates to: ${testLatitude}, ${testLongitude}`);
    
    // Use EXACTLY the same logic as user address saving
    restaurant.latitude = testLatitude;
    restaurant.longitude = testLongitude;
    restaurant.address = testAddress;
    restaurant = await restaurant.save();
    
    console.log('\n✅ Restaurant saved with user logic!');
    console.log(`   Name: ${restaurant.name}`);
    console.log(`   Address: "${restaurant.address}"`);
    console.log(`   Latitude: ${restaurant.latitude}`);
    console.log(`   Longitude: ${restaurant.longitude}`);
    
    // Verify by fetching again
    const verifyRestaurant = await Restaurant.findById(restaurant._id);
    console.log('\n🔍 Verification after save:');
    console.log(`   Name: ${verifyRestaurant.name}`);
    console.log(`   Address: "${verifyRestaurant.address}"`);
    console.log(`   Latitude: ${verifyRestaurant.latitude}`);
    console.log(`   Longitude: ${verifyRestaurant.longitude}`);
    
    if (verifyRestaurant.address === testAddress) {
      console.log('✅ Address saved successfully!');
    } else {
      console.log('❌ Address not saved correctly!');
      console.log(`   Expected: "${testAddress}"`);
      console.log(`   Got: "${verifyRestaurant.address}"`);
    }
    
    // Test with empty string
    console.log('\n🧪 Testing with empty string...');
    restaurant.address = '';
    restaurant = await restaurant.save();
    
    const verifyEmpty = await Restaurant.findById(restaurant._id);
    console.log(`   Address after empty string: "${verifyEmpty.address}"`);
    
    if (verifyEmpty.address === '') {
      console.log('✅ Empty string saved successfully!');
    } else {
      console.log('❌ Empty string not saved correctly!');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    mongoose.connection.close();
  }
} 