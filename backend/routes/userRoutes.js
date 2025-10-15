const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcrypt');

// Supabase client
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

// Test route
router.get('/', (req, res) => {
    res.json({ message: 'User API Working' });
});

// Register user
router.post('/register', async (req, res) => {
    try {
        const { walletId, password, referredBy, telegramId, telegramUsername } = req.body;

        // Check if user exists
        const { data: existingUser } = await supabase
            .from('users')
            .select('*')
            .eq('walletId', walletId)
            .single();

        if (existingUser) {
            return res.status(400).json({ message: 'Wallet ID already registered' });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create user
        const { data: newUser, error } = await supabase
            .from('users')
            .insert([{
                walletId,
                password: hashedPassword,
                balance: 0,
                referredBy: referredBy || null,
                telegramId: telegramId || null,
                telegramUsername: telegramUsername || null,
                remaining_time: 86400, // Add this for mining functionality
                join_date: new Date().toISOString() // Add this for profile
            }])
            .select();

        if (error) throw error;

        res.json({ 
            message: 'User registered successfully',
            user: { walletId, balance: 0 }
        });

    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Login user
router.post('/login', async (req, res) => {
    try {
        const { walletId, password } = req.body;

        // Find user
        const { data: user, error } = await supabase
            .from('users')
            .select('*')
            .eq('walletId', walletId)
            .single();

        if (error || !user) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        // Check password
        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        // Return user without password
        const { password: _, ...userData } = user;
        res.json({ message: 'Login successful', user: userData });

    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// === ADD THESE NEW ROUTES BELOW YOUR EXISTING ONES ===

// Get user by ID (for dashboard)
router.get('/user/:userId', async (req, res) => {
    try {
        const { userId } = req.params;

        const { data: user, error } = await supabase
            .from('users')
            .select('*')
            .eq('walletId', userId) // Using walletId as userId
            .single();

        if (error) {
            if (error.code === 'PGRST116') {
                return res.status(404).json({ error: 'User not found' });
            }
            throw error;
        }

        // Return user data in expected format
        res.json({
            userId: user.walletId,
            balance: user.balance,
            remainingTime: user.remaining_time,
            joinDate: user.join_date
        });
    } catch (error) {
        console.error('Get user error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Create new user (for dashboard initialization)
router.post('/user', async (req, res) => {
    try {
        const { userId, balance = 0, remainingTime = 86400, joinDate } = req.body;

        const { data: user, error } = await supabase
            .from('users')
            .insert([
                {
                    walletId: userId, // Using walletId as userId
                    balance: balance,
                    remaining_time: remainingTime,
                    join_date: joinDate || new Date().toISOString(),
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                }
            ])
            .select()
            .single();

        if (error) {
            if (error.code === '23505') { // Unique violation
                return res.status(409).json({ error: 'User already exists' });
            }
            throw error;
        }

        res.status(201).json({
            userId: user.walletId,
            balance: user.balance,
            remainingTime: user.remaining_time
        });
    } catch (error) {
        console.error('Create user error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Claim mining reward
router.post('/claim/:userId', async (req, res) => {
    try {
        const { userId } = req.params;

        // Get current user data
        const { data: user, error: userError } = await supabase
            .from('users')
            .select('*')
            .eq('walletId', userId)
            .single();

        if (userError) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Check if user can claim (remaining_time should be 0)
        if (user.remaining_time > 0) {
            return res.status(400).json({ error: 'Reward not ready to claim' });
        }

        // Update user balance and reset timer
        const newBalance = user.balance + 30;
        const { data: updatedUser, error: updateError } = await supabase
            .from('users')
            .update({
                balance: newBalance,
                remaining_time: 86400, // 24 hours in seconds
                updated_at: new Date().toISOString()
            })
            .eq('walletId', userId)
            .select()
            .single();

        if (updateError) {
            throw updateError;
        }

        // Create transaction record
        await supabase
            .from('transactions')
            .insert([
                {
                    user_id: userId,
                    type: 'mining_reward',
                    amount: 30,
                    description: 'Daily mining reward',
                    created_at: new Date().toISOString()
                }
            ]);

        res.json({
            balance: updatedUser.balance,
            remainingTime: updatedUser.remaining_time,
            message: 'Successfully claimed 30 NMXp!'
        });
    } catch (error) {
        console.error('Claim reward error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get user profile
router.get('/profile/:userId', async (req, res) => {
    try {
        const { userId } = req.params;

        const { data: user, error } = await supabase
            .from('users')
            .select('*')
            .eq('walletId', userId)
            .single();

        if (error) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Calculate mining days
        const joinDate = new Date(user.join_date);
        const today = new Date();
        const miningDays = Math.floor((today - joinDate) / (1000 * 60 * 60 * 24)) + 1;

        res.json({
            userId: user.walletId,
            name: user.telegramUsername || 'Mining Enthusiast',
            email: `user_${user.walletId.substring(0, 8)}@nemexcoin.com`,
            miningDays: miningDays,
            totalEarned: user.balance,
            memberSince: user.join_date
        });
    } catch (error) {
        console.error('Get profile error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;