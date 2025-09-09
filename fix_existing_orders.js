const mongoose = require('mongoose');
const Order = require('./models/order');

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/amzone', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// Function to generate short order ID
const generateOrderId = async () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let orderId;
  let isUnique = false;
  
  while (!isUnique) {
    const randomChar = chars.charAt(Math.floor(Math.random() * chars.length));
    const randomNumbers = Math.floor(Math.random() * 1000000).toString().padStart(6, '0');
    orderId = randomChar + randomNumbers;
    
    // Check if orderId already exists
    const existingOrder = await Order.findOne({ orderId: orderId });
    if (!existingOrder) {
      isUnique = true;
    }
  }
  
  return orderId;
};

// Function to fix existing orders
const fixExistingOrders = async () => {
  try {
    console.log('🔧 Starting to fix existing orders...');
    
    // Find all orders without orderId
    const ordersToFix = await Order.find({ orderId: { $exists: false } });
    console.log(`📋 Found ${ordersToFix.length} orders to fix`);
    
    for (let i = 0; i < ordersToFix.length; i++) {
      const order = ordersToFix[i];
      console.log(`🔧 Fixing order ${i + 1}/${ordersToFix.length}: ${order._id}`);
      
      // Generate short order ID
      const orderId = await generateOrderId();
      
      // Update order with new orderId and fix phone number format
      const updateData = {
        orderId: orderId,
        totalPrice: Math.round(order.totalPrice * 100) / 100,
        deliveryPrice: Math.round(order.deliveryPrice * 100) / 100,
      };
      
      // If phone number exists but might need formatting
      if (order.phone) {
        // Ensure phone is a string and has proper format
        updateData.phone = order.phone.toString();
      }
      
      // Add product names and prices if they don't exist
      if (order.products && order.products.length > 0) {
        const Product = require('./models/product');
        const updatedProducts = [];
        
        for (const productItem of order.products) {
          try {
            const product = await Product.findById(productItem.product);
            if (product) {
              updatedProducts.push({
                product: productItem.product,
                quantity: productItem.quantity,
                productName: product.name,
                productPrice: product.price,
              });
              console.log(`📦 Added product info: ${product.name} - ${product.price}`);
            } else {
              updatedProducts.push(productItem);
            }
          } catch (error) {
            console.log(`⚠️ Could not fetch product info for ${productItem.product}`);
            updatedProducts.push(productItem);
          }
        }
        
        updateData.products = updatedProducts;
      }
      
      await Order.findByIdAndUpdate(order._id, updateData);
      console.log(`✅ Fixed order ${order._id} with orderId: ${orderId}`);
    }
    
    console.log('🎉 All orders have been fixed successfully!');
    
    // Show some examples of fixed orders
    const sampleOrders = await Order.find().limit(5);
    console.log('\n📊 Sample of fixed orders:');
    sampleOrders.forEach(order => {
      console.log(`Order ID: ${order.orderId || 'N/A'}, Phone: ${order.phone}, Total: ${order.totalPrice}`);
    });
    
  } catch (error) {
    console.error('❌ Error fixing orders:', error);
  } finally {
    mongoose.connection.close();
  }
};

// Run the fix
fixExistingOrders(); 