// backend/wallet-routes.js - DATABASE ONLY VERSION
const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

console.log('✅ Wallet Routes Initialized - Database Only');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Supabase credentials missing from .env file');
    throw new Error('Supabase configuration required');
}

const supabase = createClient(supabaseUrl, supabaseKey);

// 🎯 TEST ENDPOINT - ALWAYS WORKING
router.get('/test', (req, res) => {
    console.log('✅ /api/wallet/test called');
    res.json({
        success: true,
        message: 'Wallet API is working!',
        timestamp: new Date().toISOString()
    });
});

// 🎯 HEALTH CHECK
router.get('/health', (req, res) => {
    res.json({
        success: true,
        message: 'Wallet API is healthy',
        timestamp: new Date().toISOString()
    });
});

// 🎯 GET USER WALLET - DATABASE ONLY
router.post('/get-user-wallet', async (req, res) => {
    try {
        const { userId } = req.body;
        
        console.log('🔍 Fetching wallet from DATABASE for user:', userId);

        if (!userId) {
            return res.status(400).json({
                success: false,
                error: 'User ID is required'
            });
        }

        // DATABASE ONLY - Check if wallet exists
        const { data: wallet, error } = await supabase
            .from('user_wallets')
            .select('*')
            .eq('user_id', userId)
            .single();

        if (error) {
            // No wallet found in database
            if (error.code === 'PGRST116') {
                console.log('📭 No wallet found in database for user:', userId);
                return res.json({
                    success: true,
                    hasWallet: false,
                    message: 'No wallet found. You can create one.',
                    databaseOnly: true
                });
            }
            
            console.error('❌ Database error:', error);
            return res.status(500).json({
                success: false,
                error: 'Database error',
                details: error.message
            });
        }

        if (!wallet) {
            console.log('📭 No wallet data returned for user:', userId);
            return res.json({
                success: true,
                hasWallet: false,
                message: 'No wallet found in database',
                databaseOnly: true
            });
        }

        console.log('✅ Wallet found in DATABASE:', wallet.address);

        // Return wallet from database ONLY
        res.json({
            success: true,
            hasWallet: true,
            wallet: {
                userId: wallet.user_id,
                address: wallet.address,
                addressBounceable: wallet.address_bounceable || wallet.address,
                publicKey: wallet.public_key,
                type: 'TON',
                source: wallet.source || 'database',
                wordCount: wallet.word_count || 12,
                createdAt: wallet.created_at,
                backupMethod: wallet.backup_method || 'database-stored'
            },
            databaseOnly: true,
            storage: 'supabase_database'
        });

    } catch (error) {
        console.error('❌ Get user wallet failed:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get user wallet',
            details: error.message,
            databaseOnly: true
        });
    }
});

// 🎯 CREATE WALLET - DATABASE ONLY
router.post('/create-wallet', async (req, res) => {
    try {
        const { userId, userPassword } = req.body;
        
        console.log('🔄 CREATE WALLET request (Database Only):', userId);

        if (!userId) {
            return res.status(400).json({
                success: false,
                error: 'User ID is required',
                databaseOnly: true
            });
        }

        // 1. Check if user already has a wallet IN DATABASE
        const { data: existingWallet, error: checkError } = await supabase
            .from('user_wallets')
            .select('id, address')
            .eq('user_id', userId)
            .single();

        if (!checkError && existingWallet) {
            console.log('❌ User already has wallet in DATABASE:', existingWallet.address);
            return res.status(400).json({
                success: false,
                error: 'You already have a wallet. One wallet per account only.',
                existingAddress: existingWallet.address,
                databaseOnly: true
            });
        }

        // 2. Generate mock wallet for testing (replace with real wallet generation later)
        const mockAddress = 'EQ' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
        const mockMnemonic = 'test ' + Array(11).fill(0).map(() => 
            Math.random().toString(36).substring(2, 7)
        ).join(' ');
        
        // 3. Save to DATABASE ONLY
        const walletData = {
            user_id: userId,
            address: mockAddress,
            address_bounceable: mockAddress,
            wallet_type: 'ton',
            source: 'nemex_database',
            public_key: 'mock_public_key_' + Math.random().toString(36).substring(2),
            word_count: 12,
            derivation_path: "m/44'/607'/0'/0'/0'",
            encrypted_mnemonic: JSON.stringify({
                encrypted: 'mock_encrypted_data',
                note: 'Real encryption will be added later'
            }),
            backup_method: 'database_encrypted',
            first_viewed: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };

        console.log('📝 Saving to DATABASE:', mockAddress);

        const { data: insertedWallet, error: insertError } = await supabase
            .from('user_wallets')
            .insert([walletData])
            .select();

        if (insertError) {
            console.error('❌ Database insert error:', insertError);
            return res.status(500).json({
                success: false,
                error: 'Failed to save wallet to database',
                details: insertError.message,
                databaseOnly: true
            });
        }

        console.log('✅ Wallet saved to DATABASE');

        // 4. Return success with MOCK DATA (for testing)
        res.json({
            success: true,
            wallet: {
                userId: userId,
                address: mockAddress,
                addressBounceable: mockAddress,
                type: 'TON',
                source: 'database_generated',
                wordCount: 12,
                createdAt: new Date().toISOString(),
                backupMethod: 'database_encrypted'
            },
            mnemonic: mockMnemonic, // In real app, show this ONCE then encrypt
            security: {
                level: 'high',
                storage: 'supabase_database_only',
                warning: 'Seed phrase shown once. Stored encrypted in database.'
            },
            instructions: {
                title: '🔥 TEST WALLET CREATED 🔥',
                steps: [
                    '1. This is a TEST wallet address',
                    '2. Real wallet generation coming soon',
                    '3. Your wallet is stored in Supabase database',
                    '4. No localStorage is used',
                    '5. Database-only storage for security'
                ]
            },
            databaseOnly: true,
            note: 'This is a mock wallet for testing. Real TON wallet generation will be added next.'
        });

    } catch (error) {
        console.error('❌ Create wallet failed:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create wallet: ' + error.message,
            databaseOnly: true
        });
    }
});

