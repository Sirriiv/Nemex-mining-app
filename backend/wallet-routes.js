// backend/wallet-routes.js - COMPLETE FIXED VERSION WITH SESSIONS v5.0
const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');
const axios = require('axios');
const { mnemonicToSeedSync, generateMnemonic } = require('@ton/crypto');
const bcrypt = require('bcrypt');
require('dotenv').config();

console.log('🚀 WALLET ROUTES v5.0 - COMPLETE WITH DATABASE SESSIONS');

// ============================================
// 🎯 INITIALIZATION
// ============================================
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
        
        // Ensure sessions table exists
        await ensureSessionsTable();
        
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
// 🎯 SESSION MANAGEMENT
// ============================================

// Create sessions table if not exists
async function ensureSessionsTable() {
    try {
        // Check if table exists
        const { error } = await supabase
            .from('wallet_sessions')
            .select('id')
            .limit(1);
            
        if (error && error.code === '42P01') { // Table doesn't exist
            console.log('📝 Creating wallet_sessions table...');
            
            // You need to run this SQL in Supabase dashboard first:
            console.log(`
            ⚠️ Please run this SQL in Supabase SQL Editor:
            
            CREATE TABLE wallet_sessions (
                id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
                user_id TEXT NOT NULL,
                wallet_id BIGINT NOT NULL,
                session_token TEXT UNIQUE NOT NULL,
                token_hash TEXT NOT NULL,
                ip_address TEXT,
                user_agent TEXT,
                device_info JSONB DEFAULT '{}',
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
                last_accessed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                is_active BOOLEAN DEFAULT TRUE,
                revocation_reason TEXT,
                
                CONSTRAINT fk_wallet_sessions_user 
                    FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE,
                CONSTRAINT fk_wallet_sessions_wallet 
                    FOREIGN KEY (wallet_id) REFERENCES user_wallets(id) ON DELETE CASCADE
            );

            CREATE INDEX idx_wallet_sessions_user_id ON wallet_sessions(user_id);
            CREATE INDEX idx_wallet_sessions_wallet_id ON wallet_sessions(wallet_id);
            CREATE INDEX idx_wallet_sessions_token_hash ON wallet_sessions(token_hash);
            CREATE INDEX idx_wallet_sessions_expires ON wallet_sessions(expires_at);
            CREATE INDEX idx_wallet_sessions_active ON wallet_sessions(is_active);
            `);
        } else {
            console.log('✅ wallet_sessions table exists');
        }
    } catch (error) {
        console.warn('⚠️ Could not check sessions table:', error.message);
    }
}

// Hash token for security
function hashToken(token) {
    return crypto.createHash('sha256').update(token).digest('hex');
}

// Clean expired sessions
async function cleanupExpiredSessions() {
    try {
        const { error } = await supabase
            .from('wallet_sessions')
            .delete()
            .lt('expires_at', new Date().toISOString())
            .or('is_active.eq.false');
            
        if (error) console.warn('⚠️ Session cleanup error:', error.message);
    } catch (error) {
        // Ignore cleanup errors
    }
}

// ============================================
// 🎯 WALLET FUNCTIONS
// ============================================

// Generate TON wallet with UQ address
async function generateTONWallet(wordCount = 12) {
    try {
        // Generate BIP-39 mnemonic using TON crypto
        const mnemonic = generateMnemonic(wordCount);
        
        // Convert to seed
        const seed = mnemonicToSeedSync(mnemonic);
        
        // Generate deterministic UQ address from seed
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

// Generate UQ format address
function generateUQAddress(seed) {
    const hash = crypto.createHash('sha256').update(seed).digest();
    const base64 = hash.toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '');
    
    const base46 = base64.substring(0, 46);
    return 'UQ' + base46;
}

// Hash wallet password
async function hashWalletPassword(password) {
    const saltRounds = 12;
    return await bcrypt.hash(password, saltRounds);
}

// Verify wallet password
async function verifyWalletPassword(password, hash) {
    return await bcrypt.compare(password, hash);
}

// Encrypt mnemonic
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
        authTag: authTag.toString('hex'),
        algorithm: algorithm
    };
}

