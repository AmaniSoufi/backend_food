const express = require('express'); // import 'package:express/express.dart'
const mongoose = require('mongoose');
//import from other files
const authRouter = require("./routes/auth.js");
const adminRouter = require('./routes/admin.js');
const ProductRouter = require('./routes/product.js');
const userRouter = require('./routes/user.js');
const { notificationRouter } = require('./routes/notification.js');
const { fcmRouter } = require('./routes/fcm.js');
const { fcmAdminRouter } = require('./routes/fcm_admin.js');
const deliveryRouter = require('./routes/delivery.js');
const app = express();
const port = 3000;
//middleware
app.use(express.json());

// Basic health check endpoint
app.get('/', (req, res) => {
  res.json({ 
    message: 'Server is running', 
    timestamp: new Date().toISOString(),
    endpoints: {
      auth: '/auth',
      admin: '/admin',
      delivery: '/delivery',
      user: '/user',
      product: '/product',
      notification: '/notification',
      fcm: '/fcm'
    }
  });
});

app.use(authRouter);
app.use(adminRouter);
app.use(ProductRouter);
app.use(userRouter);
app.use(notificationRouter);
app.use(fcmRouter);
app.use(fcmAdminRouter);
app.use(deliveryRouter);

// Add restaurant router
try {
  const restaurantRouter = require('./routes/restaurant.js');
  app.use(restaurantRouter);
  console.log('Restaurant router loaded successfully');
} catch (error) {
  console.log('Error loading restaurant router:', error.message);
}
//Connections
mongoose.connect("mongodb+srv://imene:04042004irir@cluster0.htrt15u.mongodb.net/myDatabase?retryWrites=true&w=majority").then(() => {
console.log("connection successful");
}) . catch ( (e) => {console.log(e) });
app.listen(port , () => {
console.log('connected at port ${port}' );
});