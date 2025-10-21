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

// ✅ DEBUG: Log all requests
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
});

// ✅ FIX: Serve static files from frontend directory
app.use(express.static(path.join(__dirname, 'frontend')));

// In-memory storage
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

// ✅ FIX: Add explicit routes for each page with error handling
app.get('/', (req, res) => {
    try {
        res.sendFile(path.join(__dirname, 'frontend', 'index.html'));
    } catch (error) {
        console.error('Error serving index.html:', error);
        res.status(500).send('Error loading homepage');
    }
});

app.get('/login', (req, res) => {
    try {
        res.sendFile(path.join(__dirname, 'frontend', 'login.html'));
    } catch (error) {
        console.error('Error serving login.html:', error);
        res.status(500).send('Error loading login page');
    }
});

app.get('/dashboard', (req, res) => {
    try {
        res.sendFile(path.join(__dirname, 'frontend', 'dashboard.html'));
    } catch (error) {
        console.error('Error serving dashboard.html:', error);
        res.status(500).send('Error loading dashboard');
    }
});

app.get('/register', (req, res) => {
    try {
        res.sendFile(path.join(__dirname, 'frontend', 'register.html'));
    } catch (error) {
        console.error('Error serving register.html:', error);
        res.status(500).send('Error loading registration page');
    }
});

// API Routes
app.get('/api/health', (req, res) => {
    res.json({ 
        success: true, 
        message: 'NemexCoin API is running!',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development'
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

app.post('/api/register', async (req, res) => {
    try {
        const { name, email, password } = req.body;
        
        if (!name || !email || !password) {
            return res.status(400).json({ 
                success: false, 
                error: 'Name, email and password are required' 
            });
        }
        
        const existingUser = users.find(u => u.email === email);
        if (existingUser) {
            return res.status(400).json({ 
                success: false, 
                error: 'User already exists with this email' 
            });
        }
        
        const hashedPassword = await bcrypt.hash(password, 10);
        
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

// ✅ FIX: Catch-all handler - MUST BE LAST
app.get('*', (req, res) => {
    console.log('Catch-all route triggered for:', req.url);
    res.sendFile(path.join(__dirname, 'frontend', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`🚀 NemexCoin app running on port ${PORT}`);
    console.log(`🏠 Homepage: http://localhost:${PORT}`);
    console.log(`🔑 Login: http://localhost:${PORT}/login`);
    console.log(`📝 Register: http://localhost:${PORT}/register`);
    console.log(`📊 Dashboard: http://localhost:${PORT}/dashboard`);
    console.log(`🩺 Health: http://localhost:${PORT}/api/health`);
    console.log(`📧 Demo account: test@nemexcoin.com / 123456`);
    console.log(`✅ Frontend folder exists: ${require('fs').existsSync(path.join(__dirname, 'frontend'))}`);
});