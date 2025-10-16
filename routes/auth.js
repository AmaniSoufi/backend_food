const express = require("express");
const User = require("../models/user");
const authRouter = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const auth = require("../middlewares/auth");

console.log('Auth router file loaded');

// PUT SIGNIN FIRST
authRouter.post('/api/signin', async (req, res) => {
  console.log('🔥 Signin route hit - FIRST ROUTE');
  console.log('Request body:', req.body);
  
  try {
    let {phone, password} = req.body; // phone is required for signin
    
    // Debug logging
    console.log('Phone from request:', phone);
    console.log('Password from request:', password);
    console.log('Password length:', password?.length);
    
    // Normalize phone to handle leading zero, country code, and spaces
    const rawPhone = (phone || '').toString().trim();
    const onlyDigits = rawPhone.replace(/\D/g, '');
    const withLeadingZero = onlyDigits.startsWith('0') ? onlyDigits : `0${onlyDigits}`;
    const withoutLeadingZero = onlyDigits.startsWith('0') ? onlyDigits.substring(1) : onlyDigits;
    // Algeria example country code (213). Adjust or extend as needed.
    const withCountryCode = onlyDigits.startsWith('213') ? onlyDigits : `213${withoutLeadingZero}`;

    console.log('Normalized phones to try:', {
      rawPhone,
      onlyDigits,
      withLeadingZero,
      withoutLeadingZero,
      withCountryCode,
    });

    const user = await User.findOne({
      $or: [
        { phone: rawPhone },
        { phone: onlyDigits },
        { phone: withLeadingZero },
        { phone: withoutLeadingZero },
        { phone: `+${withCountryCode}` },
        { phone: withCountryCode },
      ],
    });
    console.log('User found:', user ? 'Yes' : 'No');
    
    if (!user) {
      console.log('❌ User not found with phone:', phone);
      return res.status(400).json({msg: "User with this phone number doesn't exist"});
    }
    
    console.log('Stored password hash:', user.password);
    console.log('Comparing passwords...');
    
    let isMatch = false;
    
    try {
      isMatch = await bcrypt.compare(password, user.password);
      console.log('Password match result (bcrypt):', isMatch);
    } catch (bcryptError) {
      console.log('⚠️ bcrypt failed, trying bcryptjs...');
      const bcryptjs = require('bcryptjs');
      isMatch = await bcryptjs.compare(password, user.password);
      console.log('Password match result (bcryptjs):', isMatch);
    }
    
    if (!isMatch) {
      console.log('❌ Password comparison failed');
      console.log('Input password:', password);
      console.log('Stored hash:', user.password);
      return res.status(400).json({msg: "Incorrect password"});
    }
    
    console.log('✅ Password match successful');
    const token = jwt.sign({id: user._id}, "passwordKey");
    return res.json({token, ...user._doc});
    
  } catch (e) {
    console.log('Signin Error:', e);
    return res.status(500).json({error: e.message});
  }
});

