// Script لإنشاء حساب Super Admin
// تشغيل: node create_superadmin.js

const bcrypt = require('bcryptjs');

async function createSuperAdminPassword() {
  // ضع كلمة السر المطلوبة هنا
  const plainPassword = 'YourSecurePassword123!'; // غيّر هذه!
  
  // تشفير كلمة السر
  const hashedPassword = await bcrypt.hash(plainPassword, 10);
  
  console.log('\n✅ تم تشفير كلمة السر بنجاح!\n');
  console.log('📋 انسخ البيانات التالية وأدخلها في MongoDB:\n');
  
  const superAdminData = {
    name: "Super Admin",
    phone: "669435425",
    password: hashedPassword,
    email: "admin@yourapp.com",
    type: "superadmin",
    status: "active",
    address: "",
    cart: []
  };
  
  console.log(JSON.stringify(superAdminData, null, 2));
  console.log('\n');
}

createSuperAdminPassword().catch(console.error);
