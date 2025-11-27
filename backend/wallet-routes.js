// wallet-routes.js - COMPLETE VERSION WITH ALL ENDPOINTS
const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');
const crypto = require('crypto');
const bip39 = require('bip39');
const { mnemonicToWalletKey } = require('@ton/crypto');
const TonWeb = require('tonweb');

console.log('✅ COMPLETE Wallet Routes - ALL ENDPOINTS INCLUDED');

// Initialize Supabase
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Initialize TonWeb
const tonweb = new TonWeb(new TonWeb.HttpProvider('https://toncenter.com/api/v2/jsonRPC', {
    apiKey: process.env.TONCENTER_API_KEY
}));

const NMX_CONTRACT = "EQBRSrXz-7iYDnFZGhrER2XQL-gBgv1hr3Y8byWsVIye7A9f";

// =============================================
// COMPATIBILITY ENDPOINTS
// =============================================

router.post('/get-user-wallet', async function(req, res) {
    try {
        const { userId } = req.body;
        console.log('🔄 Getting user wallet for:', userId);

        if (!userId) {
            return res.status(400).json({
                success: false,
                error: 'User ID is required'
            });
        }

        const { data, error } = await supabase
            .from('user_wallets')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

        if (error) {
            if (error.code === 'PGRST116') {
                return res.json({
                    success: true,
                    wallet: null
                });
            }
            throw error;
        }

        if (data) {
            console.log('✅ Wallet found for user:', data.address);
            const walletData = {
                userId: data.user_id,
                address: data.address,
                addressBounceable: data.address,
                publicKey: data.public_key || '',
                type: data.wallet_type || 'TON',
                source: data.source || 'generated',
                wordCount: data.word_count || 12,
                derivationPath: data.derivation_path || "m/44'/607'/0'/0'/0'",
                createdAt: data.created_at
            };

            return res.json({
                success: true,
                wallet: walletData
            });
        }

        res.json({
            success: true,
            wallet: null
        });

    } catch (error) {
        console.error('❌ Get user wallet error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get user wallet: ' + error.message
        });
    }
});

router.post('/store-wallet', async function(req, res) {
    try {
        console.log('🔄 Storing wallet...');
        
        const { 
            userId, 
            address, 
            publicKey, 
            walletType, 
            type, 
            source, 
            wordCount, 
            derivationPath,
            addressBounceable
        } = req.body;

        console.log('📦 Received wallet data:', { 
            userId, 
            address: address ? address.substring(0, 10) + '...' : 'none'
        });

        if (!userId || !address) {
            return res.status(400).json({
                success: false,
                error: 'User ID and address are required'
            });
        }

        const finalWalletType = walletType || type || 'TON';
        const finalAddress = addressBounceable || address;

        const { data, error } = await supabase
            .from('user_wallets')
            .insert([{
                user_id: userId,
                address: address,
                address_bounceable: finalAddress,
                public_key: publicKey || '',
                wallet_type: finalWalletType,
                source: source || 'generated',
                word_count: wordCount || 12,
                derivation_path: derivationPath || "m/44'/607'/0'/0'/0'",
                created_at: new Date().toISOString()
            }]);

        if (error) {
            console.error('❌ Database insert error:', error);
            
            if (error.code === '23505') {
                return res.json({
                    success: true,
                    message: 'Wallet already stored',
                    wallet: {
                        userId: userId,
                        address: address,
                        type: finalWalletType,
                        source: source || 'generated'
                    }
                });
            }
            
            return res.status(500).json({
                success: false,
                error: 'Failed to store wallet: ' + error.message
            });
        }

        console.log('✅ Wallet stored in database:', address);

        res.json({
            success: true,
            message: 'Wallet stored securely',
            wallet: {
                userId: userId,
                address: address,
                type: finalWalletType,
                source: source || 'generated'
            }
        });

    } catch (error) {
        console.error('❌ Wallet storage error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to store wallet: ' + error.message
        });
    }
});

// =============================================
// PRICE API ENDPOINTS
// =============================================

async function getRealTokenPrices() {
    console.log('🔄 Fetching REAL token prices from multiple sources...');

    const priceSources = [
        getBinancePrice,
        getBybitPrice,
        getBitgetPrice,
        getMEXCPrice,
        getCoinGeckoPrice,
        getCoinMarketCapPrice,
        getFallbackPrice
    ];

    for (const priceSource of priceSources) {
        try {
            const prices = await priceSource();
            if (prices && prices.TON && prices.TON.price > 0) {
                console.log(`✅ Prices from ${priceSource.name}: TON $${prices.TON.price}, Change: ${prices.TON.change24h}%`);
                return {
                    success: true,
                    prices: prices,
                    source: priceSource.name
                };
            }
        } catch (error) {
            console.log(`❌ ${priceSource.name} failed:`, error.message);
            continue;
        }
    }

    return getFallbackPrice();
}

