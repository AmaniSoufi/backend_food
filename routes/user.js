const express = require('express');
const auth = require('../middlewares/auth');
const { Product } = require('../models/product');
const User = require('../models/user');
const Order = require('../models/order');
const userRouter = express.Router();

// Add to cart
userRouter.post('/api/add-to-cart', auth, async (req, res) => {
  try {
    const { id } = req.body;
    const product = await Product.findById(id);
    
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    let user = await User.findById(req.user);
    
    if (user.cart.length == 0) {
      user.cart.push({ product, quantity: 1 });
    } else {
      // Check if the product already exists in the cart
      let isProductFound = false;
      for (let i = 0; i < user.cart.length; i++) {
        if (user.cart[i].product._id.equals(product._id)) {
          isProductFound = true;
          user.cart[i].quantity += 1;
          break;
        }
      }
      
      if (!isProductFound) {
        user.cart.push({ product, quantity: 1 });
      }
    }
    
    user = await user.save();
    
    // Populate the cart with full product details including restaurant before sending response
    await user.populate({
      path: 'cart.product',
      populate: {
        path: 'restaurant',
        model: 'Restaurant'
      }
    });
    
    res.json({ cart: user.cart });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Get cart
userRouter.get('/api/cart', auth, async (req, res) => {
  try {
    // populate get all the informations of product including restaurant
    const user = await User.findById(req.user).populate({
      path: 'cart.product',
      populate: {
        path: 'restaurant',
        model: 'Restaurant'
      }
    });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Delivery price calculation logic (copied from order endpoint)
    let deliveryPrice = 0;
    let latitude = user.latitude;
    let longitude = user.longitude;
    let address = user.address;

    // If user has address and coordinates, calculate delivery price
    if (address && latitude && longitude) {
      try {
        const Restaurant = require('../models/restaurant');
        const restaurant = await Restaurant.findOne({ isActive: true });
        if (restaurant && restaurant.latitude && restaurant.longitude) {
          const { calculateDistance, calculateDeliveryPrice } = require('../utils/delivery');
          const distance = calculateDistance(
            { latitude: restaurant.latitude, longitude: restaurant.longitude },
            { latitude: latitude, longitude: longitude }
          );
          deliveryPrice = calculateDeliveryPrice(distance);
        }
      } catch (e) {
        deliveryPrice = 0;
      }
    }

    res.status(200).json({ cart: user.cart, deliveryPrice });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to load cart' });
  }
});
  

// Remove from cart
userRouter.delete('/api/remove-from-cart/:id', auth, async (req , res) => {
    // params is get from the url the id ( /:id )
    const {id} = req.params;
    let user = await User.findById(req.user);
    if (!user){
        return res.status(404).json({error : 'User not found '});
    }
    // filte is a function in js return a specific condition
    // here the countition is i want all the items that not equal to the id that i want to remove 
    user.cart = user.cart.filter(item => !item.product._id.equals(id));

    user = await user.save();
    await user.populate({
      path: 'cart.product',
      populate: {
        path: 'restaurant',
        model: 'Restaurant'
      }
    });
    res.json({cart : user.cart});
});

// Decrease quantity (optional - for better UX)
userRouter.post('/api/decrease-cart-quantity', auth, async (req, res) => {
  try {
    const { id } = req.body;
    let user = await User.findById(req.user);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Find the product in cart and decrease quantity
    for (let i = 0; i < user.cart.length; i++) {
      if (user.cart[i].product._id.equals(id)) {
        if (user.cart[i].quantity > 1) {
          user.cart[i].quantity -= 1;
        } else {
          // Remove item if quantity becomes 0
          user.cart.splice(i, 1);
        }
        break;
      }
    }
    
    user = await user.save();
    await user.populate({
      path: 'cart.product',
      populate: {
        path: 'restaurant',
        model: 'Restaurant'
      }
    });
    
    res.json({ cart: user.cart });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

userRouter.post('/api/save-user-address', auth, async (req, res) => {
  try {
    const { address } = req.body;
    let user = await User.findById(req.user);
    
    if (!user) {
      return res.status(404).json({ error: 'User Not Found' });
    }

    user.address = address;
    user = await user.save();

    res.json(user);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});


userRouter.post('/api/order', auth, async (req, res) => {
  try {
    console.log('🚚 ORDER CREATION STARTED');
    console.log('🚚 Request Body:', req.body);
    console.log('🚚 Phone from request:', req.body.phone);
    
    const { cart, totalPrice, address, latitude, longitude, deliveryPrice, deliveryDistance, restaurantId, phone } = req.body;
    let products = [];
    let detectedRestaurantId = null;

    for (let i = 0; i < cart.length; i++) {
      // get the product id of the product item
      let product = await Product.findById(cart[i].product._id);
      if (!detectedRestaurantId && product.restaurant) {
        detectedRestaurantId = product.restaurant.toString();
      }
      if (restaurantId && product.restaurant && product.restaurant.toString() !== restaurantId) {
        return res.status(400).json({ msg: 'All products in the order must be from the same restaurant.' });
      }
      
      // إضافة المنتج للطلب مع اسم المنتج وسعره
      products.push({
        product: product._id,
        quantity: cart[i].quantity,
        productName: product.name, // حفظ اسم المنتج
        productPrice: product.price, // حفظ سعر المنتج
      });
      
      console.log(`📦 Product added to order: ${product.name} - Quantity: ${cart[i].quantity} - Price: ${product.price}`);
    }

    let user = await User.findById(req.user);
    // Check minimum order price
    if (user.restaurant) {
      const Restaurant = require('../models/restaurant');
      const restaurant = await Restaurant.findById(user.restaurant);
      if (restaurant && restaurant.minimumOrderPrice && totalPrice < restaurant.minimumOrderPrice) {
        return res.status(400).json({ msg: `Minimum order price is $${restaurant.minimumOrderPrice}` });
      }
    }
    // empty the cart after the order sucesse
    user.cart = [];
    user = await user.save();

    console.log('🚚 User phone from database:', user.phone);
    console.log('🚚 Phone from request body:', phone);
    console.log('🚚 Final phone to be saved:', phone || user.phone);

    let order = new Order({
      products ,
      totalPrice ,
      address ,
      userId : req.user ,
      orderAt : new Date().getTime(),
      phone: phone || user.phone, // استخدام رقم الهاتف المدخل من المستخدم أو رقم الهاتف المحفوظ
      latitude: latitude,
      longitude: longitude,
      deliveryPrice: deliveryPrice || 0,
      deliveryDistance: deliveryDistance || 0,
      restaurantId: restaurantId || detectedRestaurantId,
    });

    order = await order.save();
    
    console.log('🚚 ORDER SAVED SUCCESSFULLY');
    console.log('🚚 Order ID:', order._id);
    console.log('🚚 Short Order ID:', order.orderId);
    console.log('🚚 Restaurant ID:', order.restaurantId);
    console.log('🚚 Phone saved:', order.phone);
    
    // Send notification to admin about new order
    try {
      // Get restaurant admin users
      const Restaurant = require('../models/restaurant');
      const restaurant = await Restaurant.findById(restaurantId || detectedRestaurantId);
      
      if (restaurant) {
        // Find admin users for this restaurant
        const adminUsers = await User.find({ 
          restaurant: restaurant._id, 
          type: 'admin' 
        });
        
        // Log order notification for admin
        console.log('🚚 NEW ORDER NOTIFICATION:');
        console.log('🚚 Order ID:', order._id);
        console.log('🚚 Restaurant:', restaurant.name);
        console.log('🚚 Customer Address:', address);
        console.log('🚚 Delivery Distance:', deliveryDistance, 'km');
        console.log('🚚 Delivery Price:', deliveryPrice);
        console.log('🚚 Total Price:', totalPrice);
        console.log('🚚 Customer Location:', `${latitude}, ${longitude}`);
        console.log('🚚 Admin Users to notify:', adminUsers.length);
        
        // Send FCM notifications to admin users
        const { sendNewOrderNotification } = require('./fcm_admin');
        
        try {
          await sendNewOrderNotification(order._id.toString(), restaurant._id.toString());
          console.log('✅ FCM notification sent successfully');
        } catch (fcmError) {
          console.error('❌ Error sending FCM notification:', fcmError);
        }
        
        adminUsers.forEach(admin => {
          console.log(`🚚 Notifying admin: ${admin.name} (${admin.email})`);
        });
      }
    } catch (notificationError) {
      console.error('Error sending admin notification:', notificationError);
      // Don't fail the order if notification fails
    }
    
    res.json(order);

  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});



// Backend Route - Populate products with full data and restaurant info
userRouter.get('/api/orders/me', auth, async (req, res) => {
  try {
    console.log('User ID from token:', req.user);
    
    // Populate the product field with full product data and restaurant info
    let orders = await Order.find({ userId: req.user })
      .populate('products.product')  // This will replace the product ID with full product object
      .populate('restaurantId')      // This will populate restaurant info
      .exec();
    
    console.log('Found orders:', orders.length);
    console.log('Orders status breakdown:');
    orders.forEach(order => {
      console.log(`Order ${order._id}: status = ${order.status}`);
    });
    
    // Transform orders to ensure images are included and add restaurant name
    const transformedOrders = orders.map(order => {
      const orderObj = order.toObject();
      
      console.log(`📅 Processing order: ${orderObj._id}`);
      console.log(`📅 Original orderAt: ${orderObj.orderAt}`);
      
      // Add restaurant name
      orderObj.restaurantName = orderObj.restaurantId?.name || 'مطعم غير محدد';
      
      // Add formatted date and time
      if (orderObj.orderAt) {
        const orderDate = new Date(orderObj.orderAt);
        console.log(`📅 Parsed date: ${orderDate}`);
        
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
        
        console.log(`📅 Formatted date: ${orderObj.formattedDate}`);
        console.log(`🕐 Formatted time: ${orderObj.formattedTime}`);
        console.log(`📅 ISO date: ${orderObj.orderDateTime}`);
      } else {
        console.log(`❌ No orderAt found for order: ${orderObj._id}`);
        orderObj.formattedDate = 'غير متوفر';
        orderObj.formattedTime = 'غير متوفر';
        orderObj.orderDateTime = null;
      }
      
      // Transform products array to match frontend structure
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
      
      return orderObj;
    });
    
    res.json(transformedOrders);
  } catch(e) {
    console.error('Error fetching orders:', e);
    res.status(500).json({error: e.message});
  }
});

// Get user profile
userRouter.get('/api/user/profile', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({
      id: user._id,
      name: user.name,
      email: user.email,
      type: user.type,
      restaurant: user.restaurant,
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// API endpoint لإرسال إشعار لصاحب المطعم
userRouter.post('/api/order/notify-restaurant', auth, async (req, res) => {
  try {
    console.log('🔔 NOTIFICATION ENDPOINT CALLED');
    console.log('🔔 Request Body:', req.body);
    
    const { orderId, orderData, customerName, customerEmail, totalAmount, deliveryAddress } = req.body;
    
    // البحث عن المطعم المرتبط بالطلب
    const order = await Order.findById(orderId).populate('products.product');
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // الحصول على معرف المطعم من الطلب
    const restaurantId = order.restaurantId;
    if (!restaurantId) {
      return res.status(400).json({ error: 'No restaurant associated with this order' });
    }

    // البحث عن المطعم
    const Restaurant = require('../models/restaurant');
    const restaurant = await Restaurant.findById(restaurantId);
    if (!restaurant) {
      return res.status(404).json({ error: 'Restaurant not found' });
    }

    // البحث عن صاحب المطعم (admin users)
    const adminUsers = await User.find({ 
      restaurant: restaurantId, 
      type: 'admin' 
    });

    if (adminUsers.length === 0) {
      return res.status(404).json({ error: 'No admin users found for this restaurant' });
    }

    // استيراد دالة إنشاء الإشعارات
    const { createNotification } = require('./notification.js');

    // إنشاء إشعارات لجميع أصحاب المطعم
    const notifications = [];
    for (const admin of adminUsers) {
      const notification = await createNotification(
        admin._id,
        'order',
        'طلب جديد! 🍕',
        `طلب جديد من ${customerName} بقيمة ${totalAmount} DA`,
        orderId,
        restaurantId,
        {
          customerName,
          customerEmail,
          totalAmount,
          deliveryAddress,
          restaurantName: restaurant.name,
          orderDetails: orderData
        }
      );
      
      if (notification) {
        notifications.push(notification);
      }
    }

    // تسجيل الإشعارات في قاعدة البيانات
    console.log('🔔 RESTAURANT NOTIFICATION SENT:');
    console.log('🔔 Restaurant:', restaurant.name);
    console.log('🔔 Order ID:', orderId);
    console.log('🔔 Customer:', customerName);
    console.log('🔔 Total Amount:', totalAmount);
    console.log('🔔 Delivery Address:', deliveryAddress);
    console.log('🔔 Admin Users Notified:', adminUsers.length);
    console.log('🔔 Notifications Created:', notifications.length);
    
    adminUsers.forEach(admin => {
      console.log(`🔔 Notifying admin: ${admin.name} (${admin.email})`);
    });

    // إرسال FCM push notification لصاحب المطعم
    try {
      const { sendNewOrderNotification } = require('./fcm_admin');
      await sendNewOrderNotification(orderId, restaurantId);
      console.log('✅ FCM push notification sent successfully');
    } catch (fcmError) {
      console.error('❌ Error sending FCM push notification:', fcmError);
      // لا نريد أن نفشل العملية إذا فشل FCM
    }

    res.json({ 
      success: true, 
      message: 'Restaurant notification sent successfully',
      notifications: notifications,
      restaurantName: restaurant.name,
      adminUsersCount: adminUsers.length,
      notificationsCreated: notifications.length
    });

  } catch (e) {
    console.error('Error sending restaurant notification:', e);
    res.status(500).json({ error: e.message });
  }
});

module.exports = userRouter;