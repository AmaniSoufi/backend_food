const express = require('express');
const router = express.Router();
const Restaurant = require('../models/restaurant');
const Order = require('../models/order');
const User = require('../models/user');
const LocationService = require('../utils/location');
const auth = require('../middlewares/auth');

// Update restaurant location
router.put('/restaurant/location', auth, async (req, res) => {
  try {
    const { latitude, longitude, address } = req.body;
    const userId = req.user.id;

    // Validate coordinates
    if (!LocationService.isValidCoordinates(latitude, longitude)) {
      return res.status(400).json({ message: 'Invalid coordinates' });
    }

    // Find user and check if they are a restaurant owner
    const user = await User.findById(userId).populate('restaurant');
    if (!user || user.type !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Restaurant owner only.' });
    }

    if (!user.restaurant) {
      return res.status(404).json({ message: 'Restaurant not found' });
    }

    // Update restaurant location
    const restaurant = await Restaurant.findByIdAndUpdate(
      user.restaurant._id,
      {
        latitude,
        longitude,
        address: address || user.restaurant.address
      },
      { new: true }
    );

    res.json({
      message: 'Restaurant location updated successfully',
      restaurant
    });
  } catch (error) {
    console.error('Error updating restaurant location:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get restaurants sorted by distance from customer location
router.get('/restaurants/nearby', async (req, res) => {
  try {
    const { latitude, longitude, radius = 10 } = req.query; // radius in km

    if (!latitude || !longitude) {
      return res.status(400).json({ message: 'Customer location is required' });
    }

    if (!LocationService.isValidCoordinates(parseFloat(latitude), parseFloat(longitude))) {
      return res.status(400).json({ message: 'Invalid coordinates' });
    }

    // Get all active restaurants
    const restaurants = await Restaurant.find({ isActive: true });

    // Sort restaurants by distance
    const sortedRestaurants = LocationService.sortRestaurantsByDistance(
      restaurants,
      parseFloat(latitude),
      parseFloat(longitude)
    );

    // Filter by radius
    const nearbyRestaurants = sortedRestaurants.filter(
      restaurant => restaurant.distance <= parseFloat(radius)
    );

    res.json({
      restaurants: nearbyRestaurants,
      customerLocation: { latitude: parseFloat(latitude), longitude: parseFloat(longitude) }
    });
  } catch (error) {
    console.error('Error getting nearby restaurants:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get order locations for tracking (restaurant owner and delivery person)
router.get('/order/:orderId/locations', auth, async (req, res) => {
  try {
    const { orderId } = req.params;
    const userId = req.user.id;

    const order = await Order.findById(orderId)
      .populate('userId', 'name phone')
      .populate('restaurantId', 'name latitude longitude');

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Check if user has access to this order
    const user = await User.findById(userId);
    if (user.type === 'user' && order.userId._id.toString() !== userId) {
      return res.status(403).json({ message: 'Access denied' });
    }

    if (user.type === 'admin' && order.restaurantId._id.toString() !== user.restaurant.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Get delivery person location if assigned
    let deliveryPersonLocation = null;
    if (order.deliveryPersonId) {
      const deliveryPerson = await User.findById(order.deliveryPersonId);
      if (deliveryPerson && deliveryPerson.currentLocation) {
        deliveryPersonLocation = {
          latitude: deliveryPerson.currentLocation.latitude,
          longitude: deliveryPerson.currentLocation.longitude,
          name: deliveryPerson.name,
          phone: deliveryPerson.phone
        };
      }
    }

    const locations = {
      customer: {
        latitude: order.latitude,
        longitude: order.longitude,
        name: order.userId.name,
        phone: order.userId.phone,
        address: order.address
      },
      restaurant: {
        latitude: order.restaurantId.latitude,
        longitude: order.restaurantId.longitude,
        name: order.restaurantId.name
      },
      deliveryPerson: deliveryPersonLocation
    };

    res.json(locations);
  } catch (error) {
    console.error('Error getting order locations:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Update delivery person current location
router.put('/delivery/location', auth, async (req, res) => {
  try {
    const { latitude, longitude } = req.body;
    const userId = req.user.id;

    if (!LocationService.isValidCoordinates(latitude, longitude)) {
      return res.status(400).json({ message: 'Invalid coordinates' });
    }

    const user = await User.findById(userId);
    if (!user || user.type !== 'delivery') {
      return res.status(403).json({ message: 'Access denied. Delivery person only.' });
    }

    // Update current location
    user.currentLocation = { latitude, longitude };
    await user.save();

    res.json({
      message: 'Location updated successfully',
      location: { latitude, longitude }
    });
  } catch (error) {
    console.error('Error updating delivery location:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get route between two points
router.get('/route', async (req, res) => {
  try {
    const { originLat, originLng, destLat, destLng } = req.query;

    if (!originLat || !originLng || !destLat || !destLng) {
      return res.status(400).json({ message: 'Origin and destination coordinates are required' });
    }

    const route = await LocationService.getRoute(
      parseFloat(originLat),
      parseFloat(originLng),
      parseFloat(destLat),
      parseFloat(destLng)
    );

    if (!route) {
      return res.status(404).json({ message: 'Route not found' });
    }

    res.json(route);
  } catch (error) {
    console.error('Error getting route:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Calculate delivery price based on distance
router.post('/delivery/price', async (req, res) => {
  try {
    const { restaurantLat, restaurantLng, customerLat, customerLng } = req.body;

    if (!restaurantLat || !restaurantLng || !customerLat || !customerLng) {
      return res.status(400).json({ message: 'Restaurant and customer coordinates are required' });
    }

    const distance = LocationService.calculateDistance(
      parseFloat(restaurantLat),
      parseFloat(restaurantLng),
      parseFloat(customerLat),
      parseFloat(customerLng)
    );

    const deliveryPrice = LocationService.calculateDeliveryPrice(distance);

    res.json({
      distance: distance.toFixed(2),
      deliveryPrice: deliveryPrice.toFixed(2)
    });
  } catch (error) {
    console.error('Error calculating delivery price:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = router; 