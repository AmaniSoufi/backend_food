const axios = require('axios');

class LocationService {
  static GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY || 'AIzaSyCR9iU6AmEg2hsxCKk79ESbDNhmBRlB4aI';

  // Calculate distance between two points using Haversine formula
  static calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Radius of the Earth in kilometers
    const dLat = this.deg2rad(lat2 - lat1);
    const dLon = this.deg2rad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c; // Distance in kilometers
    return distance;
  }

  static deg2rad(deg) {
    return deg * (Math.PI / 180);
  }

  // Get route between two points using Google Directions API
  static async getRoute(originLat, originLng, destLat, destLng) {
    try {
      const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${originLat},${originLng}&destination=${destLat},${destLng}&key=${this.GOOGLE_MAPS_API_KEY}`;
      const response = await axios.get(url);
      
      if (response.data.status === 'OK') {
        return {
          distance: response.data.routes[0].legs[0].distance.text,
          duration: response.data.routes[0].legs[0].duration.text,
          polyline: response.data.routes[0].overview_polyline.points
        };
      }
      return null;
    } catch (error) {
      console.error('Error getting route:', error);
      return null;
    }
  }

  // Get travel time between two points
  static async getTravelTime(originLat, originLng, destLat, destLng) {
    try {
      const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${originLat},${originLng}&destinations=${destLat},${destLng}&key=${this.GOOGLE_MAPS_API_KEY}`;
      const response = await axios.get(url);
      
      if (response.data.status === 'OK' && response.data.rows[0].elements[0].status === 'OK') {
        return {
          duration: response.data.rows[0].elements[0].duration.value, // seconds
          distance: response.data.rows[0].elements[0].distance.value // meters
        };
      }
      return null;
    } catch (error) {
      console.error('Error getting travel time:', error);
      return null;
    }
  }

  // Calculate delivery price based on distance
  static calculateDeliveryPrice(distanceInKm) {
    const basePrice = 120.0; // Base delivery price
    const pricePerAdditionalKm = 10.0; // Price per additional kilometer
    
    // If distance is 1 km or less, return base price
    if (distanceInKm <= 1.0) {
      return basePrice;
    }
    
    // For distances more than 1 km, add 10 DA per additional km
    const additionalKm = distanceInKm - 1.0;
    return basePrice + (additionalKm * pricePerAdditionalKm);
  }

  // Sort restaurants by distance from customer location
  static sortRestaurantsByDistance(restaurants, customerLat, customerLng) {
    return restaurants.map(restaurant => ({
      ...restaurant.toObject(),
      distance: this.calculateDistance(
        customerLat,
        customerLng,
        restaurant.latitude,
        restaurant.longitude
      )
    })).sort((a, b) => a.distance - b.distance);
  }

  // Validate coordinates
  static isValidCoordinates(lat, lng) {
    return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
  }

  // Get address from coordinates using Google Geocoding API
  static async getAddressFromCoordinates(lat, lng) {
    try {
      const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${this.GOOGLE_MAPS_API_KEY}`;
      const response = await axios.get(url);
      
      if (response.data.status === 'OK' && response.data.results.length > 0) {
        return response.data.results[0].formatted_address;
      }
      return null;
    } catch (error) {
      console.error('Error getting address:', error);
      return null;
    }
  }

  // Get coordinates from address using Google Geocoding API
  static async getCoordinatesFromAddress(address) {
    try {
      const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${this.GOOGLE_MAPS_API_KEY}`;
      const response = await axios.get(url);
      
      if (response.data.status === 'OK' && response.data.results.length > 0) {
        const location = response.data.results[0].geometry.location;
        return {
          lat: location.lat,
          lng: location.lng
        };
      }
      return null;
    } catch (error) {
      console.error('Error getting coordinates:', error);
      return null;
    }
  }
}

module.exports = LocationService; 