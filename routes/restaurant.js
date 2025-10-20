const express = require('express');
const router = express.Router();
const auth = require('../middlewares/auth');
const Restaurant = require('../models/restaurant');
const User = require('../models/user');
const {Product} = require('../models/product');

//const fetch = require('node-fetch'); // Add at the top if not present
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

// Get restaurant location (for restaurant owners)
router.get('/api/restaurant/location', auth, async (req, res) => {
  try {
    console.log('🚚 DEBUG: Getting restaurant location for user:', req.user);
    
    const user = await User.findById(req.user);
    console.log('🚚 DEBUG: User found:', user ? 'Yes' : 'No');
    console.log('🚚 DEBUG: User restaurant ID:', user?.restaurant);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    if (!user.restaurant) {
      return res.status(404).json({ error: 'User is not associated with a restaurant' });
    }

    const restaurant = await Restaurant.findById(user.restaurant);
    console.log('🚚 DEBUG: Restaurant found:', restaurant ? 'Yes' : 'No');
    console.log('🚚 DEBUG: Restaurant location:', restaurant?.latitude, restaurant?.longitude);
    
    if (!restaurant) {
      return res.status(404).json({ error: 'Restaurant not found' });
    }

    if (!restaurant.latitude || !restaurant.longitude) {
      return res.status(404).json({ error: 'Restaurant location not set' });
    }

    res.json({
      latitude: restaurant.latitude,
      longitude: restaurant.longitude,
      address: restaurant.address,
    });
  } catch (e) {
    console.log('🚚 DEBUG: Error getting restaurant location:', e);
    res.status(500).json({ error: e.message });
  }
});

// Get restaurant location (public - for customers)
router.get('/api/restaurant/location/public', async (req, res) => {
  try {
    console.log('🚚 DEBUG: Getting public restaurant location');
    
    // Get the first active restaurant (since this is a single-restaurant app)
    const restaurant = await Restaurant.findOne({ isActive: true });
    console.log('🚚 DEBUG: Restaurant found:', restaurant ? 'Yes' : 'No');
    console.log('🚚 DEBUG: Restaurant location:', restaurant?.latitude, restaurant?.longitude);
    
    if (!restaurant) {
      return res.status(404).json({ error: 'No active restaurant found' });
    }

    if (!restaurant.latitude || !restaurant.longitude) {
      return res.status(404).json({ error: 'Restaurant location not set' });
    }

    res.json({
      latitude: restaurant.latitude,
      longitude: restaurant.longitude,
      address: restaurant.address,
      name: restaurant.name,
    });
  } catch (e) {
    console.log('🚚 DEBUG: Error getting public restaurant location:', e);
    res.status(500).json({ error: e.message });
  }
});

// Get restaurant info from cart products
router.get('/api/restaurant/from-cart', auth, async (req, res) => {
  try {
    console.log('🚚 DEBUG: Getting restaurant info from cart products');
    
    const user = await User.findById(req.user).populate({
      path: 'cart.product',
      populate: {
        path: 'restaurant',
        model: 'Restaurant'
      }
    });
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    console.log('🚚 DEBUG: User cart length:', user.cart.length);
    
    if (user.cart.length === 0) {
      return res.status(400).json({ error: 'Cart is empty' });
    }

    // Get restaurant ID from the first product in cart
    const firstProduct = user.cart[0].product;
    console.log('🚚 DEBUG: First product:', firstProduct.name);
    console.log('🚚 DEBUG: First product restaurant:', firstProduct.restaurant);
    
    if (!firstProduct.restaurant) {
      return res.status(404).json({ error: 'Product has no restaurant association' });
    }

    // Get restaurant details
    const restaurant = await Restaurant.findById(firstProduct.restaurant);
    if (!restaurant) {
      return res.status(404).json({ error: 'Restaurant not found' });
    }

    console.log('🚚 DEBUG: Restaurant found:', restaurant.name);
    console.log('🚚 DEBUG: Restaurant address:', restaurant.address);
    console.log('🚚 DEBUG: Restaurant location:', restaurant.latitude, restaurant.longitude);

    // Verify all products in cart are from the same restaurant
    for (let i = 1; i < user.cart.length; i++) {
      const product = user.cart[i].product;
      if (product.restaurant.toString() !== firstProduct.restaurant.toString()) {
        return res.status(400).json({ error: 'All products must be from the same restaurant' });
      }
    }

    res.json({
      latitude: restaurant.latitude,
      longitude: restaurant.longitude,
      address: restaurant.address,
      name: restaurant.name,
    });
  } catch (e) {
    console.log('🚚 DEBUG: Error getting restaurant from cart:', e);
    res.status(500).json({ error: e.message });
  }
});

