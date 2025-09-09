const bcrypt = require('bcrypt');

async function createHash() {
  const password = 'superadmin123';
  const hash = await bcrypt.hash(password, 10);
  
  console.log('🔐 Password Hash Generated:');
  console.log('==========================');
  console.log('Original Password:', password);
  console.log('Hashed Password:', hash);
  console.log('');
  console.log('📋 Copy this to MongoDB:');
  console.log('{');
  console.log('  "name": "صاحب التطبيق",');
  console.log('  "email": "superadmin@example.com",');
  console.log(`  "password": "${hash}",`);
  console.log('  "phone": "0000000000",');
  console.log('  "type": "superadmin",');
  console.log('  "address": "",');
  console.log('  "cart": [],');
  console.log('  "status": "accepted"');
  console.log('}');
  console.log('');
  console.log('🔑 Login Credentials:');
  console.log('Email: superadmin@example.com');
  console.log('Password: superadmin123');
}

createHash().catch(console.error); 