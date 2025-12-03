// backend/wallet-routes.js - NO TOP-LEVEL AWAIT VERSION
const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

console.log('✅ Wallet Routes Loaded - NO TOP-LEVEL AWAIT');

// =============================================
// 🎯 INITIALIZE SUPABASE CLIENTS - NO AWAIT
// =============================================

console.log('🔧 ENVIRONMENT CHECK:');
console.log('📋 NODE_ENV:', process.env.NODE_ENV);
console.log('📋 SUPABASE_URL exists?', !!process.env.SUPABASE_URL);
console.log('📋 SUPABASE_ANON_KEY exists?', !!process.env.SUPABASE_ANON_KEY);
console.log('📋 SUPABASE_SERVICE_ROLE_KEY exists?', !!process.env.SUPABASE_SERVICE_ROLE_KEY);

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

let supabase = null;
let supabaseAdmin = null;

// Initialize clients WITHOUT async/await at top level
try {
    // Regular client
    if (supabaseUrl && supabaseAnonKey) {
        supabase = createClient(supabaseUrl, supabaseAnonKey, {
            auth: { persistSession: false }
        });
        console.log('✅ Regular Supabase client initialized');
    } else {
        console.error('❌ Missing SUPABASE_URL or SUPABASE_ANON_KEY');
    }

    // Admin client
    if (supabaseUrl && supabaseServiceKey) {
        supabaseAdmin = createClient(
            supabaseUrl,
            supabaseServiceKey,
            {
                auth: {
                    autoRefreshToken: false,
                    persistSession: false,
                    detectSessionInUrl: false
                }
            }
        );
        console.log('✅ Supabase ADMIN client initialized (SERVICE ROLE)');
    } else {
        console.error('❌ SUPABASE_SERVICE_ROLE_KEY NOT FOUND!');
        supabaseAdmin = supabase; // Fallback
        console.warn('⚠️ Using regular client as fallback');
    }
} catch (clientError) {
    console.error('❌ Supabase client initialization failed:', clientError.message);
}

// =============================================
// 🎯 ADD TEST ENDPOINT FIRST (to verify it loads)
// =============================================

router.get('/test', (req, res) => {
    console.log('📞 /api/wallet/test called');
    res.json({
        success: true,
        message: 'Wallet API is working!',
        clients: {
            regular: !!supabase,
            admin: !!supabaseAdmin,
            isServiceRole: supabaseAdmin !== supabase
        },
        timestamp: new Date().toISOString()
    });
});

// =============================================
// 🎯 TEST SERVICE KEY ENDPOINT
// =============================================

router.get('/debug-env', (req, res) => {
    console.log('🔍 Environment debug endpoint called');
    
    const maskKey = (key) => {
        if (!key) return null;
        return key.substring(0, 5) + '...' + key.substring(key.length - 5);
    };
    
    res.json({
        success: true,
        environment: {
            nodeEnv: process.env.NODE_ENV,
            hasSupabaseUrl: !!supabaseUrl,
            hasAnonKey: !!supabaseAnonKey,
            hasServiceKey: !!supabaseServiceKey,
            serviceKeyPreview: maskKey(supabaseServiceKey),
            supabaseClientReady: !!supabase,
            supabaseAdminReady: !!supabaseAdmin,
            isServiceRole: supabaseAdmin !== supabase
        },
        timestamp: new Date().toISOString()
    });
});

// =============================================
// 🎯 HELPER FUNCTIONS (NO CHANGES)
// =============================================

function generateTONWallet() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
    let address = 'EQ';
    for (let i = 0; i < 48; i++) {
        address += chars[Math.floor(Math.random() * chars.length)];
    }

    const wordList = [
        'abandon', 'ability', 'able', 'about', 'above', 'absent', 'absorb', 'abstract', 'absurd', 'abuse'
    ];

    let mnemonic = '';
    for (let i = 0; i < 12; i++) {
        if (i > 0) mnemonic += ' ';
        mnemonic += wordList[Math.floor(Math.random() * wordList.length)];
    }

    return {
        address: address,
        mnemonic: mnemonic,
        publicKey: 'pub_' + crypto.randomBytes(32).toString('hex'),
        privateKey: 'priv_' + crypto.randomBytes(32).toString('hex')
    };
}

// =============================================
// 🎯 GET USER WALLET
// =============================================