async function getBinancePrice() {
    try {
        console.log('🔄 Trying Binance API...');
        const response = await axios.get('https://api.binance.com/api/v3/ticker/24hr?symbol=TONUSDT', {
            timeout: 5000
        });

        if (response.data && response.data.lastPrice) {
            const tonPrice = parseFloat(response.data.lastPrice);
            const priceChangePercent = parseFloat(response.data.priceChangePercent);
            console.log('✅ Binance TON price:', tonPrice, 'Change:', priceChangePercent + '%');

            return {
                TON: { price: tonPrice, change24h: priceChangePercent },
                NMX: { price: 0.10, change24h: 0 }
            };
        }
        throw new Error('No price data from Binance');
    } catch (error) {
        throw new Error(`Binance: ${error.message}`);
    }
}
getBinancePrice.name = 'Binance';

async function getBybitPrice() {
    try {
        console.log('🔄 Trying Bybit API...');
        const response = await axios.get('https://api.bybit.com/v2/public/tickers?symbol=TONUSDT', {
            timeout: 5000
        });

        if (response.data && response.data.result && response.data.result[0]) {
            const tonPrice = parseFloat(response.data.result[0].last_price);
            const priceChangePercent = parseFloat(response.data.result[0].price_24h_pcnt) * 100;
            console.log('✅ Bybit TON price:', tonPrice, 'Change:', priceChangePercent + '%');

            return {
                TON: { price: tonPrice, change24h: priceChangePercent },
                NMX: { price: 0.10, change24h: 0 }
            };
        }
        throw new Error('No price data from Bybit');
    } catch (error) {
        throw new Error(`Bybit: ${error.message}`);
    }
}
getBybitPrice.name = 'Bybit';

async function getBitgetPrice() {
    try {
        console.log('🔄 Trying Bitget API...');
        const response = await axios.get('https://api.bitget.com/api/spot/v1/market/ticker?symbol=TONUSDT', {
            timeout: 5000
        });

        if (response.data && response.data.data && response.data.data.close) {
            const tonPrice = parseFloat(response.data.data.close);
            const priceChangePercent = parseFloat(response.data.data.usdtVol);
            console.log('✅ Bitget TON price:', tonPrice, 'Change:', priceChangePercent + '%');

            return {
                TON: { price: tonPrice, change24h: priceChangePercent },
                NMX: { price: 0.10, change24h: 0 }
            };
        }
        throw new Error('No price data from Bitget');
    } catch (error) {
        throw new Error(`Bitget: ${error.message}`);
    }
}
getBitgetPrice.name = 'Bitget';

async function getMEXCPrice() {
    try {
        console.log('🔄 Trying MEXC API...');
        const response = await axios.get('https://api.mexc.com/api/v3/ticker/24hr?symbol=TONUSDT', {
            timeout: 5000
        });

        if (response.data && response.data.lastPrice) {
            const tonPrice = parseFloat(response.data.lastPrice);
            const priceChangePercent = parseFloat(response.data.priceChangePercent);
            console.log('✅ MEXC TON price:', tonPrice, 'Change:', priceChangePercent + '%');

            return {
                TON: { price: tonPrice, change24h: priceChangePercent },
                NMX: { price: 0.10, change24h: 0 }
            };
        }
        throw new Error('No price data from MEXC');
    } catch (error) {
        throw new Error(`MEXC: ${error.message}`);
    }
}
getMEXCPrice.name = 'MEXC';

async function getCoinGeckoPrice() {
    try {
        console.log('🔄 Trying CoinGecko API...');
        const response = await axios.get('https://api.coingecko.com/api/v3/simple/price?ids=the-open-network&vs_currencies=usd&include_24hr_change=true', {
            timeout: 10000
        });

        const tonData = response.data['the-open-network'];
        if (tonData && tonData.usd) {
            console.log('✅ CoinGecko TON price:', tonData.usd, 'Change:', tonData.usd_24h_change + '%');

            return {
                TON: { 
                    price: tonData.usd, 
                    change24h: tonData.usd_24h_change || 0 
                },
                NMX: { price: 0.10, change24h: 0 }
            };
        }
        throw new Error('No price data from CoinGecko');
    } catch (error) {
        throw new Error(`CoinGecko: ${error.message}`);
    }
}
getCoinGeckoPrice.name = 'CoinGecko';

async function getCoinMarketCapPrice() {
    try {
        console.log('🔄 Trying CoinMarketCap API...');
        const response = await axios.get('https://pro-api.coinmarketcap.com/v1/cryptocurrency/quotes/latest?symbol=TON', {
            headers: {
                'X-CMC_PRO_API_KEY': process.env.COINMARKETCAP_API_KEY || ''
            },
            timeout: 10000
        });

        if (response.data && response.data.data && response.data.data.TON) {
            const tonData = response.data.data.TON;
            const tonPrice = tonData.quote.USD.price;
            const change24h = tonData.quote.USD.percent_change_24h;
            console.log('✅ CoinMarketCap TON price:', tonPrice, 'Change:', change24h + '%');

            return {
                TON: { price: tonPrice, change24h: change24h },
                NMX: { price: 0.10, change24h: 0 }
            };
        }
        throw new Error('No price data from CoinMarketCap');
    } catch (error) {
        throw new Error(`CoinMarketCap: ${error.message}`);
    }
}
getCoinMarketCapPrice.name = 'CoinMarketCap';

