
const express = require('express');
const ProductRouter = express.Router();
const admin = require('../middlewares/admin');
const {Product} = require('../models/product');
const auth = require('../middlewares/auth');



ProductRouter.get ( "/api/products", auth , async (req , res ) => {
    try {
        console.log(req.query.category) // get access to the /api/products?category=Essentials ( for example)
         const product = await Product.find({category : req.query.category}); 

         res.json(product);


    } catch(e){
        res.status(500).json({err : e.message});
    }
});





ProductRouter.post("/api/rate-product" , auth , async(req , res) => {
    try {
        const { id , rating } = req.body ; // get the values from the body and store them in id and ratting 
        let product = await Product.findById(id);
 
        // rating here is and array 
        for ( let i = 0 ; i< product.ratings.length ; i++){
            if(product.ratings[i].userId == req.user)  // req.user from the auth ( middleware )
        {
            product.ratings.splice(i , 1); // use it when we want to remove remove the old rating or duplicated rating
            break ;
        }
        }

        const ratingSchema = {
            userId : req.user ,
            rating 
        };
        product.ratings.push(ratingSchema);
        product = await product.save();
        res.json(product);

    }catch(e){
        res.status(500).json({err : e.message});
    }
})

ProductRouter.get ( "/api/products/search/:name", auth , async (req , res ) => {
    try {
       
         const product = await Product.find({
            // if we search with /api/products/search/samsung  then the req.params.name will be samsung
            // we looking in the MongoDB for the products using Regex
            // options i  to make the result same as Phone or phone 
            name : { $regex : req.params.name , $options : 'i'}
            
         }); 

         res.json(product);


    } catch(e){
        res.status(500).json({err : e.message});
    }
});



ProductRouter.get('/api/deal-of-day', auth, async (req, res) => {
    try {
      console.log('Fetching deal of day...');
      
      let products = await Product.find({}); // get all products
      console.log(`Found ${products.length} products`);
      
      if (products.length === 0) {
        return res.status(404).json({ message: 'No products found' });
      }
      
      // Sort products by rating
      products = products.sort((a, b) => {
        let aSum = 0;
        let bSum = 0;
        
        // Calculate average rating for product a
        if (a.ratings && a.ratings.length > 0) {
          for (let i = 0; i < a.ratings.length; i++) {
            aSum += a.ratings[i].rating;
          }
          aSum = aSum / a.ratings.length; // Get average
        }
        
        // Calculate average rating for product b  
        if (b.ratings && b.ratings.length > 0) {
          for (let i = 0; i < b.ratings.length; i++) {
            bSum += b.ratings[i].rating;
          }
          bSum = bSum / b.ratings.length; // Get average
        }
        
        return bSum - aSum; // Sort descending (highest rating first)
      });
      
      console.log('Top product:', products[0].name);
      res.json(products[0]);
      
    } catch (e) {
      console.error('Error in deal-of-day:', e);
      res.status(500).json({ error: e.message });
    }
  });







module.exports = ProductRouter ;