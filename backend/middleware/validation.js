const { body, validationResult } = require('express-validator');

// Validation rules
const registerValidation = [
    body('fullName')
        .notEmpty()
        .withMessage('Full name is required')
        .isLength({ min: 2, max: 50 })
        .withMessage('Full name must be between 2 and 50 characters')
        .trim()
        .escape(),
    
    body('email')
        .isEmail()
        .withMessage('Please provide a valid email')
        .normalizeEmail(),
    
    body('password')
        .isLength({ min: 6 })
        .withMessage('Password must be at least 6 characters long')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
        .withMessage('Password must contain at least one lowercase letter, one uppercase letter, and one number'),
    
    body('referralCode')
        .optional()
        .isLength({ min: 3, max: 20 })
        .withMessage('Referral code must be between 3 and 20 characters')
        .trim()
        .escape()
];

const loginValidation = [
    body('email')
        .isEmail()
        .withMessage('Please provide a valid email')
        .normalizeEmail(),
    
    body('password')
        .notEmpty()
        .withMessage('Password is required')
];

const taskValidation = [
    body('title')
        .notEmpty()
        .withMessage('Task title is required')
        .isLength({ min: 3, max: 100 })
        .withMessage('Task title must be between 3 and 100 characters'),
    
    body('description')
        .optional()
        .isLength({ max: 500 })
        .withMessage('Description must not exceed 500 characters'),
    
    body('reward')
        .isInt({ min: 1, max: 1000 })
        .withMessage('Reward must be between 1 and 1000 NMXp'),
    
    body('type')
        .isIn(['daily', 'social', 'streak', 'purchase', 'other'])
        .withMessage('Invalid task type')
];

// Validation middleware
const validate = (req, res, next) => {
    const errors = validationResult(req);
    
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            message: 'Validation failed',
            errors: errors.array().map(err => ({
                field: err.param,
                message: err.msg
            }))
        });
    }
    
    next();
};

// Sanitization middleware
const sanitizeInput = (req, res, next) => {
    // Trim string fields
    if (req.body) {
        Object.keys(req.body).forEach(key => {
            if (typeof req.body[key] === 'string') {
                req.body[key] = req.body[key].trim();
            }
        });
    }
    next();
};

module.exports = {
    registerValidation,
    loginValidation,
    taskValidation,
    validate,
    sanitizeInput
};