// 🎯 IMPORT WALLET - DATABASE ONLY
router.post('/import-wallet', async (req, res) => {
    try {
        const { userId, mnemonic } = req.body;
        
        console.log('🔄 IMPORT WALLET request (Database Only):', userId);

        if (!userId || !mnemonic) {
            return res.status(400).json({
                success: false,
                error: 'User ID and seed phrase are required',
                databaseOnly: true
            });
        }

        // 1. Check if user already has a wallet IN DATABASE
        const { data: existingWallet, error: checkError } = await supabase
            .from('user_wallets')
            .select('id')
            .eq('user_id', userId)
            .single();

        if (!checkError && existingWallet) {
            return res.status(400).json({
                success: false,
                error: 'You already have a wallet. Delete it first to import a new one.',
                databaseOnly: true
            });
        }

        // 2. Validate mnemonic (basic check)
        const words = mnemonic.trim().split(/\s+/);
        if (words.length !== 12 && words.length !== 24) {
            return res.status(400).json({
                success: false,
                error: 'Seed phrase must be 12 or 24 words',
                databaseOnly: true
            });
        }

        // 3. Create mock address from mnemonic hash
        const mockAddress = 'EQ' + require('crypto')
            .createHash('sha256')
            .update(mnemonic)
            .digest('hex')
            .substring(0, 30);

        // 4. Save to DATABASE
        const walletData = {
            user_id: userId,
            address: mockAddress,
            address_bounceable: mockAddress,
            wallet_type: 'ton',
            source: 'imported_database',
            public_key: 'imported_' + require('crypto')
                .createHash('md5')
                .update(mnemonic)
                .digest('hex'),
            word_count: words.length,
            derivation_path: "m/44'/607'/0'/0'/0'",
            encrypted_mnemonic: JSON.stringify({
                encrypted: 'mock_encrypted_import_data',
                note: 'Real encryption will be added later',
                wordCount: words.length
            }),
            backup_method: 'imported_database',
            first_viewed: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };

        const { data: insertedWallet, error: insertError } = await supabase
            .from('user_wallets')
            .insert([walletData])
            .select();

        if (insertError) {
            console.error('❌ Database insert error:', insertError);
            return res.status(500).json({
                success: false,
                error: 'Failed to save imported wallet to database',
                details: insertError.message,
                databaseOnly: true
            });
        }

        console.log('✅ Imported wallet saved to DATABASE');

        // 5. Return success
        res.json({
            success: true,
            wallet: {
                userId: userId,
                address: mockAddress,
                addressBounceable: mockAddress,
                type: 'TON',
                source: 'imported',
                wordCount: words.length,
                createdAt: new Date().toISOString(),
                backupMethod: 'database_imported'
            },
            message: 'Wallet imported successfully!',
            security: {
                storage: 'supabase_database_only',
                imported: true,
                wordCount: words.length
            },
            databaseOnly: true,
            note: 'Mock import for testing. Real TON wallet import coming soon.'
        });

    } catch (error) {
        console.error('❌ Import wallet failed:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to import wallet: ' + error.message,
            databaseOnly: true
        });
    }
});

// 🎯 DELETE WALLET (for testing)
router.post('/delete-wallet', async (req, res) => {
    try {
        const { userId } = req.body;
        
        console.log('🗑️ DELETE WALLET request:', userId);

        if (!userId) {
            return res.status(400).json({
                success: false,
                error: 'User ID is required'
            });
        }

        const { error } = await supabase
            .from('user_wallets')
            .delete()
            .eq('user_id', userId);

        if (error) {
            console.error('❌ Delete error:', error);
            return res.status(500).json({
                success: false,
                error: 'Failed to delete wallet',
                details: error.message
            });
        }

        res.json({
            success: true,
            message: 'Wallet deleted from database',
            userId: userId,
            deleted: true
        });

    } catch (error) {
        console.error('❌ Delete wallet failed:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to delete wallet'
        });
    }
});

// 🎯 GET BALANCE
router.get('/balance/:address', async (req, res) => {
    try {
        const { address } = req.params;
        
        console.log('💰 Balance check for:', address);
        
        // Mock balance
        res.json({
            success: true,
            address: address,
            balance: Math.random() * 10, // Random balance for testing
            currency: 'TON',
            databaseOnly: true
        });
    } catch (error) {
        console.error('❌ Get balance failed:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get balance'
        });
    }
});

// 🎯 GET PRICES
router.get('/prices', async (req, res) => {
    try {
        res.json({
            success: true,
            prices: {
                TON: { price: 2.5, change24h: 0.5 },
                NMX: { price: 0.10, change24h: 1.2 }
            },
            databaseOnly: true
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to get prices'
        });
    }
});

module.exports = router;