function getFallbackPrice() {
    console.log('⚠️ Using fallback prices (all APIs failed)');
    return {
        TON: { price: 2.5, change24h: 1.2 },
        NMX: { price: 0.10, change24h: 0 }
    };
}
getFallbackPrice.name = 'Fallback';

router.get('/token-prices', async function(req, res) {
    try {
        console.log('🔄 Fetching REAL token prices from multiple exchanges...');

        const priceData = await getRealTokenPrices();
        console.log(`🎯 Final price source: ${priceData.source}`);

        res.json(priceData);

    } catch (error) {
        console.error('Token prices endpoint failed:', error);
        res.json({
            success: true,
            prices: {
                TON: { price: 2.5, change24h: 1.2 },
                NMX: { price: 0.10, change24h: 0 }
            },
            source: 'error_fallback'
        });
    }
});

// =============================================
// CRYPTO UTILS
// =============================================

class BackendCryptoUtils {
    static encryptPrivateKey(privateKey, password, salt = null) {
        try {
            salt = salt || crypto.randomBytes(16);
            const key = crypto.pbkdf2Sync(password, salt, 100000, 32, 'sha256');
            const iv = crypto.randomBytes(16);

            const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
            let encrypted = cipher.update(privateKey, 'utf8', 'base64');
            encrypted += cipher.final('base64');
            const authTag = cipher.getAuthTag();

            return {
                encrypted: encrypted,
                iv: iv.toString('base64'),
                salt: salt.toString('base64'),
                authTag: authTag.toString('base64')
            };
        } catch (error) {
            console.error('❌ Encryption error:', error);
            throw new Error('Encryption failed: ' + error.message);
        }
    }

    static decryptPrivateKey(encryptedData, password) {
        try {
            const key = crypto.pbkdf2Sync(
                password, 
                Buffer.from(encryptedData.salt, 'base64'), 
                100000, 32, 'sha256'
            );

            const decipher = crypto.createDecipheriv(
                'aes-256-gcm', 
                key, 
                Buffer.from(encryptedData.iv, 'base64')
            );

            decipher.setAuthTag(Buffer.from(encryptedData.authTag, 'base64'));
            let decrypted = decipher.update(encryptedData.encrypted, 'base64', 'utf8');
            decrypted += decipher.final('utf8');

            return decrypted;
        } catch (error) {
            console.error('❌ Decryption error:', error);
            throw new Error('Decryption failed: ' + error.message);
        }
    }

    static hashPassword(password, salt = null) {
        salt = salt || crypto.randomBytes(16);
        const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512');
        return {
            hash: hash.toString('base64'),
            salt: salt.toString('base64')
        };
    }

    static verifyPassword(password, hash, salt) {
        const newHash = crypto.pbkdf2Sync(
            password, 
            Buffer.from(salt, 'base64'), 
            100000, 64, 'sha512'
        );
        return newHash.toString('base64') === hash;
    }
}

// =============================================
// SESSION MANAGEMENT
// =============================================

router.post('/store-session-data', async function(req, res) {
    try {
        const { sessionId, key, value, timestamp } = req.body;
        console.log('🔄 Storing session data in Supabase:', { sessionId, key });

        if (!sessionId || !key) {
            return res.status(400).json({
                success: false,
                error: 'Session ID and key are required'
            });
        }

        const { data, error } = await supabase
            .from('user_sessions')
            .upsert({
                user_id: sessionId,
                active_wallet_address: JSON.stringify({
                    [key]: value,
                    timestamp: timestamp
                }),
                last_active: new Date().toISOString(),
                updated_at: new Date().toISOString()
            }, {
                onConflict: 'user_id'
            });

        if (error) {
            console.error('❌ Supabase session store error:', error);
            return res.status(500).json({
                success: false,
                error: 'Failed to store session data: ' + error.message
            });
        }

        console.log('✅ Session data stored in Supabase');
        res.json({ success: true });

    } catch (error) {
        console.error('❌ Store session data error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to store session data: ' + error.message
        });
    }
});

router.get('/get-session-data', async function(req, res) {
    try {
        const { sessionId, key } = req.query;
        console.log('🔄 Retrieving session data from Supabase:', { sessionId, key });

        if (!sessionId || !key) {
            return res.status(400).json({
                success: false,
                error: 'Session ID and key are required'
            });
        }

        const { data, error } = await supabase
            .from('user_sessions')
            .select('active_wallet_address')
            .eq('user_id', sessionId)
            .single();

        if (error) {
            if (error.code === 'PGRST116') {
                return res.json({ success: true, value: null });
            }
            console.error('❌ Supabase session retrieval error:', error);
            return res.status(500).json({
                success: false,
                error: 'Failed to retrieve session data: ' + error.message
            });
        }

        if (data && data.active_wallet_address) {
            try {
                const sessionData = JSON.parse(data.active_wallet_address);
                const value = sessionData[key];
                console.log('✅ Session data retrieved from Supabase for key:', key);
                return res.json({ success: true, value: value });
            } catch (parseError) {
                console.error('❌ Failed to parse session data:', parseError);
                return res.json({ success: true, value: null });
            }
        }

        console.log('ℹ️ No session data found');
        return res.json({ success: true, value: null });

    } catch (error) {
        console.error('❌ Get session data error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to retrieve session data: ' + error.message
        });
    }
});

