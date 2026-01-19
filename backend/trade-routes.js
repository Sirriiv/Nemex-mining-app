// NMX Trading Routes - Backend API for TON/NMX token trading
const express = require('express');
const router = express.Router();

// Trading configuration
const TRADE_CONFIG = {
    RATE: 2000,                    // 2000 NMX per 1 TON
    MIN_TON: 1,                    // Minimum 1 TON per trade
    MAX_TON: 10,                   // Maximum 10 TON per trade
    DAILY_LIMIT_NMX: 5000,         // 5000 NMX per day limit
    WALLET_MAX_NMX: 100000,        // 100,000 NMX lifetime wallet limit
    PROJECT_WALLET: 'UQBc7zwA9otknd4KC4zQUx6oxSWdqPtOjUNKZ-zO3vNJxV7s',
    TOTAL_NMX_SUPPLY: 10000000000  // 10 billion NMX available
};

// Get trading configuration (public)
router.get('/config', (req, res) => {
    res.json({
        success: true,
        config: {
            rate: TRADE_CONFIG.RATE,
            minTon: TRADE_CONFIG.MIN_TON,
            maxTon: TRADE_CONFIG.MAX_TON,
            dailyLimitNmx: TRADE_CONFIG.DAILY_LIMIT_NMX,
            walletMaxNmx: TRADE_CONFIG.WALLET_MAX_NMX,
            projectWallet: TRADE_CONFIG.PROJECT_WALLET
        }
    });
});

