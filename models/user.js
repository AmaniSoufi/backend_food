const mongoose = require('mongoose');
const { productSchema } = require('./product');
const { calculateDistance } = require('../utils/delivery');

const userSchema = mongoose.Schema({
    name : {
        required : true ,
        type : String ,
    } ,
    email : {
        required : true ,
        type : String ,
        trim : true ,
        validate : {
            validator : (value) => {
                const re = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
                return value.match(re);
            },
            message : 'Please enter a vaild email adress'
        }
    } ,
    password: {
        required: true,
        type: String
    },
    phone: {
        type: String,
        required: true,
        trim: true,
    },
    address : {
        type : String ,
        default : '',
    } ,
    type : {
        type : String ,
        default : "user"
    },
    cart: [
        {
          product: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Product', // reference to the Product collection
            required: true,
          },
          quantity: {
            type: Number,
            required: true,
          },
        },
      ],
    restaurant: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Restaurant',
        required: false, // Only required for admins/delivery
    },
    status: {
        type: String,
        enum: ['pending', 'accepted', 'rejected'],
        default: 'pending', // Only used for delivery
    },
    // FCM Token for push notifications
    fcmToken: {
        type: String,
        default: null,
    },
    // Delivery person specific fields
    currentLocation: {
        latitude: Number,
        longitude: Number,
        lastUpdated: Date
    },
    isOnline: {
        type: Boolean,
        default: false
    },
    isAvailable: {
        type: Boolean,
        default: true
    },
    currentOrder: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Order',
        default: null
    },
    rating: {
        type: Number,
        default: 0
    },
    totalDeliveries: {
        type: Number,
        default: 0
    },
    vehicleType: {
        type: String,
        enum: ['motorcycle', 'car', 'bicycle'],
        default: 'motorcycle'
    }
});

const User = mongoose.model("User" , userSchema);
module.exports = User;  // Make sure this line exists