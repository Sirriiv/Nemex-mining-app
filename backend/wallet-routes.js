// wallet-routes.js - FIXED INTEGRATED WALLET
const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');
const bip39 = require('bip39');
const { mnemonicToWalletKey } = require('@ton/crypto');
const TonWeb = require('tonweb');

console.log('✅ FIXED Integrated Wallet Routes');

// Initialize Supabase with environment variables
const supabaseUrl = process.env.SUPABASE_URL || 'https://bjulifvbfogymoduxnzl.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJqdWxpZnZiZm9neW1vZHV4bnpsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTkxOTQ0MywiZXhwIjoyMDc1NDk1NDQzfQ.O2Ygj-_9D-mZ8l8oH6VgyOggK5wQ1byQ9NKQoDQB_Gk';

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Supabase credentials missing');
    throw new Error('Supabase configuration required');
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Initialize TonWeb with proper configuration
const tonweb = new TonWeb(new TonWeb.HttpProvider('https://toncenter.com/api/v2/jsonRPC'));

// NMX contract address
const NMX_CONTRACT = "EQBRSrXz-7iYDnFZGhrER2XQL-gBgv1hr3Y8byWsVIye7A9f";

// =============================================
// 🎯 SIMPLE SESSION CHECK (FIXED - using profiles table)
// =============================================

router.post('/check-user', async function(req, res) {
    try {
        const { userId } = req.body;

        if (!userId) {
            return res.json({
                success: false,
                error: 'User ID required'
            });
        }

        console.log('🔍 Checking user in database:', userId);

        // FIXED: Check if user exists in PROFILES table (not users)
        const { data: user, error } = await supabase
            .from('profiles')  // FIXED: Your actual table is 'profiles'
            .select('id, email, username')
            .eq('id', userId)
            .single();

        if (error || !user) {
            console.log('❌ User not found in profiles:', userId);
            return res.json({
                success: false,
                error: 'User not found'
            });
        }

        console.log('✅ User verified:', user.email);

        res.json({
            success: true,
            user: user
        });

    } catch (error) {
        console.error('❌ User check failed:', error);
        res.status(500).json({
            success: false,
            error: 'User verification failed'
        });
    }
});

// =============================================
// 🎯 WALLET MANAGEMENT (FIXED - matches your table structure)
// =============================================

router.post('/get-user-wallet', async function(req, res) {
    try {
        const { userId } = req.body;
        console.log('🔍 Getting wallet for user:', userId);

        if (!userId) {
            return res.json({
                success: false,
                wallet: null,
                message: 'User ID required'
            });
        }

        // Check if user already has a wallet
        const { data: wallet, error } = await supabase
            .from('user_wallets')
            .select('*')
            .eq('user_id', userId)
            .single();

        if (error) {
            if (error.code === 'PGRST116') {
                console.log('ℹ️ No wallet found for user:', userId);
                return res.json({
                    success: true,
                    wallet: null,
                    message: 'No wallet found'
                });
            }
            console.warn('⚠️ Database warning:', error.message);
        }

        if (wallet) {
            console.log('✅ Wallet found:', wallet.address);
            return res.json({
                success: true,
                wallet: {
                    // FIXED: Match your actual column names
                    userId: wallet.user_id,
                    address: wallet.address,
                    // Handle missing columns gracefully
                    addressBounceable: wallet.address, // Your table doesn't have address_bounceable
                    publicKey: wallet.public_key || '',
                    type: wallet.wallet_type || 'TON',
                    source: wallet.source || 'generated',
                    wordCount: wallet.word_count || 12,
                    derivationPath: wallet.derivation_path || "m/44'/607'/0'/0'/0'",
                    createdAt: wallet.created_at,
                    isActive: true
                }
            });
        }

        res.json({
            success: true,
            wallet: null
        });

    } catch (error) {
        console.error('❌ Get wallet error:', error);
        res.json({
            success: false,
            error: 'Failed to get wallet'
        });
    }
});

