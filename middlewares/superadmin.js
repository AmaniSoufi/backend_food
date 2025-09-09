const jwt = require('jsonwebtoken');
const User = require('../models/user');

const superadmin = async (req, res, next) => {
    try {
        console.log('🔍 DEBUG: SuperAdmin middleware called');
        
        const token = req.header('x-auth-token');
        if (!token) {
            console.log('❌ DEBUG: No auth token provided');
            return res.status(401).json({ msg: "no auth token" });
        }

        console.log('🔍 DEBUG: Token provided, verifying...');
        
        // هذا يتحقق إذا كان التوكن موجود ولكن غير صالح 
        const verified = jwt.verify(token, "passwordKey");
        if (!verified) {
            console.log('❌ DEBUG: Token verification failed');
            return res.status(401).json({ msg: "token verification failed" });
        }

        console.log('🔍 DEBUG: Token verified, checking user type...');
        
        const user = await User.findById(verified.id);
        console.log('🔍 DEBUG: User found:', user.name, 'Type:', user.type);
        
        if (user.type !== 'superadmin') {
            console.log('❌ DEBUG: User is not superadmin, type:', user.type);
            return res.status(401).json({ msg: 'you are not a super admin' })
        }
        
        console.log('✅ DEBUG: SuperAdmin access granted');
        req.user = verified.id;
        req.token = token;
        next();

    } catch (err) {
        console.error('❌ DEBUG: SuperAdmin middleware error:', err.message);
        res.status(500).json({ error: err.message });
    }
}

module.exports = superadmin; 