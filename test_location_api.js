const mongoose = require('mongoose');
const User = require('./models/user');

// Connect to MongoDB
mongoose.connect("mongodb+srv://imene:04042004irir@cluster0.htrt15u.mongodb.net/myDatabase?retryWrites=true&w=majority")
  .then(() => {
    console.log("Connected to MongoDB");
    testLocationUpdate();
  })
  .catch((e) => {
    console.log("MongoDB connection error:", e);
  });

async function testLocationUpdate() {
  try {
    // Find the delivery user
    const deliveryUser = await User.findById('687a263b25fb1d3cd16c49e9');
    
    if (!deliveryUser) {
      console.log('Delivery user not found');
      return;
    }
    
    console.log('Found delivery user:', deliveryUser.name);
    console.log('Current location before update:', deliveryUser.currentLocation);
    
    // Update location
    deliveryUser.currentLocation = {
      latitude: 36.7538,
      longitude: 3.0588,
      lastUpdated: new Date()
    };
    
    await deliveryUser.save();
    
    console.log('Location updated successfully');
    console.log('New location:', deliveryUser.currentLocation);
    
    // Verify the update
    const updatedUser = await User.findById('687a263b25fb1d3cd16c49e9');
    console.log('Verified location:', updatedUser.currentLocation);
    
  } catch (error) {
    console.error('Error testing location update:', error);
  } finally {
    mongoose.connection.close();
  }
} 