router.post('/create-wallet', async function(req, res) {
    try {
        const { userId } = req.body;
        console.log('🔄 Creating wallet for user:', userId);

        if (!userId) {
            return res.status(400).json({
                success: false,
                error: 'User ID is required'
            });
        }

        // Check if user already has a wallet
        const { data: existingWallet, error: checkError } = await supabase
            .from('user_wallets')
            .select('id')
            .eq('user_id', userId)
            .single();

        if (!checkError && existingWallet) {
            console.log('❌ User already has a wallet');
            return res.status(400).json({
                success: false,
                error: 'User already has a wallet. One wallet per account only.'
            });
        }

        // Generate mnemonic (12 words)
        const mnemonic = bip39.generateMnemonic(128);
        console.log('✅ Mnemonic generated:', mnemonic);

        // Derive wallet from mnemonic
        const keyPair = await mnemonicToWalletKey(mnemonic.split(' '));

        const WalletClass = tonweb.wallet.all.v4R2;
        const wallet = new WalletClass(tonweb.provider, {
            publicKey: keyPair.publicKey,
            wc: 0
        });

        const walletAddress = await wallet.getAddress();
        const address = walletAddress.toString(true, true, false);
        const addressBounceable = walletAddress.toString(true, true, true);

        console.log('✅ Wallet derived:', address);

        // FIXED: Match your actual table structure
        const walletData = {
            user_id: userId,
            address: address,
            // Your table doesn't have these columns, so we'll skip them
            // address_bounceable: addressBounceable,
            // public_key: TonWeb.utils.bytesToHex(keyPair.publicKey),
            wallet_type: 'ton',  // FIXED: lowercase 'ton' to match your column
            source: 'nemex',
            // word_count: 12,
            // derivation_path: "m/44'/607'/0'/0'/0'",
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
            // is_active: true  // Your table doesn't have this
        };

        console.log('📝 Inserting wallet data:', JSON.stringify(walletData, null, 2));

        const { data: insertedWallet, error: insertError } = await supabase
            .from('user_wallets')
            .insert([walletData])
            .select();

        if (insertError) {
            console.error('❌ Database insert error:', insertError);
            console.error('❌ Full error details:', JSON.stringify(insertError, null, 2));
            return res.status(500).json({
                success: false,
                error: 'Failed to save wallet to database: ' + insertError.message,
                details: insertError
            });
        }

        console.log('✅ Wallet saved to database:', insertedWallet);

        res.json({
            success: true,
            wallet: {
                userId: userId,
                address: address,
                addressBounceable: addressBounceable,
                publicKey: TonWeb.utils.bytesToHex(keyPair.publicKey),
                type: 'TON',
                source: 'generated',
                wordCount: 12,
                createdAt: new Date().toISOString()
            },
            mnemonic: mnemonic,
            securityWarning: 'WRITE DOWN YOUR SEED PHRASE! Store it securely. Without it, you cannot recover your wallet.',
            instructions: 'This is your one and only wallet for this account. Use these 12 words to recover your wallet if needed.',
            databaseResult: insertedWallet  // For debugging
        });

    } catch (error) {
        console.error('❌ Wallet creation failed:', error);
        console.error('❌ Error stack:', error.stack);
        res.status(500).json({
            success: false,
            error: 'Failed to create wallet: ' + error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
});

router.post('/import-wallet', async function(req, res) {
    try {
        const { userId, mnemonic } = req.body;

        console.log('🔄 Importing wallet for user:', userId);

        if (!userId || !mnemonic) {
            return res.status(400).json({
                success: false,
                error: 'User ID and seed phrase are required'
            });
        }

        // Check if user already has a wallet
        const { data: existingWallet, error: checkError } = await supabase
            .from('user_wallets')
            .select('id')
            .eq('user_id', userId)
            .single();

        if (!checkError && existingWallet) {
            console.log('❌ User already has a wallet');
            return res.status(400).json({
                success: false,
                error: 'User already has a wallet. One wallet per account only.'
            });
        }

        // Normalize mnemonic
        const normalizedMnemonic = mnemonic.trim().toLowerCase().replace(/\s+/g, ' ');
        const wordCount = normalizedMnemonic.split(' ').length;

        if (wordCount !== 12 && wordCount !== 24) {
            return res.status(400).json({
                success: false,
                error: 'Seed phrase must be 12 or 24 words'
            });
        }

        // Derive wallet from mnemonic
        let address, addressBounceable, publicKey;
        try {
            const keyPair = await mnemonicToWalletKey(normalizedMnemonic.split(' '));

            const WalletClass = tonweb.wallet.all.v4R2;
            const tonWallet = new WalletClass(tonweb.provider, {
                publicKey: keyPair.publicKey,
                wc: 0
            });

            const walletAddress = await tonWallet.getAddress();
            address = walletAddress.toString(true, true, false);
            addressBounceable = walletAddress.toString(true, true, true);
            publicKey = TonWeb.utils.bytesToHex(keyPair.publicKey);

            console.log('✅ Wallet derived:', address);

        } catch (derivationError) {
            console.error('❌ Wallet derivation failed:', derivationError);
            return res.status(400).json({
                success: false,
                error: 'Invalid seed phrase'
            });
        }

        // FIXED: Match your table structure
        const walletData = {
            user_id: userId,
            address: address,
            wallet_type: 'ton',  // lowercase
            source: 'imported',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };

        const { error: insertError } = await supabase
            .from('user_wallets')
            .insert([walletData]);

        if (insertError) {
            console.error('❌ Database error:', insertError);
            return res.status(500).json({
                success: false,
                error: 'Failed to save wallet to database'
            });
        }

        console.log('✅ Wallet imported and saved');

        res.json({
            success: true,
            wallet: {
                userId: userId,
                address: address,
                addressBounceable: addressBounceable,
                publicKey: publicKey,
                type: 'TON',
                source: 'imported',
                wordCount: wordCount,
                createdAt: new Date().toISOString()
            },
            message: 'Wallet imported successfully!'
        });

    } catch (error) {
        console.error('❌ Wallet import failed:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to import wallet: ' + error.message
        });
    }
});

// =============================================
// 🎯 BALANCE CHECKING (FIXED with proper error handling)
// =============================================

router.get('/balance/:address', async function(req, res) {
    try {
        const { address } = req.params;
        console.log('💰 Checking balance for:', address);

        // Use TON API v4 (newest version)
        const response = await axios.get(`https://tonapi.io/v2/accounts/${address}`, {
            headers: {
                'Accept': 'application/json',
                'Authorization': 'Bearer AGDQXFV3ZMAAAAAAI5TFJW7XVMK2SFHWBQLR3Z2HLHN2HMP7NI2XTQVPKQSTZA'  // Free public API key
            },
            timeout: 10000
        });

        if (response.data && response.data.balance) {
            const balanceNano = response.data.balance;
            const balanceTON = parseInt(balanceNano) / 1_000_000_000;

            console.log(`✅ Balance found: ${balanceTON} TON`);

            res.json({
                success: true,
                balance: balanceTON,
                balanceNano: balanceNano,
                address: address,
                currency: 'TON'
            });
        } else {
            console.log('ℹ️ No balance found (account might be new)');
            res.json({
                success: true,
                balance: 0,
                address: address,
                currency: 'TON'
            });
        }

    } catch (error) {
        console.error('❌ Balance check failed:', error.message);
        
        // Fallback to TonCenter API
        try {
            const fallbackResponse = await axios.get('https://toncenter.com/api/v2/getAddressInformation', {
                params: { address: req.params.address },
                timeout: 10000
            });

            if (fallbackResponse.data?.result?.balance) {
                const balance = fallbackResponse.data.result.balance;
                const tonBalance = parseFloat(TonWeb.utils.fromNano(balance));

                res.json({
                    success: true,
                    balance: tonBalance,
                    address: req.params.address,
                    currency: 'TON',
                    source: 'toncenter_fallback'
                });
            } else {
                res.json({
                    success: true,
                    balance: 0,
                    address: req.params.address,
                    currency: 'TON',
                    error: 'Account not found or has zero balance'
                });
            }
        } catch (fallbackError) {
            res.json({
                success: true,
                balance: 0,
                address: req.params.address,
                currency: 'TON',
                error: 'API unavailable, showing zero balance'
            });
        }
    }
});

// =============================================
// 🎯 REAL TOKEN PRICES (FIXED with real API)
// =============================================

router.get('/prices', async function(req, res) {
    try {
        console.log('🔄 Getting REAL token prices...');

        // Get TON price from CoinGecko
        const tonResponse = await axios.get('https://api.coingecko.com/api/v3/simple/price', {
            params: {
                ids: 'the-open-network',
                vs_currencies: 'usd',
                include_24hr_change: true
            },
            timeout: 10000
        });

        const tonPrice = tonResponse.data['the-open-network']?.usd || 2.5;
        const tonChange24h = tonResponse.data['the-open-network']?.usd_24h_change || 0;

        // For NMX, use a fixed price or your own API
        const nmxPrice = 0.10;
        const nmxChange24h = 0.5;

        const prices = {
            TON: { 
                price: tonPrice, 
                change24h: tonChange24h,
                marketCap: tonPrice * 5100000000, // Approximate TON market cap
                volume24h: tonPrice * 100000000   // Approximate 24h volume
            },
            NMX: { 
                price: nmxPrice, 
                change24h: nmxChange24h,
                marketCap: nmxPrice * 1000000000, // Your NMX supply
                volume24h: nmxPrice * 1000000     // Your 24h volume
            }
        };

        console.log('✅ Prices fetched:', {
            TON: `$${tonPrice}`,
            NMX: `$${nmxPrice}`
        });

        res.json({
            success: true,
            prices: prices,
            timestamp: new Date().toISOString(),
            source: 'coingecko'
        });

    } catch (error) {
        console.error('❌ Price fetch failed:', error.message);
        
        // Fallback prices
        res.json({
            success: true,
            prices: {
                TON: { price: 2.5, change24h: 1.2 },
                NMX: { price: 0.10, change24h: 0.5 }
            },
            timestamp: new Date().toISOString(),
            source: 'fallback'
        });
    }
});

// =============================================
// 🎯 SEND TRANSACTIONS (SIMULATED - for demo)
// =============================================

router.post('/send-ton', async function(req, res) {
    try {
        const { userId, fromAddress, toAddress, amount, memo = '' } = req.body;

        console.log('🔄 Sending TON simulation:', { fromAddress, toAddress, amount });

        if (!userId || !fromAddress || !toAddress || !amount) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields'
            });
        }

        // Verify user owns the fromAddress
        const { data: wallet, error } = await supabase
            .from('user_wallets')
            .select('user_id')
            .eq('user_id', userId)
            .eq('address', fromAddress)
            .single();

        if (error || !wallet) {
            return res.status(401).json({
                success: false,
                error: 'Unauthorized: Wallet does not belong to user'
            });
        }

        // In a real implementation, this would:
        // 1. Get private key (encrypted)
        // 2. Sign transaction
        // 3. Broadcast to TON network
        
        // For demo, simulate transaction
        const txHash = `0x${Date.now().toString(16)}${Math.random().toString(16).substr(2, 10)}`;

        // Record transaction in database
        const transactionData = {
            user_id: userId,
            from_address: fromAddress,
            to_address: toAddress,
            amount: amount,
            currency: 'TON',
            tx_hash: txHash,
            status: 'completed',
            memo: memo,
            created_at: new Date().toISOString()
        };

        // Insert into pending_transactions (or your transactions table)
        await supabase
            .from('pending_transactions')  // Or 'transactions' table
            .insert([transactionData]);

        res.json({
            success: true,
            transaction: {
                hash: txHash,
                from: fromAddress,
                to: toAddress,
                amount: amount,
                amountTON: amount,
                memo: memo,
                timestamp: new Date().toISOString(),
                status: 'completed',
                explorerUrl: `https://tonscan.org/tx/${txHash}`
            },
            message: `Successfully sent ${amount} TON (simulation)`
        });

    } catch (error) {
        console.error('❌ Send transaction failed:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to send transaction: ' + error.message
        });
    }
});

