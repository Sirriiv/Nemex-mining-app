// admin-routes.js
const express = require('express');
const router = express.Router();

// Admin middleware - Only you can access
const checkAdmin = (req, res, next) => {
    const adminToken = req.headers.authorization?.replace('Bearer ', '');
    
    // Use a secure token that only you know
    const validTokens = [
        process.env.ADMIN_SECRET_TOKEN,
        'your-temporary-admin-token' // Remove this after testing
    ];
    
    if (validTokens.includes(adminToken)) {
        next();
    } else {
        res.status(403).json({ error: 'Admin access required' });
    }
};

// Get all users for admin panel
router.get('/users', checkAdmin, async (req, res) => {
    try {
        // Replace with your actual database query
        // This is a sample query - adjust based on your database schema
        const { data: users, error } = await req.supabase
            .from('profiles')
            .select(`
                id,
                email,
                username,
                balance,
                created_at,
                telegram_id,
                referral_slots,
                used_slots,
                total_earned_from_refs,
                referrals:referrals(count)
            `)
            .order('created_at', { ascending: false });

        if (error) {
            throw error;
        }

        // Process the data for admin panel
        const processedUsers = users.map(user => ({
            id: user.id,
            name: user.username || 'Unknown User',
            email: user.email || 'No email',
            balance: parseFloat(user.balance) || 0,
            joinedDate: user.created_at,
            hasReferral: (user.referrals && user.referrals.length > 0) || false,
            telegramId: user.telegram_id,
            referralSlots: user.referral_slots,
            usedSlots: user.used_slots,
            totalEarnedFromRefs: user.total_earned_from_refs || 0
        }));

        // Calculate statistics
        const stats = {
            totalUsers: processedUsers.length,
            withReferrals: processedUsers.filter(u => u.hasReferral).length,
            withoutReferrals: processedUsers.filter(u => !u.hasReferral).length,
            totalNMX: processedUsers.reduce((sum, user) => sum + user.balance, 0),
            totalReferralEarnings: processedUsers.reduce((sum, user) => sum + (user.totalEarnedFromRefs || 0), 0)
        };

        res.json({
            users: processedUsers,
            stats: stats
        });

    } catch (error) {
        console.error('Admin users fetch error:', error);
        res.status(500).json({ error: 'Failed to fetch users data' });
    }
});

// Check admin access
router.get('/check-access', checkAdmin, (req, res) => {
    res.json({ 
        message: 'Admin access granted',
        user: req.user // If you have user info in request
    });
});

// Get detailed user information
router.get('/users/:userId', checkAdmin, async (req, res) => {
    try {
        const { userId } = req.params;

        const { data: user, error } = await req.supabase
            .from('profiles')
            .select(`
                *,
                referrals:referrals(*),
                referral_bonuses:referral_bonuses(*)
            `)
            .eq('id', userId)
            .single();

        if (error) throw error;

        res.json({ user });

    } catch (error) {
        console.error('Admin user details error:', error);
        res.status(500).json({ error: 'Failed to fetch user details' });
    }
});

module.exports = router;

// Add wallet routes to your existing admin routes
const walletRoutes = require('./wallet-routes');

// Mount wallet routes
app.use('/api/wallet', walletRoutes);

console.log('✅ Wallet routes added to admin backend');