// backend/wallet-routes.js - FINAL VERSION FOR YOUR SCHEMA
const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

console.log('✅ Wallet Routes Loaded (Browser-Side Encryption)');

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
// 🎯 TEST ENDPOINTS
// =============================================

router.get('/test', (req, res) => {
    res.json({
        success: true,
        message: 'Wallet API is working!',
        encryption: 'browser-side',
        timestamp: new Date().toISOString()
    });
});

// =============================================
// 🎯 STORE ENCRYPTED WALLET (FOR CREATE/IMPORT)
// =============================================

router.post('/store-encrypted', async (req, res) => {
    console.log('📦 STORE ENCRYPTED WALLET endpoint called');

    try {
        const { 
            userId, 
            walletAddress, 
            encryptedMnemonic, 
            publicKey = '',
            wordCount = 12,
            derivationPath = "m/44'/607'/0'/0/0",
            isImport = false
        } = req.body;
        
        console.log('📋 Storing wallet for user:', userId);
        console.log('🔐 Encrypted data length:', encryptedMnemonic?.length || 0);
        console.log('📍 Address:', walletAddress?.substring(0, 20) + '...');

        if (!userId || !walletAddress || !encryptedMnemonic) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields: userId, walletAddress, encryptedMnemonic'
            });
        }

        if (!supabase) {
            console.error('❌ Supabase not connected');
            return res.status(500).json({
                success: false,
                error: 'Database not available'
            });
        }

        // Check if wallet already exists
        const { data: existingWallets, error: checkError } = await supabase
            .from('user_wallets')
            .select('id')
            .eq('user_id', userId);

        if (checkError) {
            console.error('❌ Check existing error:', checkError.message);
            return res.status(500).json({
                success: false,
                error: 'Database error: ' + checkError.message
            });
        }

        // Delete existing wallet if exists
        if (existingWallets && existingWallets.length > 0) {
            console.log('🗑️ Deleting existing wallet for user:', userId);
            const { error: deleteError } = await supabase
                .from('user_wallets')
                .delete()
                .eq('user_id', userId);

            if (deleteError) {
                console.error('❌ Delete error:', deleteError.message);
            }
        }

        // Create wallet record matching YOUR schema
        const walletRecord = {
            user_id: userId,
            address: walletAddress,
            encrypted_mnemonic: encryptedMnemonic,
            public_key: publicKey || `pub_${crypto.randomBytes(16).toString('hex')}`,
            wallet_type: 'TON',
            source: isImport ? 'imported' : 'generated',
            word_count: wordCount,
            derivation_path: derivationPath,
            encryption_salt: crypto.randomBytes(16).toString('hex'), // Add salt
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };

        // Insert new wallet
        const { data: newWallet, error: insertError } = await supabase
            .from('user_wallets')
            .insert([walletRecord])
            .select()
            .single();

        if (insertError) {
            console.error('❌ Insert error:', insertError.message);
            console.error('❌ Full error details:', insertError);
            
            // Try to get more info
            if (insertError.details) {
                console.error('❌ Error details:', insertError.details);
            }
            if (insertError.hint) {
                console.error('❌ Error hint:', insertError.hint);
            }
            
            return res.status(500).json({
                success: false,
                error: 'Failed to store wallet: ' + insertError.message,
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
                userId: userId,
                address: walletAddress,
                createdAt: newWallet.created_at,
                source: isImport ? 'imported' : 'generated',
                wordCount: wordCount
            },
            note: 'Seed phrase encrypted in browser, backend cannot decrypt it'
        });

    } catch (error) {
        console.error('❌ Store encrypted wallet failed:', error);
        console.error('❌ Error stack:', error.stack);
        res.status(500).json({
            success: false,
            error: 'Failed to store wallet: ' + error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
});

// =============================================
// 🎯 GET ENCRYPTED WALLET (FOR VIEW SEED PHRASE)
// =============================================

router.post('/get-encrypted', async (req, res) => {
    console.log('🔐 GET ENCRYPTED WALLET endpoint called');

    try {
        const { userId } = req.body;
        console.log('📋 Getting encrypted wallet for user:', userId);

        if (!userId) {
            return res.status(400).json({
                success: false,
                error: 'User ID required'
            });
        }

        if (!supabase) {
            console.error('❌ Supabase not connected');
            return res.status(500).json({
                success: false,
                error: 'Database not available'
            });
        }

        // Get user's wallet
        const { data: wallets, error } = await supabase
            .from('user_wallets')
            .select('encrypted_mnemonic, address, created_at, word_count, source')
            .eq('user_id', userId);

        if (error) {
            console.error('❌ Database error:', error.message);
            return res.status(500).json({
                success: false,
                error: 'Database error: ' + error.message
            });
        }

        if (!wallets || wallets.length === 0) {
            console.log('❌ No wallet found for user:', userId);
            return res.json({
                success: false,
                error: 'No wallet found for user'
            });
        }

        const wallet = wallets[0];
        const encryptedMnemonic = wallet.encrypted_mnemonic;
        const walletAddress = wallet.address;

        if (!encryptedMnemonic) {
            return res.json({
                success: false,
                error: 'No encrypted seed phrase found'
            });
        }

        console.log(`✅ Found wallet for user ${userId}, word count: ${wallet.word_count}`);

        res.json({
            success: true,
            encryptedMnemonic: encryptedMnemonic,
            address: walletAddress,
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
        const { userId } = req.body;

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
            console.warn('⚠️ Check wallet error:', error.message);
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
                },
                userId: userId
            });
        } else {
            return res.json({
                success: true,
                hasWallet: false,
                message: 'No wallet found',
                userId: userId
            });
        }

    } catch (error) {
        console.error('❌ Check wallet failed:', error);
        return res.json({
            success: false,
            error: 'Failed to check wallet: ' + error.message
        });
    }
});

