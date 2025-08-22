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
    const {email, password, phone} = req.body; // phone is optional for signin
    
    // Debug logging
    console.log('Email from request:', email);
    console.log('Password from request:', password);
    console.log('Password length:', password?.length);
    
    const user = await User.findOne({email});
    console.log('User found:', user ? 'Yes' : 'No');
    
    if (!user) {
      console.log('❌ User not found with email:', email);
      return res.status(400).json({msg: "User with this email doesn't exist"});
    }
    
    console.log('Stored password hash:', user.password);
    console.log('Comparing passwords...');
    
    const isMatch = await bcrypt.compare(password, user.password);
    console.log('Password match result:', isMatch);
    
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
    const {name, email, password, phone, type, restaurantName} = req.body;
    
    // Debug logging for signup
    console.log('🔥 Signup data - Name:', name, 'Email:', email, 'Password length:', password?.length, 'Type:', type, 'RestaurantName:', restaurantName);
    console.log('🔥 Type check:', type === 'admin' ? 'IS ADMIN' : 'NOT ADMIN');
    
    if (!name || !email || !password || !phone) {
      console.log('❌ Missing required fields');
      return res.status(400).json({msg: 'Missing required fields'});
    }
    
    const existUser = await User.findOne({email});
    if (existUser) {
      console.log('❌ User already exists with email:', email);
      return res.status(400).json({msg: 'User with the same email exist'});
    }
    
    console.log('Hashing password...');
    const hashedPassword = await bcrypt.hash(password, 10);
    console.log('Password hashed successfully, hash length:', hashedPassword.length);
    
    let userData = {
      email,
      password: hashedPassword,
      name,
      phone,
      type: type || 'user',
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
        userData.status = 'accepted'; // Admin is automatically accepted
        console.log('✅ User data updated with restaurant ID:', userData.restaurant);
      } catch (restaurantError) {
        console.log('❌ Error creating restaurant:', restaurantError);
        console.log('❌ Error stack:', restaurantError.stack);
        throw restaurantError;
      }
    }
    
    if (type === 'delivery') {
      userData.status = 'pending';
      if (req.body.restaurantId) {
        userData.restaurant = req.body.restaurantId;
      }
    }
    
    let user = new User(userData);
    user = await user.save();
    console.log('✅ User created successfully:', user._id);
    
    return res.json(user);
    
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

console.log('All routes registered');
module.exports = authRouter;