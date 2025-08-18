const express = require('express');
const auth = require('../middlewares/auth');
const admin = require('../middlewares/admin');
const Notification = require('../models/notification');
const User = require('../models/user');
const Order = require('../models/order');
const notificationRouter = express.Router();

// الحصول على إشعارات المستخدم
notificationRouter.get('/api/notifications', auth, async (req, res) => {
  try {
    const notifications = await Notification.find({ recipientId: req.user })
      .sort({ createdAt: -1 })
      .limit(50);
    
    res.json(notifications);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// تحديث حالة الإشعار كمقروء
notificationRouter.put('/api/notifications/:id/read', auth, async (req, res) => {
  try {
    const notification = await Notification.findByIdAndUpdate(
      req.params.id,
      { isRead: true },
      { new: true }
    );
    
    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }
    
    res.json(notification);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// تحديث جميع الإشعارات كمقروءة
notificationRouter.put('/api/notifications/read-all', auth, async (req, res) => {
  try {
    await Notification.updateMany(
      { recipientId: req.user, isRead: false },
      { isRead: true }
    );
    
    res.json({ message: 'All notifications marked as read' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// حذف إشعار
notificationRouter.delete('/api/notifications/:id', auth, async (req, res) => {
  try {
    const notification = await Notification.findByIdAndDelete(req.params.id);
    
    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }
    
    res.json({ message: 'Notification deleted successfully' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// دالة مساعدة لإنشاء إشعار
const createNotification = async (recipientId, type, title, message, orderId = null, restaurantId = null, data = {}) => {
  try {
    const notification = new Notification({
      recipientId,
      type,
      title,
      message,
      orderId,
      restaurantId,
      data,
    });
    
    await notification.save();
    console.log(`🔔 Notification created: ${title} for user ${recipientId}`);
    return notification;
  } catch (e) {
    console.error('Error creating notification:', e);
    return null;
  }
};

// تصدير دالة إنشاء الإشعارات لاستخدامها في routes أخرى
module.exports = { notificationRouter, createNotification }; 