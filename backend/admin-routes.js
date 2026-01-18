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
            totalNMXp: processedUsers.reduce((sum, user) => sum + user.balance, 0),
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

// Orphan a referral (break the link but keep user in database)
router.post('/orphan-referral', async (req, res) => {
    try {
        const { referrerId, referredId } = req.body;
        const BONUS_AMOUNT = 30;

        if (!referrerId || !referredId) {
            return res.status(400).json({ error: 'Missing referrer or referred user ID' });
        }

        console.log('🔗 Orphaning referral:', { referrerId, referredId });

        // Get Supabase from request (set by server middleware)
        const supabase = req.supabase || req.app.locals.supabase;

        // 1. Get current balances before making changes
        const { data: referrerProfile } = await supabase
            .from('profiles')
            .select('balance, total_earned_from_refs, used_slots, username')
            .eq('id', referrerId)
            .single();

        const { data: referredProfile } = await supabase
            .from('profiles')
            .select('balance, username')
            .eq('id', referredId)
            .single();

        if (!referrerProfile || !referredProfile) {
            return res.status(404).json({ error: 'User not found' });
        }

        // 2. Remove the referral link (orphan the user)
        const { error: orphanError } = await supabase
            .from('profiles')
            .update({ referred_by: null })
            .eq('id', referredId);

        if (orphanError) {
            console.error('Error orphaning user:', orphanError);
            return res.status(500).json({ error: 'Failed to orphan user' });
        }

        // 3. Deduct bonus from referrer
        const newReferrerBalance = Math.max(0, (referrerProfile.balance || 0) - BONUS_AMOUNT);
        const newReferrerEarned = Math.max(0, (referrerProfile.total_earned_from_refs || 0) - BONUS_AMOUNT);
        const newUsedSlots = Math.max(0, (referrerProfile.used_slots || 0) - 1);

        const { error: referrerUpdateError } = await supabase
            .from('profiles')
            .update({
                balance: newReferrerBalance,
                total_earned_from_refs: newReferrerEarned,
                used_slots: newUsedSlots
            })
            .eq('id', referrerId);

        if (referrerUpdateError) {
            console.error('Error updating referrer balance:', referrerUpdateError);
        }

        // 4. Deduct bonus from referred user (if they had signup bonus)
        const newReferredBalance = Math.max(0, (referredProfile.balance || 0) - BONUS_AMOUNT);

        const { error: referredUpdateError } = await supabase
            .from('profiles')
            .update({ balance: newReferredBalance })
            .eq('id', referredId);

        if (referredUpdateError) {
            console.error('Error updating referred user balance:', referredUpdateError);
        }

        // 5. Delete all referral_network entries for this relationship
        const { error: networkDeleteError } = await supabase
            .from('referral_network')
            .delete()
            .eq('referred_id', referredId);

        if (networkDeleteError) {
            console.error('Error deleting referral network entries:', networkDeleteError);
        }

        console.log('✅ Referral orphaned successfully');
        console.log(`  - ${referredProfile.username} is now an orphaned user`);
        console.log(`  - ${referrerProfile.username} lost ${BONUS_AMOUNT} NMXp`);
        console.log(`  - ${referredProfile.username} lost ${BONUS_AMOUNT} NMXp`);

        res.json({
            success: true,
            message: 'Referral removed successfully',
            details: {
                referrerUsername: referrerProfile.username,
                referredUsername: referredProfile.username,
                deductedAmount: BONUS_AMOUNT,
                referrerNewBalance: newReferrerBalance,
                referredNewBalance: newReferredBalance,
                freedSlots: 1
            }
        });

    } catch (error) {
        console.error('❌ Error in orphan-referral:', error);
        res.status(500).json({ error: 'Failed to orphan referral' });
    }
});


module.exports = router;

