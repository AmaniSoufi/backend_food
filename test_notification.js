const http = require('http');

// Test the notification endpoint
const testNotification = () => {
  const postData = JSON.stringify({
    orderId: 'test_order_id',
    orderData: {
      cart: [],
      address: 'Test Address',
      totalPrice: 1000,
      latitude: 32.570303,
      longitude: 1.1259581,
      deliveryPrice: 100,
      deliveryDistance: 10
    },
    customerName: 'Test Customer',
    customerEmail: 'test@example.com',
    totalAmount: 1000,
    deliveryAddress: 'Test Address'
  });

  const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/order/notify-restaurant',
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

console.log('Testing notification endpoint...');
testNotification(); 