const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');
const crypto = require('crypto');
const bip39 = require('bip39');
const { mnemonicToWalletKey } = require('@ton/crypto');
const TonWeb = require('tonweb');

console.log('✅ CLEAN wallet-routes.js LOADED - NO HARCODED ADDRESSES!');

// Initialize Supabase
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Initialize TON with tonweb
const tonweb = new TonWeb(new TonWeb.HttpProvider('https://toncenter.com/api/v2/jsonRPC', {
    apiKey: process.env.TONCENTER_API_KEY
}));

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;

// =============================================
// TEST ROUTE
// =============================================

router.get('/test', (req, res) => {
    res.json({
        success: true,
        message: 'Wallet API is working!',
        timestamp: new Date().toISOString(),
        routes: [
            '/generate-wallet',
            '/import-wallet', 
            '/real-balance/:address',
            '/nmx-balance/:address',
            '/all-balances/:address',
            '/validate-address/:address',
            '/supported-tokens',
            '/analytics/wallet-stats'
        ]
    });
});

// =============================================
// WALLET GENERATION
// =============================================

async function generateRealTONWallet(wordCount) {
    try {
        const strength = wordCount === 12 ? 128 : 256;
        const mnemonic = bip39.generateMnemonic(strength);

        const keyPair = await mnemonicToWalletKey(mnemonic.split(' '));

        const WalletClass = tonweb.wallet.all.v4R2;
        const wallet = new WalletClass(tonweb.provider, {
            publicKey: keyPair.publicKey,
            wc: 0
        });

        const walletAddress = await wallet.getAddress();
        const address = walletAddress.toString(true, true, true);

        return {
            mnemonic: mnemonic,
            address: address,
            publicKey: TonWeb.utils.bytesToHex(keyPair.publicKey),
            privateKey: TonWeb.utils.bytesToHex(keyPair.secretKey)
        };

    } catch (error) {
        console.error('Real TON wallet generation failed:', error);
        throw new Error('Failed to generate TON wallet: ' + error.message);
    }
}

// =============================================
// ENCRYPTION FUNCTIONS
// =============================================