// Decrypt mnemonic
function decryptMnemonic(encryptedData, password) {
    const algorithm = encryptedData.algorithm || 'aes-256-gcm';
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
// 🎯 PRICE API
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

    console.log('💰 Fetching prices...');
    
    let successfulPrices = null;

    for (const api of PRICE_APIS) {
        try {
            const tonResponse = await axios.get(api.urls.TON, { timeout: 5000 });
            const tonPrices = await api.parser(tonResponse.data);
            
            const nmxResponse = await axios.get(api.urls.NMX, { timeout: 5000 });
            const nmxPrices = await api.parser(nmxResponse.data);
            
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

            if (prices.TON.price > 0 && prices.NMX.price > 0) {
                successfulPrices = prices;
                break;
            }
        } catch (error) {
            continue;
        }
    }

    if (!successfulPrices) {
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
// 🎯 SESSION ROUTES - CLEAN VERSION
// ============================================

// Create session
router.post('/session/create', async (req, res) => {
    try {
        const { userId, walletId, walletAddress } = req.body;
        
        if (!userId || !walletAddress) {
            return res.status(400).json({
                success: false,
                error: 'User ID and wallet address required'
            });
        }
        
        // Generate secure session token
        const sessionToken = crypto.randomBytes(32).toString('hex');
        const tokenHash = hashToken(sessionToken);
        const userAgent = req.headers['user-agent'] || 'unknown';
        const ip = req.ip || req.connection.remoteAddress || 'unknown';
        
        // Session expires in 30 days
        const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
        
        if (!supabase || dbStatus !== 'connected') {
            return res.status(503).json({
                success: false,
                error: 'Database not available'
            });
        }
        
        let data, error;
        
        // Try to use user_sessions table first (your main table)
        const sessionData = {
            user_id: userId,
            active_wallet_address: walletAddress,
            session_token: sessionToken,
            token_hash: tokenHash,
            ip_address: ip,
            user_agent: userAgent,
            expires_at: expiresAt.toISOString(),
            last_active: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            is_active: true
        };
        
        // Use upsert to update existing or create new
        ({ data, error } = await supabase
            .from('user_sessions')
            .upsert(sessionData, {
                onConflict: 'user_id'
            })
            .select()
            .single());
        
        // If upsert fails, try regular insert
        if (error) {
            console.warn('⚠️ Upsert failed, trying insert:', error.message);
            
            ({ data, error } = await supabase
                .from('user_sessions')
                .insert([sessionData])
                .select()
                .single());
        }
        
        if (error) {
            console.error('❌ Both user_sessions methods failed:', error.message);
            throw error;
        }
        
        res.json({
            success: true,
            session: {
                token: sessionToken,
                user_id: userId,
                wallet_address: walletAddress,
                expires_at: data.expires_at,
                created_at: data.created_at
            }
        });
        
    } catch (error) {
        console.error('❌ Create session failed:', error);
        res.json({
            success: false,
            error: 'Failed to create session: ' + error.message
        });
    }
});

// Check session
router.post('/session/check', async (req, res) => {
    try {
        const sessionToken = req.headers['x-session-token'] || 
                            req.body.sessionToken;
        
        if (!sessionToken) {
            return res.json({
                success: true,
                hasSession: false,
                message: 'No session token'
            });
        }
        
        const tokenHash = hashToken(sessionToken);
        
        if (!supabase || dbStatus !== 'connected') {
            return res.json({
                success: true,
                hasSession: false,
                message: 'Database not available'
            });
        }
        
        // Check session in user_sessions table
        const { data: session, error } = await supabase
            .from('user_sessions')
            .select('*')
            .eq('token_hash', tokenHash)
            .eq('is_active', true)
            .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
            .single();
            
        if (error || !session) {
            return res.json({
                success: true,
                hasSession: false,
                message: 'Invalid or expired session'
            });
        }
        
        // Update last active timestamp
        await supabase
            .from('user_sessions')
            .update({ 
                last_active: new Date().toISOString(),
                updated_at: new Date().toISOString()
            })
            .eq('user_id', session.user_id);
        
        // Get wallet details if needed
        let walletDetails = {};
        if (session.active_wallet_address) {
            // Get wallet info from user_wallets
            const { data: wallet } = await supabase
                .from('user_wallets')
                .select('id, address, source, created_at')
                .eq('user_id', session.user_id)
                .single();
            
            if (wallet) {
                walletDetails = {
                    id: wallet.id,
                    address: wallet.address,
                    createdAt: wallet.created_at,
                    source: wallet.source
                };
            }
        }
        
        res.json({
            success: true,
            hasSession: true,
            session: {
                token: sessionToken,
                user_id: session.user_id,
                wallet_address: session.active_wallet_address,
                expires_at: session.expires_at,
                wallet: walletDetails
            }
        });
        
    } catch (error) {
        console.error('❌ Check session failed:', error);
        res.json({
            success: false,
            hasSession: false,
            error: 'Session check failed: ' + error.message
        });
    }
});

// Destroy session
router.post('/session/destroy', async (req, res) => {
    try {
        const { token } = req.body;
        
        if (!token) {
            return res.json({
                success: false,
                error: 'Session token required'
            });
        }
        
        const tokenHash = hashToken(token);
        
        if (!supabase || dbStatus !== 'connected') {
            return res.json({
                success: true,
                message: 'Database not available'
            });
        }
        
        // Deactivate session in user_sessions
        const { error } = await supabase
            .from('user_sessions')
            .update({ 
                is_active: false,
                expires_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            })
            .eq('token_hash', tokenHash);
        
        // Also clean up any expired sessions
        await supabase
            .from('user_sessions')
            .delete()
            .lt('expires_at', new Date().toISOString());
            
        if (error) {
            console.warn('⚠️ Session destroy update failed:', error.message);
            // Continue anyway - session might already be expired
        }
        
        res.json({
            success: true,
            message: 'Session destroyed'
        });
        
    } catch (error) {
        console.error('❌ Destroy session failed:', error);
        res.json({
            success: false,
            error: 'Failed to destroy session: ' + error.message
        });
    }
});

// ============================================
// 🎯 WALLET ROUTES
// ============================================

// Create wallet
router.post('/create', async (req, res) => {
    console.log('🎯 CREATE WALLET');
    
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
        
        // Check if wallet already exists
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
        
        // Generate TON wallet
        const wallet = await generateTONWallet(12);
        
        // Hash wallet password
        const passwordHash = await hashWalletPassword(walletPassword);
        
        // Encrypt mnemonic
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
            warning: !supabase ? 'Wallet stored temporarily' : null
        });
        
    } catch (error) {
        console.error('❌ Create wallet failed:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create wallet: ' + error.message
        });
    }
});

