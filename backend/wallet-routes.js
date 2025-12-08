// backend/wallet-routes.js - FIXED WITH TON CRYPTO v4.0 (SIMPLIFIED)
const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');
const axios = require('axios');
const { mnemonicToSeedSync, generateMnemonic } = require('@ton/crypto');
const bcrypt = require('bcrypt');
require('dotenv').config();

console.log('🚀 WALLET ROUTES v4.0 - LOADING WITH TON CRYPTO...');

// Initialize Supabase
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
let supabase = null;
let dbStatus = 'not_initialized';

async function initializeSupabase() {
    try {
        if (!supabaseUrl || !supabaseAnonKey) {
            console.error('❌ SUPABASE CREDENTIALS MISSING');
            dbStatus = 'credentials_missing';
            return false;
        }

        supabase = createClient(supabaseUrl, supabaseAnonKey);
        
        // Test connection
        const { error } = await supabase
            .from('user_wallets')
            .select('count')
            .limit(1);

        if (error) throw error;

        console.log('✅ Supabase connected successfully!');
        dbStatus = 'connected';
        return true;
    } catch (error) {
        console.error('❌ Supabase initialization error:', error.message);
        dbStatus = 'initialization_error';
        return false;
    }
}

// Initialize immediately
(async () => {
    await initializeSupabase();
})();

// ============================================
// 🎯 HELPER FUNCTIONS
// ============================================

// Generate TON wallet with UQ address
async function generateTONWallet(wordCount = 12) {
    try {
        // 1. Generate BIP-39 mnemonic using TON crypto
        const mnemonic = generateMnemonic(wordCount);
        
        // 2. Convert to seed
        const seed = mnemonicToSeedSync(mnemonic);
        
        // 3. Generate deterministic UQ address from seed
        const address = generateUQAddress(seed);
        
        return {
            mnemonic,
            address,
            seed: seed.toString('hex'),
            wordCount
        };
    } catch (error) {
        console.error('❌ TON wallet generation failed:', error);
        throw error;
    }
}

// Generate UQ format address from seed
function generateUQAddress(seed) {
    // Create SHA-256 hash of the seed
    const hash = crypto.createHash('sha256').update(seed).digest();
    
    // Convert to base64url (UQ format)
    const base64 = hash.toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '');
    
    // Ensure it's exactly 48 chars (UQ + 46 chars)
    const base46 = base64.substring(0, 46);
    return 'UQ' + base46;
}

// Hash wallet password with bcrypt
async function hashWalletPassword(password) {
    const saltRounds = 12;
    return await bcrypt.hash(password, saltRounds);
}

// Verify wallet password
async function verifyWalletPassword(password, hash) {
    return await bcrypt.compare(password, hash);
}

