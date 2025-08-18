const calculateDistance = (point1, point2) => {
  const earthRadius = 6371; // Earth's radius in kilometers
  const pi = Math.PI;
  
  const lat1Rad = point1.latitude * pi / 180;
  const lat2Rad = point2.latitude * pi / 180;
  const deltaLat = (point2.latitude - point1.latitude) * pi / 180;
  const deltaLng = (point2.longitude - point1.longitude) * pi / 180;
  
  const a = Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
      Math.cos(lat1Rad) * Math.cos(lat2Rad) * Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  
  return earthRadius * c; // Distance in kilometers
};

const calculateDeliveryPrice = (distanceInKm) => {
  const basePrice = 120.0;
  const pricePerAdditionalKm = 10.0;
  
  // If distance is 1 km or less, return base price
  if (distanceInKm <= 1.0) {
    return basePrice;
  }
  
  // For distances more than 1 km, add 10 DA per additional km
  const additionalKm = distanceInKm - 1.0;
  return basePrice + (additionalKm * pricePerAdditionalKm);
};

module.exports = {
  calculateDistance,
  calculateDeliveryPrice
}; 