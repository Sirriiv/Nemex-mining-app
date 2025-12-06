// backend/wallet-routes.js - COMPLETELY FIXED VERSION
const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const axios = require('axios');

// Load environment variables
dotenv.config();

console.log('🚀 PRODUCTION Wallet Routes Loaded');

// =============================================
// 🎯 INITIALIZE SUPABASE
// =============================================

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

let supabase = null;

try {
    if (supabaseUrl && supabaseAnonKey) {
        supabase = createClient(supabaseUrl, supabaseAnonKey);
        console.log('✅ Supabase client initialized');
    } else {
        console.error('❌ Missing SUPABASE_URL or SUPABASE_ANON_KEY');
    }
} catch (clientError) {
    console.error('❌ Supabase client initialization failed:', clientError.message);
}

// =============================================
// 🎯 CRITICAL DEBUG ENDPOINTS
// =============================================

// 🔥 DEBUG: Test database connection
router.get('/debug-db', async (req, res) => {
    try {
        console.log('🔍 Debug database connection...');
        
        if (!supabase) {
            return res.json({
                success: false,
                error: 'Supabase not initialized'
            });
        }

        // Test simple query
        const { data, error } = await supabase
            .from('user_wallets')
            .select('count(*)')
            .limit(1);

        res.json({
            success: true,
            supabaseConnected: !error,
            error: error?.message,
            data: data,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        res.json({
            success: false,
            error: error.message
        });
    }
});

// 🔥 DEBUG: Check table schema
router.get('/debug-schema', async (req, res) => {
    try {
        if (!supabase) {
            return res.json({
                success: false,
                error: 'Supabase not initialized'
            });
        }

        // Get columns from user_wallets table
        const { data: columns, error } = await supabase
            .from('information_schema.columns')
            .select('column_name, data_type, is_nullable')
            .eq('table_name', 'user_wallets')
            .eq('table_schema', 'public');

        if (error) {
            return res.json({
                success: false,
                error: error.message
            });
        }

        res.json({
            success: true,
            table: 'user_wallets',
            columns: columns || [],
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        res.json({
            success: false,
            error: error.message
        });
    }
});

// 🔥 DEBUG: Test wallet creation
router.post('/debug-test-create', async (req, res) => {
    try {
        console.log('🧪 DEBUG: Testing wallet creation...');
        
        const testData = {
            user_id: 'test_user_' + Date.now(),
            address: 'EQ' + crypto.randomBytes(20).toString('hex'),
            encrypted_mnemonic: 'test_encrypted_' + crypto.randomBytes(32).toString('hex'),
            public_key: 'test_pub_' + crypto.randomBytes(32).toString('hex'),
            wallet_type: 'TON',
            source: 'test',
            word_count: 12,
            derivation_path: "m/44'/607'/0'/0/0",
            encryption_salt: crypto.randomBytes(16).toString('hex')
        };

        console.log('📝 Test data:', testData);

        if (!supabase) {
            return res.json({
                success: false,
                error: 'Supabase not initialized'
            });
        }

        // Insert test wallet
        const { data, error } = await supabase
            .from('user_wallets')
            .insert([testData])
            .select()
            .single();

        if (error) {
            console.error('❌ Test insert failed:', error);
            return res.json({
                success: false,
                error: error.message,
                details: error.details,
                hint: error.hint
            });
        }

        // Clean up test data
        await supabase
            .from('user_wallets')
            .delete()
            .eq('id', data.id);

        res.json({
            success: true,
            message: 'Database insert test passed!',
            testData: {
                insertedId: data.id,
                address: data.address
            }
        });

    } catch (error) {
        res.json({
            success: false,
            error: error.message
        });
    }
});

// =============================================
// 🎯 🔥 CRITICAL FIX: STORE ENCRYPTED WALLET
// =============================================

router.post('/store-encrypted', async (req, res) => {
    console.log('📦 STORE ENCRYPTED WALLET endpoint called');
    console.log('📥 Received request body keys:', Object.keys(req.body));

    try {
        // 🔥 FIX: Handle both naming conventions from frontend
        const userId = req.body.userId || req.body.user_id;
        const walletAddress = req.body.walletAddress || req.body.address;
        const encryptedMnemonic = req.body.encryptedMnemonic || req.body.encrypted_mnemonic;
        const publicKey = req.body.publicKey || req.body.public_key || '';
        const wordCount = req.body.wordCount || req.body.word_count || 12;
        const derivationPath = req.body.derivationPath || req.body.derivation_path || "m/44'/607'/0'/0/0";
        const isImport = req.body.isImport || req.body.import || false;

        console.log('🔍 Parsed data:', {
            userId,
            walletAddressPreview: walletAddress?.substring(0, 30) + '...',
            encryptedMnemonicLength: encryptedMnemonic?.length,
            hasPublicKey: !!publicKey,
            isImport
        });

        // 🔥 VALIDATION: Check all required fields
        const missingFields = [];
        if (!userId) missingFields.push('userId');
        if (!walletAddress) missingFields.push('walletAddress');
        if (!encryptedMnemonic) missingFields.push('encryptedMnemonic');

        if (missingFields.length > 0) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields',
                missingFields,
                received: {
                    userId: !!userId,
                    walletAddress: !!walletAddress,
                    encryptedMnemonic: !!encryptedMnemonic,
                    publicKey: !!publicKey
                }
            });
        }

        console.log('✅ All required fields present');

        if (!supabase) {
            console.error('❌ Supabase not initialized');
            return res.status(500).json({
                success: false,
                error: 'Database not available'
            });
        }

        // Check for existing wallet
        console.log('🔍 Checking for existing wallet...');
        const { data: existingWallets, error: checkError } = await supabase
            .from('user_wallets')
            .select('id')
            .eq('user_id', userId);

        if (checkError) {
            console.error('❌ Error checking existing wallet:', checkError);
            return res.status(500).json({
                success: false,
                error: 'Database error: ' + checkError.message
            });
        }

        // Delete existing wallet if found
        if (existingWallets && existingWallets.length > 0) {
            console.log(`🗑️ Found ${existingWallets.length} existing wallet(s), deleting...`);
            const { error: deleteError } = await supabase
                .from('user_wallets')
                .delete()
                .eq('user_id', userId);

            if (deleteError) {
                console.error('❌ Error deleting existing wallet:', deleteError);
            } else {
                console.log('✅ Successfully deleted existing wallet(s)');
            }
        }

        // 🔥 FIX: Create wallet record with EXACT column names from your schema
        const walletRecord = {
            user_id: userId,
            address: walletAddress,
            encrypted_mnemonic: encryptedMnemonic,
            public_key: publicKey || `pub_${crypto.randomBytes(16).toString('hex')}`,
            wallet_type: 'TON',
            source: isImport ? 'imported' : 'generated',
            word_count: wordCount,
            derivation_path: derivationPath,
            encryption_salt: crypto.randomBytes(16).toString('hex'),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };

        console.log('📝 Inserting wallet with columns:', Object.keys(walletRecord));

        // Insert the wallet
        const { data: newWallet, error: insertError } = await supabase
            .from('user_wallets')
            .insert([walletRecord])
            .select()
            .single();

        if (insertError) {
            console.error('❌ INSERT ERROR:');
            console.error('Message:', insertError.message);
            console.error('Code:', insertError.code);
            console.error('Details:', insertError.details);
            console.error('Hint:', insertError.hint);

            return res.status(500).json({
                success: false,
                error: 'Failed to store wallet',
                message: insertError.message,
                details: insertError.details,
                hint: insertError.hint
            });
        }

        console.log(`✅ Wallet stored successfully! ID: ${newWallet.id}`);

        res.json({
            success: true,
            message: 'Wallet stored securely',
            wallet: {
                id: newWallet.id,
                userId: newWallet.user_id,
                address: newWallet.address,
                createdAt: newWallet.created_at,
                source: newWallet.source,
                wordCount: newWallet.word_count
            },
            note: 'Seed phrase encrypted in browser, backend cannot decrypt it'
        });

    } catch (error) {
        console.error('❌ UNEXPECTED ERROR:', error);
        console.error('Stack:', error.stack);
        
        res.status(500).json({
            success: false,
            error: 'Server error',
            message: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
});

// =============================================
// 🎯 GET ENCRYPTED WALLET
// =============================================

router.post('/get-encrypted', async (req, res) => {
    console.log('🔐 GET ENCRYPTED WALLET endpoint called');

    try {
        const userId = req.body.userId || req.body.user_id;

        if (!userId) {
            return res.status(400).json({
                success: false,
                error: 'User ID required'
            });
        }

        if (!supabase) {
            return res.status(500).json({
                success: false,
                error: 'Database not available'
            });
        }

        const { data: wallets, error } = await supabase
            .from('user_wallets')
            .select('encrypted_mnemonic, address, created_at, word_count, source')
            .eq('user_id', userId);

        if (error) {
            console.error('❌ Database error:', error);
            return res.status(500).json({
                success: false,
                error: 'Database error: ' + error.message
            });
        }

        if (!wallets || wallets.length === 0) {
            return res.json({
                success: false,
                error: 'No wallet found for user'
            });
        }

        const wallet = wallets[0];

        if (!wallet.encrypted_mnemonic) {
            return res.json({
                success: false,
                error: 'No encrypted seed phrase found'
            });
        }

        console.log(`✅ Found wallet for user ${userId}`);

        res.json({
            success: true,
            encryptedMnemonic: wallet.encrypted_mnemonic,
            address: wallet.address,
            createdAt: wallet.created_at,
            wordCount: wallet.word_count,
            source: wallet.source,
            note: 'Decrypt this in browser with user password'
        });

    } catch (error) {
        console.error('❌ Get encrypted wallet failed:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get wallet: ' + error.message
        });
    }
});

// =============================================
// 🎯 CHECK WALLET EXISTS
// =============================================

router.post('/check-wallet', async (req, res) => {
    console.log('🔍 CHECK WALLET endpoint called');

    try {
        const userId = req.body.userId || req.body.user_id;

        if (!userId) {
            return res.json({
                success: false,
                error: 'User ID required'
            });
        }

        if (!supabase) {
            return res.json({
                success: true,
                hasWallet: false,
                message: 'Database not available'
            });
        }

        const { data: wallets, error } = await supabase
            .from('user_wallets')
            .select('id, address, created_at, source')
            .eq('user_id', userId);

        if (error) {
            console.warn('⚠️ Database error:', error.message);
            return res.json({
                success: true,
                hasWallet: false,
                message: 'Database error'
            });
        }

        if (wallets && wallets.length > 0) {
            const wallet = wallets[0];
            return res.json({
                success: true,
                hasWallet: true,
                wallet: {
                    id: wallet.id,
                    address: wallet.address,
                    createdAt: wallet.created_at,
                    source: wallet.source
                }
            });
        }

        return res.json({
            success: true,
            hasWallet: false,
            message: 'No wallet found'
        });

    } catch (error) {
        console.error('❌ Check wallet failed:', error);
        return res.json({
            success: false,
            error: 'Failed to check wallet: ' + error.message
        });
    }
});

// =============================================
// 🎯 GET USER WALLET
// =============================================

router.post('/get-user-wallet', async (req, res) => {
    console.log('🔍 GET USER WALLET endpoint called');

    try {
        const userId = req.body.userId || req.body.user_id;

        if (!userId) {
            return res.json({
                success: false,
                error: 'User ID required',
                requiresLogin: true
            });
        }

        if (!supabase) {
            return res.json({
                success: false,
                error: 'Database not available'
            });
        }

        const { data: wallets, error } = await supabase
            .from('user_wallets')
            .select('id, address, created_at, wallet_type, source')
            .eq('user_id', userId);

        if (error) {
            if (error.code === 'PGRST116') {
                return res.json({
                    success: true,
                    hasWallet: false,
                    message: 'No wallet found'
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
                message: 'No wallet found'
            });
        }

        const wallet = wallets[0];
        return res.json({
            success: true,
            hasWallet: true,
            wallet: {
                id: wallet.id,
                address: wallet.address,
                createdAt: wallet.created_at,
                walletType: wallet.wallet_type || 'TON',
                source: wallet.source || 'generated'
            }
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
// 🎯 DELETE WALLET
// =============================================

router.post('/delete-wallet', async (req, res) => {
    console.log('🗑️ DELETE WALLET endpoint called');

    try {
        const userId = req.body.userId || req.body.user_id;
        const confirm = req.body.confirm;

        if (!userId) {
            return res.status(400).json({
                success: false,
                error: 'User ID required'
            });
        }

        if (!confirm) {
            return res.json({
                success: false,
                error: 'Confirmation required for safety'
            });
        }

        if (!supabase) {
            return res.status(500).json({
                success: false,
                error: 'Database not available'
            });
        }

        const { data, error } = await supabase
            .from('user_wallets')
            .delete()
            .eq('user_id', userId)
            .select();

        if (error) {
            console.error('❌ Delete error:', error);
            return res.status(500).json({
                success: false,
                error: 'Delete failed: ' + error.message
            });
        }

        const deletedCount = data ? data.length : 0;
        console.log(`✅ Deleted ${deletedCount} wallet(s)`);

        res.json({
            success: true,
            deletedCount: deletedCount,
            message: 'Wallet deleted successfully',
            warning: '⚠️ Wallet cannot be recovered without seed phrase'
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
// 🎯 SIMPLE PRICE ENDPOINT (For now, fix wallet first)
// =============================================

router.get('/prices', async (req, res) => {
    try {
        console.log('📊 PRICES endpoint called');
        
        // Simple fallback prices for now
        res.json({
            success: true,
            prices: {
                TON: { 
                    price: 2.35, 
                    change24h: 0,
                    source: 'fallback',
                    timestamp: Date.now()
                },
                NMX: { 
                    price: 0.10, 
                    change24h: 0,
                    source: 'fallback',
                    timestamp: Date.now()
                }
            },
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('❌ Get prices failed:', error);
        res.json({
            success: true,
            prices: {
                TON: { price: 2.35, change24h: 0 },
                NMX: { price: 0.10, change24h: 0 }
            },
            isFallback: true
        });
    }
});

// =============================================
// 🎯 BALANCE ENDPOINT
// =============================================

router.get('/balance/:address', async (req, res) => {
    try {
        const { address } = req.params;
        
        if (!address) {
            return res.status(400).json({
                success: false,
                error: 'Address required'
            });
        }

        console.log(`💰 Fetching balance for: ${address.substring(0, 20)}...`);

        // Try TonAPI
        try {
            const response = await axios.get(`https://tonapi.io/v2/accounts/${address}`, {
                timeout: 5000
            });

            if (response.data && response.data.balance) {
                const balanceInNano = response.data.balance;
                const balanceInTON = balanceInNano / 1000000000;

                return res.json({
                    success: true,
                    address: address,
                    balance: balanceInTON.toFixed(4),
                    currency: 'TON',
                    source: 'tonapi.io',
                    timestamp: new Date().toISOString()
                });
            }
        } catch (error) {
            console.warn('⚠️ TonAPI failed:', error.message);
        }

        // Fallback
        res.json({
            success: true,
            address: address,
            balance: "0.0000",
            currency: 'TON',
            source: 'fallback',
            note: 'Balance API temporarily unavailable'
        });

    } catch (error) {
        console.error('❌ Get balance failed:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch balance: ' + error.message
        });
    }
});

// =============================================
// 🎯 TEST ENDPOINT
// =============================================

router.get('/test', (req, res) => {
    res.json({
        success: true,
        message: 'Wallet API is working!',
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        debugEndpoints: [
            '/api/wallet/debug-db',
            '/api/wallet/debug-schema',
            '/api/wallet/debug-test-create'
        ]
    });
});

module.exports = router;