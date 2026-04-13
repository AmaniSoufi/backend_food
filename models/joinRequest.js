const mongoose = require('mongoose');

const joinRequestSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['delivery', 'restaurant'],
      required: true,
    },
    fullName: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    vehicleType: { type: String, trim: true },
    restaurantName: { type: String, trim: true },
    fcmToken: { type: String, default: '' },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'rejected'],
      default: 'pending',
    },
    reviewedAt: { type: Date },
    createdUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  { timestamps: true }
);

joinRequestSchema.index({ status: 1, createdAt: -1 });
joinRequestSchema.index({ phone: 1 });

module.exports = mongoose.model('JoinRequest', joinRequestSchema);
