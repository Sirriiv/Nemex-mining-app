const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authMiddleware } = require('../middleware/auth');
const { registerValidation, loginValidation, validate } = require('../middleware/validation');

// Public routes
router.post('/register', registerValidation, validate, userController.register);
router.post('/login', loginValidation, validate, userController.login);

// Protected routes
router.get('/profile', authMiddleware, userController.getProfile);
router.put('/profile', authMiddleware, userController.updateProfile);
router.get('/balance', authMiddleware, userController.getBalance);
router.post('/mining/claim', authMiddleware, userController.claimMiningReward);

module.exports = router;