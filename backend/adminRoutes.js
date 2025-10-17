const express = require('express');
const router = express.Router();
const { adminAuthMiddleware } = require('../middleware/auth');

// Mock admin data
const adminStats = {
    totalUsers: 150,
    activeUsers: 89,
    totalNMXMined: 12500,
    dailyRewards: 2670,
    pendingWithdrawals: 3
};

// Admin dashboard stats
router.get('/stats', adminAuthMiddleware, (req, res) => {
    res.json({
        success: true,
        stats: adminStats,
        lastUpdated: new Date().toISOString()
    });
});

// Get all users (simplified)
router.get('/users', adminAuthMiddleware, (req, res) => {
    const { users } = require('./middleware/auth');
    
    const userList = Array.from(users.values()).map(user => ({
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        balance: user.balance,
        joinDate: user.joinDate,
        lastLogin: user.lastLogin,
        isActive: user.isActive
    }));

    res.json({
        success: true,
        users: userList,
        total: userList.length
    });
});

module.exports = router;