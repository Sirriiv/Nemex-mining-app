// routes/userRoutes.js

const express = require('express');
const router = express.Router();
const User = require('../models/userModel'); // Import the User Model from the models folder
const bcrypt = require('bcrypt'); // Import bcrypt for password hashing

// ----------------- TEST ROUTE -----------------
// This path will be: /api/users
router.get('/', (req, res) => {
    res.json({ message: 'User Routes Working. Ready to implement Register/Login.' });
});

// ----------------- USER REGISTRATION ROUTE -----------------
// This path will be: /api/users/register
router.post('/register', async (req, res) => {
    try {
        // We expect walletId and password from the frontend in the request body
        const { walletId, password } = req.body;

        // 1. Check if user already exists
        const existingUser = await User.findOne({ walletId });
        if (existingUser) {
            return res.status(400).json({ message: 'Wallet ID already registered.' });
        }

        // 2. Hash the password (CRITICAL security step!)
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // 3. Create a new user instance
        const newUser = new User({
            walletId,
            password: hashedPassword,
            balance: 0 // Initialize balance
        });

        // 4. Save the user to the MongoDB database
        await newUser.save();

        // 5. Success response
        res.status(201).json({ message: 'User registered successfully!' });

    } catch (error) {
        // This catches database or server errors
        res.status(500).json({ message: 'Server error during registration.', error: error.message });
    }
});
// ----------------------------------------------------------------


module.exports = router;
