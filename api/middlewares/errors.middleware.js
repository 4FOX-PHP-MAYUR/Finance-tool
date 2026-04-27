
module.exports = (err, req, res, next) => {
    err.statusCode = err.statusCode || 500;
    err.message = err.message || "Internal server error";
    

    let error = {...err};
    
    error.message = err.message;
    console.log(err);
    // Wrong Mongoose Object ID Error
    if(err.name === 'CastError') {
        const message = `Resource not found. Invalid: ${err.path}`;
        res.status(500).json({
            success : false,
            message 
        });
        return;
    }

    // Handling Mongoose Validation Error
    if(err.name === 'ValidationError') {
        const message = Object.values(err.errors).map(value => value.message);
        res.status(500).json({
            success : false,
            message 
        });
        return;
    }

    if (err.isOperational) {
        res.status(err.statusCode).json({
            success : false,
            message: err.message,
        });
        return;
    }

    // Handle mongoose duplicate key error
    if(err.code === 11000) {
        const message = `Record with '${Object.keys(err.keyValue)}' already exists! Please try again using a different value.`;
        res.status(500).json({
            success : false,
            message 
        });
        return;
    }

    // Handling Wrong JWT token error
    if(err.name === 'JsonWebTokenError') {
        const message = 'JSON Web token is invalid. Try Again!';
        res.status(401).json({
            success : false,
            message 
        });
        return;
    }

    // Handling Expired JWT token error
    if(err.name === 'TokenExpiredError') {
        const message = 'TokenExpiredError';
        res.status(401).json({
            success : false,
            message 
        });
        return;
    }

    // Handle syntax error
    if(err.name === 'SyntaxError') {
        const message = 'Something went wrong!';
        res.status(400).json({
            success : false,
            message 
        });
        return;
    }    

    res.status(error.statusCode).json({
        success : false,
        message : error.message || 'Internal Server Error.'
    })
    return;

}