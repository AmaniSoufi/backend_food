const mongoose = require('mongoose');
const ratingSchema = require('./rating');

const productSchema = mongoose.Schema({ 
    name:{
        type : String ,
        required : true , 
        trim : true , // remove the white spaces  
    },
    description  : {
        type : String ,
        required : true , 
        trim : true , 
    },
    images : [{
        type : String ,
        required : true ,
    }],

    quantity : {
        type : Number ,
        required : true , 
         
    },
    price : {
        type : Number ,
        required : true , 
    },
    category : {
        type : String ,
        required : true , 
    },
    ratings : [
        ratingSchema
    ],
    restaurant: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Restaurant',
        required: true,
    }

});


const Product = mongoose.model('Product' , productSchema);
module.exports = {Product , productSchema } ;