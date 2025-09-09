const mongoose = require('mongoose');
const Order = require('./models/order');

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/amzone', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// Function to fix order dates
const fixOrderDates = async () => {
  try {
    console.log('🔧 Fixing order dates...');
    
    // Find orders without orderAt or with invalid orderAt
    const ordersToFix = await Order.find({
      $or: [
        { orderAt: { $exists: false } },
        { orderAt: null },
        { orderAt: { $type: "invalid" } }
      ]
    });
    
    console.log(`📋 Found ${ordersToFix.length} orders to fix`);
    
    for (let i = 0; i < ordersToFix.length; i++) {
      const order = ordersToFix[i];
      console.log(`🔧 Fixing order ${i + 1}/${ordersToFix.length}: ${order._id}`);
      
      // Set orderAt to current time if it doesn't exist
      const updateData = {
        orderAt: Date.now()
      };
      
      await Order.findByIdAndUpdate(order._id, updateData);
      console.log(`✅ Fixed order ${order._id} with current timestamp`);
    }
    
    // Also check all orders and ensure they have valid orderAt
    const allOrders = await Order.find();
    console.log(`\n📋 Checking all ${allOrders.length} orders...`);
    
    for (let i = 0; i < allOrders.length; i++) {
      const order = allOrders[i];
      console.log(`📦 Order ${i + 1}: ${order._id}`);
      
      if (order.orderAt) {
        const orderDate = new Date(order.orderAt);
        if (!isNaN(orderDate.getTime())) {
          console.log(`✅ Valid date: ${orderDate.toLocaleString('ar-SA')}`);
        } else {
          console.log(`❌ Invalid date: ${order.orderAt}`);
          
          // Fix invalid date
          await Order.findByIdAndUpdate(order._id, { orderAt: Date.now() });
          console.log(`✅ Fixed invalid date for order ${order._id}`);
        }
      } else {
        console.log(`❌ No orderAt found`);
        
        // Add orderAt
        await Order.findByIdAndUpdate(order._id, { orderAt: Date.now() });
        console.log(`✅ Added orderAt for order ${order._id}`);
      }
    }
    
    console.log('\n🎉 Order dates fixed successfully!');
    
    // Show sample of fixed orders
    const sampleOrders = await Order.find().limit(3);
    console.log('\n📊 Sample of fixed orders:');
    sampleOrders.forEach(order => {
      const orderDate = new Date(order.orderAt);
      console.log(`Order ID: ${order.orderId || order._id}`);
      console.log(`Date: ${orderDate.toLocaleString('ar-SA')}`);
      console.log('---');
    });
    
  } catch (error) {
    console.error('❌ Error fixing order dates:', error);
  } finally {
    mongoose.connection.close();
  }
};

// Run the fix
console.log('🚀 Fixing Order Dates');
console.log('=====================');
fixOrderDates(); 