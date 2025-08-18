const axios = require('axios');

async function testLocationAPI() {
    try {
        console.log('🔍 Testing location API...');
        
        // First, login to get a token
        const loginResponse = await axios.post('http://localhost:3000/api/signin', {
            email: 'xcvbn@gmail.com',
            password: 'xcvbn'
        });
        
        const token = loginResponse.data.token;
        console.log('✅ Login successful, token received');
        
        // Test location update
        const locationData = {
            latitude: 25.2048,
            longitude: 55.2708
        };
        
        console.log('📍 Sending location data:', locationData);
        
        const locationResponse = await axios.put('http://localhost:3000/delivery/location', 
            locationData,
            {
                headers: {
                    'Content-Type': 'application/json',
                    'x-auth-token': token
                }
            }
        );
        
        console.log('✅ Location API response:', locationResponse.data);
        console.log('✅ Status code:', locationResponse.status);
        
    } catch (error) {
        console.error('❌ API test error:');
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Data:', error.response.data);
        } else {
            console.error('Error:', error.message);
        }
    }
}

testLocationAPI(); 