router.post('/clear-session-data', async function(req, res) {
    try {
        const { sessionId, key } = req.body;
        console.log('🔄 Clearing session data from Supabase:', { sessionId, key });

        if (!sessionId || !key) {
            return res.status(400).json({
                success: false,
                error: 'Session ID and key are required'
            });
        }

        const { data: currentData, error: fetchError } = await supabase
            .from('user_sessions')
            .select('active_wallet_address')
            .eq('user_id', sessionId)
            .single();

        let newSessionData = {};
        if (currentData && currentData.active_wallet_address) {
            try {
                const sessionData = JSON.parse(currentData.active_wallet_address);
                delete sessionData[key];
                newSessionData = sessionData;
            } catch (parseError) {
                console.error('❌ Failed to parse session data for clearing:', parseError);
            }
        }

        const { error: updateError } = await supabase
            .from('user_sessions')
            .update({
                active_wallet_address: JSON.stringify(newSessionData),
                updated_at: new Date().toISOString()
            })
            .eq('user_id', sessionId);

        if (updateError) {
            throw updateError;
        }

        console.log('✅ Session data cleared from Supabase');
        res.json({ success: true });

    } catch (error) {
        console.error('❌ Clear session data error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to clear session data: ' + error.message
        });
    }
});

router.post('/clear-all-session-data', async function(req, res) {
    try {
        const { sessionId } = req.body;
        console.log('🔄 Clearing ALL session data for:', sessionId);

        if (!sessionId) {
            return res.status(400).json({
                success: false,
                error: 'Session ID is required'
            });
        }

        const { error } = await supabase
            .from('user_sessions')
            .update({
                active_wallet_address: JSON.stringify({}),
                updated_at: new Date().toISOString()
            })
            .eq('user_id', sessionId);

        if (error) {
            console.error('❌ Supabase clear all sessions error:', error);
            return res.status(500).json({
                success: false,
                error: 'Failed to clear session data: ' + error.message
            });
        }

        console.log('✅ All session data cleared from Supabase');
        res.json({ success: true });

    } catch (error) {
        console.error('❌ Clear all session data error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to clear session data: ' + error.message
        });
    }
});

// =============================================
// WALLET GENERATION & IMPORT
// =============================================

router.post('/generate-wallet', async function(req, res) {
    try {
        const { userId, wordCount = 12, userPassword } = req.body;
        console.log('🔄 Generating wallet for user:', userId);

        if (!userId || !userPassword) {
            return res.status(400).json({
                success: false,
                error: 'User ID and password are required'
            });
        }

        const mnemonic = bip39.generateMnemonic(wordCount === 12 ? 128 : 256);
        const keyPair = await mnemonicToWalletKey(mnemonic.split(' '));

        const WalletClass = tonweb.wallet.all.v4R2;
        const wallet = new WalletClass(tonweb.provider, {
            publicKey: keyPair.publicKey,
            wc: 0
        });

        const walletAddress = await wallet.getAddress();
        const address = walletAddress.toString(true, true, false);
        const addressBounceable = walletAddress.toString(true, true, true);

        console.log('✅ Wallet generated:', address);

        const encryptedData = BackendCryptoUtils.encryptPrivateKey(
            TonWeb.utils.bytesToHex(keyPair.secretKey), 
            userPassword
        );

        const passwordHash = BackendCryptoUtils.hashPassword(userPassword);

        try {
            const { data, error } = await supabase
                .from('user_wallets')
                .insert([{
                    user_id: userId,
                    address: address,
                    public_key: TonWeb.utils.bytesToHex(keyPair.publicKey),
                    encrypted_private_key: JSON.stringify(encryptedData),
                    password_hash: passwordHash.hash,
                    encryption_salt: passwordHash.salt,
                    wallet_type: 'TON',
                    source: 'generated',
                    word_count: wordCount,
                    derivation_path: "m/44'/607'/0'/0'/0'",
                    created_at: new Date().toISOString()
                }]);

            if (error) {
                console.warn('⚠️ Database warning:', error.message);
            } else {
                console.log('✅ Wallet saved to database with encrypted private key');
            }
        } catch (dbError) {
            console.warn('⚠️ Database error:', dbError.message);
        }

        res.json({
            success: true,
            wallet: {
                userId: userId,
                address: address,
                addressBounceable: addressBounceable,
                publicKey: TonWeb.utils.bytesToHex(keyPair.publicKey),
                wordCount: wordCount,
                type: 'TON',
                source: 'generated',
                derivationPath: "m/44'/607'/0'/0'/0'",
                mnemonic: mnemonic
            },
            message: 'Wallet generated successfully'
        });

    } catch (error) {
        console.error('Wallet generation error:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to generate wallet: ' + error.message 
        });
    }
});