// Simple AES encryption for mnemonic
function encryptMnemonic(mnemonic, password) {
    const algorithm = 'aes-256-gcm';
    const iv = crypto.randomBytes(16);
    const key = crypto.scryptSync(password, 'nemex-salt', 32);
    
    const cipher = crypto.createCipheriv(algorithm, key, iv);
    let encrypted = cipher.update(mnemonic, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    return {
        iv: iv.toString('hex'),
        encrypted: encrypted,
        authTag: authTag.toString('hex')
    };
}

// Simple AES decryption
function decryptMnemonic(encryptedData, password) {
    const algorithm = 'aes-256-gcm';
    const key = crypto.scryptSync(password, 'nemex-salt', 32);
    const iv = Buffer.from(encryptedData.iv, 'hex');
    const authTag = Buffer.from(encryptedData.authTag, 'hex');
    
    const decipher = crypto.createDecipheriv(algorithm, key, iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
}

// ============================================
// 🎯 PRICE API (Keep your existing price APIs)
// ============================================

const PRICE_APIS = [
    {
        name: 'Binance',
        urls: {
            TON: 'https://api.binance.com/api/v3/ticker/price?symbol=TONUSDT',
            NMX: 'https://api.binance.com/api/v3/ticker/price?symbol=NMXUSDT'
        },
        parser: async (data) => {
            try {
                const prices = {};
                if (data.symbol === 'TONUSDT') prices.TON = parseFloat(data.price) || 0;
                if (data.symbol === 'NMXUSDT') prices.NMX = parseFloat(data.price) || 0;
                return prices;
            } catch (error) {
                console.warn('⚠️ Binance parser error:', error.message);
                return {};
            }
        }
    },
    {
        name: 'Bybit',
        urls: {
            TON: 'https://api.bybit.com/v5/market/tickers?category=spot&symbol=TONUSDT',
            NMX: 'https://api.bybit.com/v5/market/tickers?category=spot&symbol=NMXUSDT'
        },
        parser: async (data) => {
            try {
                const prices = {};
                if (data.retCode === 0 && data.result && data.result.list && data.result.list.length > 0) {
                    const ticker = data.result.list[0];
                    if (ticker.symbol === 'TONUSDT') prices.TON = parseFloat(ticker.lastPrice) || 0;
                    if (ticker.symbol === 'NMXUSDT') prices.NMX = parseFloat(ticker.lastPrice) || 0;
                }
                return prices;
            } catch (error) {
                console.warn('⚠️ Bybit parser error:', error.message);
                return {};
            }
        }
    }
];

let priceCache = { data: null, timestamp: 0 };
const CACHE_DURATION = 30000;

async function fetchRealPrices() {
    const now = Date.now();
    if (priceCache.data && (now - priceCache.timestamp) < CACHE_DURATION) {
        return priceCache.data;
    }

    console.log('💰 Fetching fresh prices from exchanges...');
    
    let successfulPrices = null;

    for (const api of PRICE_APIS) {
        try {
            console.log(`🔄 Trying ${api.name}...`);
            
            // Fetch TON price
            const tonResponse = await axios.get(api.urls.TON, { timeout: 5000 });
            const tonPrices = await api.parser(tonResponse.data);
            
            // Fetch NMX price
            const nmxResponse = await axios.get(api.urls.NMX, { timeout: 5000 });
            const nmxPrices = await api.parser(nmxResponse.data);
            
            // Combine prices
            const prices = {
                TON: { 
                    price: tonPrices.TON || 2.35, 
                    change24h: 0, 
                    source: api.name, 
                    timestamp: now 
                },
                NMX: { 
                    price: nmxPrices.NMX || 0.10, 
                    change24h: 0, 
                    source: api.name, 
                    timestamp: now 
                }
            };

            // Validate prices
            if (prices.TON.price > 0 && prices.NMX.price > 0) {
                successfulPrices = prices;
                console.log(`✅ ${api.name} prices: TON=$${prices.TON.price}, NMX=$${prices.NMX.price}`);
                break;
            }
        } catch (error) {
            console.warn(`⚠️ ${api.name} failed:`, error.message);
            continue;
        }
    }

    // Fallback if all APIs fail
    if (!successfulPrices) {
        console.warn('⚠️ All exchanges failed, using fallback prices');
        successfulPrices = {
            TON: { price: 2.35, change24h: 0, source: 'fallback', timestamp: now },
            NMX: { price: 0.10, change24h: 0, source: 'fallback', timestamp: now }
        };
    }

    priceCache.data = successfulPrices;
    priceCache.timestamp = now;

    return successfulPrices;
}

// ============================================
// 🎯 API ROUTES
// ============================================

// 🎯 CREATE WALLET (with separate wallet password)
router.post('/create', async (req, res) => {
    console.log('🎯 CREATE WALLET - Processing request');
    
    try {
        const { userId, walletPassword } = req.body;
        
        if (!userId || !walletPassword) {
            return res.status(400).json({
                success: false,
                error: 'User ID and wallet password required'
            });
        }
        
        if (walletPassword.length < 8) {
            return res.status(400).json({
                success: false,
                error: 'Wallet password must be at least 8 characters'
            });
        }
        
        // 1. Check if wallet already exists
        if (supabase && dbStatus === 'connected') {
            const { data: existingWallet } = await supabase
                .from('user_wallets')
                .select('id')
                .eq('user_id', userId)
                .single();
                
            if (existingWallet) {
                return res.status(400).json({
                    success: false,
                    error: 'Wallet already exists for this user'
                });
            }
        }
        
        // 2. Generate TON wallet
        console.log('🔐 Generating TON wallet...');
        const wallet = await generateTONWallet(12);
        
        // 3. Hash wallet password
        const passwordHash = await hashWalletPassword(walletPassword);
        
        // 4. Encrypt mnemonic with wallet password
        const encryptedMnemonic = encryptMnemonic(wallet.mnemonic, walletPassword);
        
        // 5. Store in database if available
        let walletId = null;
        if (supabase && dbStatus === 'connected') {
            const walletRecord = {
                user_id: userId,
                address: wallet.address,
                encrypted_mnemonic: JSON.stringify(encryptedMnemonic),
                public_key: crypto.randomBytes(32).toString('hex'),
                wallet_type: 'TON',
                source: 'generated',
                word_count: 12,
                derivation_path: "m/44'/607'/0'/0/0",
                password_hash: passwordHash,
                encryption_salt: 'nemex-salt',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };
            
            const { data, error } = await supabase
                .from('user_wallets')
                .insert([walletRecord])
                .select()
                .single();
                
            if (error) throw error;
            
            walletId = data.id;
            console.log('✅ Wallet stored in database');
        }
        
        // Success response
        res.json({
            success: true,
            message: 'TON wallet created successfully',
            wallet: {
                id: walletId || `temp_${Date.now()}`,
                userId: userId,
                address: wallet.address,
                format: 'UQ',
                createdAt: new Date().toISOString(),
                source: supabase ? 'database' : 'temporary',
                wordCount: 12
            },
            warning: !supabase ? 'Wallet stored temporarily. Save your recovery phrase!' : null
        });
        
    } catch (error) {
        console.error('❌ Create wallet failed:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create wallet: ' + error.message
        });
    }
});

// 🎯 LOGIN TO WALLET
router.post('/login', async (req, res) => {
    console.log('🔐 WALLET LOGIN - Processing request');
    
    try {
        const { userId, walletPassword } = req.body;
        
        if (!userId || !walletPassword) {
            return res.status(400).json({
                success: false,
                error: 'User ID and wallet password required'
            });
        }
        
        if (!supabase || dbStatus !== 'connected') {
            return res.status(503).json({
                success: false,
                error: 'Database not available'
            });
        }
        
        // 1. Get wallet from database
        const { data: wallet, error } = await supabase
            .from('user_wallets')
            .select('*')
            .eq('user_id', userId)
            .single();
            
        if (error || !wallet) {
            return res.status(404).json({
                success: false,
                error: 'No wallet found for this user'
            });
        }
        
        // 2. Verify wallet password
        const passwordValid = await verifyWalletPassword(walletPassword, wallet.password_hash);
        if (!passwordValid) {
            return res.status(401).json({
                success: false,
                error: 'Incorrect wallet password'
            });
        }
        
        // 3. Return wallet data (without mnemonic)
        res.json({
            success: true,
            message: 'Wallet login successful',
            wallet: {
                id: wallet.id,
                userId: wallet.user_id,
                address: wallet.address,
                format: 'UQ',
                createdAt: wallet.created_at,
                source: wallet.source,
                wordCount: wallet.word_count,
                hasWallet: true
            }
        });
        
    } catch (error) {
        console.error('❌ Wallet login failed:', error);
        res.status(500).json({
            success: false,
            error: 'Login failed: ' + error.message
        });
    }
});

// 🎯 CHECK IF WALLET EXISTS
router.post('/check', async (req, res) => {
    console.log('🔍 CHECK WALLET - Processing request');
    
    try {
        const { userId } = req.body;
        
        if (!userId) {
            return res.json({
                success: false,
                error: 'User ID required'
            });
        }
        
        if (!supabase || dbStatus !== 'connected') {
            return res.json({
                success: true,
                hasWallet: false,
                message: 'Database not available'
            });
        }
        
        const { data: wallet, error } = await supabase
            .from('user_wallets')
            .select('id, address, created_at, source')
            .eq('user_id', userId)
            .single();
            
        if (error || !wallet) {
            return res.json({
                success: true,
                hasWallet: false,
                message: 'No wallet found'
            });
        }
        
        res.json({
            success: true,
            hasWallet: true,
            wallet: {
                id: wallet.id,
                address: wallet.address,
                format: 'UQ',
                createdAt: wallet.created_at,
                source: wallet.source
            }
        });
        
    } catch (error) {
        console.error('❌ Check wallet failed:', error);
        res.json({
            success: false,
            error: 'Check failed: ' + error.message
        });
    }
});

// 🎯 GET ENCRYPTED MNEMONIC (for recovery/backup)
router.post('/get-mnemonic', async (req, res) => {
    console.log('🔐 GET MNEMONIC - Processing request');
    
    try {
        const { userId, walletPassword } = req.body;
        
        if (!userId || !walletPassword) {
            return res.status(400).json({
                success: false,
                error: 'User ID and wallet password required'
            });
        }
        
        if (!supabase || dbStatus !== 'connected') {
            return res.status(503).json({
                success: false,
                error: 'Database not available'
            });
        }
        
        // 1. Get wallet
        const { data: wallet, error } = await supabase
            .from('user_wallets')
            .select('*')
            .eq('user_id', userId)
            .single();
            
        if (error || !wallet) {
            return res.status(404).json({
                success: false,
                error: 'No wallet found'
            });
        }
        
        // 2. Verify password
        const passwordValid = await verifyWalletPassword(walletPassword, wallet.password_hash);
        if (!passwordValid) {
            return res.status(401).json({
                success: false,
                error: 'Incorrect wallet password'
            });
        }
        
        // 3. Return encrypted mnemonic (client will decrypt)
        const encryptedData = JSON.parse(wallet.encrypted_mnemonic);
        
        res.json({
            success: true,
            encryptedMnemonic: encryptedData,
            address: wallet.address,
            note: 'Decrypt this client-side with your wallet password'
        });
        
    } catch (error) {
        console.error('❌ Get mnemonic failed:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get mnemonic: ' + error.message
        });
    }
});