router.post('/get-user-wallet', async (req, res) => {
    console.log('🔍 GET USER WALLET endpoint called');

    try {
        const { userId } = req.body;
        console.log('📋 User ID:', userId);

        if (!userId) {
            return res.json({
                success: false,
                error: 'User ID required',
                requiresLogin: true
            });
        }

        if (!supabase) {
            console.error('❌ Supabase not connected');
            return res.json({
                success: false,
                error: 'Database not available'
            });
        }

        const { data: wallets, error } = await supabase
            .from('user_wallets')
            .select('*')
            .eq('user_id', userId);

        if (error) {
            if (error.code === 'PGRST116') {
                return res.json({
                    success: true,
                    hasWallet: false,
                    message: 'No wallet found',
                    userId: userId
                });
            }
            return res.json({
                success: false,
                error: 'Database error: ' + error.message
            });
        }

        if (!wallets || wallets.length === 0) {
            return res.json({
                success: true,
                hasWallet: false,
                message: 'No wallet found',
                userId: userId
            });
        }

        const wallet = wallets[0];
        return res.json({
            success: true,
            hasWallet: true,
            wallet: {
                id: wallet.id,
                userId: wallet.user_id,
                address: wallet.address,
                createdAt: wallet.created_at
            },
            userId: userId
        });

    } catch (error) {
        console.error('❌ Get wallet failed:', error);
        res.json({
            success: false,
            error: 'Server error: ' + error.message
        });
    }
});

// =============================================
// 🎯 CREATE WALLET - SIMPLIFIED
// =============================================

router.post('/create-wallet', async (req, res) => {
    console.log('🔐 CREATE WALLET endpoint called');

    try {
        const { userId, userPassword, replaceExisting = false } = req.body;
        console.log('📋 Creating for user:', userId);

        if (!userId || !userPassword) {
            return res.status(400).json({
                success: false,
                error: 'User ID and password required'
            });
        }

        // Use admin client if available, otherwise regular
        const client = supabaseAdmin || supabase;
        if (!client) {
            return res.status(500).json({
                success: false,
                error: 'Database not available'
            });
        }

        console.log('🔍 Using client:', supabaseAdmin !== supabase ? 'SERVICE ROLE' : 'REGULAR');

        // Check existing
        const { data: existingWallets } = await client
            .from('user_wallets')
            .select('id')
            .eq('user_id', userId);

        if (existingWallets && existingWallets.length > 0 && !replaceExisting) {
            return res.json({
                success: false,
                hasExistingWallet: true,
                error: 'Wallet already exists'
            });
        }

        // Generate wallet
        const walletData = generateTONWallet();
        
        // Create record
        const walletRecord = {
            user_id: userId,
            address: walletData.address,
            encrypted_mnemonic: Buffer.from(JSON.stringify({
                mnemonic: walletData.mnemonic
            })).toString('base64'),
            public_key: walletData.publicKey,
            wallet_type: 'TON',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };

        // Insert
        const { data: newWallet, error: insertError } = await client
            .from('user_wallets')
            .insert([walletRecord])
            .select()
            .single();

        if (insertError) {
            console.error('❌ Insert error:', insertError.message);
            
            // Special RLS error
            if (insertError.message.includes('row-level security')) {
                return res.status(500).json({
                    success: false,
                    error: 'RLS restriction. Service role key may not be working.',
                    debug: {
                        usedServiceRole: supabaseAdmin !== supabase,
                        hasServiceKey: !!supabaseServiceKey
                    }
                });
            }
            
            throw new Error('Insert failed: ' + insertError.message);
        }

        console.log(`✅ Wallet created for user ${userId}`);

        res.json({
            success: true,
            wallet: {
                userId: userId,
                address: walletData.address,
                createdAt: new Date().toISOString()
            },
            mnemonic: walletData.mnemonic,
            message: '🎉 Wallet created successfully!'
        });

    } catch (error) {
        console.error('❌ Create wallet failed:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create wallet: ' + error.message
        });
    }
});

// =============================================
// 🎯 ADD OTHER ROUTES (simplified)
// =============================================

// Health check
router.get('/health', (req, res) => {
    res.json({
        success: true,
        status: 'healthy',
        database: !!supabase,
        admin: !!supabaseAdmin,
        timestamp: new Date().toISOString()
    });
});

// Get balance
router.get('/balance/:address', (req, res) => {
    res.json({
        success: true,
        address: req.params.address,
        balance: (Math.random() * 5).toFixed(4),
        currency: 'TON'
    });
});

// Get prices
router.get('/prices', (req, res) => {
    res.json({
        success: true,
        prices: {
            TON: { price: 2.35, change24h: 1.5 },
            NMX: { price: 0.10, change24h: 0.5 }
        }
    });
});

module.exports = router;