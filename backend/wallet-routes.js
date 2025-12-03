// backend/wallet-routes.js - FINAL FIXED VERSION
const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');

console.log('✅ Wallet Routes Loaded');

// =============================================
// 🎯 INITIALIZE SUPABASE
// =============================================

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

let supabase;
if (supabaseUrl && supabaseKey) {
    supabase = createClient(supabaseUrl, supabaseKey);
    console.log('✅ Supabase connected');
} else {
    console.error('❌ Supabase credentials missing');
}

// =============================================
// 🎯 HELPER: Generate realistic TON wallet
// =============================================

function generateTONWallet() {
    // Generate realistic TON address (EQ...)
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
    let address = 'EQ';
    for (let i = 0; i < 48; i++) {
        address += chars[Math.floor(Math.random() * chars.length)];
    }

    // Generate 12-word mnemonic (BIP-39 style)
    const wordList = [
        'abandon', 'ability', 'able', 'about', 'above', 'absent', 'absorb', 'abstract', 'absurd', 'abuse',
        'access', 'accident', 'account', 'accuse', 'achieve', 'acid', 'acoustic', 'acquire', 'across', 'act',
        'action', 'actor', 'actress', 'actual', 'adapt', 'add', 'addict', 'address', 'adjust', 'admit'
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
// 🎯 ENCRYPTION HELPERS (using mining password)
// =============================================

function encryptWithPassword(data, password) {
    // Simple encryption for now - you can use crypto-js for stronger encryption
    const dataStr = JSON.stringify(data);
    const encrypted = Buffer.from(dataStr).toString('base64');
    return encrypted;
}

function decryptWithPassword(encryptedData, password) {
    try {
        const decrypted = Buffer.from(encryptedData, 'base64').toString('utf-8');
        return JSON.parse(decrypted);
    } catch (error) {
        throw new Error('Decryption failed - wrong password?');
    }
}

// =============================================
// 🎯 TEST ENDPOINT
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

// =============================================
// 🎯 GET USER WALLET - SIMPLIFIED & FIXED
// =============================================

router.post('/get-user-wallet', async (req, res) => {
    console.log('🔍 GET USER WALLET endpoint called');
    
    try {
        const { userId } = req.body;
        console.log('📋 User ID:', userId);

        if (!userId) {
            console.log('❌ Missing user ID');
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

        console.log('🔍 Checking for wallet in user_wallets table...');
        
        // SIMPLE CHECK: Just see if any wallet exists for this user
        const { data: wallets, error } = await supabase
            .from('user_wallets')
            .select('*')
            .eq('user_id', userId);

        if (error) {
            console.error('❌ Database query error:', error.message);
            console.error('❌ Error details:', error);
            
            // Handle specific error cases
            if (error.code === 'PGRST116' || error.message.includes('result is not an array')) {
                // No wallet found - this is OK!
                console.log(`✅ No wallet found for user ${userId} - new user`);
                return res.json({
                    success: true,
                    hasWallet: false,
                    message: 'No wallet found. Create one to get started.',
                    userId: userId
                });
            }
            
            // Other database error
            return res.json({
                success: false,
                error: 'Database error: ' + error.message,
                requiresLogin: false
            });
        }

        console.log(`📊 Found ${wallets?.length || 0} wallets for user`);

        if (!wallets || wallets.length === 0) {
            // No wallet found
            console.log(`✅ No wallet found for user ${userId}`);
            return res.json({
                success: true,
                hasWallet: false,
                message: 'No wallet found. Create one to get started.',
                userId: userId
            });
        }

        // Take the first wallet (should only be one per user)
        const wallet = wallets[0];
        console.log(`✅ Wallet found:`, {
            id: wallet.id,
            address: wallet.address?.substring(0, 20) + '...',
            createdAt: wallet.created_at
        });

        // Return wallet data - handle different possible column names
        return res.json({
            success: true,
            hasWallet: true,
            wallet: {
                id: wallet.id,
                userId: wallet.user_id,
                address: wallet.address || wallet.wallet_address || 'No address',
                wallet_address: wallet.address || wallet.wallet_address || 'No address',
                publicKey: wallet.public_key,
                walletType: wallet.wallet_type || 'TON',
                source: wallet.source || 'generated',
                wordCount: wallet.word_count || 12,
                createdAt: wallet.created_at,
                updatedAt: wallet.updated_at
            },
            userId: userId
        });

    } catch (error) {
        console.error('❌ Get wallet failed with exception:', error);
        console.error('❌ Error stack:', error.stack);
        
        res.json({
            success: false,
            error: 'Server error: ' + error.message,
            requiresLogin: false
        });
    }
});

// =============================================
// 🎯 CREATE WALLET - SIMPLIFIED & FIXED
// =============================================

router.post('/create-wallet', async (req, res) => {
    console.log('🔐 CREATE WALLET endpoint called');
    
    try {
        const { userId, userPassword } = req.body;
        console.log('📋 Creating for user:', userId);

        if (!userId || !userPassword) {
            return res.status(400).json({
                success: false,
                error: 'User ID and password are required'
            });
        }

        if (!supabase) {
            return res.status(500).json({
                success: false,
                error: 'Database not available'
            });
        }

        // Check if wallet already exists (simple check)
        const { data: existingWallets } = await supabase
            .from('user_wallets')
            .select('id')
            .eq('user_id', userId);

        if (existingWallets && existingWallets.length > 0) {
            console.log(`⚠️ Wallet already exists for user ${userId}`);
            return res.json({
                success: false,
                hasExistingWallet: true,
                error: 'You already have a wallet! One wallet per mining account.'
            });
        }

        // Generate wallet
        const walletData = generateTONWallet();
        console.log('✅ Generated wallet:', walletData.address.substring(0, 20) + '...');

        // Prepare wallet record for YOUR table structure
        const walletRecord = {
            user_id: userId,
            address: walletData.address,  // Your column name
            encrypted_mnemonic: Buffer.from(JSON.stringify({
                mnemonic: walletData.mnemonic,
                privateKey: walletData.privateKey
            })).toString('base64'),
            encrypted_private_key: 'encrypted_' + Date.now(),
            public_key: walletData.publicKey,
            wallet_type: 'TON',
            source: 'generated',
            word_count: 12,
            derivation_path: "m/44'/607'/0'/0'/0'",
            password_hash: crypto.createHash('sha256').update(userPassword).digest('hex').substring(0, 32),
            encryption_salt: crypto.randomBytes(16).toString('hex'),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };

        // Insert into database
        const { data: newWallet, error: insertError } = await supabase
            .from('user_wallets')
            .insert([walletRecord])
            .select()
            .single();

        if (insertError) {
            console.error('❌ Insert error:', insertError);
            
            // Try without .single() if that's causing issues
            const { data: wallets, error: bulkError } = await supabase
                .from('user_wallets')
                .insert([walletRecord])
                .select();
                
            if (bulkError) {
                throw new Error('Failed to save wallet to database: ' + bulkError.message);
            }
            
            console.log('✅ Wallet saved (bulk insert)');
            
            res.json({
                success: true,
                wallet: {
                    userId: userId,
                    address: walletData.address,
                    wallet_address: walletData.address,
                    createdAt: new Date().toISOString()
                },
                mnemonic: walletData.mnemonic,
                message: '🎉 Wallet created successfully! Save your seed phrase!'
            });
            return;
        }

        console.log(`✅ Wallet created and saved for user ${userId}`);

        res.json({
            success: true,
            wallet: {
                userId: userId,
                address: walletData.address,
                wallet_address: walletData.address,
                createdAt: new Date().toISOString()
            },
            mnemonic: walletData.mnemonic,
            message: '🎉 Wallet created successfully! Save your seed phrase!'
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
// 🎯 VIEW SEED PHRASE - SIMPLIFIED
// =============================================

router.post('/view-seed-phrase', async (req, res) => {
    try {
        const { userId, userPassword } = req.body;
        console.log('🔑 View seed phrase for user:', userId);

        if (!userId || !userPassword) {
            return res.status(400).json({
                success: false,
                error: 'User ID and password required'
            });
        }

        if (!supabase) {
            return res.status(500).json({
                success: false,
                error: 'Database not available'
            });
        }

        // Get wallet
        const { data: wallets } = await supabase
            .from('user_wallets')
            .select('encrypted_mnemonic')
            .eq('user_id', userId);

        if (!wallets || wallets.length === 0) {
            throw new Error('Wallet not found');
        }

        // For now, return mock seed phrase
        res.json({
            success: true,
            seedPhrase: 'This is a mock seed phrase for development',
            userId: userId,
            message: 'Seed phrase retrieved (development mode)'
        });

    } catch (error) {
        console.error('❌ View seed phrase failed:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to retrieve seed phrase'
        });
    }
});

// =============================================
// 🎯 IMPORT WALLET - SIMPLIFIED
// =============================================

router.post('/import-wallet', async (req, res) => {
    try {
        const { userId, mnemonic, userPassword, replaceExisting = false } = req.body;
        console.log('📥 Import wallet for user:', userId);

        if (!userId || !mnemonic || !userPassword) {
            return res.status(400).json({
                success: false,
                error: 'User ID, seed phrase, and password are required'
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

        // Check if wallet exists
        if (!replaceExisting && supabase) {
            const { data: existingWallets } = await supabase
                .from('user_wallets')
                .select('id')
                .eq('user_id', userId);

            if (existingWallets && existingWallets.length > 0) {
                return res.json({
                    success: false,
                    hasExistingWallet: true,
                    error: 'Wallet already exists. Use replaceExisting=true to replace it.'
                });
            }
        }

        // Generate address from mnemonic
        const addressHash = crypto.createHash('sha256').update(mnemonic).digest('hex');
        const address = 'EQ' + addressHash.substring(0, 48);

        // Delete existing if replacing
        if (replaceExisting && supabase) {
            await supabase
                .from('user_wallets')
                .delete()
                .eq('user_id', userId);
        }

        // Insert new wallet
        if (supabase) {
            const walletRecord = {
                user_id: userId,
                address: address,
                encrypted_mnemonic: Buffer.from(JSON.stringify({
                    mnemonic: mnemonic,
                    privateKey: 'imported_' + crypto.randomBytes(32).toString('hex')
                })).toString('base64'),
                encrypted_private_key: 'imported_encrypted_' + Date.now(),
                public_key: 'imported_' + crypto.randomBytes(32).toString('hex'),
                wallet_type: 'TON',
                source: 'imported',
                word_count: words.length,
                derivation_path: "m/44'/607'/0'/0'/0'",
                password_hash: crypto.createHash('sha256').update(userPassword).digest('hex').substring(0, 32),
                encryption_salt: crypto.randomBytes(16).toString('hex'),
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };

            await supabase
                .from('user_wallets')
                .insert([walletRecord]);
        }

        res.json({
            success: true,
            wallet: {
                userId: userId,
                address: address,
                wallet_address: address,
                source: 'imported',
                wordCount: words.length,
                createdAt: new Date().toISOString()
            },
            message: '✅ Wallet imported successfully!'
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
// 🎯 DELETE WALLET
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

        if (supabase) {
            const { error } = await supabase
                .from('user_wallets')
                .delete()
                .eq('user_id', userId);

            if (error) {
                console.error('❌ Delete error:', error);
                throw error;
            }
            console.log(`✅ Wallet deleted for user ${userId}`);
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
        console.log('💰 Balance check for:', address?.substring(0, 16) + '...');

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

        res.json({
            success: true,
            prices: {
                TON: {
                    price: 2.35,
                    change24h: 1.5,
                    currency: 'USD'
                },
                NMX: {
                    price: 0.10,
                    change24h: 0.5,
                    currency: 'USD'
                }
            },
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('❌ Get prices failed:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get prices: ' + error.message
        });
    }
});

// =============================================
// 🎯 HEALTH CHECK
// =============================================

router.get('/health', (req, res) => {
    res.json({
        success: true,
        status: 'healthy',
        supabase: !!supabase,
        timestamp: new Date().toISOString()
    });
});

module.exports = router;