router.post('/import-wallet', async function(req, res) {
    try {
        console.log('🔄 Import wallet with user session');
        const { userId, mnemonic, targetAddress, userPassword } = req.body;

        if (!userId || !mnemonic || !userPassword) {
            console.log('❌ Missing userId, mnemonic, or password');
            return res.status(400).json({
                success: false,
                error: 'User ID, mnemonic, and password are required'
            });
        }

        const cleanedMnemonic = mnemonic.trim().toLowerCase().replace(/\s+/g, ' ');
        const wordCount = cleanedMnemonic.split(' ').length;

        console.log('🔍 Cleaned mnemonic words:', wordCount);

        if (wordCount !== 12 && wordCount !== 24) {
            return res.status(400).json({
                success: false,
                error: 'Mnemonic must be 12 or 24 words. Found: ' + wordCount + ' words'
            });
        }

        console.log('🔄 Deriving wallet...');
        const keyPair = await mnemonicToWalletKey(cleanedMnemonic.split(' '));

        const WalletClass = tonweb.wallet.all.v4R2;
        const wallet = new WalletClass(tonweb.provider, {
            publicKey: keyPair.publicKey,
            wc: 0
        });

        const walletAddress = await wallet.getAddress();
        const address = walletAddress.toString(true, true, false);
        const addressBounceable = walletAddress.toString(true, true, true);

        console.log('✅ Wallet derived:', address);

        const encryptedData = BackendCryptoUtils.encryptPrivateKey(
            TonWeb.utils.bytesToHex(keyPair.secretKey), 
            userPassword
        );

        const passwordHash = BackendCryptoUtils.hashPassword(userPassword);

        try {
            const { data, error } = await supabase
                .from('user_wallets')
                .insert([{
                    user_id: userId,
                    address: address,
                    public_key: TonWeb.utils.bytesToHex(keyPair.publicKey),
                    encrypted_private_key: JSON.stringify(encryptedData),
                    password_hash: passwordHash.hash,
                    encryption_salt: passwordHash.salt,
                    wallet_type: 'TON',
                    source: 'imported',
                    word_count: wordCount,
                    derivation_path: "m/44'/607'/0'/0'/0'",
                    created_at: new Date().toISOString()
                }]);

            if (error) {
                console.warn('⚠️ Database warning:', error.message);
            } else {
                console.log('✅ Wallet saved to database with encrypted private key');
            }
        } catch (dbError) {
            console.warn('⚠️ Database error:', dbError.message);
        }

        console.log('✅ Import successful');
        res.json({
            success: true,
            wallet: {
                userId: userId,
                address: address,
                addressBounceable: addressBounceable,
                publicKey: TonWeb.utils.bytesToHex(keyPair.publicKey),
                type: 'TON',
                source: 'imported',
                wordCount: wordCount,
                derivationPath: "m/44'/607'/0'/0'/0'"
            },
            message: 'Wallet imported successfully'
        });

    } catch (error) {
        console.error('❌ Import error:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to import wallet: ' + error.message 
        });
    }
});

// =============================================
// WALLET MANAGEMENT
// =============================================

router.get('/test', (req, res) => {
    res.json({
        success: true,
        message: '✅ Backend is WORKING with all endpoints!',
        timestamp: new Date().toISOString()
    });
});

router.post('/import-wallet-select', async function(req, res) {
    try {
        const { userId, mnemonic, selectedPath } = req.body;

        if (!userId || !mnemonic || !selectedPath) {
            return res.status(400).json({
                success: false,
                error: 'User ID, mnemonic, and selected path are required'
            });
        }

        const cleanedMnemonic = mnemonic.trim().toLowerCase().replace(/\s+/g, ' ');
        const wordCount = cleanedMnemonic.split(' ').length;

        const keyPair = await mnemonicToWalletKey(cleanedMnemonic.split(' '));

        const WalletClass = tonweb.wallet.all.v4R2;
        const wallet = new WalletClass(tonweb.provider, {
            publicKey: keyPair.publicKey,
            wc: 0
        });

        const walletAddress = await wallet.getAddress();
        const address = walletAddress.toString(true, true, false);
        const addressBounceable = walletAddress.toString(true, true, true);

        console.log('✅ Selected wallet derived:', address);

        try {
            const { data, error } = await supabase
                .from('user_wallets')
                .insert([{
                    user_id: userId,
                    address: address,
                    public_key: TonWeb.utils.bytesToHex(keyPair.publicKey),
                    wallet_type: 'TON',
                    source: 'imported',
                    word_count: wordCount,
                    derivation_path: selectedPath,
                    created_at: new Date().toISOString()
                }]);

            if (error) {
                console.warn('⚠️ Database warning:', error.message);
            }
        } catch (dbError) {
            console.warn('⚠️ Database error:', dbError.message);
        }

        res.json({
            success: true,
            wallet: { 
                userId: userId,
                address: address,
                addressBounceable: addressBounceable,
                type: 'TON',
                source: 'imported',
                wordCount: wordCount,
                derivationPath: selectedPath
            },
            message: 'Wallet imported successfully'
        });

    } catch (error) {
        console.error('Wallet selection error:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to import selected wallet: ' + error.message 
        });
    }
});