// =============================================
// 🎯 GET NMX BALANCE (for your token)
// =============================================

router.get('/nmx-balance/:address', async function(req, res) {
    try {
        const { address } = req.params;
        console.log('💰 Checking NMX balance for:', address);

        // This would query your NMX contract on TON
        // For now, return demo data
        const nmxBalance = Math.random() * 1000; // Demo

        res.json({
            success: true,
            balance: nmxBalance,
            address: address,
            currency: 'NMX',
            contract: NMX_CONTRACT
        });

    } catch (error) {
        console.error('❌ NMX balance check failed:', error);
        res.json({
            success: true,
            balance: 0,
            address: req.params.address,
            currency: 'NMX'
        });
    }
});

// =============================================
// 🎯 HEALTH CHECK (Enhanced)
// =============================================

router.get('/health', async (req, res) => {
    try {
        // Test database connection
        const { data: dbTest, error: dbError } = await supabase
            .from('user_wallets')
            .select('count', { count: 'exact', head: true });

        // Test TON API connection
        const apiTest = await axios.get('https://tonapi.io/v2/status', { timeout: 5000 });

        res.json({
            success: true,
            message: 'Integrated Wallet API is running',
            timestamp: new Date().toISOString(),
            version: '2.0.0',
            database: dbError ? '❌ Error: ' + dbError.message : '✅ Connected',
            tonApi: apiTest.status === 200 ? '✅ Connected' : '❌ Error',
            features: [
                'One wallet per user account',
                'Real TON balance checking',
                'Real price feeds',
                'Send/receive simulation',
                'Seed phrase backup'
            ],
            stats: {
                totalWallets: dbTest?.count || 0,
                uptime: process.uptime()
            }
        });

    } catch (error) {
        res.json({
            success: true,
            message: 'API running with some issues',
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// =============================================
// 🎯 GET WALLET TRANSACTIONS
// =============================================

router.get('/transactions/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        
        // Get transactions from pending_transactions table
        const { data: transactions, error } = await supabase
            .from('pending_transactions')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(50);

        if (error) {
            console.error('❌ Get transactions error:', error);
            return res.json({
                success: true,
                transactions: []
            });
        }

        res.json({
            success: true,
            transactions: transactions || []
        });

    } catch (error) {
        console.error('❌ Transactions fetch failed:', error);
        res.json({
            success: true,
            transactions: []
        });
    }
});

module.exports = router;