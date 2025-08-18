const mongoose = require('mongoose');
const User = require('./models/user');

// Connect to MongoDB using the same connection string as the main server
mongoose.connect("mongodb+srv://imene:04042004irir@cluster0.htrt15u.mongodb.net/myDatabase?retryWrites=true&w=majority", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => {
  console.log("✅ تم الاتصال بقاعدة البيانات بنجاح");
  createTestDrivers();
}).catch((e) => {
  console.log("❌ خطأ في الاتصال بقاعدة البيانات:", e);
});

const testDrivers = [
  {
    name: 'أحمد محمد',
    email: 'ahmed@delivery.com',
    password: '123456',
    phone: '+971501234567',
    type: 'delivery',
    status: 'accepted',
    isOnline: true,
    isAvailable: true,
    currentLocation: {
      latitude: 25.2048,
      longitude: 55.2708,
      lastUpdated: new Date()
    },
    rating: 4.5,
    totalDeliveries: 150,
    vehicleType: 'motorcycle'
  },
  {
    name: 'محمد علي',
    email: 'mohamed@delivery.com',
    password: '123456',
    phone: '+971502345678',
    type: 'delivery',
    status: 'accepted',
    isOnline: true,
    isAvailable: true,
    currentLocation: {
      latitude: 25.2148,
      longitude: 55.2808,
      lastUpdated: new Date()
    },
    rating: 4.8,
    totalDeliveries: 200,
    vehicleType: 'car'
  },
  {
    name: 'علي حسن',
    email: 'ali@delivery.com',
    password: '123456',
    phone: '+971503456789',
    type: 'delivery',
    status: 'accepted',
    isOnline: true,
    isAvailable: true,
    currentLocation: {
      latitude: 25.1948,
      longitude: 55.2608,
      lastUpdated: new Date()
    },
    rating: 4.2,
    totalDeliveries: 120,
    vehicleType: 'motorcycle'
  },
  {
    name: 'حسن أحمد',
    email: 'hassan@delivery.com',
    password: '123456',
    phone: '+971504567890',
    type: 'delivery',
    status: 'accepted',
    isOnline: true,
    isAvailable: true,
    currentLocation: {
      latitude: 25.2248,
      longitude: 55.2908,
      lastUpdated: new Date()
    },
    rating: 4.6,
    totalDeliveries: 180,
    vehicleType: 'bicycle'
  }
];

async function createTestDrivers() {
  try {
    console.log('🚚 إنشاء سائقين تجريبيين...');
    
    for (const driverData of testDrivers) {
      // التحقق من عدم وجود السائق مسبقاً
      const existingDriver = await User.findOne({ email: driverData.email });
      if (existingDriver) {
        console.log(`⚠️ السائق ${driverData.name} موجود مسبقاً`);
        continue;
      }
      
      const driver = new User(driverData);
      await driver.save();
      console.log(`✅ تم إنشاء السائق: ${driverData.name}`);
    }
    
    console.log('🎉 تم إنشاء جميع السائقين بنجاح!');
    
    // عرض السائقين المتاحين
    const availableDrivers = await User.find({
      type: 'delivery',
      status: 'accepted',
      isOnline: true,
      isAvailable: true
    });
    
    console.log(`📊 عدد السائقين المتاحين: ${availableDrivers.length}`);
    availableDrivers.forEach(driver => {
      console.log(`- ${driver.name} (${driver.phone}) - ${driver.vehicleType}`);
    });
    
  } catch (error) {
    console.error('❌ خطأ في إنشاء السائقين:', error);
  } finally {
    mongoose.connection.close();
  }
} 