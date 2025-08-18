const mongoose = require('mongoose');
const Order = require('./models/order');

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/amzone', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// Test function to check date and time formatting
const testDateTimeFormatting = async () => {
  try {
    console.log('🧪 Testing date and time formatting...');
    
    // Get recent orders
    const recentOrders = await Order.find()
      .sort({ orderAt: -1 })
      .limit(3);
    
    console.log(`📋 Found ${recentOrders.length} recent orders`);
    
    for (let i = 0; i < recentOrders.length; i++) {
      const order = recentOrders[i];
      console.log(`\n📦 Order ${i + 1}: ${order.orderId || order._id}`);
      console.log('========================');
      
      // Check original orderAt
      console.log(`📅 Original orderAt: ${order.orderAt}`);
      
      // Format date and time
      if (order.orderAt) {
        const orderDate = new Date(order.orderAt);
        
        // Arabic date formatting
        const formattedDate = orderDate.toLocaleDateString('ar-SA', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        });
        
        // Arabic time formatting
        const formattedTime = orderDate.toLocaleTimeString('ar-SA', {
          hour: '2-digit',
          minute: '2-digit',
        });
        
        // ISO string
        const orderDateTime = orderDate.toISOString();
        
        console.log(`📅 Formatted Date (Arabic): ${formattedDate}`);
        console.log(`🕐 Formatted Time (Arabic): ${formattedTime}`);
        console.log(`📅 ISO DateTime: ${orderDateTime}`);
        console.log(`📅 Local DateTime: ${orderDate.toLocaleString('ar-SA')}`);
        
        // Test different date formats
        console.log('\n📅 Different Date Formats:');
        console.log(`   English: ${orderDate.toLocaleDateString('en-US')}`);
        console.log(`   Arabic: ${orderDate.toLocaleDateString('ar-SA')}`);
        console.log(`   ISO: ${orderDate.toISOString()}`);
        console.log(`   Unix Timestamp: ${orderDate.getTime()}`);
        
      } else {
        console.log('❌ No orderAt found');
      }
      
      console.log('---');
    }
    
    // Test creating a new order with current timestamp
    console.log('\n🧪 Testing new order with current timestamp...');
    
    const currentTimestamp = Date.now();
    const testOrder = new Order({
      products: [],
      totalPrice: 100,
      address: 'Test Address',
      phone: '0555123456',
      orderAt: currentTimestamp,
      deliveryPrice: 50,
      deliveryDistance: 1.0,
    });
    
    console.log(`📅 Current Timestamp: ${currentTimestamp}`);
    console.log(`📅 Date from Timestamp: ${new Date(currentTimestamp).toLocaleString('ar-SA')}`);
    
    // Clean up - don't save the test order
    console.log('🧹 Test order not saved (cleanup)');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    mongoose.connection.close();
  }
};

// Run the test
console.log('🚀 Testing Date and Time Formatting');
console.log('==================================');
testDateTimeFormatting(); 