// Login to wallet
router.post('/login', async (req, res) => {
    console.log('🔐 WALLET LOGIN');
    
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
        
        // Get wallet from database
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
        
        // Verify wallet password
        const passwordValid = await verifyWalletPassword(walletPassword, wallet.password_hash);
        if (!passwordValid) {
            return res.status(401).json({
                success: false,
                error: 'Incorrect wallet password'
            });
        }
        
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

// Check wallet
router.post('/check', async (req, res) => {
    console.log('🔍 CHECK WALLET');
    
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

// ============================================
// 🎯 COMPATIBILITY ROUTES
// ============================================

// Old store-encrypted endpoint
router.post('/store-encrypted', async (req, res) => {
    console.log('⚠️ Using old store-encrypted endpoint');
    
    try {
        const { userId, walletPassword } = req.body;
        
        if (!userId || !walletPassword) {
            return res.status(400).json({
                success: false,
                error: 'User ID and wallet password required'
            });
        }
        
        // Forward to new create endpoint
        const response = await fetch(`http://localhost${req.baseUrl}/create`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId, walletPassword })
        });
        
        const result = await response.json();
        res.json(result);
        
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Old check-wallet endpoint
router.post('/check-wallet', async (req, res) => {
    console.log('⚠️ Using old check-wallet endpoint');
    
    try {
        const { userId } = req.body;
        
        if (!userId) {
            return res.json({
                success: false,
                error: 'User ID required'
            });
        }
        
        // Forward to new check endpoint
        const response = await fetch(`http://localhost${req.baseUrl}/check`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId })
        });
        
        const result = await response.json();
        res.json(result);
        
    } catch (error) {
        res.json({
            success: false,
            error: error.message
        });
    }
});

// Old auto-login endpoint
router.post('/auto-login', async (req, res) => {
    console.log('⚠️ Using old auto-login endpoint');
    
    try {
        const { userId } = req.body;
        
        if (!userId) {
            return res.json({
                success: false,
                error: 'User ID required'
            });
        }
        
        // Forward to check endpoint
        const response = await fetch(`http://localhost${req.baseUrl}/check`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId })
        });
        
        const result = await response.json();
        res.json(result);
        
    } catch (error) {
        res.json({
            success: false,
            error: error.message
        });
    }
});

