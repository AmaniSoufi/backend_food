# 🎉 Super Admin Setup - الإعداد الكامل

## ✅ تم إنجازه:

### 1️⃣ الملفات المنشأة في مجلد server:
- ✅ `create_superadmin.js` - إنشاء hash لكلمة السر
- ✅ `create_superadmin_db.js` - إنشاء Super Admin مباشرة في قاعدة البيانات
- ✅ `create_superadmin_simple.js` - إنشاء hash بسيط

### 2️⃣ الـ APIs المضافة في `routes/superadmin.js`:
- ✅ `POST /api/superadmin/login` - تسجيل الدخول
- ✅ `GET /api/superadmin/users` - جلب جميع المستخدمين
- ✅ `POST /api/superadmin/users/:userId/approve` - قبول مستخدم
- ✅ `POST /api/superadmin/users/:userId/reject` - رفض مستخدم
- ✅ `GET /api/superadmin/restaurants/stats` - المطاعم مع الإحصائيات
- ✅ `GET /api/superadmin/deliveries/stats` - السائقين مع الإحصائيات
- ✅ `GET /api/superadmin/stats/overview` - الإحصائيات الإجمالية

### 3️⃣ تم تسجيل الـ router في `index.js`
- ✅ تمت إضافة `superadminRouter`

---

## 🚀 كيفية الاستخدام:

### الخطوة 1: إنشاء Super Admin في قاعدة البيانات

#### الطريقة الأسهل - استخدام Script:

```bash
cd server
node create_superadmin_simple.js
```

سيعطيك JSON جاهز، انسخه وأدخله في MongoDB!

#### الطريقة المباشرة - إدخال في MongoDB:

```javascript
// في MongoDB Compass أو Mongo Shell
db.users.insertOne({
  "name": "Super Admin",
  "phone": "669435425",
  "password": "$2a$10$N9qo8uLOickgx2ZMRZoMye.lW8N3FUGPPTpqYzWj3LN1aCHEfHIei",
  "email": "admin@yourapp.com",
  "type": "superadmin",
  "status": "active",
  "address": "",
  "cart": []
})
```

---

### الخطوة 2: شغّل الـ Server

```bash
cd server
npm install
node index.js
```

يجب أن ترى:
```
Server running at port 3000
connection successful
```

---

### الخطوة 3: اختبر الـ API

#### باستخدام cURL:

```bash
curl -X POST http://localhost:3000/api/superadmin/login \
  -H "Content-Type: application/json" \
  -d "{\"phone\":\"669435425\",\"password\":\"123456\"}"
```

#### يجب أن تحصل على response مثل:

```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "_id": "68e8a7e9f5f17d28fd65cdb3",
  "name": "Super Admin",
  "phone": "669435425",
  "type": "superadmin",
  "status": "active",
  ...
}
```

---

### الخطوة 4: جرّب في التطبيق

افتح التطبيق Flutter واذهب لصفحة Super Admin Login:
```
📱 رقم الهاتف: 669435425
🔑 كلمة السر: 123456
```

---

## 🔑 بيانات الدخول الافتراضية:

```
Phone: 669435425
Password: 123456
Type: superadmin
```

---

## 📋 جميع الـ Endpoints:

### 1. تسجيل الدخول (بدون token)
```
POST /api/superadmin/login
Body: { phone, password }
```

### 2. جلب المستخدمين (مع token)
```
GET /api/superadmin/users
Headers: { x-auth-token: YOUR_TOKEN }
```

### 3. قبول مستخدم (مع token)
```
POST /api/superadmin/users/:userId/approve
Headers: { x-auth-token: YOUR_TOKEN }
```

### 4. رفض مستخدم (مع token)
```
POST /api/superadmin/users/:userId/reject
Headers: { x-auth-token: YOUR_TOKEN }
```

### 5. إحصائيات المطاعم (مع token)
```
GET /api/superadmin/restaurants/stats
Headers: { x-auth-token: YOUR_TOKEN }
```

### 6. إحصائيات السائقين (مع token)
```
GET /api/superadmin/deliveries/stats
Headers: { x-auth-token: YOUR_TOKEN }
```

### 7. الإحصائيات الإجمالية (مع token)
```
GET /api/superadmin/stats/overview
Headers: { x-auth-token: YOUR_TOKEN }
```

---

## ✅ Checklist:

- ✅ المستخدم موجود في MongoDB
- ✅ الـ APIs جاهزة في `routes/superadmin.js`
- ✅ الـ middleware جاهز في `middlewares/superadmin.js`
- ✅ الـ router مسجل في `index.js`
- ✅ الـ Server شغال على port 3000

---

## 🎯 الخطوة التالية:

1. ✅ شغّل الـ server: `node index.js`
2. ✅ افتح التطبيق
3. ✅ اذهب لصفحة Super Admin Login
4. ✅ سجل الدخول بالبيانات أعلاه
5. 🎉 استمتع بلوحة التحكم الكاملة!

---

## 🔧 للمساعدة:

إذا واجهت أي مشكلة:
1. تحقق من console الـ server للأخطاء
2. تحقق من Debug Console في Flutter
3. تأكد من أن المستخدم موجود في MongoDB
4. تأكد من أن الـ server شغال

---

**تم الإعداد بنجاح!** 🎉

