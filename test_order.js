const http = require('http');

// Test creating an order
const testOrder = () => {
  const postData = JSON.stringify({
    cart: [
      {
        product: {
          _id: 'test_product_id',
          name: 'Test Product',
          price: 100,
          restaurant: 'test_restaurant_id'
        },
        quantity: 1
      }
    ],
    totalPrice: 1000,
    address: 'Test Address',
    latitude: 32.570303,
    longitude: 1.1259581,
    deliveryPrice: 100,
    deliveryDistance: 10
  });

  const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/order',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-auth-token': 'test_token'
    }
  };

  const req = http.request(options, (res) => {
    console.log(`Status: ${res.statusCode}`);
    console.log(`Headers: ${JSON.stringify(res.headers)}`);
    
    let data = '';
    res.on('data', (chunk) => {
      data += chunk;
    });
    
    res.on('end', () => {
      console.log('Response Body:', data);
    });
  });

  req.on('error', (e) => {
    console.error(`Problem with request: ${e.message}`);
  });

  req.write(postData);
  req.end();
};

console.log('Testing order creation...');
testOrder(); 