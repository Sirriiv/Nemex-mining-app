require('dotenv').config();
const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const cors = require('cors');
const bcrypt = require('bcryptjs');

const app = express();
app.use(cors());
app.use(express.json());

// Initialize Supabase
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase environment variables');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Helper function to get UTC date without timezone issues
function getUTCDate() {
    const now = new Date();
    return new Date(now.getTime() + now.getTimezoneOffset() * 60000);
}

// User Registration
app.post('/api/register', async (req, res) => {
    try {
        const { name, email, password } = req.body;

        console.log('Registration attempt:', { name, email });

        // Validate input
        if (!name || !email || !password) {
            return res.status(400).json({ error: 'All fields are required' });
        }

        if (password.length < 6) {
            return res.status(400).json({ error: 'Password must be at least 6 characters' });
        }

        // Check if user already exists
        const { data: existingUser, error: checkError } = await supabase
            .from('users')
            .select('user_id, email')
            .eq('email', email)
            .single();

        if (existingUser) {
            return res.status(400).json({ error: 'User already exists with this email' });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 12);

        // Generate unique user ID for Sybil detection
        const userId = 'user_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();

        // FIXED: Use consistent UTC date handling
        const currentUTCDate = getUTCDate();
        const countdownEnd = new Date(currentUTCDate.getTime() + 24 * 60 * 60 * 1000);

        // Create new user with REAL data
        const newUser = {
            user_id: userId,
            name: name.trim(),
            email: email.toLowerCase().trim(),
            password_hash: hashedPassword,
            balance: 0,
            total_earned: 0,
            countdown_end: countdownEnd.toISOString(),
            last_claim: currentUTCDate.toISOString(),
            created_at: currentUTCDate.toISOString(),
            updated_at: currentUTCDate.toISOString(),
            last_login: currentUTCDate.toISOString()
        };

        const { data: createdUser, error: createError } = await supabase
            .from('users')
            .insert([newUser])
            .select()
            .single();

        if (createError) {
            console.error('Database Error:', createError);
            throw createError;
        }

        console.log('New user registered:', createdUser.email);
        console.log('User created at:', createdUser.created_at);

        // Return user data (without password)
        const { password_hash, ...userWithoutPassword } = createdUser;

        res.json({
            success: true,
            message: 'Registration successful!',
            user: userWithoutPassword
        });
    } catch (error) {
        console.error('Registration Error:', error);
        res.status(500).json({ error: 'Registration failed. Please try again.' });
    }
});

// User Login
app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        console.log('Login attempt:', email);

        // Find user by email
        const { data: user, error } = await supabase
            .from('users')
            .select('*')
            .eq('email', email.toLowerCase().trim())
            .single();

        if (error || !user) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        // Check password
        const isPasswordValid = await bcrypt.compare(password, user.password_hash);
        if (!isPasswordValid) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        // Update last login
        const currentUTCDate = getUTCDate();
        await supabase
            .from('users')
            .update({ last_login: currentUTCDate.toISOString() })
            .eq('user_id', user.user_id);

        // Return user data (without password)
        const { password_hash, ...userWithoutPassword } = user;

        console.log('User logged in:', user.email);

        res.json({
            success: true,
            message: 'Login successful!',
            user: userWithoutPassword
        });
    } catch (error) {
        console.error('Login Error:', error);
        res.status(500).json({ error: 'Login failed. Please try again.' });
    }
});

