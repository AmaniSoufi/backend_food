const express = require('express');
const JoinRequest = require('../models/joinRequest');

const joinRequestRouter = express.Router();

/**
 * إنشاء طلب انضمام (سائق أو مطعم) — بدون مصادقة.
 * POST /api/join-requests
 * body: { type, fullName, email, phone, vehicleType?, restaurantName?, fcmToken? }
 */
joinRequestRouter.post('/api/join-requests', async (req, res) => {
  try {
    const { type, fullName, email, phone, vehicleType, restaurantName, fcmToken } = req.body;

    if (!type || !['delivery', 'restaurant'].includes(type)) {
      return res.status(400).json({ msg: 'نوع الطلب غير صالح' });
    }
    if (!fullName || !String(fullName).trim()) {
      return res.status(400).json({ msg: 'الاسم مطلوب' });
    }
    if (!email || !String(email).trim()) {
      return res.status(400).json({ msg: 'البريد مطلوب' });
    }
    if (!phone || !String(phone).trim()) {
      return res.status(400).json({ msg: 'رقم الهاتف مطلوب' });
    }

    if (type === 'delivery') {
      if (!vehicleType || !String(vehicleType).trim()) {
        return res.status(400).json({ msg: 'نوع المركبة مطلوب' });
      }
    } else {
      if (!restaurantName || !String(restaurantName).trim()) {
        return res.status(400).json({ msg: 'اسم المطعم مطلوب' });
      }
    }

    const doc = await JoinRequest.create({
      type,
      fullName: String(fullName).trim(),
      email: String(email).trim(),
      phone: String(phone).trim(),
      vehicleType: type === 'delivery' ? String(vehicleType).trim() : undefined,
      restaurantName: type === 'restaurant' ? String(restaurantName).trim() : undefined,
      fcmToken: fcmToken ? String(fcmToken).trim() : '',
      status: 'pending',
    });

    res.status(201).json({
      msg: 'تم استلام طلبك بنجاح',
      id: doc._id,
    });
  } catch (error) {
    console.error('join-requests POST:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * متابعة حالة الطلب (للمتقدّم) — بدون مصادقة.
 * GET /api/join-requests/status/:id
 */
joinRequestRouter.get('/api/join-requests/status/:id', async (req, res) => {
  try {
    const jr = await JoinRequest.findById(req.params.id)
      .select('status type email phone fullName')
      .lean();
    if (!jr) {
      return res.status(404).json({ msg: 'الطلب غير موجود' });
    }
    let message = '';
    if (jr.status === 'pending') {
      message = 'جاري مراجعة طلب الانضمام من قبل إدارة التطبيق.';
    } else if (jr.status === 'accepted') {
      message =
        'تم قبول طلبك! استخدم البريد الإلكتروني ورقم الهاتف المسجّلين مع كلمة المرور التي أرسلها لك المسؤول، ثم سجّل الدخول.';
    } else {
      message = 'تم رفض طلب الانضمام.';
    }
    res.json({
      status: jr.status,
      type: jr.type,
      email: jr.email,
      phone: jr.phone,
      message,
    });
  } catch (error) {
    console.error('join-requests status GET:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = joinRequestRouter;
