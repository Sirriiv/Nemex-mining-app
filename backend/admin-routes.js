// admin-routes.js - Add this as a separate file to your backend
const express = require('express');
const router = express.Router();

// Admin middleware - Only you can access
const checkAdmin = (req, res, next) => {
    const adminToken = req.headers.authorization?.replace('Bearer ', '');
    
    // Use a secure token that only you know
    if (adminToken === process.env.ADMIN_SECRET_TOKEN) {
        next();
    } else {
        res.status(403).json({ error: 'Admin access required' });
    }
};

// Get all users for admin panel
router.get('/users', checkAdmin, async (req, res) => {
    try {
        // Replace this with your actual database query
        const users = await db.query(`
            SELECT 
                u.id,
                u.name,
                u.email,
                u.balance,
                u.created_at as joinedDate,
                COUNT(r.id) > 0 as hasReferral
            FROM users u
            LEFT JOIN referrals r ON u.id = r.referred_user_id
            GROUP BY u.id, u.name, u.email, u.balance, u.created_at
            ORDER BY u.created_at DESC
        `);

        const stats = {
            totalUsers: users.length,
            withReferrals: users.filter(u => u.hasReferral).length,
            withoutReferrals: users.filter(u => !u.hasReferral).length,
            totalNMX: users.reduce((sum, user) => sum + user.balance, 0)
        };

        res.json({
            users: users,
            stats: stats
        });
    } catch (error) {
        console.error('Admin users fetch error:', error);
        res.status(500).json({ error: 'Failed to fetch users data' });
    }
});

// Check admin access
router.get('/check-access', checkAdmin, (req, res) => {
    res.json({ message: 'Admin access granted' });
});

module.exports = router;