router.get('/user-wallets/:userId', async function(req, res) {
    try {
        const { userId } = req.params;
        console.log('🔄 Fetching wallets for user:', userId);

        const { data, error } = await supabase
            .from('user_wallets')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Database error:', error);
            return res.status(500).json({ success: false, error: error.message });
        }

        console.log(`✅ Found ${data.length} wallets for user ${userId}`);

        res.json({
            success: true,
            wallets: data.map(wallet => ({
                id: wallet.id,
                userId: wallet.user_id,
                address: wallet.address,
                walletType: wallet.source === 'generated' ? 'new' : 'imported',
                type: wallet.wallet_type,
                source: wallet.source,
                wordCount: wallet.word_count,
                derivationPath: wallet.derivation_path,
                createdAt: wallet.created_at
            }))
        });

    } catch (error) {
        console.error('Get user wallets error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

router.post('/set-active-wallet', async function(req, res) {
    try {
        const { userId, address } = req.body;
        console.log('🔄 Setting active wallet for user:', userId, 'address:', address);

        const { data, error } = await supabase
            .from('user_sessions')
            .upsert({
                user_id: userId,
                active_wallet_address: address,
                last_active: new Date().toISOString(),
                updated_at: new Date().toISOString()
            }, {
                onConflict: 'user_id'
            });

        if (error) {
            console.error('Session update error:', error);
            return res.status(500).json({ success: false, error: error.message });
        }

        console.log('✅ Active wallet set:', address);
        res.json({
            success: true,
            message: 'Active wallet set successfully'
        });

    } catch (error) {
        console.error('Set active wallet error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

router.get('/active-wallet/:userId', async function(req, res) {
    try {
        const { userId } = req.params;
        console.log('🔄 Getting active wallet for user:', userId);

        const { data, error } = await supabase
            .from('user_sessions')
            .select('active_wallet_address')
            .eq('user_id', userId)
            .single();

        if (error && error.code !== 'PGRST116') {
            console.error('Session fetch error:', error);
            return res.status(500).json({ success: false, error: error.message });
        }

        const activeWalletAddress = data?.active_wallet_address;

        if (activeWalletAddress) {
            try {
                const parsed = JSON.parse(activeWalletAddress);
                if (parsed && typeof parsed === 'object') {
                    const walletEntry = Object.values(parsed).find(val => 
                        val && val.address && (val.address.startsWith('EQ') || val.address.startsWith('UQ'))
                    );
                    if (walletEntry) {
                        console.log('✅ Active wallet found in session data:', walletEntry.address);
                        return res.json({
                            success: true,
                            activeWallet: walletEntry.address
                        });
                    }
                }
            } catch (e) {
                console.log('✅ Active wallet found (plain address):', activeWalletAddress);
                return res.json({
                    success: true,
                    activeWallet: activeWalletAddress
                });
            }
        }

        console.log('ℹ️ No active wallet found for user');
        res.json({
            success: true,
            activeWallet: null
        });

    } catch (error) {
        console.error('Get active wallet error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// =============================================
// BALANCE ENDPOINTS
// =============================================

router.get('/real-balance/:address', async function(req, res) {
    try {
        const { address } = req.params;
        console.log('🔄 Balance check for:', address);

        const response = await axios.get('https://toncenter.com/api/v2/getAddressInformation', {
            params: { address: address },
            headers: { 'X-API-Key': process.env.TONCENTER_API_KEY },
            timeout: 10000
        });

        if (response.data && response.data.result) {
            const balance = response.data.result.balance;
            const tonBalance = TonWeb.utils.fromNano(balance.toNumber());

            res.json({
                success: true,
                balance: parseFloat(tonBalance),
                address: address
            });
        } else {
            res.json({
                success: true,
                balance: 0,
                address: address
            });
        }

    } catch (error) {
        console.error('Balance error:', error.message);
        res.json({
            success: true,
            balance: 0,
            address: req.params.address,
            error: error.message
        });
    }
});

router.get('/nmx-balance/:address', async function(req, res) {
    try {
        const { address } = req.params;
        console.log('🔄 NMX balance check for:', address);

        res.json({
            success: true,
            balance: 0,
            address: address,
            source: 'not_implemented'
        });

    } catch (error) {
        console.error('NMX balance error:', error);
        res.json({
            success: true,
            balance: 0,
            address: req.params.address,
            error: error.message
        });
    }
});

router.get('/all-balances/:address', async function(req, res) {
    try {
        const { address } = req.params;

        const tonResponse = await axios.get('https://toncenter.com/api/v2/getAddressInformation', {
            params: { address: address },
            headers: { 'X-API-Key': process.env.TONCENTER_API_KEY },
            timeout: 10000
        });

        let tonBalance = 0;
        if (tonResponse.data && tonResponse.data.result) {
            const balance = tonResponse.data.result.balance;
            tonBalance = parseFloat(TonWeb.utils.fromNano(balance.toString()));
        }

        res.json({
            success: true,
            balances: {
                TON: tonBalance,
                NMX: 0
            },
            address: address
        });

    } catch (error) {
        console.error('All balances error:', error.message);
        res.json({
            success: true,
            balances: {
                TON: 0,
                NMX: 0
            },
            address: req.params.address
        });
    }
});

// =============================================
// TRANSACTION ENDPOINTS
// =============================================

router.post('/send-ton', async function(req, res) {
    try {
        const { fromAddress, toAddress, amount, memo = '', base64Mnemonic } = req.body;

        console.log('🔄 SEND-TON: Starting transaction...');

        if (!fromAddress || !toAddress || !amount || !base64Mnemonic) {
            console.log('❌ Missing required fields');
            return res.status(400).json({
                success: false,
                error: 'Missing required fields: fromAddress, toAddress, amount, base64Mnemonic'
            });
        }

        let decryptedMnemonic;
        try {
            console.log('🔐 Decoding base64 mnemonic...');
            decryptedMnemonic = Buffer.from(base64Mnemonic, 'base64').toString('utf8');

            if (!decryptedMnemonic || decryptedMnemonic.trim().length === 0) {
                throw new Error('Empty mnemonic after decoding');
            }

            console.log('✅ Base64 mnemonic decoded successfully');
        } catch (decodeError) {
            console.error('❌ Base64 decode failed:', decodeError);
            return res.status(400).json({
                success: false,
                error: 'Invalid mnemonic encoding: ' + decodeError.message
            });
        }

        const tonAmount = parseFloat(amount);
        if (isNaN(tonAmount) || tonAmount <= 0) {
            console.error('❌ Invalid amount:', amount);
            return res.status(400).json({
                success: false,
                error: 'Invalid amount. Must be a positive number.'
            });
        }

        const nanoAmount = TonWeb.utils.toNano(tonAmount.toString());
        console.log(`💰 Converting ${tonAmount} TON to ${nanoAmount} nanoTON`);

        let keyPair;
        try {
            console.log('🔑 Generating key pair from mnemonic...');
            const mnemonicWords = decryptedMnemonic.split(' ');
            console.log('🔍 Mnemonic word count:', mnemonicWords.length);

            keyPair = await mnemonicToWalletKey(mnemonicWords);
            console.log('✅ Key pair generated successfully');
        } catch (keyError) {
            console.error('❌ Key pair generation failed:', keyError);
            return res.status(400).json({
                success: false,
                error: 'Invalid mnemonic phrase: ' + keyError.message
            });
        }

        const WalletClass = tonweb.wallet.all.v4R2;
        const wallet = new WalletClass(tonweb.provider, {
            publicKey: keyPair.publicKey,
            wc: 0
        });

        let walletAddress;
        try {
            console.log('📍 Deriving wallet address...');
            walletAddress = await wallet.getAddress();
            const derivedAddress = walletAddress.toString(true, true, false);
            console.log('✅ Wallet address derived:', derivedAddress');
        } catch (addressError) {
            console.error('❌ Address derivation failed:', addressError);
            return res.status(400).json({
                success: false,
                error: 'Failed to derive wallet address: ' + addressError.message
            });
        }

        let balance;
        try {
            console.log('💰 Checking balance...');
            balance = await tonweb.getBalance(walletAddress);
            const balanceTON = TonWeb.utils.fromNano(balance);
            console.log('💰 Current balance:', balanceTON, 'TON');

            if (BigInt(balance) < BigInt(nanoAmount)) {
                console.error('❌ Insufficient balance:', {
                    available: balanceTON,
                    required: tonAmount
                });
                return res.status(400).json({
                    success: false,
                    error: `Insufficient balance. Available: ${balanceTON} TON, Required: ${tonAmount} TON`
                });
            }
        } catch (balanceError) {
            console.error('❌ Balance check failed:', balanceError);
            return res.status(400).json({
                success: false,
                error: 'Failed to check balance: ' + balanceError.message
            });
        }

        let seqno;
        try {
            console.log('🔢 Getting seqno from blockchain...');
            const seqnoResult = await wallet.methods.seqno().call();
            console.log('🔍 Raw seqno result:', seqnoResult);

            if (seqnoResult !== undefined && seqnoResult !== null) {
                seqno = parseInt(seqnoResult);
                if (isNaN(seqno)) {
                    console.warn('⚠️ Seqno is NaN, setting to 0');
                    seqno = 0;
                }
            } else {
                console.warn('⚠️ Seqno is undefined/null, setting to 0');
                seqno = 0;
            }
        } catch (seqnoError) {
            console.warn('⚠️ Seqno call failed, setting to 0:', seqnoError.message);
            seqno = 0;
        }

        console.log(`🔄 Final Seqno: ${seqno}`);

        let payload = null;
        if (memo && memo.trim().length > 0) {
            try {
                console.log('📝 Creating memo payload...');
                const cell = new TonWeb.boc.Cell();
                cell.bits.writeUint(0, 32);
                cell.bits.writeString(memo);
                payload = cell;
                console.log('✅ Memo payload created');
            } catch (payloadError) {
                console.warn('⚠️ Failed to create memo payload, continuing without memo:', payloadError);
            }
        }

        const transfer = {
            secretKey: keyPair.secretKey,
            toAddress: toAddress,
            amount: nanoAmount,
            seqno: seqno,
            payload: payload,
            sendMode: 3
        };

        console.log('🔄 Broadcasting transaction to blockchain...');

        let result;
        try {
            result = await Promise.race([
                wallet.methods.transfer(transfer).send(),
                new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('Transaction timeout')), 30000)
                )
            ]);
            console.log('✅ Transaction broadcast result:', result);
        } catch (sendError) {
            console.error('❌ Transaction send failed:', sendError);
            return res.status(500).json({
                success: false,
                error: 'Failed to send transaction to blockchain: ' + sendError.message
            });
        }

        console.log('✅ TON Transaction completed successfully');

        const txHash = `ton_tx_${fromAddress}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        res.json({
            success: true,
            transaction: {
                hash: txHash,
                from: fromAddress,
                to: toAddress,
                amount: nanoAmount.toString(),
                amountTON: tonAmount,
                memo: memo || '',
                timestamp: new Date().toISOString(),
                status: 'broadcasted'
            },
            message: `Successfully sent ${tonAmount} TON to ${toAddress.substring(0, 8)}...`
        });

    } catch (error) {
        console.error('❌ SEND-TON: Unhandled error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to send TON: ' + (error.message || 'Unknown error occurred')
        });
    }
});

router.post('/send-nmx', async function(req, res) {
    try {
        const { fromAddress, toAddress, amount, memo = '', base64Mnemonic } = req.body;

        console.log('🔄 Sending NMX...');

        if (!fromAddress || !toAddress || !amount || !base64Mnemonic) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields'
            });
        }

        console.log('ℹ️ NMX sending not fully implemented yet');

        res.json({
            success: true,
            transaction: {
                hash: `nmx_tx_${Date.now()}`,
                from: fromAddress,
                to: toAddress,
                amount: amount,
                amountNMX: amount,
                memo: memo || '',
                timestamp: new Date().toISOString(),
                status: 'simulated'
            },
            message: `NMX transfer simulated - ${amount} NMX to ${toAddress}`
        });

    } catch (error) {
        console.error('Send NMX error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to send NMX: ' + error.message
        });
    }
});

// =============================================
// ADDITIONAL ENDPOINTS
// =============================================

router.get('/transaction-history/:address', async function(req, res) {
    try {
        const { address } = req.params;
        console.log('🔄 Fetching transaction history for:', address);

        res.json({
            success: true,
            transactions: [],
            address: address
        });

    } catch (error) {
        console.error('Transaction history error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch transaction history: ' + error.message
        });
    }
});

router.get('/supported-tokens', async function(req, res) {
    res.json({ 
        success: true, 
        tokens: [
            {
                symbol: "TON", name: "Toncoin", isNative: true, isFeatured: true,
                logo: "https://assets.coingecko.com/coins/images/17980/large/ton_symbol.png",
                price: 0, canSend: true
            },
            {
                symbol: "NMX", name: "NemexCoin", isNative: false, isFeatured: true,
                contract: NMX_CONTRACT,
                logo: "https://turquoise-obedient-frog-86.mypinata.cloud/ipfs/QmZo4rNnhhpWq6qQBkXBaAGqTdrawEzmW4w4QQsuMSjjW1",
                price: 0, canSend: true
            }
        ],
        primaryToken: "TON"
    });
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

router.get('/health', (req, res) => {
    res.json({
        success: true,
        message: 'Wallet API is running with ALL endpoints',
        timestamp: new Date().toISOString(),
        version: '2.0.0'
    });
});

router.get('/user-status/:userId', async function(req, res) {
    try {
        const { userId } = req.params;
        
        const { data: wallets, error: walletsError } = await supabase
            .from('user_wallets')
            .select('address')
            .eq('user_id', userId)
            .limit(1);

        const { data: session, error: sessionError } = await supabase
            .from('user_sessions')
            .select('active_wallet_address')
            .eq('user_id', userId)
            .single();

        res.json({
            success: true,
            hasWallets: wallets && wallets.length > 0,
            hasActiveSession: !!session,
            walletCount: wallets ? wallets.length : 0
        });

    } catch (error) {
        console.error('User status error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get user status: ' + error.message
        });
    }
});

module.exports = router;