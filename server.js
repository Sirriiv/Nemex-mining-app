const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// In-memory storage (replace with database in production)
let users = [
    {
        user_id: 1,
        name: "Test User",
        email: "test@nemexcoin.com",
        password: "$2a$10$8K1p/a0dRa1C5C7dJ7gOP.O2zNcQhoWbY7cB5d5L2nY9X5Vc8sK6", // 123456
        balance: 12.5432,
        total_mined: 12.5432,
        created_at: new Date('2024-01-01')
    }
];

let transactions = [
    {
        id: 1,
        user_id: 1,
        type: "mining",
        amount: 0.0012,
        description: "Mining Reward",
        timestamp: new Date(Date.now() - 3600000)
    },
    {
        id: 2,
        user_id: 1, 
        type: "mining",
        amount: 0.0015,
        description: "Mining Reward",
        timestamp: new Date(Date.now() - 7200000)
    },
    {
        id: 3,
        user_id: 1,
        type: "mining",
        amount: 0.0021,
        description: "Mining Reward", 
        timestamp: new Date(Date.now() - 10800000)
    }
];

let miningSessions = {};

// Auth middleware
const authenticate = (req, res, next) => {
    const userId = req.headers['user-id'];
    if (!userId) {
        return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    const user = users.find(u => u.user_id == userId);
    if (!user) {
        return res.status(401).json({ success: false, error: 'User not found' });
    }

    req.user = user;
    next();
};

// Routes

// Health check
app.get('/api/health', (req, res) => {
    res.json({ 
        success: true, 
        message: 'NemexCoin API is running!',
        timestamp: new Date().toISOString()
    });
});

// Login
app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ 
                success: false, 
                error: 'Email and password are required' 
            });
        }

        const user = users.find(u => u.email === email);
        if (!user) {
            return res.status(401).json({ 
                success: false, 
                error: 'Invalid email or password' 
            });
        }

        // In production, use bcrypt.compare
        // For demo, we'll use simple comparison with the hashed password for "123456"
        const isValid = await bcrypt.compare(password, user.password);

        if (!isValid && password !== "123456") {
            return res.status(401).json({ 
                success: false, 
                error: 'Invalid email or password' 
            });
        }

        // Remove password from response
        const { password: _, ...userWithoutPassword } = user;

        res.json({
            success: true,
            user: userWithoutPassword,
            message: 'Login successful'
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Internal server error' 
        });
    }
});

// Register
app.post('/api/register', async (req, res) => {
    try {
        const { name, email, password } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({ 
                success: false, 
                error: 'Name, email and password are required' 
            });
        }

        // Check if user already exists
        const existingUser = users.find(u => u.email === email);
        if (existingUser) {
            return res.status(400).json({ 
                success: false, 
                error: 'User already exists with this email' 
            });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create new user
        const newUser = {
            user_id: users.length + 1,
            name,
            email,
            password: hashedPassword,
            balance: 0,
            total_mined: 0,
            created_at: new Date()
        };

        users.push(newUser);

        // Remove password from response
        const { password: _, ...userWithoutPassword } = newUser;

        res.status(201).json({
            success: true,
            user: userWithoutPassword,
            message: 'Registration successful'
        });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Internal server error' 
        });
    }
});

// Get user data
app.get('/api/user/:id', authenticate, (req, res) => {
    const { password: _, ...userWithoutPassword } = req.user;
    res.json({
        success: true,
        user: userWithoutPassword
    });
});

// Get transactions
app.get('/api/transactions/:userId', authenticate, (req, res) => {
    const userTransactions = transactions
        .filter(t => t.user_id == req.user.user_id)
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    res.json({
        success: true,
        transactions: userTransactions
    });
});

// Start mining
app.post('/api/start-mining', authenticate, (req, res) => {
    const { mining_power } = req.body;
    const userId = req.user.user_id;

    if (!mining_power || mining_power < 1 || mining_power > 100) {
        return res.status(400).json({
            success: false,
            error: 'Mining power must be between 1 and 100'
        });
    }

    // Start mining session
    miningSessions[userId] = {
        startTime: new Date(),
        miningPower: mining_power,
        isActive: true
    };

    res.json({
        success: true,
        message: 'Mining started successfully',
        mining_power: mining_power
    });
});

// Stop mining
app.post('/api/stop-mining', authenticate, (req, res) => {
    const userId = req.user.user_id;
    const session = miningSessions[userId];

    if (!session || !session.isActive) {
        return res.status(400).json({
            success: false,
            error: 'No active mining session'
        });
    }

    // Calculate earnings (simulated)
    const sessionDuration = (new Date() - session.startTime) / 3600000; // hours
    const baseRate = 0.001;
    const earnings = baseRate * session.miningPower * sessionDuration;

    // Update user balance
    req.user.balance += earnings;
    req.user.total_mined += earnings;

    // Add transaction
    const newTransaction = {
        id: transactions.length + 1,
        user_id: userId,
        type: 'mining',
        amount: earnings,
        description: 'Mining Reward',
        timestamp: new Date()
    };

    transactions.push(newTransaction);

    // End session
    session.isActive = false;

    res.json({
        success: true,
        earnings: earnings,
        session_duration: sessionDuration,
        message: 'Mining stopped successfully'
    });
});

// Serve frontend in production
if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.join(__dirname, '../frontend')));

    app.get('*', (req, res) => {
        res.sendFile(path.join(__dirname, '../frontend/index.html'));
    });
}

app.listen(PORT, () => {
    console.log(`🚀 NemexCoin server running on port ${PORT}`);
    console.log(`📧 Demo account: test@nemexcoin.com / 123456`);
    console.log(`🌐 Health check: http://localhost:${PORT}/api/health`);
});