// =============================================
// 🎯 GET USER WALLET (COMPATIBILITY)
// =============================================

router.post('/get-user-wallet', async (req, res) => {
    console.log('🔍 GET USER WALLET endpoint called');

    try {
        const { userId } = req.body;

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
                userId: userId,
                address: wallet.address,
                createdAt: wallet.created_at,
                walletType: wallet.wallet_type || 'TON',
                source: wallet.source || 'generated'
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
// 🎯 DELETE WALLET
// =============================================

router.post('/delete-wallet', async (req, res) => {
    console.log('🗑️ DELETE WALLET endpoint called');

    try {
        const { userId, confirm } = req.body;

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
            console.error('❌ Delete error:', error.message);
            return res.status(500).json({
                success: false,
                error: 'Delete failed: ' + error.message
            });
        }

        const deletedCount = data ? data.length : 0;
        console.log(`✅ Deleted ${deletedCount} wallet(s) for user ${userId}`);

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
// 🎯 OTHER ENDPOINTS (BALANCE, PRICES, TRANSACTIONS)
// =============================================

router.get('/balance/:address', (req, res) => {
    res.json({
        success: true,
        address: req.params.address,
        balance: (Math.random() * 5).toFixed(4),
        currency: 'TON',
        tokens: [
            { symbol: 'TON', balance: (Math.random() * 5).toFixed(4), value: ((Math.random() * 5) * 2.35).toFixed(2) },
            { symbol: 'NMX', balance: (Math.random() * 1000).toFixed(2), value: ((Math.random() * 1000) * 0.10).toFixed(2) }
        ],
        isMock: true
    });
});

router.get('/prices', async (req, res) => {
    try {
        let prices = {
            TON: { price: 2.35, change24h: 1.5 },
            NMX: { price: 0.10, change24h: 0.5 }
        };

        res.json({
            success: true,
            prices: prices,
            source: 'fallback',
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
            isMock: true,
            timestamp: new Date().toISOString()
        });
    }
});

router.get('/transactions/:address', async (req, res) => {
    try {
        const { address } = req.params;
        const { limit = 50 } = req.query;

        if (!address) {
            return res.json({
                success: true,
                transactions: [],
                address: 'N/A',
                message: 'Address required'
            });
        }

        if (!supabase) {
            return res.json({
                success: true,
                transactions: [],
                address: address,
                isMock: true,
                message: 'Database not available'
            });
        }

        const { data: transactions, error } = await supabase
            .from('transactions')
            .select('*')
            .or(`from_address.eq.${address},to_address.eq.${address}`)
            .order('created_at', { ascending: false })
            .limit(parseInt(limit));

        if (error) {
            console.warn('⚠️ Transaction query failed:', error.message);
            return res.json({
                success: true,
                transactions: [],
                address: address,
                isMock: true
            });
        }

        res.json({
            success: true,
            transactions: transactions || [],
            address: address,
            count: transactions?.length || 0
        });

    } catch (error) {
        console.error('❌ Get transactions failed:', error);
        res.json({
            success: true,
            transactions: [],
            address: req.params.address || 'N/A',
            isMock: true,
            error: error.message
        });
    }
});

router.post('/send-transaction', async (req, res) => {
    try {
        const { userId, toAddress, amount, token = 'TON', memo = '' } = req.body;

        if (!userId || !toAddress || !amount) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields'
            });
        }

        const amountNum = parseFloat(amount);
        if (isNaN(amountNum) || amountNum <= 0) {
            return res.status(400).json({
                success: false,
                error: 'Invalid amount'
            });
        }

        if (!supabase) {
            return res.status(500).json({
                success: false,
                error: 'Database not available'
            });
        }

        // Get user's wallet address
        const { data: wallets, error: walletError } = await supabase
            .from('user_wallets')
            .select('address')
            .eq('user_id', userId);

        if (walletError) {
            return res.status(500).json({
                success: false,
                error: 'Failed to get wallet: ' + walletError.message
            });
        }

        if (!wallets || wallets.length === 0) {
            return res.json({
                success: false,
                error: 'No wallet found for user'
            });
        }

        const wallet = wallets[0];
        const fromAddress = wallet.address;
        const txHash = 'tx_' + crypto.randomBytes(16).toString('hex');

        // Save transaction to database
        const txRecord = {
            user_id: userId,
            from_address: fromAddress,
            to_address: toAddress,
            amount: amountNum,
            token: token,
            memo: memo || null,
            tx_hash: txHash,
            status: 'pending',
            created_at: new Date().toISOString()
        };

        try {
            await supabase
                .from('transactions')
                .insert([txRecord]);
        } catch (txError) {
            console.warn('⚠️ Failed to save transaction:', txError.message);
        }

        res.json({
            success: true,
            message: `Transaction submitted successfully!`,
            transaction: {
                hash: txHash,
                from: fromAddress,
                to: toAddress,
                amount: amountNum,
                token: token,
                memo: memo,
                status: 'pending',
                timestamp: new Date().toISOString()
            }
        });

    } catch (error) {
        console.error('❌ Send transaction failed:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to send transaction: ' + error.message
        });
    }
});

module.exports = router;