// Get user data (existing endpoint - updated)
app.get('/api/user/:userId', async (req, res) => {
    try {
        const { userId } = req.params;

        // Get user data from Supabase
        const { data: user, error } = await supabase
            .from('users')
            .select('*')
            .eq('user_id', userId)
            .single();

        if (error) {
            console.error('User fetch error:', error);
            return res.status(404).json({ error: 'User not found' });
        }

        // Calculate remaining time with UTC dates
        const now = getUTCDate();
        const countdownEnd = new Date(user.countdown_end);
        const remainingTime = Math.max(0, Math.floor((countdownEnd - now) / 1000));

        // Return without password
        const { password_hash, ...userWithoutPassword } = user;

        res.json({
            balance: user.balance,
            remainingTime: remainingTime,
            canClaim: remainingTime <= 0,
            profile: userWithoutPassword
        });
    } catch (error) {
        console.error('API Error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get user profile - FIXED DATE HANDLING
app.get('/api/profile/:userId', async (req, res) => {
    try {
        const { userId } = req.params;

        // Get user data from Supabase
        const { data: user, error } = await supabase
            .from('users')
            .select('*')
            .eq('user_id', userId)
            .single();

        if (error) throw error;

        // FIXED: Calculate days since joining with proper date handling
        const joinDate = new Date(user.created_at);
        const today = getUTCDate();

        // Reset both dates to start of day for accurate day calculation
        const joinDateStart = new Date(joinDate.getFullYear(), joinDate.getMonth(), joinDate.getDate());
        const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());

        const miningDays = Math.floor((todayStart - joinDateStart) / (1000 * 60 * 60 * 24)) + 1;

        console.log('Profile date debug:', {
            userId: userId,
            rawCreatedAt: user.created_at,
            joinDate: joinDate.toISOString(),
            today: today.toISOString(),
            joinDateStart: joinDateStart.toISOString(),
            todayStart: todayStart.toISOString(),
            calculatedMiningDays: miningDays
        });

        // Return without password
        const { password_hash, ...userWithoutPassword } = user;

        res.json({
            name: user.name,
            email: user.email,
            userId: user.user_id,
            miningDays: miningDays,
            totalEarned: user.total_earned || user.balance,
            memberSince: user.created_at, // Return raw ISO string for frontend to format
            balance: user.balance,
            lastClaim: user.last_claim,
            lastLogin: user.last_login
        });
    } catch (error) {
        console.error('Profile Error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Update user profile
app.post('/api/profile/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const { name, email } = req.body;

        const updates = {
            name: name,
            email: email,
            updated_at: getUTCDate().toISOString()
        };

        const { data: updatedUser, error } = await supabase
            .from('users')
            .update(updates)
            .eq('user_id', userId)
            .select()
            .single();

        if (error) throw error;

        const { password_hash, ...userWithoutPassword } = updatedUser;

        res.json({
            message: 'Profile updated successfully',
            profile: userWithoutPassword
        });
    } catch (error) {
        console.error('Update Profile Error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Claim reward (existing endpoint) - FIXED DATE HANDLING
app.post('/api/claim/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const now = getUTCDate();

        // Get user current data
        const { data: user, error: fetchError } = await supabase
            .from('users')
            .select('*')
            .eq('user_id', userId)
            .single();

        if (fetchError) throw fetchError;

        // Check if timer is finished
        const countdownEnd = new Date(user.countdown_end);
        if (countdownEnd > now) {
            const remaining = Math.floor((countdownEnd - now) / 1000);
            return res.status(400).json({ 
                error: `Timer not finished. ${Math.floor(remaining/3600)}h ${Math.floor((remaining%3600)/60)}m remaining` 
            });
        }

        // Update user data - CLAIM REWARD
        const newBalance = user.balance + 30;
        const newTotalEarned = (user.total_earned || 0) + 30;

        const updates = {
            balance: newBalance,
            total_earned: newTotalEarned,
            countdown_end: new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString(),
            last_claim: now.toISOString(),
            updated_at: now.toISOString()
        };

        const { data: updatedUser, error: updateError } = await supabase
            .from('users')
            .update(updates)
            .eq('user_id', userId)
            .select()
            .single();

        if (updateError) throw updateError;

        res.json({
            balance: newBalance,
            totalEarned: newTotalEarned,
            message: 'Claim successful! +30 NMXp'
        });
    } catch (error) {
        console.error('Claim Error:', error);
        res.status(500).json({ error: error.message });
    }
});

// === NEW DASHBOARD ROUTES ADDED BELOW ===

// Get user tasks
app.get('/api/tasks/:userId', async (req, res) => {
    try {
        const { userId } = req.params;

        // Static tasks for now - you can move to database later
        const tasks = [
            {
                id: 1,
                title: 'Daily Check-in',
                description: 'Claim your daily reward',
                reward: 10,
                type: 'daily',
                completed: false,
                action: 'checkin'
            },
            {
                id: 2,
                title: 'Watch Tutorial',
                description: 'Learn about NemexCoin',
                reward: 15,
                type: 'one_time',
                completed: false,
                action: 'tutorial'
            },
            {
                id: 3,
                title: 'Invite Friends',
                description: 'Earn 50 NMXp for each friend who joins',
                reward: 50,
                type: 'referral',
                completed: false,
                action: 'referral'
            },
            {
                id: 4,
                title: 'Join Telegram',
                description: 'Join our Telegram community',
                reward: 25,
                type: 'one_time',
                completed: false,
                action: 'telegram'
            }
        ];

        res.json({
            success: true,
            tasks: tasks
        });
    } catch (error) {
        console.error('Tasks Error:', error);
        res.status(500).json({ error: 'Failed to load tasks' });
    }
});

// Complete a task
app.post('/api/tasks/:userId/complete', async (req, res) => {
    try {
        const { userId } = req.params;
        const { taskId } = req.body;

        // Get task details
        const tasks = {
            1: { reward: 10, title: 'Daily Check-in' },
            2: { reward: 15, title: 'Watch Tutorial' },
            3: { reward: 50, title: 'Invite Friends' },
            4: { reward: 25, title: 'Join Telegram' }
        };

        const task = tasks[taskId];
        if (!task) {
            return res.status(404).json({ error: 'Task not found' });
        }

        // Get current user data
        const { data: user, error: userError } = await supabase
            .from('users')
            .select('balance, total_earned')
            .eq('user_id', userId)
            .single();

        if (userError) throw userError;

        // Update user balance
        const newBalance = user.balance + task.reward;
        const newTotalEarned = (user.total_earned || 0) + task.reward;

        const updates = {
            balance: newBalance,
            total_earned: newTotalEarned,
            updated_at: getUTCDate().toISOString()
        };

        const { data: updatedUser, error: updateError } = await supabase
            .from('users')
            .update(updates)
            .eq('user_id', userId)
            .select()
            .single();

        if (updateError) throw updateError;

        res.json({
            success: true,
            balance: newBalance,
            reward: task.reward,
            message: `Task completed! +${task.reward} NMXp`
        });
    } catch (error) {
        console.error('Complete Task Error:', error);
        res.status(500).json({ error: 'Failed to complete task' });
    }
});

// Get referral stats
app.get('/api/referrals/:userId', async (req, res) => {
    try {
        const { userId } = req.params;

        // For now, return static data - you can implement real referral tracking later
        const referralStats = {
            referralCount: 0,
            referralEarnings: 0,
            referralLink: `https://nemexcoin.com/ref/${userId}`,
            pendingRewards: 0
        };

        res.json({
            success: true,
            ...referralStats
        });
    } catch (error) {
        console.error('Referrals Error:', error);
        res.status(500).json({ error: 'Failed to load referral data' });
    }
});

// Get wallet data
app.get('/api/wallet/:userId', async (req, res) => {
    try {
        const { userId } = req.params;

        // Get user data
        const { data: user, error } = await supabase
            .from('users')
            .select('balance, total_earned, created_at')
            .eq('user_id', userId)
            .single();

        if (error) throw error;

        res.json({
            success: true,
            balance: user.balance,
            totalEarned: user.total_earned || user.balance,
            memberSince: user.created_at
        });
    } catch (error) {
        console.error('Wallet Error:', error);
        res.status(500).json({ error: 'Failed to load wallet data' });
    }
});

// Get transaction history
app.get('/api/transactions/:userId', async (req, res) => {
    try {
        const { userId } = req.params;

        // For now, return sample transactions - you can implement real transaction history later
        const transactions = [
            {
                id: 1,
                type: 'mining_reward',
                amount: 30,
                description: 'Daily mining reward',
                date: new Date().toISOString(),
                status: 'completed'
            },
            {
                id: 2,
                type: 'task_reward',
                amount: 10,
                description: 'Daily check-in task',
                date: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
                status: 'completed'
            }
        ];

        res.json({
            success: true,
            transactions: transactions
        });
    } catch (error) {
        console.error('Transactions Error:', error);
        res.status(500).json({ error: 'Failed to load transactions' });
    }
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development',
        service: 'NemexCoin Backend'
    });
});

// 404 handler for undefined routes
app.use('*', (req, res) => {
    res.status(404).json({ 
        error: 'Endpoint not found',
        path: req.originalUrl
    });
});

// Global error handler
app.use((error, req, res, next) => {
    console.error('Unhandled Error:', error);
    res.status(500).json({ 
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
    });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log('✅ Authentication system ready!');
    console.log('✅ Dashboard API endpoints ready!');
    console.log('✅ Date handling fixed - using UTC timezone consistency');
    console.log(`📍 Health check: http://localhost:${PORT}/health`);
});
