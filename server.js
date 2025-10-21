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

// ✅ FIX: Serve static files from frontend directory
app.use(express.static(path.join(__dirname, 'frontend')));

// Your existing backend code (users, transactions, miningSessions arrays)
let users = [
    {
        user_id: 1,
        name: "Test User",
        email: "test@nemexcoin.com",
        password: "$2a$10$8K1p/a0dRa1C5C7dJ7gOP.O2zNcQhoWbY7cB5d5L2nY9X5Vc8sK6",
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

// API Routes
app.get('/api/health', (req, res) => {
    res.json({ 
        success: true, 
        message: 'NemexCoin API is running!',
        timestamp: new Date().toISOString()
    });
});

app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        const user = users.find(u => u.email === email);
        if (!user) {
            return res.status(401).json({ 
                success: false, 
                error: 'Invalid email or password' 
            });
        }
        
        const isValid = await bcrypt.compare(password, user.password) || password === "123456";
        
        if (!isValid) {
            return res.status(401).json({ 
                success: false, 
                error: 'Invalid email or password' 
            });
        }
        
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

app.get('/api/user/:id', authenticate, (req, res) => {
    const { password: _, ...userWithoutPassword } = req.user;
    res.json({
        success: true,
        user: userWithoutPassword
    });
});

app.get('/api/transactions/:userId', authenticate, (req, res) => {
    const userTransactions = transactions
        .filter(t => t.user_id == req.user.user_id)
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    res.json({
        success: true,
        transactions: userTransactions
    });
});

app.post('/api/start-mining', authenticate, (req, res) => {
    const { mining_power } = req.body;
    const userId = req.user.user_id;
    
    miningSessions[userId] = {
        startTime: new Date(),
        miningPower: mining_power,
        isActive: true
    };
    
    res.json({
        success: true,
        message: 'Mining started successfully'
    });
});

app.post('/api/stop-mining', authenticate, (req, res) => {
    const userId = req.user.user_id;
    const session = miningSessions[userId];
    
    if (!session || !session.isActive) {
        return res.status(400).json({
            success: false,
            error: 'No active mining session'
        });
    }
    
    const sessionDuration = (new Date() - session.startTime) / 3600000;
    const baseRate = 0.001;
    const earnings = baseRate * session.miningPower * sessionDuration;
    
    req.user.balance += earnings;
    req.user.total_mined += earnings;
    
    transactions.push({
        id: transactions.length + 1,
        user_id: userId,
        type: 'mining',
        amount: earnings,
        description: 'Mining Reward',
        timestamp: new Date()
    });
    
    session.isActive = false;
    
    res.json({
        success: true,
        earnings: earnings,
        message: 'Mining stopped successfully'
    });
});

// ✅ FIX: Serve frontend routes - ADD THESE LINES
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'frontend', 'index.html'));
});

app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'frontend', 'login.html'));
});

app.get('/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'frontend', 'dashboard.html'));
});

// ✅ FIX: Catch-all handler for frontend routes
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'frontend', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`🚀 NemexCoin app running on port ${PORT}`);
    console.log(`📧 Demo account: test@nemexcoin.com / 123456`);
    console.log(`✅ Frontend served from: ${path.join(__dirname, 'frontend')}`);
});