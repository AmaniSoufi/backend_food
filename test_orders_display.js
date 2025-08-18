const mongoose = require('mongoose');
const Order = require('./models/order');
const Restaurant = require('./models/restaurant');

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/amzone', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// Test function to check orders display
const testOrdersDisplay = async () => {
  try {
    console.log('🧪 Testing orders display with product names and restaurant...');
    
    // Get recent orders with populated data
    const recentOrders = await Order.find()
      .populate('products.product')
      .populate('restaurantId')
      .sort({ orderAt: -1 })
      .limit(3);
    
    console.log(`📋 Found ${recentOrders.length} recent orders`);
    
    for (let i = 0; i < recentOrders.length; i++) {
      const order = recentOrders[i];
      console.log(`\n📦 Order ${i + 1}: ${order.orderId || order._id}`);
      console.log('========================');
      
      // Check restaurant info
      if (order.restaurantId) {
        console.log(`🏪 Restaurant: ${order.restaurantId.name}`);
        console.log(`📍 Restaurant Address: ${order.restaurantId.address}`);
      } else {
        console.log('❌ No restaurant info');
      }
      
      // Check products
      if (order.products && order.products.length > 0) {
        console.log(`\n📦 Products (${order.products.length}):`);
        
        for (let j = 0; j < order.products.length; j++) {
          const product = order.products[j];
          console.log(`  ${j + 1}. Product ID: ${product.product}`);
          
          // Check product name
          if (product.productName) {
            console.log(`     Name (saved): ${product.productName}`);
          } else {
            console.log(`     Name (saved): ❌ Missing`);
          }
          
          // Check product price
          if (product.productPrice) {
            console.log(`     Price (saved): ${product.productPrice}`);
          } else {
            console.log(`     Price (saved): ❌ Missing`);
          }
          
          console.log(`     Quantity: ${product.quantity}`);
          
          // Check if product exists in database
          if (product.product) {
            console.log(`     Name (from DB): ${product.product.name}`);
            console.log(`     Price (from DB): ${product.product.price}`);
            
            // Check if names match
            if (product.productName && product.productName !== product.product.name) {
              console.log(`     ⚠️ Name mismatch: Saved="${product.productName}" vs DB="${product.product.name}"`);
            }
            
            if (product.productPrice && product.productPrice !== product.product.price) {
              console.log(`     ⚠️ Price mismatch: Saved=${product.productPrice} vs DB=${product.product.price}`);
            }
          } else {
            console.log(`     ❌ Product not found in database`);
          }
          
          console.log('');
        }
      } else {
        console.log('❌ No products found in order');
      }
      
      console.log(`📅 Order Date: ${order.orderAt ? new Date(order.orderAt).toLocaleString('ar-SA') : 'غير متوفر'}`);
      console.log(`📞 Phone: ${order.phone}`);
      console.log(`💰 Total Price: ${order.totalPrice}`);
      console.log(`🚚 Delivery Price: ${order.deliveryPrice}`);
      console.log('---');
    }
    
    // Test API response format
    console.log('\n🧪 Testing API response format...');
    
    // Simulate the API response transformation
    const transformedOrders = recentOrders.map(order => {
      const orderObj = order.toObject();
      
      // Add restaurant name
      orderObj.restaurantName = orderObj.restaurantId?.name || 'مطعم غير محدد';
      
      // Transform products array
      orderObj.products = orderObj.products.map(item => {
        if (!item.product) {
          return { 
            quantity: item.quantity,
            productName: item.productName || 'منتج غير متوفر',
            productPrice: item.productPrice || 0
          };
        }
        return {
          ...item.product,
          quantity: item.quantity,
          productName: item.productName || item.product.name || 'منتج غير متوفر',
          productPrice: item.productPrice || item.product.price || 0
        };
      });
      
      // Add formatted date and time
      if (orderObj.orderAt) {
        const orderDate = new Date(orderObj.orderAt);
        orderObj.formattedDate = orderDate.toLocaleDateString('ar-SA', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        });
        orderObj.formattedTime = orderDate.toLocaleTimeString('ar-SA', {
          hour: '2-digit',
          minute: '2-digit',
        });
        orderObj.orderDateTime = orderDate.toISOString();
      } else {
        orderObj.formattedDate = 'غير متوفر';
        orderObj.formattedTime = 'غير متوفر';
        orderObj.orderDateTime = null;
      }
      
      return orderObj;
    });
    
    console.log('✅ API Response Format:');
    console.log(JSON.stringify(transformedOrders[0], null, 2));
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    mongoose.connection.close();
  }
};

// Run the test
console.log('🚀 Testing Orders Display');
console.log('========================');
testOrdersDisplay(); 