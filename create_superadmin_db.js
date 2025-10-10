// Script لإنشاء حساب Super Admin مباشرة في قاعدة البيانات
// تشغيل: node create_superadmin_db.js

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// ⚠️ غيّر هذه القيم:
const MONGODB_URI = 'mongodb://localhost:27017/your_database_name'; // رابط قاعدة البيانات
const PHONE = '669435425'; // رقم الهاتف
const PASSWORD = 'YourSecurePassword123!'; // كلمة السر (ستُشفّر تلقائياً)
const ADMIN_NAME = 'Super Admin'; // الاسم
const ADMIN_EMAIL = 'admin@yourapp.com'; // البريد الإلكتروني

// نموذج المستخدم (تأكد من أنه يطابق نموذجك)
const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  phone: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  email: { type: String },
  type: { type: String, default: 'user' },
  status: { type: String, default: 'active' },
  address: { type: String, default: '' },
  cart: { type: Array, default: [] },
  restaurant: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant' },
}, { timestamps: true });

const User = mongoose.model('User', userSchema);

async function createSuperAdmin() {
  try {
    // الاتصال بقاعدة البيانات
    console.log('🔄 جاري الاتصال بقاعدة البيانات...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ تم الاتصال بقاعدة البيانات\n');

    // التحقق من وجود حساب superadmin مسبقاً
    const existingSuperAdmin = await User.findOne({ type: 'superadmin' });
    if (existingSuperAdmin) {
      console.log('⚠️  حساب Super Admin موجود بالفعل!');
      console.log('📱 الهاتف:', existingSuperAdmin.phone);
      console.log('📧 البريد:', existingSuperAdmin.email);
      console.log('\nإذا كنت تريد إنشاء حساب جديد، احذف الحساب القديم أولاً.\n');
      await mongoose.disconnect();
      return;
    }

    // تشفير كلمة السر
    console.log('🔐 جاري تشفير كلمة السر...');
    const hashedPassword = await bcrypt.hash(PASSWORD, 10);
    console.log('✅ تم تشفير كلمة السر\n');

    // إنشاء حساب Super Admin
    console.log('🔄 جاري إنشاء حساب Super Admin...');
    const superAdmin = new User({
      name: ADMIN_NAME,
      phone: PHONE,
      password: hashedPassword,
      email: ADMIN_EMAIL,
      type: 'superadmin',
      status: 'active',
      address: '',
      cart: []
    });

    await superAdmin.save();
    console.log('✅ تم إنشاء حساب Super Admin بنجاح!\n');

    // عرض البيانات
    console.log('📋 بيانات الحساب:');
    console.log('=====================================');
    console.log('الاسم:', superAdmin.name);
    console.log('رقم الهاتف:', superAdmin.phone);
    console.log('البريد الإلكتروني:', superAdmin.email);
    console.log('النوع:', superAdmin.type);
    console.log('الحالة:', superAdmin.status);
    console.log('ID:', superAdmin._id);
    console.log('=====================================\n');

    console.log('🎉 يمكنك الآن تسجيل الدخول باستخدام:');
    console.log('   رقم الهاتف:', PHONE);
    console.log('   كلمة السر: (التي أدخلتها أعلاه)\n');

    // قطع الاتصال
    await mongoose.disconnect();
    console.log('✅ تم قطع الاتصال بقاعدة البيانات');

  } catch (error) {
    console.error('\n❌ حدث خطأ:', error.message);
    if (error.code === 11000) {
      console.error('⚠️  رقم الهاتف مستخدم بالفعل في قاعدة البيانات!');
    }
    await mongoose.disconnect();
    process.exit(1);
  }
}

// تشغيل الدالة
console.log('\n🚀 بدء إنشاء حساب Super Admin...\n');
createSuperAdmin();

