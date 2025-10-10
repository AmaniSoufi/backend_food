// إنشاء hash باستخدام bcrypt (نفس المكتبة المستخدمة في auth.js)
const bcrypt = require('bcrypt');

const password = '123456';

async function createHash() {
  console.log('\n🔐 إنشاء Hash باستخدام bcrypt...\n');
  
  const hash = await bcrypt.hash(password, 10);
  
  console.log('=====================================');
  console.log('كلمة السر:', password);
  console.log('Hash:', hash);
  console.log('=====================================\n');
  
  // اختبار
  const testMatch = await bcrypt.compare(password, hash);
  console.log('✅ اختبار المطابقة:', testMatch ? 'نجح ✅' : 'فشل ❌');
  
  console.log('\n📋 استخدم هذا الأمر في MongoDB:\n');
  console.log('db.users.updateOne(');
  console.log('  { phone: "669435425" },');
  console.log(`  { $set: { password: "${hash}" } }`);
  console.log(')\n');
  
  console.log('أو احذف القديم وأنشئ جديد:\n');
  console.log('db.users.deleteOne({ phone: "669435425" })');
  console.log('db.users.insertOne({');
  console.log('  "name": "Super Admin",');
  console.log('  "phone": "669435425",');
  console.log(`  "password": "${hash}",`);
  console.log('  "email": "admin@yourapp.com",');
  console.log('  "type": "superadmin",');
  console.log('  "status": "active",');
  console.log('  "address": "",');
  console.log('  "cart": []');
  console.log('})\n');
}

createHash().catch(console.error);