// Get user's trading stats
router.get('/stats', async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        const userId = authHeader ? authHeader.replace('Bearer ', '') : null;
        
        if (!userId) {
            return res.status(401).json({ success: false, error: 'Not authenticated' });
        }

        const { supabase } = req;

        // Get user's locked NMX balance
        const { data: profile } = await supabase
            .from('profiles')
            .select('locked_nmx_balance')
            .eq('id', userId)
            .single();

        const lockedBalance = parseFloat(profile?.locked_nmx_balance || 0);

        // Get today's purchases
        const { data: todayLimit } = await supabase
            .from('nmx_daily_limits')
            .select('total_nmx_today')
            .eq('user_id', userId)
            .eq('trade_date', new Date().toISOString().split('T')[0])
            .single();

        const todayPurchased = parseFloat(todayLimit?.total_nmx_today || 0);

        // Get total trade history
        const { data: trades, count } = await supabase
            .from('nmx_trades')
            .select('*', { count: 'exact' })
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

        const totalTonSpent = trades?.reduce((sum, t) => sum + parseFloat(t.ton_spent || 0), 0) || 0;

        res.json({
            success: true,
            stats: {
                lockedNmxBalance: lockedBalance,
                todayPurchased: todayPurchased,
                todayRemaining: Math.max(0, TRADE_CONFIG.DAILY_LIMIT_NMX - todayPurchased),
                walletRemaining: Math.max(0, TRADE_CONFIG.WALLET_MAX_NMX - lockedBalance),
                totalTrades: count || 0,
                totalTonSpent: totalTonSpent,
                canTrade: lockedBalance < TRADE_CONFIG.WALLET_MAX_NMX && todayPurchased < TRADE_CONFIG.DAILY_LIMIT_NMX
            }
        });
    } catch (error) {
        console.error('❌ Error fetching trading stats:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get trade history
router.get('/history', async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        const userId = authHeader ? authHeader.replace('Bearer ', '') : null;
        
        if (!userId) {
            return res.status(401).json({ success: false, error: 'Not authenticated' });
        }

        const { supabase } = req;

        const { data: trades, error } = await supabase
            .from('nmx_trades')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(50);

        if (error) throw error;

        res.json({
            success: true,
            trades: trades || []
        });
    } catch (error) {
        console.error('❌ Error fetching trade history:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Execute NMX purchase
router.post('/buy-nmx', async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        const userId = authHeader ? authHeader.replace('Bearer ', '') : null;
        
        if (!userId) {
            return res.status(401).json({ success: false, error: 'Not authenticated' });
        }

        const { tonAmount } = req.body;

        // Validate input
        if (!tonAmount || isNaN(tonAmount)) {
            return res.status(400).json({ success: false, error: 'Invalid TON amount' });
        }

        const tonValue = parseFloat(tonAmount);

        // Check minimum and maximum
        if (tonValue < TRADE_CONFIG.MIN_TON) {
            return res.status(400).json({
                success: false,
                error: `Minimum trade is ${TRADE_CONFIG.MIN_TON} TON`
            });
        }

        if (tonValue > TRADE_CONFIG.MAX_TON) {
            return res.status(400).json({
                success: false,
                error: `Maximum trade is ${TRADE_CONFIG.MAX_TON} TON per transaction`
            });
        }

        const { supabase } = req;

        // Get user's wallet info
        const { data: wallet } = await supabase
            .from('wallets')
            .select('address, balance')
            .eq('user_id', userId)
            .single();

        if (!wallet) {
            return res.status(404).json({ success: false, error: 'Wallet not found' });
        }

        const currentBalance = parseFloat(wallet.balance || 0);

        // Check if user has enough TON
        if (currentBalance < tonValue) {
            return res.status(400).json({
                success: false,
                error: `Insufficient TON balance. You have ${currentBalance.toFixed(4)} TON`
            });
        }

        // Get user's current locked NMX balance
        const { data: profile } = await supabase
            .from('profiles')
            .select('locked_nmx_balance')
            .eq('id', userId)
            .single();

        const currentLockedNmx = parseFloat(profile?.locked_nmx_balance || 0);

        // Calculate NMX to receive
        const nmxToReceive = tonValue * TRADE_CONFIG.RATE;

        // Check wallet lifetime limit
        if (currentLockedNmx + nmxToReceive > TRADE_CONFIG.WALLET_MAX_NMX) {
            const remaining = TRADE_CONFIG.WALLET_MAX_NMX - currentLockedNmx;
            return res.status(400).json({
                success: false,
                error: `Wallet limit reached. You can only buy ${remaining.toFixed(0)} more NMX`
            });
        }

        // Check daily limit
        const today = new Date().toISOString().split('T')[0];
        const { data: dailyLimit } = await supabase
            .from('nmx_daily_limits')
            .select('total_nmx_today')
            .eq('user_id', userId)
            .eq('trade_date', today)
            .single();

        const todayPurchased = parseFloat(dailyLimit?.total_nmx_today || 0);

        if (todayPurchased + nmxToReceive > TRADE_CONFIG.DAILY_LIMIT_NMX) {
            const remaining = TRADE_CONFIG.DAILY_LIMIT_NMX - todayPurchased;
            return res.status(400).json({
                success: false,
                error: `Daily limit reached. You can only buy ${remaining.toFixed(0)} more NMX today`
            });
        }

        // All checks passed - execute trade
        console.log('🔄 Executing NMX trade:', {
            userId,
            tonAmount: tonValue,
            nmxReceived: nmxToReceive,
            newBalance: currentBalance - tonValue
        });

        // 1. Deduct TON from wallet
        const { error: walletError } = await supabase
            .from('wallets')
            .update({ balance: currentBalance - tonValue })
            .eq('user_id', userId);

        if (walletError) throw new Error('Failed to update wallet balance');

        // 2. Add locked NMX to profile
        const { error: profileError } = await supabase
            .from('profiles')
            .update({ locked_nmx_balance: currentLockedNmx + nmxToReceive })
            .eq('id', userId);

        if (profileError) throw new Error('Failed to update locked NMX balance');

        // 3. Record the trade
        const { data: trade, error: tradeError } = await supabase
            .from('nmx_trades')
            .insert({
                user_id: userId,
                ton_spent: tonValue,
                nmx_received: nmxToReceive,
                rate: TRADE_CONFIG.RATE,
                status: 'completed'
            })
            .select()
            .single();

        if (tradeError) throw new Error('Failed to record trade');

        console.log('✅ NMX trade completed successfully');

        res.json({
            success: true,
            message: 'Trade completed successfully',
            trade: {
                tonSpent: tonValue,
                nmxReceived: nmxToReceive,
                rate: TRADE_CONFIG.RATE,
                newTonBalance: currentBalance - tonValue,
                newLockedNmx: currentLockedNmx + nmxToReceive,
                tradeId: trade.id,
                timestamp: trade.created_at
            }
        });

    } catch (error) {
        console.error('❌ Error executing NMX trade:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get total platform stats (admin/public)
router.get('/platform-stats', async (req, res) => {
    try {
        const { supabase } = req;

        // Get total NMX sold
        const { data: allTrades } = await supabase
            .from('nmx_trades')
            .select('nmx_received, ton_spent');

        const totalNmxSold = allTrades?.reduce((sum, t) => sum + parseFloat(t.nmx_received || 0), 0) || 0;
        const totalTonCollected = allTrades?.reduce((sum, t) => sum + parseFloat(t.ton_spent || 0), 0) || 0;

        res.json({
            success: true,
            platformStats: {
                totalNmxSold: totalNmxSold,
                totalNmxRemaining: TRADE_CONFIG.TOTAL_NMX_SUPPLY - totalNmxSold,
                totalTonCollected: totalTonCollected,
                totalTrades: allTrades?.length || 0,
                percentageSold: ((totalNmxSold / TRADE_CONFIG.TOTAL_NMX_SUPPLY) * 100).toFixed(2)
            }
        });
    } catch (error) {
        console.error('❌ Error fetching platform stats:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;
