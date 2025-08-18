const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  orderId: {
    type: String,
    unique: true,
    required: false, // سنجعله false لأن middleware سيقوم بتوليده
  },
  products: [
    {
      product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
      },
      quantity: Number,
      productName: String, // اسم المنتج
      productPrice: Number, // سعر المنتج
    },
  ],
  totalPrice: {
    type: Number,
    set: function(value) {
      return Math.round(value * 100) / 100; // تقريب لرقمين خلف الفاصلة
    }
  },
  address: String,
  phone: {
    type: String,
    required: true,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  orderAt: Number,
  status: {
    type: Number,
    default: 0,
  },
  latitude: {
    type: Number,
    required: false,
  },
  longitude: {
    type: Number,
    required: false,
  },
  deliveryPrice: {
    type: Number,
    default: 0,
    set: function(value) {
      return Math.round(value * 100) / 100; // تقريب لرقمين خلف الفاصلة
    }
  },
  deliveryDistance: {
    type: Number,
    default: 0,
  },
  restaurantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Restaurant',
    required: false,
  },
  // Delivery related fields
  deliveryPersonId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false,
  },
  assignedAt: Date,
  deliveryAcceptedAt: Date,
  deliveryRejectedAt: Date,
  deliveryRejectionReason: String,
  estimatedDeliveryTime: Date,
  actualDeliveryTime: Date,
  deliveryRating: {
    type: Number,
    min: 1,
    max: 5,
    default: null,
  }
});

// Middleware لتوليد orderId فريد وقصير قبل الحفظ
orderSchema.pre('save', async function(next) {
  if (!this.orderId) {
    // توليد ID قصير: حرف + 6 أرقام
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let orderId;
    let isUnique = false;
    
    while (!isUnique) {
      const randomChar = chars.charAt(Math.floor(Math.random() * chars.length));
      const randomNumbers = Math.floor(Math.random() * 1000000).toString().padStart(6, '0');
      orderId = randomChar + randomNumbers;
      
      // التحقق من عدم تكرار الـ ID
      const existingOrder = await mongoose.model('Order').findOne({ orderId: orderId });
      if (!existingOrder) {
        isUnique = true;
      }
    }
    
    this.orderId = orderId;
  }
  next();
});

module.exports = mongoose.model('Order', orderSchema);
