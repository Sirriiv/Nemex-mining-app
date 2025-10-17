const jwt = require('jsonwebtoken');

// Mock user database (replace with real database)
const users = new Map();

// Mock JWT secret (use environment variable in production)
const JWT_SECRET = process.env.JWT_SECRET || 'nemexcoin_dev_secret_2024';

const authMiddleware = (req, res, next) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');
        
        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'Access denied. No token provided.'
            });
        }

        // Verify token
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        
        // Check if user exists in our mock database
        if (!users.has(decoded.id)) {
            return res.status(401).json({
                success: false,
                message: 'Invalid token. User not found.'
            });
        }

        next();
    } catch (error) {
        console.error('Auth middleware error:', error);
        res.status(401).json({
            success: false,
            message: 'Invalid token.'
        });
    }
};

const adminAuthMiddleware = (req, res, next) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');
        
        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'Access denied. No token provided.'
            });
        }

        const decoded = jwt.verify(token, JWT_SECRET);
        
        // Check if user is admin
        if (decoded.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Access denied. Admin privileges required.'
            });
        }

        req.user = decoded;
        next();
    } catch (error) {
        console.error('Admin auth middleware error:', error);
        res.status(401).json({
            success: false,
            message: 'Invalid token.'
        });
    }
};

// Utility function to generate JWT token
const generateToken = (user) => {
    return jwt.sign(
        { 
            id: user.id, 
            email: user.email,
            role: user.role || 'user'
        },
        JWT_SECRET,
        { expiresIn: process.env.TOKEN_EXPIRY || '24h' }
    );
};

module.exports = {
    authMiddleware,
    adminAuthMiddleware,
    generateToken,
    users
};