require('dotenv').config();
const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const cors = require('cors');
const bcrypt = require('bcryptjs');

const app = express();

// ======================
// MIDDLEWARE
// ======================
app.use(cors({
    origin: '*',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// ======================
// SUPABASE INIT
// ======================
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase environment variables');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);
console.log('✅ Supabase client initialized');

// ======================
// UTILITY FUNCTIONS
// ======================
function getUTCDate() {
    const now = new Date();
    return new Date(now.getTime() + now.getTimezoneOffset() * 60000);
}

function generateUserId() {
    return 'user_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
}

// ======================
// AUTHENTICATION ROUTES
// ======================

// User Registration
app.post('/api/register', async (req, res) => {
    try {
        const { name, email, password } = req.body;

        console.log('📝 Registration attempt:', { name, email });

        // Validation
        if (!name || !email || !password) {
            return res.status(400).json({ error: 'All fields are required' });
        }

        if (password.length < 6) {
            return res.status(400).json({ error: 'Password must be at least 6 characters' });
        }

        // Check if user exists
        const { data: existingUser, error: checkError } = await supabase
            .from('users')
            .select('user_id, email')
            .eq('email', email)
            .single();

        if (existingUser) {
            return res.status(400).json({ error: 'User already exists with this email' });
        }

        // Create new user
        const hashedPassword = await bcrypt.hash(password, 12);
        const userId = generateUserId();
        const currentUTCDate = getUTCDate();
        const countdownEnd = new Date(currentUTCDate.getTime() + 24 * 60 * 60 * 1000);

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

        if (createError) throw createError;

        console.log('✅ New user registered:', createdUser.email);

        // Return without password
        const { password_hash, ...userWithoutPassword } = createdUser;

        res.json({
            success: true,
            message: 'Registration successful!',
            user: userWithoutPassword
        });

    } catch (error) {
        console.error('❌ Registration Error:', error);
        res.status(500).json({ error: 'Registration failed. Please try again.' });
    }
});

// User Login
app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        console.log('🔐 Login attempt:', email);

        // Find user
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
        await supabase
            .from('users')
            .update({ last_login: getUTCDate().toISOString() })
            .eq('user_id', user.user_id);

        // Return without password
        const { password_hash, ...userWithoutPassword } = user;

        console.log('✅ User logged in:', user.email);

        res.json({
            success: true,
            message: 'Login successful!',
            user: userWithoutPassword
        });

    } catch (error) {
        console.error('❌ Login Error:', error);
        res.status(500).json({ error: 'Login failed. Please try again.' });
    }
});

// ======================
// DASHBOARD ROUTES
// ======================

// Get user data
app.get('/api/user/:userId', async (req, res) => {
    try {
        const { userId } = req.params;

        const { data: user, error } = await supabase
            .from('users')
            .select('*')
            .eq('user_id', userId)
            .single();

        if (error) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Calculate remaining time
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
        console.error('❌ User API Error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get user profile
app.get('/api/profile/:userId', async (req, res) => {
    try {
        const { userId } = req.params;

        const { data: user, error } = await supabase
            .from('users')
            .select('*')
            .eq('user_id', userId)
            .single();

        if (error) throw error;

        // Calculate mining days
        const joinDate = new Date(user.created_at);
        const today = getUTCDate();
        const joinDateStart = new Date(joinDate.getFullYear(), joinDate.getMonth(), joinDate.getDate());
        const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        const miningDays = Math.floor((todayStart - joinDateStart) / (1000 * 60 * 60 * 24)) + 1;

        // Return without password
        const { password_hash, ...userWithoutPassword } = user;

        res.json({
            name: user.name,
            email: user.email,
            userId: user.user_id,
            miningDays: miningDays,
            totalEarned: user.total_earned || user.balance,
            memberSince: user.created_at,
            balance: user.balance,
            lastClaim: user.last_claim,
            lastLogin: user.last_login
        });

    } catch (error) {
        console.error('❌ Profile Error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Claim reward
app.post('/api/claim/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const now = getUTCDate();

        // Get user data
        const { data: user, error: fetchError } = await supabase
            .from('users')
            .select('*')
            .eq('user_id', userId)
            .single();

        if (fetchError) throw fetchError;

        // Check timer
        const countdownEnd = new Date(user.countdown_end);
        if (countdownEnd > now) {
            const remaining = Math.floor((countdownEnd - now) / 1000);
            return res.status(400).json({ 
                error: `Timer not finished. ${Math.floor(remaining/3600)}h ${Math.floor((remaining%3600)/60)}m remaining` 
            });
        }

        // Update balance
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
        console.error('❌ Claim Error:', error);
        res.status(500).json({ error: error.message });
    }
});

// ======================
// HEALTH CHECK
// ======================

app.get('/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development',
        service: 'NemexCoin Backend'
    });
});

// ======================
// ERROR HANDLING
// ======================

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({ 
        error: 'Endpoint not found',
        path: req.originalUrl
    });
});

// Global error handler
app.use((error, req, res, next) => {
    console.error('❌ Unhandled Error:', error);
    res.status(500).json({ 
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
    });
});

// ======================
// SERVER START
// ======================
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log('✅ Authentication system ready!');
    console.log('✅ Dashboard API endpoints ready!');
    console.log('✅ CORS properly configured!');
    console.log(`📍 Health check: http://localhost:${PORT}/health`);
});
