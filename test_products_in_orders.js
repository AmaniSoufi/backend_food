const mongoose = require('mongoose');
const Order = require('./models/order');
const Product = require('./models/product');

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/amzone', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// Test function to check products in orders
const testProductsInOrders = async () => {
  try {
    console.log('🧪 Testing products in orders...');
    
    // Get recent orders
    const recentOrders = await Order.find()
      .sort({ orderAt: -1 })
      .limit(5);
    
    console.log(`📋 Found ${recentOrders.length} recent orders`);
    
    for (let i = 0; i < recentOrders.length; i++) {
      const order = recentOrders[i];
      console.log(`\n📦 Order ${i + 1}: ${order.orderId || order._id}`);
      console.log('========================');
      
      if (order.products && order.products.length > 0) {
        console.log(`Products (${order.products.length}):`);
        
        for (let j = 0; j < order.products.length; j++) {
          const product = order.products[j];
          console.log(`  ${j + 1}. Product ID: ${product.product}`);
          
          if (product.productName) {
            console.log(`     Name: ${product.productName}`);
          } else {
            console.log(`     Name: ❌ Missing`);
          }
          
          if (product.productPrice) {
            console.log(`     Price: ${product.productPrice}`);
          } else {
            console.log(`     Price: ❌ Missing`);
          }
          
          console.log(`     Quantity: ${product.quantity}`);
          
          // Try to get product details from database
          try {
            const productDetails = await Product.findById(product.product);
            if (productDetails) {
              console.log(`     Database Name: ${productDetails.name}`);
              console.log(`     Database Price: ${productDetails.price}`);
              
              // Check if names match
              if (product.productName && product.productName !== productDetails.name) {
                console.log(`     ⚠️ Name mismatch: Order="${product.productName}" vs DB="${productDetails.name}"`);
              }
              
              if (product.productPrice && product.productPrice !== productDetails.price) {
                console.log(`     ⚠️ Price mismatch: Order=${product.productPrice} vs DB=${productDetails.price}`);
              }
            } else {
              console.log(`     ❌ Product not found in database`);
            }
          } catch (error) {
            console.log(`     ❌ Error fetching product: ${error.message}`);
          }
          
          console.log('');
        }
      } else {
        console.log('❌ No products found in order');
      }
      
      console.log(`Total Price: ${order.totalPrice}`);
      console.log(`Phone: ${order.phone}`);
      console.log('---');
    }
    
    // Test creating a new order with product names
    console.log('\n🧪 Testing new order creation with product names...');
    
    // Get a sample product
    const sampleProduct = await Product.findOne();
    if (sampleProduct) {
      console.log(`Using sample product: ${sampleProduct.name} - ${sampleProduct.price}`);
      
      // Create a test order
      const testOrder = new Order({
        products: [
          {
            product: sampleProduct._id,
            quantity: 2,
            productName: sampleProduct.name,
            productPrice: sampleProduct.price,
          }
        ],
        totalPrice: sampleProduct.price * 2,
        address: 'Test Address',
        phone: '0555123456',
        orderAt: Date.now(),
        deliveryPrice: 100,
        deliveryDistance: 1.5,
      });
      
      const savedOrder = await testOrder.save();
      console.log('✅ Test order created successfully!');
      console.log(`Order ID: ${savedOrder.orderId}`);
      console.log(`Product Name: ${savedOrder.products[0].productName}`);
      console.log(`Product Price: ${savedOrder.products[0].productPrice}`);
      
      // Clean up - delete test order
      await Order.findByIdAndDelete(savedOrder._id);
      console.log('🧹 Test order cleaned up');
      
    } else {
      console.log('❌ No products found in database for testing');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    mongoose.connection.close();
  }
};

// Run the test
console.log('🚀 Testing Products in Orders');
console.log('============================');
testProductsInOrders(); 