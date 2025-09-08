const express = require('express');
const router = express.Router();
const smssakService = require('../services/smssakService');
const User = require('../models/user');

// إرسال رمز OTP
router.post('/api/send-otp', async (req, res) => {
  try {
    const { phone } = req.body;

    if (!phone) {
      return res.status(400).json({
        success: false,
        message: 'رقم الهاتف مطلوب'
      });
    }

    // تنظيف رقم الهاتف
    const cleanPhone = phone.replace(/\D/g, '');
    
    // التحقق من صحة الرقم الجزائري
    if (cleanPhone.length !== 9 || !/^[5-7]/.test(cleanPhone)) {
      return res.status(400).json({
        success: false,
        message: 'رقم الهاتف غير صحيح'
      });
    }

    // إنشاء رمز OTP
    const otpCode = Math.floor(1000 + Math.random() * 9000).toString();
    
    // إرسال OTP عبر SMSSak
    const smsResult = await smssakService.sendOtp('dz', cleanPhone, otpCode);
    
    if (smsResult.success) {
      // حفظ OTP في قاعدة البيانات (اختياري)
      // يمكن إضافة جدول OTP منفصل أو حفظه في User model
      
      res.json({
        success: true,
        message: 'تم إرسال رمز التحقق بنجاح',
        otpCode: otpCode // في الإنتاج، لا ترسل الرمز للعميل
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'فشل في إرسال رمز التحقق'
      });
    }
  } catch (error) {
    console.error('Error sending OTP:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في الخادم'
    });
  }
});

// التحقق من رمز OTP
router.post('/api/verify-otp', async (req, res) => {
  try {
    const { phone, otp } = req.body;

    if (!phone || !otp) {
      return res.status(400).json({
        success: false,
        message: 'رقم الهاتف ورمز التحقق مطلوبان'
      });
    }

    // التحقق من OTP عبر SMSSak
    const verifyResult = await smssakService.verifyOtp('dz', phone, otp);
    
    if (verifyResult.success) {
      // تحديث حالة التحقق في قاعدة البيانات
      await User.findOneAndUpdate(
        { phone: phone },
        { isPhoneVerified: true },
        { new: true }
      );

      res.json({
        success: true,
        message: 'تم التحقق من رقم الهاتف بنجاح'
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'رمز التحقق غير صحيح'
      });
    }
  } catch (error) {
    console.error('Error verifying OTP:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في الخادم'
    });
  }
});

module.exports = router;