// Update restaurant location
router.post('/api/restaurant/location', auth, async (req, res) => {
  try {
    const { latitude, longitude, address } = req.body;
    console.log('🚚 DEBUG: Incoming location data:', { latitude, longitude, address });
    console.log('🚚 DEBUG: Request user ID:', req.user);

    // Validate input data
    if (!latitude || !longitude) {
      console.log('🚚 DEBUG: Missing coordinates, attempting geocoding...');
      
      if (!address) {
        return res.status(400).json({ error: 'Either coordinates or address must be provided' });
      }
      fetch
      // Geocode the address
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}`;
      console.log('🚚 DEBUG: Geocoding URL:', url);
      
      const geoRes = await fetch(url);
      const geoData = await geoRes.json();
      console.log('🚚 DEBUG: Geocoding response:', geoData);
      
      if (geoData && geoData.length > 0) {
        latitude = parseFloat(geoData[0].lat);
        longitude = parseFloat(geoData[0].lon);
        console.log('🚚 DEBUG: Geocoded address to:', { latitude, longitude });
      } else {
        return res.status(400).json({ error: 'Could not geocode address' });
      }
    }

    // Validate coordinates are numbers
    const finalLatitude = parseFloat(latitude);
    const finalLongitude = parseFloat(longitude);
    
    if (isNaN(finalLatitude) || isNaN(finalLongitude)) {
      return res.status(400).json({ error: 'Invalid coordinates provided' });
    }

    console.log('🚚 DEBUG: Final coordinates:', { latitude: finalLatitude, longitude: finalLongitude, address });

    const user = await User.findById(req.user);
    console.log('🚚 DEBUG: User found:', user ? 'Yes' : 'No');
    console.log('🚚 DEBUG: User restaurant ID:', user?.restaurant);
    
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (!user.restaurant) return res.status(404).json({ error: 'User is not associated with a restaurant' });

    let restaurant = await Restaurant.findById(user.restaurant);
    console.log('🚚 DEBUG: Restaurant found:', restaurant ? 'Yes' : 'No');
    console.log('🚚 DEBUG: Restaurant name:', restaurant?.name);
    
    if (!restaurant) return res.status(404).json({ error: 'Restaurant not found' });

    // Update restaurant location - EXACTLY like user address saving
    restaurant.latitude = finalLatitude;
    restaurant.longitude = finalLongitude;
    restaurant.address = address || ''; // Convert null/undefined to empty string
    restaurant = await restaurant.save();

    console.log('🚚 DEBUG: After saving - Restaurant data:', {
      name: restaurant.name,
      latitude: restaurant.latitude,
      longitude: restaurant.longitude,
      address: restaurant.address,
    });

    res.json({
      message: 'Restaurant location updated successfully',
      latitude: restaurant.latitude,
      longitude: restaurant.longitude,
      address: restaurant.address,
    });
  } catch (e) {
    console.log('🚚 DEBUG: Error updating restaurant location:', e);
    console.log('🚚 DEBUG: Error stack:', e.stack);
    res.status(500).json({ error: e.message });
  }
});

// Get restaurant details
router.get('/api/restaurant', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user);
    if (!user || !user.restaurant) {
      return res.status(404).json({ error: 'Restaurant not found' });
    }

    const restaurant = await Restaurant.findById(user.restaurant);
    if (!restaurant) {
      return res.status(404).json({ error: 'Restaurant not found' });
    }

    res.json(restaurant);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Get restaurant location
router.get('/api/restaurant/location', auth, async (req, res) => {
  try {
    console.log('📍 DEBUG: Getting restaurant location for user:', req.user);
    
    const user = await User.findById(req.user);
    console.log('📍 DEBUG: User found:', user ? 'Yes' : 'No');
    console.log('📍 DEBUG: User restaurant ID:', user?.restaurant);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    if (!user.restaurant) {
      return res.status(404).json({ error: 'User is not associated with a restaurant' });
    }

    const restaurant = await Restaurant.findById(user.restaurant);
    console.log('📍 DEBUG: Restaurant found:', restaurant ? 'Yes' : 'No');
    console.log('📍 DEBUG: Restaurant location data:', {
      latitude: restaurant?.latitude,
      longitude: restaurant?.longitude,
      address: restaurant?.address
    });
    
    if (!restaurant) {
      return res.status(404).json({ error: 'Restaurant not found' });
    }

    // Return location data if available
    if (restaurant.latitude && restaurant.longitude) {
      res.json({
        latitude: restaurant.latitude,
        longitude: restaurant.longitude,
        address: restaurant.address || ''
      });
    } else {
      return res.status(404).json({ error: 'Restaurant location not set' });
    }
  } catch (e) {
    console.log('📍 DEBUG: Error getting restaurant location:', e);
    res.status(500).json({ error: e.message });
  }
});

// Get restaurant products by restaurant ID
router.get('/api/restaurant/:restaurantId/products', async (req, res) => {
  try {
    const { restaurantId } = req.params;
    console.log('🍽️ DEBUG: Getting products for restaurant:', restaurantId);
    
    // Validate restaurant ID
    if (!restaurantId) {
      return res.status(400).json({ error: 'Restaurant ID is required' });
    }

    // Check if restaurant exists
    const restaurant = await Restaurant.findById(restaurantId);
    if (!restaurant) {
      return res.status(404).json({ error: 'Restaurant not found' });
    }

    // Get all products for this restaurant
    const products = await Product.find({ restaurant: restaurantId });
    console.log('🍽️ DEBUG: Found products:', products.length);

    res.json({
      success: true,
      products: products,
      restaurant: {
        name: restaurant.name,
        address: restaurant.address,
        minimumOrderPrice: restaurant.minimumOrderPrice
      }
    });
  } catch (e) {
    console.log('🍽️ DEBUG: Error getting restaurant products:', e);
    res.status(500).json({ error: e.message });
  }
});

module.exports = router; 