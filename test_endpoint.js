const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

// Test the restaurant products endpoint
async function testEndpoint() {
  try {
    // Use a valid restaurant ID from the database
    const restaurantId = '686fd3e584b169975ab214b7'; // imo25 restaurant
    
    console.log('Testing restaurant products endpoint...');
    console.log('Restaurant ID:', restaurantId);
    
    const response = await fetch(`http://localhost:3000/api/restaurant/${restaurantId}/products`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    });
    
    console.log('Response status:', response.status);
    
    if (response.ok) {
      const data = await response.json();
      console.log('Response data:', JSON.stringify(data, null, 2));
    } else {
      const errorText = await response.text();
      console.log('Error response:', errorText);
    }
    
  } catch (error) {
    console.error('Test failed:', error);
  }
}

testEndpoint(); 