const mongoose = require('mongoose');
const User = require('./models/user');
const Order = require('./models/order');
const Product = require('./models/product');
const Restaurant = require('./models/restaurant');

// Connect to MongoDB
mongoose.connect("mongodb+srv://imene:04042004irir@cluster0.htrt15u.mongodb.net/myDatabase?retryWrites=true&w=majority")
  .then(() => {
    console.log("✅ Connected to MongoDB");
    testRealOrder();
  })
  .catch((e) => {
    console.log("❌ MongoDB connection failed:", e);
  });

const testRealOrder = async () => {
  try {
    console.log('🧪 Testing real order creation...');
    
    // Find a restaurant admin
    const adminUser = await User.findOne({ type: 'admin' });
    if (!adminUser) {
      console.log('❌ No admin user found');
      return;
    }
    
    console.log('✅ Found admin user:', adminUser.email);
    console.log('✅ Admin FCM token:', adminUser.fcmToken ? 'EXISTS' : 'NOT FOUND');
    
    // Find a product from this restaurant
    const product = await Product.findOne({ restaurant: adminUser.restaurant });
    if (!product) {
      console.log('❌ No products found for this restaurant');
      return;
    }
    
    console.log('✅ Found product:', product.name);
    
    // Find a regular user
    const regularUser = await User.findOne({ type: 'user' });
    if (!regularUser) {
      console.log('❌ No regular user found');
      return;
    }
    
    console.log('✅ Found regular user:', regularUser.email);
    
    // Create a test order
    const orderData = {
      products: [{
        product: product._id,
        quantity: 2,
        productName: product.name,
        productPrice: product.price,
      }],
      totalPrice: product.price * 2,
      address: 'Test Address',
      userId: regularUser._id,
      orderAt: new Date().getTime(),
      phone: regularUser.phone,
      latitude: 32.570303,
      longitude: 1.1259581,
      deliveryPrice: 100,
      deliveryDistance: 5,
      restaurantId: adminUser.restaurant,
    };
    
    console.log('📦 Creating order with data:', orderData);
    
    const order = new Order(orderData);
    const savedOrder = await order.save();
    
    console.log('✅ Order created successfully!');
    console.log('✅ Order ID:', savedOrder._id);
    console.log('✅ Restaurant ID:', savedOrder.restaurantId);
    
    // Now trigger the notification
    const { sendNewOrderNotification } = require('./routes/fcm_admin');
    
    console.log('🔔 Triggering notification...');
    await sendNewOrderNotification(savedOrder._id.toString(), savedOrder.restaurantId.toString());
    
    console.log('✅ Test completed successfully!');
    
  } catch (error) {
    console.error('❌ Error in test:', error);
  } finally {
    mongoose.connection.close();
  }
}; 