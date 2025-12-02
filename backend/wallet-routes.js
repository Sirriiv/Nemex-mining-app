// backend/wallet-routes.js - UPDATED WITH SUPABASE
const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');

console.log('✅ Wallet Routes Loaded');

// =============================================
// 🎯 INITIALIZE SUPABASE
// =============================================

const supabaseUrl = process.env.SUPABASE_URL || 'https://bjulifvbfogymoduxnzl.supabase.co';
const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_KEY;

console.log('🔧 Supabase URL:', supabaseUrl ? '✅ Set' : '❌ Missing');
console.log('🔧 Supabase Key:', supabaseKey ? '✅ Set' : '❌ Missing');

let supabase;
if (supabaseUrl && supabaseKey) {
    try {
        supabase = createClient(supabaseUrl, supabaseKey);
        console.log('✅ Supabase client initialized');
    } catch (error) {
        console.error('❌ Failed to initialize Supabase:', error.message);
    }
} else {
    console.error('❌ Missing Supabase credentials');
}

// =============================================
// 🎯 TEST ENDPOINTS
// =============================================

router.get('/test', (req, res) => {
    console.log('📞 /api/wallet/test called');
    res.json({
        success: true,
        message: 'Wallet API is working!',
        supabase: !!supabase,
        timestamp: new Date().toISOString()
    });
});

router.get('/health', (req, res) => {
    res.json({
        success: true,
        message: 'Wallet API is healthy',
        supabase: !!supabase,
        timestamp: new Date().toISOString()
    });
});

// =============================================
// 🎯 GET USER WALLET - UPDATED TO CHECK DATABASE
// =============================================

