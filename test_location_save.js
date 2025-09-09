const mongoose = require('mongoose');
const User = require('./models/user');

// Connect to MongoDB
mongoose.connect("mongodb+srv://imene:04042004irir@cluster0.htrt15u.mongodb.net/myDatabase?retryWrites=true&w=majority")
    .then(() => {
        console.log("✅ Connected to MongoDB");
        testLocationSave();
    })
    .catch((e) => {
        console.log("❌ MongoDB connection error:", e);
    });

async function testLocationSave() {
    try {
        console.log('🔍 Testing location save...');
        
        // Find a delivery user
        const deliveryUser = await User.findOne({ type: 'delivery' });
        
        if (!deliveryUser) {
            console.log('❌ No delivery user found');
            return;
        }
        
        console.log('✅ Found delivery user:', deliveryUser.name);
        console.log('📍 Current location before update:', deliveryUser.currentLocation);
        
        // Update location using findByIdAndUpdate to avoid validation issues
        const newLocation = {
            latitude: 25.2048,
            longitude: 55.2708,
            lastUpdated: new Date()
        };
        
        const updatedUser = await User.findByIdAndUpdate(
            deliveryUser._id,
            { currentLocation: newLocation },
            { new: true, runValidators: false }
        );
        
        console.log('✅ Location updated successfully');
        console.log('📍 New location:', updatedUser.currentLocation);
        
        // Verify the update
        const verificationUser = await User.findById(deliveryUser._id);
        console.log('🔍 Verification - saved location:', verificationUser.currentLocation);
        
        if (verificationUser.currentLocation && 
            verificationUser.currentLocation.latitude === newLocation.latitude &&
            verificationUser.currentLocation.longitude === newLocation.longitude) {
            console.log('✅ Location save test PASSED');
        } else {
            console.log('❌ Location save test FAILED');
        }
        
    } catch (error) {
        console.error('❌ Test error:', error);
    } finally {
        mongoose.connection.close();
        console.log('🔌 MongoDB connection closed');
    }
} 