const mongoose = require('mongoose');
const Order = require('./models/order');

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/amzone', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// Debug function to check orders data
const debugOrders = async () => {
  try {
    console.log('🔍 Debugging orders data...');
    
    // Get all orders
    const orders = await Order.find().limit(5);
    console.log(`📋 Found ${orders.length} orders`);
    
    for (let i = 0; i < orders.length; i++) {
      const order = orders[i];
      console.log(`\n📦 Order ${i + 1}: ${order._id}`);
      console.log('========================');
      
      // Check raw data
      console.log(`📅 Raw orderAt: ${order.orderAt}`);
      console.log(`📅 Type of orderAt: ${typeof order.orderAt}`);
      
      // Check if orderAt exists
      if (order.orderAt) {
        console.log(`✅ orderAt exists`);
        
        // Try to parse the date
        try {
          const orderDate = new Date(order.orderAt);
          console.log(`📅 Parsed date: ${orderDate}`);
          console.log(`📅 Is valid date: ${!isNaN(orderDate.getTime())}`);
          
          if (!isNaN(orderDate.getTime())) {
            // Format the date
            const formattedDate = orderDate.toLocaleDateString('ar-SA', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            });
            const formattedTime = orderDate.toLocaleTimeString('ar-SA', {
              hour: '2-digit',
              minute: '2-digit',
            });
            
            console.log(`📅 Formatted date: ${formattedDate}`);
            console.log(`🕐 Formatted time: ${formattedTime}`);
            console.log(`📅 ISO string: ${orderDate.toISOString()}`);
          } else {
            console.log(`❌ Invalid date: ${orderDate}`);
          }
        } catch (error) {
          console.log(`❌ Error parsing date: ${error.message}`);
        }
      } else {
        console.log(`❌ No orderAt found`);
      }
      
      // Check other fields
      console.log(`📞 Phone: ${order.phone}`);
      console.log(`💰 Total Price: ${order.totalPrice}`);
      console.log(`🚚 Delivery Price: ${order.deliveryPrice}`);
      console.log(`🏪 Restaurant ID: ${order.restaurantId}`);
      
      // Check products
      if (order.products && order.products.length > 0) {
        console.log(`📦 Products (${order.products.length}):`);
        order.products.forEach((product, index) => {
          console.log(`  ${index + 1}. ${product.productName || 'No name'} - ${product.productPrice || 0} DA`);
        });
      } else {
        console.log(`❌ No products found`);
      }
      
      console.log('---');
    }
    
    // Test creating a new order with current timestamp
    console.log('\n🧪 Testing new order creation...');
    const currentTimestamp = Date.now();
    console.log(`📅 Current timestamp: ${currentTimestamp}`);
    console.log(`📅 Current date: ${new Date(currentTimestamp).toLocaleString('ar-SA')}`);
    
  } catch (error) {
    console.error('❌ Debug failed:', error);
  } finally {
    mongoose.connection.close();
  }
};

// Run the debug
console.log('🚀 Debugging Orders Data');
console.log('========================');
debugOrders(); 