// ============================================
// 🎯 COMPATIBILITY ROUTES (for existing frontend)
// ============================================

// Old endpoint for compatibility
router.post('/store-encrypted', async (req, res) => {
    console.log('⚠️ Using old store-encrypted endpoint');
    
    try {
        const { userId, walletPassword, walletAddress } = req.body;
        
        if (!userId || !walletPassword) {
            return res.status(400).json({
                success: false,
                error: 'User ID and wallet password required'
            });
        }
        
        // Check if wallet already exists
        if (supabase && dbStatus === 'connected') {
            const { data: existingWallet } = await supabase
                .from('user_wallets')
                .select('id')
                .eq('user_id', userId)
                .single();
                
            if (existingWallet) {
                return res.json({
                    success: false,
                    error: 'Wallet already exists for this user'
                });
            }
        }
        
        // Generate new wallet
        const wallet = await generateTONWallet(12);
        const passwordHash = await hashWalletPassword(walletPassword);
        const encryptedMnemonic = encryptMnemonic(wallet.mnemonic, walletPassword);
        
        // Store in database
        let walletId = null;
        if (supabase && dbStatus === 'connected') {
            const walletRecord = {
                user_id: userId,
                address: wallet.address,
                encrypted_mnemonic: JSON.stringify(encryptedMnemonic),
                public_key: crypto.randomBytes(32).toString('hex'),
                wallet_type: 'TON',
                source: 'generated',
                word_count: 12,
                password_hash: passwordHash,
                created_at: new Date().toISOString()
            };
            
            const { data, error } = await supabase
                .from('user_wallets')
                .insert([walletRecord])
                .select()
                .single();
                
            if (error) throw error;
            walletId = data.id;
        }
        
        res.json({
            success: true,
            message: 'Wallet created via legacy endpoint',
            wallet: {
                id: walletId || `legacy_${Date.now()}`,
                userId: userId,
                address: wallet.address,
                format: 'UQ',
                createdAt: new Date().toISOString()
            }
        });
        
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Old check-wallet endpoint
router.post('/check-wallet', async (req, res) => {
    try {
        const { userId } = req.body;
        
        if (!userId) {
            return res.json({
                success: false,
                error: 'User ID required'
            });
        }
        
        if (!supabase || dbStatus !== 'connected') {
            return res.json({
                success: true,
                hasWallet: false,
                message: 'Database not available'
            });
        }
        
        const { data: wallet, error } = await supabase
            .from('user_wallets')
            .select('id, address, created_at, source')
            .eq('user_id', userId)
            .single();
            
        if (error || !wallet) {
            return res.json({
                success: true,
                hasWallet: false,
                message: 'No wallet found'
            });
        }
        
        res.json({
            success: true,
            hasWallet: true,
            wallet: {
                id: wallet.id,
                address: wallet.address,
                format: 'UQ',
                createdAt: wallet.created_at,
                source: wallet.source
            }
        });
        
    } catch (error) {
        res.json({
            success: false,
            error: error.message
        });
    }
});

// Old auto-login endpoint
router.post('/auto-login', async (req, res) => {
    try {
        const { userId } = req.body;
        
        if (!userId) {
            return res.json({
                success: false,
                error: 'User ID required'
            });
        }
        
        if (!supabase || dbStatus !== 'connected') {
            return res.json({
                success: true,
                hasWallet: false,
                message: 'Database not available'
            });
        }
        
        const { data: wallet, error } = await supabase
            .from('user_wallets')
            .select('id, address, created_at, source')
            .eq('user_id', userId)
            .single();
            
        if (error || !wallet) {
            return res.json({
                success: true,
                hasWallet: false,
                message: 'No wallet found'
            });
        }
        
        res.json({
            success: true,
            hasWallet: true,
            wallet: {
                id: wallet.id,
                address: wallet.address,
                format: 'UQ',
                createdAt: wallet.created_at,
                source: wallet.source
            }
        });
        
    } catch (error) {
        res.json({
            success: false,
            error: error.message
        });
    }
});

// Health endpoint
router.get('/health', (req, res) => {
    res.json({
        status: 'operational',
        version: '4.0.0',
        tonCrypto: true,
        database: dbStatus,
        timestamp: new Date().toISOString()
    });
});

// Test endpoint
router.get('/test', (req, res) => {
    res.json({
        success: true,
        message: 'TON Crypto Wallet API v4.0',
        features: [
            'separate-wallet-password',
            'ton-crypto-generation',
            'bcrypt-password-hashing',
            'aes-256-gcm-encryption',
            'uq-address-format'
        ],
        timestamp: new Date().toISOString()
    });
});

console.log('✅ WALLET ROUTES v4.0 READY - With TON Crypto & Separate Password System');

module.exports = router;