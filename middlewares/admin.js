const jwt = require ('jsonwebtoken');
const User = require('../models/user');


const admin = async (req , res , next) => {
     try {
            const token = req.header('x-auth-token');
            if(!token)
                return res.status(401).json({msg: "no auth token"});
    
            // هذا يتحقق إذا كان التوكن موجود ولكن غير صالح 
                const verified = jwt.verify(token , "passwordKey" );
                if(!verified) return res.status(401).json({msg: "token verfication failed " });

                const user = await User.findById(verified.id) ;
                if (user.type == 'user' || user.type == 'seller' || user.status !== 'accepted'){
                    return res.status(401).json({msg: 'you are not an accepted admin'})
                }
                req.user = verified.id;
                req.token = token ;
                next();
    
        }catch(err){
            res.status(500).json({error : err.message});
        }
}

module.exports = admin ;