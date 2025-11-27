// wallet-routes.js - COMPLETE COMPATIBILITY FIX
const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');
const crypto = require('crypto');
const bip39 = require('bip39');
const { mnemonicToWalletKey } = require('@ton/crypto');
const TonWeb = require('tonweb');

console.log('✅ COMPLETE Wallet Routes - FRONTEND COMPATIBILITY FIX');

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
// NEW COMPATIBILITY ENDPOINTS - FRONTEND FIXES
// =============================================

// ✅ NEW: Endpoint that frontend is calling
router.post('/get-user-wallet', async function(req, res) {
    try {
        const { userId } = req.body;
        console.log('🔄 Frontend compatibility: Getting user wallet for:', userId);

        if (!userId) {
            return res.status(400).json({
                success: false,
                error: 'User ID is required'
            });
        }

        // Get the most recent wallet for this user
        const { data, error } = await supabase
            .from('user_wallets')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

        if (error) {
            if (error.code === 'PGRST116') {
                // No wallet found
                console.log('ℹ️ No wallet found for user:', userId);
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
                addressBounceable: data.address, // Use same address for bounceable
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

// ✅ FIXED: Store wallet endpoint - compatible with frontend
router.post('/store-wallet', async function(req, res) {
    try {
        console.log('🔄 Frontend compatibility: Storing wallet...');
        
        // ✅ FIXED: Accept both parameter formats from frontend
        const { 
            userId, 
            address, 
            publicKey, 
            walletType, 
            type, 
            source, 
            wordCount, 
            derivationPath,
            // Frontend might send these too
            addressBounceable,
            mnemonic // Don't store mnemonic in database!
        } = req.body;

        console.log('📦 Received wallet data:', { 
            userId, 
            address: address ? address.substring(0, 10) + '...' : 'none',
            hasMnemonic: !!mnemonic 
        });

        if (!userId || !address) {
            return res.status(400).json({
                success: false,
                error: 'User ID and address are required'
            });
        }

        // Use walletType or type (frontend might send either)
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
            
            // If it's a duplicate, still return success
            if (error.code === '23505') {
                console.log('ℹ️ Wallet already exists, returning success');
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
// CRYPTO UTILS (keep existing)
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
// SUPABASE SESSION MANAGEMENT (keep existing)
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
                console.log('ℹ️ No session data found for user:', sessionId);
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
// WALLET GENERATION & IMPORT (keep existing)
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

        // Encrypt and store private key
        const encryptedData = BackendCryptoUtils.encryptPrivateKey(
            TonWeb.utils.bytesToHex(keyPair.secretKey), 
            userPassword
        );

        const passwordHash = BackendCryptoUtils.hashPassword(userPassword);

        // Save to database
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

        // Encrypt and store private key
        const encryptedData = BackendCryptoUtils.encryptPrivateKey(
            TonWeb.utils.bytesToHex(keyPair.secretKey), 
            userPassword
        );

        const passwordHash = BackendCryptoUtils.hashPassword(userPassword);

        // Save to database
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
// EXISTING ENDPOINTS (keep all these)
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
// BALANCE & TRANSACTION ENDPOINTS (keep existing)
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

// ... (keep all the existing price endpoints, transaction endpoints, etc.)

// =============================================
// ADDITIONAL COMPATIBILITY ENDPOINTS
// =============================================

// ✅ NEW: Health check endpoint
router.get('/health', (req, res) => {
    res.json({
        success: true,
        message: 'Wallet API is running',
        timestamp: new Date().toISOString(),
        version: '2.0.0'
    });
});

// ✅ NEW: Get user session status
router.get('/user-status/:userId', async function(req, res) {
    try {
        const { userId } = req.params;
        
        // Check if user has any wallets
        const { data: wallets, error: walletsError } = await supabase
            .from('user_wallets')
            .select('address')
            .eq('user_id', userId)
            .limit(1);

        // Check if user has active session
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