function encrypt(text) {
    try {
        const iv = crypto.randomBytes(16);
        const cipher = crypto.createCipheriv('aes-256-gcm', Buffer.from(ENCRYPTION_KEY, 'hex'), iv);
        let encrypted = cipher.update(text, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        const authTag = cipher.getAuthTag();
        return {
            iv: iv.toString('hex'),
            data: encrypted,
            authTag: authTag.toString('hex')
        };
    } catch (error) {
        console.error('Encryption failed:', error);
        throw new Error('Encryption error');
    }
}

// =============================================
// BALANCE FUNCTIONS
// =============================================

async function getRealBalance(address) {
    try {
        console.log('🔄 Fetching TON balance for:', address);

        const response = await axios.get('https://toncenter.com/api/v2/getAddressInformation', {
            params: { address: address },
            headers: { 'X-API-Key': process.env.TONCENTER_API_KEY }
        });

        if (response.data && response.data.result) {
            const balance = response.data.result.balance;
            const tonBalance = TonWeb.utils.fromNano(balance);

            console.log('✅ TON Balance fetched:', tonBalance);

            return {
                success: true,
                balance: parseFloat(tonBalance).toFixed(4),
                address: address,
                rawBalance: balance.toString()
            };
        } else {
            throw new Error('Invalid response from TON API');
        }

    } catch (error) {
        console.error('❌ TON balance fetch failed:', error.message);

        return {
            success: true,
            balance: "0",
            address: address,
            rawBalance: "0",
            error: error.message
        };
    }
}

async function getNMXBalance(address) {
    try {
        console.log('🔄 Fetching NMX balance for:', address);

        const response = await axios.get('https://tonapi.io/v1/jetton/getBalances', {
            params: { account: address }
        });

        let nmxJetton = null;

        if (response.data.balances && response.data.balances.length > 0) {
            nmxJetton = response.data.balances.find(function(j) {
                const jettonAddress = j.jetton.address;
                return jettonAddress === "0:514ab5f3fbb8980e71591a1ac44765d02fe80182fd61af763c6f25ac548c9eec" ||
                       jettonAddress === "EQBRSrXz-7iYDnFZGhrER2XQL-gBgv1hr3Y8byWsVIye7A9f";
            });
        }

        if (nmxJetton) {
            const nmxBalance = TonWeb.utils.fromNano(nmxJetton.balance);
            console.log('✅ NMX Balance found:', nmxBalance, 'NMX');

            return {
                success: true,
                balance: parseFloat(nmxBalance).toFixed(2),
                address: address,
                rawBalance: nmxJetton.balance
            };
        } else {
            console.log('ℹ️ No NMX tokens found');
            return {
                success: true,
                balance: "0",
                address: address,
                rawBalance: "0"
            };
        }

    } catch (error) {
        console.error('❌ NMX balance fetch failed:', error.message);

        return {
            success: true,
            balance: "0",
            address: address,
            rawBalance: "0",
            error: error.message
        };
    }
}

async function getAllBalances(address) {
    try {
        console.log('🔍 [DEBUG] getAllBalances called with address:', address);

        const tonBalance = await getRealBalance(address);
        const nmxBalance = await getNMXBalance(address);

        console.log('✅ All balances fetched for:', address);
        console.log('✅ TON:', tonBalance.balance, 'NMX:', nmxBalance.balance);

        return {
            success: true,
            balances: {
                TON: tonBalance.balance,
                NMX: nmxBalance.balance
            },
            address: address
        };

    } catch (error) {
        console.error('❌ All balances fetch failed:', error);

        return {
            success: true,
            balances: {
                TON: "0",
                NMX: "0"
            },
            address: address,
            error: error.message
        };
    }
}

// =============================================
// API ROUTES - WITH ANALYTICS TRACKING
// =============================================

router.post('/generate-wallet', async function(req, res) {
    try {
        const { userId, wordCount = 24 } = req.body;
        console.log('🔄 Generating TON wallet...');

        const walletData = await generateRealTONWallet(wordCount);
        const encryptedMnemonic = encrypt(walletData.mnemonic);

        // Try to insert into Supabase
        try {
            const { data, error } = await supabase
                .from('user_wallets')
                .insert([{
                    user_id: userId,
                    address: walletData.address,
                    encrypted_mnemonic: JSON.stringify(encryptedMnemonic),
                    public_key: walletData.publicKey,
                    wallet_type: 'TON',
                    source: 'generated', // ✅ ANALYTICS: Track as generated wallet
                    created_at: new Date().toISOString()
                }]);

            if (error) {
                console.warn('⚠️ Supabase insert failed (continuing without DB):', error.message);
            } else {
                console.log('✅ Wallet saved to database (generated)');
            }
        } catch (dbError) {
            console.warn('⚠️ Database error (continuing without DB):', dbError.message);
        }

        console.log('✅ Wallet generated:', walletData.address);

        res.json({
            success: true,
            wallet: {
                address: walletData.address,
                mnemonic: walletData.mnemonic,
                wordCount: walletData.mnemonic.split(' ').length,
                type: 'TON',
                source: 'generated' // ✅ Return source to frontend
            }
        });

    } catch (error) {
        console.error('Wallet generation error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

router.post('/import-wallet', async function(req, res) {
    try {
        const { userId, mnemonic } = req.body;
        console.log('🔄 Importing TON wallet...');

        if (!bip39.validateMnemonic(mnemonic)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid mnemonic phrase.'
            });
        }

        const keyPair = await mnemonicToWalletKey(mnemonic.split(' '));
        const WalletClass = tonweb.wallet.all.v4R2;
        const wallet = new WalletClass(tonweb.provider, {
            publicKey: keyPair.publicKey,
            wc: 0
        });

        const walletAddress = await wallet.getAddress();
        const address = walletAddress.toString(true, true, true);
        const encryptedMnemonic = encrypt(mnemonic);

        // Try to insert into Supabase
        try {
            const { data, error } = await supabase
                .from('user_wallets')
                .insert([{
                    user_id: userId,
                    address: address,
                    encrypted_mnemonic: JSON.stringify(encryptedMnemonic),
                    public_key: TonWeb.utils.bytesToHex(keyPair.publicKey),
                    wallet_type: 'TON',
                    source: 'imported', // ✅ ANALYTICS: Track as imported wallet
                    created_at: new Date().toISOString()
                }]);

            if (error) {
                console.warn('⚠️ Supabase insert failed (continuing without DB):', error.message);
            } else {
                console.log('✅ Wallet saved to database (imported)');
            }
        } catch (dbError) {
            console.warn('⚠️ Database error (continuing without DB):', dbError.message);
        }

        console.log('✅ Wallet imported:', address);

        res.json({
            success: true,
            wallet: { 
                address: address, 
                type: 'TON',
                source: 'imported' // ✅ Return source to frontend
            }
        });

    } catch (error) {
        console.error('Wallet import error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

router.get('/real-balance/:address', async function(req, res) {
    try {
        const { address } = req.params;
        console.log('🔍 /real-balance called with:', address);
        const result = await getRealBalance(address);
        res.json(result);
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

router.get('/nmx-balance/:address', async function(req, res) {
    try {
        const { address } = req.params;
        console.log('🔍 /nmx-balance called with:', address);
        const result = await getNMXBalance(address);
        res.json(result);
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

router.get('/all-balances/:address', async function(req, res) {
    try {
        const { address } = req.params;
        console.log('🔍 /all-balances called with:', address);
        const result = await getAllBalances(address);
        res.json(result);
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

router.get('/validate-address/:address', async function(req, res) {
    try {
        const { address } = req.params;
        const isValid = address.startsWith('EQ') || address.startsWith('UQ');
        res.json({ success: true, isValid: isValid, address: address });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

router.get('/supported-tokens', async function(req, res) {
    try {
        const tokens = [
            {
                symbol: "TON", name: "Toncoin", isNative: true, isFeatured: true,
                logo: "https://assets.coingecko.com/coins/images/17980/large/ton_symbol.png",
                price: 2.50, canSend: true
            },
            {
                symbol: "NMX", name: "NemexCoin", isNative: false, isFeatured: true,
                contract: "0:514ab5f3fbb8980e71591a1ac44765d02fe80182fd61af763c6f25ac548c9eec",
                logo: "https://turquoise-obedient-frog-86.mypinata.cloud/ipfs/QmZo4rNnhhpWq6qQBkXBaAGqTdrawEzmW4w4QQsuMSjjW1",
                price: 0.10, canSend: true
            }
        ];
        res.json({ success: true, tokens: tokens, primaryToken: "TON" });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// =============================================
// ANALYTICS ENDPOINTS
// =============================================

router.get('/analytics/wallet-stats', async function(req, res) {
    try {
        const { data, error } = await supabase
            .from('user_wallets')
            .select('source, created_at');

        if (error) throw error;

        const total = data.length;
        const generated = data.filter(w => w.source === 'generated').length;
        const imported = data.filter(w => w.source === 'imported').length;

        // Calculate daily stats for the last 7 days
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        
        const recentWallets = data.filter(w => new Date(w.created_at) >= sevenDaysAgo);
        const dailyStats = {};
        
        recentWallets.forEach(wallet => {
            const date = new Date(wallet.created_at).toISOString().split('T')[0];
            if (!dailyStats[date]) {
                dailyStats[date] = { generated: 0, imported: 0, total: 0 };
            }
            dailyStats[date][wallet.source]++;
            dailyStats[date].total++;
        });

        res.json({
            success: true,
            stats: {
                total_wallets: total,
                generated_wallets: generated,
                imported_wallets: imported,
                generated_percentage: total > 0 ? ((generated / total) * 100).toFixed(2) : 0,
                imported_percentage: total > 0 ? ((imported / total) * 100).toFixed(2) : 0,
                daily_stats: dailyStats
            },
            message: `📊 Wallet Analytics: ${generated} generated, ${imported} imported (${((generated / total) * 100).toFixed(1)}% new users)`
        });
    } catch (error) {
        console.error('Analytics error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

router.get('/analytics/daily-stats', async function(req, res) {
    try {
        const { data, error } = await supabase
            .from('user_wallets')
            .select('source, created_at')
            .order('created_at', { ascending: false });

        if (error) throw error;

        // Group by date and source
        const dailyStats = {};
        data.forEach(wallet => {
            const date = new Date(wallet.created_at).toISOString().split('T')[0];
            if (!dailyStats[date]) {
                dailyStats[date] = { date: date, generated: 0, imported: 0, total: 0 };
            }
            dailyStats[date][wallet.source]++;
            dailyStats[date].total++;
        });

        // Convert to array and sort by date
        const statsArray = Object.values(dailyStats).sort((a, b) => b.date.localeCompare(a.date));

        res.json({
            success: true,
            daily_stats: statsArray,
            total_days: statsArray.length
        });
    } catch (error) {
        console.error('Daily stats error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;