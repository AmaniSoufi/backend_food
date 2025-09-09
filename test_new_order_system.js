const axios = require('axios');

// Test the new order system
const testNewOrderSystem = async () => {
  try {
    console.log('🧪 Testing new order system with phone number...');
    
    // Test data
    const testOrderData = {
      cart: [
        {
          product: {
            _id: '688524a18f5754ac3f69a2a9' // Use an existing product ID from your database
          },
          quantity: 1
        }
      ],
      totalPrice: '800.00',
      address: 'Test Address, Algiers',
      phone: '0555123456', // This should be saved instead of user's phone
      latitude: 36.7538,
      longitude: 3.0588,
      deliveryPrice: '200.00',
      deliveryDistance: 1.5
    };
    
    console.log('📦 Test order data:', JSON.stringify(testOrderData, null, 2));
    
    // First, we need to get a valid token
    // You'll need to replace this with actual login credentials
    console.log('🔐 Attempting to get auth token...');
    
    // For testing purposes, you might need to:
    // 1. Create a test user first
    // 2. Or use existing user credentials
    // 3. Or modify this to work with your auth system
    
    const loginResponse = await axios.post('http://localhost:3000/api/auth/signin', {
      email: 'test@example.com', // Replace with actual test user
      password: 'test123'
    });
    
    const token = loginResponse.data.token;
    console.log('✅ Got auth token');
    
    // Create order with new system
    console.log('📤 Sending order to server...');
    const orderResponse = await axios.post('http://localhost:3000/api/order', testOrderData, {
      headers: {
        'Content-Type': 'application/json',
        'x-auth-token': token
      }
    });
    
    console.log('✅ Order created successfully!');
    console.log('📋 Full response:', JSON.stringify(orderResponse.data, null, 2));
    
    // Verify the results
    const order = orderResponse.data;
    
    console.log('\n🔍 Verification Results:');
    console.log('========================');
    
    // Check orderId
    if (order.orderId && order.orderId.length === 7) {
      console.log('✅ Order ID is short and correct format:', order.orderId);
    } else {
      console.log('❌ Order ID issue:', order.orderId);
    }
    
    // Check phone number
    if (order.phone === '0555123456') {
      console.log('✅ Phone number saved correctly:', order.phone);
    } else {
      console.log('❌ Phone number not saved correctly. Expected: 0555123456, Got:', order.phone);
    }
    
    // Check products with names and prices
    if (order.products && order.products.length > 0) {
      console.log('✅ Products saved with names and prices:');
      order.products.forEach((product, index) => {
        console.log(`   ${index + 1}. ${product.productName} - Quantity: ${product.quantity} - Price: ${product.productPrice}`);
      });
    } else {
      console.log('❌ No products found in order');
    }
    
    // Check price formatting
    const totalPrice = parseFloat(order.totalPrice);
    const deliveryPrice = parseFloat(order.deliveryPrice);
    
    if (totalPrice.toFixed(2) === totalPrice.toString()) {
      console.log('✅ Total price formatted correctly:', totalPrice);
    } else {
      console.log('❌ Total price format issue:', totalPrice);
    }
    
    if (deliveryPrice.toFixed(2) === deliveryPrice.toString()) {
      console.log('✅ Delivery price formatted correctly:', deliveryPrice);
    } else {
      console.log('❌ Delivery price format issue:', deliveryPrice);
    }
    
    console.log('\n🎉 Test completed!');
    
  } catch (error) {
    console.error('❌ Test failed:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    } else {
      console.error('Error:', error.message);
    }
  }
};

// Instructions for running the test
console.log('🚀 New Order System Test');
console.log('========================');
console.log('Before running this test:');
console.log('1. Make sure your server is running on localhost:3000');
console.log('2. Make sure you have a test user in your database');
console.log('3. Update the login credentials in this script');
console.log('4. Update the product ID to an existing one in your database');
console.log('');

// Run the test
testNewOrderSystem(); 