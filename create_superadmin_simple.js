// Script بسيط لإنشاء hash لكلمة السر 123456
const bcrypt = require('bcryptjs');

async function generateHash() {
  const password = '123456';
  const hash = await bcrypt.hash(password, 10);
  
  console.log('\n✅ تم إنشاء Hash لكلمة السر "123456"\n');
  console.log('انسخ هذا JSON بالكامل وأدخله في MongoDB:\n');
  console.log('=====================================\n');
  
  const userData = {
    name: "Super Admin",
    phone: "669435425",
    password: hash,
    email: "admin@yourapp.com",
    type: "superadmin",
    status: "active",
    address: "",
    cart: []
  };
  
  console.log(JSON.stringify(userData, null, 2));
  
  console.log('\n=====================================');
  console.log('\n📝 لإدخاله في MongoDB:');
  console.log('db.users.insertOne(' + JSON.stringify(userData, null, 2) + ')');
  console.log('\n');
  console.log('🔑 بيانات الدخول:');
  console.log('   رقم الهاتف: 669435425');
  console.log('   كلمة السر: 123456\n');
}

generateHash().catch(console.error);