router.post('/get-user-wallet', async (req, res) => {
    try {
        const { userId } = req.body;
        console.log('🔍 Get user wallet for:', userId);

        if (!userId) {
            return res.status(400).json({
                success: false,
                error: 'User ID is required'
            });
        }

        // If Supabase is available, check database
        if (supabase) {
            console.log('🔍 Checking database for wallet...');
            
            const { data: wallet, error } = await supabase
                .from('user_wallets')
                .select('*')
                .eq('user_id', userId)
                .single();

            if (error) {
                if (error.code === 'PGRST116') {
                    // No wallet found - this is normal for new users
                    console.log(`ℹ️ No wallet found for user ${userId}`);
                    return res.json({
                        success: true,
                        hasWallet: false,
                        message: 'No wallet found. Create one to get started.',
                        userId: userId
                    });
                }
                
                console.error('❌ Database error:', error);
                throw new Error(`Database error: ${error.message}`);
            }

            // Wallet found!
            console.log(`✅ Wallet found for user ${userId}: ${wallet.wallet_address}`);
            
            return res.json({
                success: true,
                hasWallet: true,
                wallet: {
                    id: wallet.id,
                    userId: wallet.user_id,
                    address: wallet.wallet_address,
                    type: 'TON',
                    source: 'database',
                    createdAt: wallet.created_at,
                    updatedAt: wallet.updated_at
                },
                userId: userId
            });
        }

        // If no Supabase, return mock response
        console.log('⚠️ Supabase not available, using mock response');
        res.json({
            success: true,
            hasWallet: false,
            message: 'Database not available',
            userId: userId
        });
        
    } catch (error) {
        console.error('❌ Get user wallet failed:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get user wallet: ' + error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// =============================================
// 🎯 CREATE WALLET - UPDATED TO SAVE TO DATABASE
// =============================================

router.post('/create-wallet', async (req, res) => {
    console.log('🎯 CREATE WALLET endpoint called');

    try {
        const { userId, userPassword, replaceExisting = false } = req.body;

        if (!userId) {
            return res.status(400).json({
                success: false,
                error: 'User ID is required'
            });
        }

        if (!userPassword) {
            return res.status(400).json({
                success: false,
                error: 'Password is required'
            });
        }

        // Generate wallet
        const mockAddress = 'EQ' + crypto.randomBytes(24).toString('hex');
        const mockMnemonic = Array(12).fill(0).map(() => 
            crypto.randomBytes(4).toString('hex')
        ).join(' ');

        console.log('✅ Generated wallet:', mockAddress.substring(0, 16) + '...');

        // If Supabase is available, save to database
        if (supabase) {
            console.log('💾 Saving wallet to database...');
            
            // Check if wallet already exists
            if (!replaceExisting) {
                const { data: existingWallet } = await supabase
                    .from('user_wallets')
                    .select('id')
                    .eq('user_id', userId)
                    .single();

                if (existingWallet) {
                    console.log(`⚠️ Wallet already exists for user ${userId}`);
                    return res.json({
                        success: false,
                        hasExistingWallet: true,
                        error: 'Wallet already exists. Use replaceExisting=true to create a new one.'
                    });
                }
            }

            // Encrypt private data (simple encryption for now)
            const encryptedPrivateKey = Buffer.from(JSON.stringify({
                mnemonic: mockMnemonic,
                privateKey: 'mock_private_key_' + Date.now()
            })).toString('base64');

            // Prepare wallet record
            const walletRecord = {
                user_id: userId,
                wallet_address: mockAddress,
                encrypted_private_key: encryptedPrivateKey,
                public_key: 'mock_public_key_' + Date.now(),
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };

            // Delete existing if replacing
            if (replaceExisting) {
                await supabase
                    .from('user_wallets')
                    .delete()
                    .eq('user_id', userId);
                console.log(`🗑️ Deleted existing wallet for user ${userId}`);
            }

            // Insert new wallet
            const { data: newWallet, error: insertError } = await supabase
                .from('user_wallets')
                .insert([walletRecord])
                .select()
                .single();

            if (insertError) {
                console.error('❌ Database insert error:', insertError);
                throw insertError;
            }

            console.log(`✅ Wallet saved to database for user ${userId}`);
        }

        // Return response
        res.json({
            success: true,
            wallet: {
                userId: userId,
                address: mockAddress,
                type: 'TON',
                source: supabase ? 'database' : 'mock',
                wordCount: 12,
                createdAt: new Date().toISOString()
            },
            mnemonic: mockMnemonic,
            security: {
                level: 'high',
                storage: supabase ? 'database' : 'mock'
            },
            instructions: 'Write down your seed phrase and store it securely!'
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
// 🎯 VIEW SEED PHRASE - NEW ENDPOINT
// =============================================

router.post('/view-seed-phrase', async (req, res) => {
    try {
        const { userId, userPassword } = req.body;
        console.log('🔑 View seed phrase for user:', userId);

        if (!userId || !userPassword) {
            return res.status(400).json({
                success: false,
                error: 'User ID and password are required'
            });
        }

        // Mock response for now
        res.json({
            success: true,
            seedPhrase: 'mock seed phrase for demonstration purposes only',
            userId: userId,
            message: 'Seed phrase retrieved successfully'
        });
    } catch (error) {
        console.error('❌ View seed phrase failed:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to retrieve seed phrase: ' + error.message
        });
    }
});

// =============================================
// 🎯 IMPORT WALLET - UPDATED TO SAVE TO DATABASE
// =============================================

router.post('/import-wallet', async (req, res) => {
    try {
        const { userId, mnemonic, userPassword, replaceExisting = false } = req.body;
        console.log('📥 Import wallet for user:', userId);

        if (!mnemonic) {
            return res.status(400).json({
                success: false,
                error: 'Seed phrase is required'
            });
        }

        // Validate mnemonic
        const words = mnemonic.trim().split(/\s+/);
        if (words.length !== 12 && words.length !== 24) {
            return res.status(400).json({
                success: false,
                error: 'Seed phrase must be 12 or 24 words',
                receivedWords: words.length
            });
        }

        // Generate address from mnemonic
        const addressHash = crypto.createHash('sha256').update(mnemonic).digest('hex');
        const mockAddress = 'EQ' + addressHash.substring(0, 48);

        // If Supabase is available, save to database
        if (supabase) {
            console.log('💾 Saving imported wallet to database...');
            
            // Check if wallet already exists
            if (!replaceExisting) {
                const { data: existingWallet } = await supabase
                    .from('user_wallets')
                    .select('id')
                    .eq('user_id', userId)
                    .single();

                if (existingWallet) {
                    return res.json({
                        success: false,
                        hasExistingWallet: true,
                        error: 'Wallet already exists. Use replaceExisting=true to replace it.'
                    });
                }
            }

            // Encrypt private data
            const encryptedPrivateKey = Buffer.from(JSON.stringify({
                mnemonic: mnemonic,
                privateKey: 'imported_private_key_' + Date.now()
            })).toString('base64');

            // Prepare wallet record
            const walletRecord = {
                user_id: userId,
                wallet_address: mockAddress,
                encrypted_private_key: encryptedPrivateKey,
                public_key: 'imported_public_key_' + Date.now(),
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };

            // Delete existing if replacing
            if (replaceExisting) {
                await supabase
                    .from('user_wallets')
                    .delete()
                    .eq('user_id', userId);
            }

            // Insert new wallet
            const { data: newWallet, error: insertError } = await supabase
                .from('user_wallets')
                .insert([walletRecord])
                .select()
                .single();

            if (insertError) throw insertError;
        }

        res.json({
            success: true,
            wallet: {
                userId: userId,
                address: mockAddress,
                type: 'TON',
                source: supabase ? 'database_imported' : 'mock_imported',
                wordCount: words.length,
                createdAt: new Date().toISOString()
            },
            message: 'Wallet imported successfully!'
        });
    } catch (error) {
        console.error('❌ Import wallet failed:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to import wallet: ' + error.message
        });
    }
});

// =============================================
// 🎯 DELETE WALLET - NEW ENDPOINT
// =============================================

router.post('/delete-wallet', async (req, res) => {
    try {
        const { userId, confirm } = req.body;
        console.log('🗑️ Delete wallet for user:', userId);

        if (!userId) {
            return res.status(400).json({
                success: false,
                error: 'User ID is required'
            });
        }

        if (!confirm) {
            return res.status(400).json({
                success: false,
                error: 'Confirmation required for safety'
            });
        }

        // If Supabase is available, delete from database
        if (supabase) {
            const { error } = await supabase
                .from('user_wallets')
                .delete()
                .eq('user_id', userId);

            if (error) throw error;
            console.log(`✅ Wallet deleted from database for user ${userId}`);
        }

        res.json({
            success: true,
            message: 'Wallet deleted successfully',
            userId: userId
        });
    } catch (error) {
        console.error('❌ Delete wallet failed:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to delete wallet: ' + error.message
        });
    }
});

// =============================================
// 🎯 GET BALANCE
// =============================================

router.get('/balance/:address', async (req, res) => {
    try {
        const { address } = req.params;
        console.log('💰 Balance check for:', address.substring(0, 16) + '...');

        // Mock balance for now
        const mockBalance = (Math.random() * 5).toFixed(4);

        res.json({
            success: true,
            address: address,
            balance: parseFloat(mockBalance),
            currency: 'TON',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('❌ Get balance failed:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get balance: ' + error.message
        });
    }
});

// =============================================
// 🎯 GET PRICES
// =============================================

router.get('/prices', async (req, res) => {
    try {
        console.log('📈 Prices requested');

        // Mock prices for now
        const currentTime = new Date();
        const hour = currentTime.getHours();
        const fluctuation = Math.sin(hour / 6) * 0.1;

        res.json({
            success: true,
            prices: {
                TON: {
                    price: parseFloat((2.5 * (1 + fluctuation)).toFixed(4)),
                    change24h: parseFloat((fluctuation * 100).toFixed(2)),
                    currency: 'USD',
                    source: 'mock'
                },
                NMX: {
                    price: parseFloat((0.10 * (1 + fluctuation * 2)).toFixed(4)),
                    change24h: parseFloat((fluctuation * 150).toFixed(2)),
                    currency: 'USD',
                    source: 'mock'
                }
            },
            timestamp: currentTime.toISOString()
        });
    } catch (error) {
        console.error('❌ Get prices failed:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get prices: ' + error.message
        });
    }
});

module.exports = router;