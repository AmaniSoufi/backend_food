const axios = require('axios');

// Test the new order system with phone number and short order ID
const testNewOrder = async () => {
  try {
    console.log('🧪 Testing new order system...');
    
    // First, login to get token
    const loginResponse = await axios.post('http://localhost:3000/api/auth/signin', {
      email: 'test@example.com',
      password: 'test123'
    });
    
    const token = loginResponse.data.token;
    console.log('✅ Login successful, token received');
    
    // Test order creation with phone number
    const orderData = {
      cart: [
        {
          product: {
            _id: '507f1f77bcf86cd799439011' // Replace with actual product ID
          },
          quantity: 2
        }
      ],
      totalPrice: '1500.00', // Formatted to 2 decimal places
      address: 'Test Address, Algiers',
      phone: '0555123456', // Phone number from user input
      latitude: 36.7538,
      longitude: 3.0588,
      deliveryPrice: '500.00', // Formatted to 2 decimal places
      deliveryDistance: 2.5
    };
    
    console.log('📦 Order data:', orderData);
    
    const orderResponse = await axios.post('http://localhost:3000/api/order', orderData, {
      headers: {
        'Content-Type': 'application/json',
        'x-auth-token': token
      }
    });
    
    console.log('✅ Order created successfully!');
    console.log('📋 Order response:', orderResponse.data);
    console.log('🆔 Order ID:', orderResponse.data.orderId);
    console.log('📞 Phone:', orderResponse.data.phone);
    console.log('💰 Total Price:', orderResponse.data.totalPrice);
    console.log('🚚 Delivery Price:', orderResponse.data.deliveryPrice);
    
    // Verify that order ID is short and unique
    if (orderResponse.data.orderId && orderResponse.data.orderId.length <= 7) {
      console.log('✅ Order ID is short and formatted correctly');
    } else {
      console.log('❌ Order ID format issue');
    }
    
    // Verify phone number is saved
    if (orderResponse.data.phone === '0555123456') {
      console.log('✅ Phone number saved correctly');
    } else {
      console.log('❌ Phone number not saved correctly');
    }
    
    // Verify prices are formatted to 2 decimal places
    const totalPrice = parseFloat(orderResponse.data.totalPrice);
    const deliveryPrice = parseFloat(orderResponse.data.deliveryPrice);
    
    if (totalPrice.toFixed(2) === totalPrice.toString()) {
      console.log('✅ Total price formatted correctly');
    } else {
      console.log('❌ Total price format issue');
    }
    
    if (deliveryPrice.toFixed(2) === deliveryPrice.toString()) {
      console.log('✅ Delivery price formatted correctly');
    } else {
      console.log('❌ Delivery price format issue');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
};

// Run the test
console.log('🚀 Starting new order system test...');
testNewOrder(); 