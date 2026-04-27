const jwt = require('jsonwebtoken');
const User = require('../schema/UserSchema');
const catchAsyncErrors = require('../middlewares/CatchAsyncErrors');
const ErrorHandler = require('../utils/ErrorHandler');
const e = require('cors');

// Check if the user is authenticated or not
exports.IsAuthenticatedUser = catchAsyncErrors( async (req, res, next) => {
    let token;

    if(req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
    }

    if(!token) {
        res
			.status(401)
			.json({
				success : false,
				message : 'Login first to access this resource.'
			});
        return; 
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id);
    if(!req.user.isActive) {
		res
			.status(404)
			.json({
				success : false,
				message : 'Please contact admin for login.'
			});
		return;
	}
    next();
});


// handling users roles
exports.AuthorizeRoles = (...roles) => {
    return (req, res, next) => {
        if(req.user) {
            if(!roles.includes(req.user.role)) {
                res
                .status(403)
                .json({
                    success : false,
                    message : `Role(${req.user.role}) is not allowed to access this resource.`
                });
                return; 
            }
        }
        else {
            res
			.status(401)
			.json({
				success : false,
				message : 'Login first to access this resource.'
			});
        return; 
        }
        next();
    }
}