// PUT SIGNUP SECOND
authRouter.post('/api/signup', async (req, res) => {
  console.log('🔥 Signup route hit - SECOND ROUTE');
  console.log('🔥 Signup request body:', req.body);
  console.log('🔥 Request headers:', req.headers);
  
  try {
    const {name, password, phone, type, restaurantName} = req.body;
    
    // Debug logging for signup
    console.log('🔥 Signup data - Name:', name, 'Password length:', password?.length, 'Type:', type, 'RestaurantName:', restaurantName);
    console.log('🔥 Type check:', type === 'admin' ? 'IS ADMIN' : 'NOT ADMIN');
    
    if (!name || !password || !phone) {
      console.log('❌ Missing required fields');
      return res.status(400).json({msg: 'Missing required fields'});
    }
    
    // Check if phone number already exists
    const existPhone = await User.findOne({phone});
    if (existPhone) {
      console.log('❌ User already exists with phone:', phone);
      return res.status(400).json({msg: 'User with the same phone number exist'});
    }
    
    console.log('Hashing password...');
    const hashedPassword = await bcrypt.hash(password, 10);
    console.log('Password hashed successfully, hash length:', hashedPassword.length);
    
    let userData = {
      password: hashedPassword,
      name,
      phone,
      email: `user_${phone}@app.com`, // ✅ جعل email فريد باستخدام رقم الهاتف
      type: type || 'user',
      address: '', // ✅ إضافة address
      cart: [], // ✅ إضافة cart فارغ
      status: 'accepted', // ✅ default status للمستخدمين العاديين (سيتم تغييره للمطاعم والديليفري)
    };
    
    // If user is admin (restaurant owner), create a restaurant for them
    if (type === 'admin') {
      console.log('🔧 Creating restaurant for admin user...');
      console.log('🔧 Restaurant name:', restaurantName);
      
      try {
        const Restaurant = require('../models/restaurant');
        console.log('🔧 Restaurant model loaded successfully');
        
        // Create a new restaurant
        const restaurant = new Restaurant({
          name: restaurantName || `${name}'s Restaurant`,
          address: '',
          minimumOrderPrice: 0,
        });
        
        console.log('🔧 Restaurant object created:', restaurant);
        
        const savedRestaurant = await restaurant.save();
        console.log('✅ Restaurant created for admin:', savedRestaurant._id);
        console.log('✅ Restaurant data:', savedRestaurant);
        
        // Assign the restaurant to the user
        userData.restaurant = savedRestaurant._id;
        userData.status = 'pending'; // ✅ Admin needs approval from superadmin
        console.log('✅ User data updated with restaurant ID:', userData.restaurant);
        console.log('✅ Admin status set to: pending (waiting for superadmin approval)');
      } catch (restaurantError) {
        console.log('❌ Error creating restaurant:', restaurantError);
        console.log('❌ Error stack:', restaurantError.stack);
        throw restaurantError;
      }
    }
    
    if (type === 'delivery') {
      console.log('🔧 Setting delivery status to pending...');
      userData.status = 'pending';
      if (req.body.restaurantId) {
        userData.restaurant = req.body.restaurantId;
      }
      console.log('✅ Delivery user data prepared');
    }
    
    console.log('🔧 Creating user with data:', JSON.stringify(userData, null, 2));
    console.log('🔧 User data keys:', Object.keys(userData));
    
    try {
      let user = new User(userData);
      console.log('🔧 User object created, saving to database...');
      
      user = await user.save();
      console.log('✅ User created successfully:', user._id);
      console.log('✅ User data:', JSON.stringify(user, null, 2));
      
      // ✅ إنشاء token للمستخدم الجديد
      const token = jwt.sign({ id: user._id }, "passwordKey");
      console.log('✅ Token created for new user');
      
      // Send notification to superadmin if user is admin or delivery
      if (type === 'admin' || type === 'delivery') {
        try {
          const { sendNewRegistrationNotification } = require('./fcm');
          await sendNewRegistrationNotification(
            user._id.toString(),
            type,
            name,
            phone
          );
          console.log('✅ Registration notification sent to superadmin');
        } catch (notificationError) {
          console.error('❌ Error sending registration notification:', notificationError);
          // Don't fail the registration if notification fails
        }
      }
      
      // ✅ إرجاع بيانات المستخدم مع Token
      return res.json({
        token,
        ...user._doc
      });
    } catch (userSaveError) {
      console.log('❌ Error saving user to database:', userSaveError);
      console.log('❌ Error name:', userSaveError.name);
      console.log('❌ Error message:', userSaveError.message);
      console.log('❌ Error stack:', userSaveError.stack);
      
      // إذا كان المطعم تم إنشاءه، احذفه لتجنب المطاعم اليتيمة
      if (type === 'admin' && userData.restaurant) {
        console.log('🗑️ Cleaning up restaurant since user creation failed...');
        const Restaurant = require('../models/restaurant');
        await Restaurant.findByIdAndDelete(userData.restaurant);
        console.log('🗑️ Restaurant deleted');
      }
      
      throw userSaveError;
    }
    
  } catch (error) {
    console.log('Signup Error:', error);
    return res.status(500).json({msg: 'Server error', error: error.message});
  }
});

authRouter.post("/tokenIsValid" , async (req , res) => {
  try {
    const token = req.header('x-auth-token');

    // هذا يتحقق إذا كان token غير موجود
    if(!token) return res.json(false);

    // هذا يتحقق إذا كان التوكن موجود ولكن غير صالح 
    const verified = jwt.verify(token , "passwordKey" );
    if(!verified) return res.json(false);

    const user = await User.findById(verified.id);
    if(!user) return res.json(false);

    res.json(true);

  }catch(e){
    res.status(500).json({error:e.message});
  }
});

// the auth is middleware
authRouter.get('/' , auth , async (req , res) => { 
  const user = await User.findById(req.user); // we put req.user = token in the middleware 
    res.json({...user._doc , token : req.token});
  

} )

// Get user data (explicit route for /api/user)
authRouter.get('/api/user', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({...user._doc, token: req.token});
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Check if phone number exists
authRouter.post('/api/check-phone', async (req, res) => {
  console.log('🔍 Check phone route hit');
  console.log('📱 Phone to check:', req.body.phone);
  
  try {
    const {phone} = req.body;
    
    if (!phone) {
      console.log('❌ No phone provided');
      return res.status(400).json({msg: 'Phone number is required'});
    }
    
    const existPhone = await User.findOne({phone});
    console.log('📱 Phone exists:', existPhone ? 'Yes' : 'No');
    
    if (existPhone) {
      console.log('❌ Phone number already exists');
      return res.status(400).json({msg: 'User with the same phone number exist'});
    } else {
      console.log('✅ Phone number is available');
      return res.json({exists: false, msg: 'Phone number is available'});
    }
    
  } catch (error) {
    console.log('❌ Check phone error:', error);
    return res.status(500).json({msg: 'Server error', error: error.message});
  }
});

console.log('All routes registered');
module.exports = authRouter;