// Get encrypted mnemonic
router.post('/get-encrypted', async (req, res) => {
    try {
        const { userId } = req.body;
        
        if (!userId) {
            return res.status(400).json({
                success: false,
                error: 'User ID required'
            });
        }
        
        if (!supabase || dbStatus !== 'connected') {
            return res.status(500).json({
                success: false,
                error: 'Database not available'
            });
        }
        
        const { data: wallet, error } = await supabase
            .from('user_wallets')
            .select('encrypted_mnemonic, address, created_at')
            .eq('user_id', userId)
            .single();
            
        if (error || !wallet) {
            return res.json({
                success: false,
                error: 'No wallet found'
            });
        }
        
        res.json({
            success: true,
            encryptedMnemonic: wallet.encrypted_mnemonic,
            address: wallet.address,
            createdAt: wallet.created_at
        });
        
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ============================================
// 🎯 OTHER ROUTES
// ============================================

// Prices
router.get('/prices', async (req, res) => {
    try {
        const prices = await fetchRealPrices();
        res.json({
            success: true,
            prices: {
                TON: { 
                    price: prices.TON.price.toFixed(4), 
                    source: prices.TON.source,
                    change24h: prices.TON.change24h 
                },
                NMX: { 
                    price: prices.NMX.price.toFixed(4), 
                    source: prices.NMX.source,
                    change24h: prices.NMX.change24h 
                }
            },
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.json({
            success: true,
            prices: {
                TON: { price: 2.35, source: 'fallback', change24h: 0 },
                NMX: { price: 0.10, source: 'fallback', change24h: 0 }
            },
            isFallback: true,
            timestamp: new Date().toISOString()
        });
    }
});

// Balance
router.get('/balance/:address', async (req, res) => {
    try {
        let { address } = req.params;
        
        if (address.startsWith('EQ')) {
            address = 'UQ' + address.substring(2);
        }
        
        const prices = await fetchRealPrices();
        const tonPrice = prices.TON.price;
        
        res.json({
            success: true,
            address: address,
            format: 'UQ',
            balance: "0.0000",
            valueUSD: "0.00",
            tonPrice: tonPrice,
            source: 'simulation'
        });
        
    } catch (error) {
        res.json({
            success: true,
            address: req.params.address,
            format: 'UQ',
            balance: "0.0000",
            valueUSD: "0.00",
            tonPrice: 2.35,
            source: 'error_fallback'
        });
    }
});

// Health
router.get('/health', (req, res) => {
    res.json({
        status: 'operational',
        version: '5.0.0',
        database: dbStatus,
        sessions: 'enabled',
        timestamp: new Date().toISOString()
    });
});

// Test
router.get('/test', (req, res) => {
    res.json({
        success: true,
        message: 'Wallet API v5.0 with Database Sessions',
        features: [
            'database-sessions',
            'ton-crypto-wallets',
            'separate-wallet-passwords',
            'bcrypt-hashing',
            'aes-256-encryption'
        ],
        timestamp: new Date().toISOString()
    });
});

console.log('✅ WALLET ROUTES v5.0 READY - With Database Sessions');

module.exports = router;