const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

// Test the exact Flutter app request
async function testFlutterRequest() {
  try {
    console.log('🧪 Testing Flutter app request...');
    
    // Step 1: Sign in as admin
    const signinResponse = await fetch('http://localhost:3000/api/signin', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'admin@gmail.com',
        password: '04042004irir'
      })
    });
    
    if (!signinResponse.ok) {
      const errorData = await signinResponse.json();
      console.log('❌ Signin failed:', errorData);
      return;
    }
    
    const userData = await signinResponse.json();
    const token = userData.token;
    
    console.log('✅ Signed in successfully');
    console.log('🔑 Token:', token.substring(0, 20) + '...');
    
    // Step 2: Test different request formats
    const testCases = [
      {
        name: 'Normal request with address',
        data: {
          latitude: 33.6844,
          longitude: 1.0193,
          address: 'Test Address from Flutter, El Bayadh, Algeria'
        }
      },
      {
        name: 'Request with empty address',
        data: {
          latitude: 33.6844,
          longitude: 1.0193,
          address: ''
        }
      },
      {
        name: 'Request without address field',
        data: {
          latitude: 33.6844,
          longitude: 1.0193
        }
      },
      {
        name: 'Request with null address',
        data: {
          latitude: 33.6844,
          longitude: 1.0193,
          address: null
        }
      }
    ];
    
    for (const testCase of testCases) {
      console.log(`\n📡 Testing: ${testCase.name}`);
      console.log('📄 Request data:', testCase.data);
      
      const locationResponse = await fetch('http://localhost:3000/api/restaurant/location', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-auth-token': token
        },
        body: JSON.stringify(testCase.data)
      });
      
      console.log('📊 Response status:', locationResponse.status);
      
      const responseData = await locationResponse.json();
      console.log('📄 Response data:', responseData);
      
      if (locationResponse.ok) {
        console.log('✅ Request successful!');
      } else {
        console.log('❌ Request failed!');
      }
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testFlutterRequest(); 