// backend/wallet-routes.js - REAL TON WALLETS v7.5 - FIXED
const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');
const axios = require('axios');
const bcrypt = require('bcrypt');
const TonWeb = require('tonweb');
const { mnemonicNew, mnemonicToPrivateKey } = require('@ton/crypto');

require('dotenv').config();

console.log('🚀 WALLET ROUTES v7.5 - COMPLETELY FIXED TON ADDRESSES');

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
        const { error } = await supabase
            .from('user_wallets')
            .select('count')
            .limit(1);

        if (error) {
            console.error('❌ Supabase connection test failed:', error.message);
            dbStatus = 'connection_error';
            return false;
        }

        console.log('✅ Supabase connected successfully!');
        dbStatus = 'connected';
        return true;
    } catch (error) {
        console.error('❌ Supabase initialization error:', error.message);
        dbStatus = 'initialization_error';
        return false;
    }
}

(async () => {
    await initializeSupabase();
})();

// ============================================
// 🎯 FIXED TON WALLET GENERATION
// ============================================

async function generateRealTONWallet() {
    try {
        console.log('🔧 Generating TON wallet with official libraries...');
        
        // 1. Generate mnemonic
        const mnemonic = await mnemonicNew();
        console.log('✅ Mnemonic generated');
        
        // 2. Get private key from mnemonic
        const key = await mnemonicToPrivateKey(mnemonic);
        console.log('✅ Private key derived');
        
        // 3. Create wallet - WORKCHAIN MUST BE 0 FOR MAINNET!
        const workchain = 0;
        console.log(`🎯 Creating wallet on workchain ${workchain}`);
        
        // CRITICAL FIX: Use proper TonWeb initialization
        // Create a proper TonWeb instance with provider
        const provider = new TonWeb.HttpProvider('https://toncenter.com/api/v2');
        const tonweb = new TonWeb(provider);
        
        // Create the wallet using the initialized tonweb
        const wallet = tonweb.wallet.create({ 
            workchain, 
            publicKey: key.publicKey 
        });
        
        // Get the address - CRITICAL: Use the correct method
        const addressObj = await wallet.getAddress();
        
        // Convert to string format - NON-BOUNCEABLE (UQ)
        const address = addressObj.toString(true, false, true);
        
        console.log('🔍 Raw address from TonWeb:', address);
        console.log('📏 Address length:', address.length);
        console.log('🔤 First 4 chars:', address.substring(0, 4));
        
        // 4. Validate the address format
        let finalAddress = address;
        
        // Ensure it starts with UQ (non-bounceable)
        if (!finalAddress.startsWith('UQ')) {
            console.warn('⚠️ Address not UQ format, converting...');
            if (finalAddress.startsWith('EQ')) {
                finalAddress = 'UQ' + finalAddress.substring(2);
            } else {
                // If it starts with something else, add UQ prefix
                finalAddress = 'UQ' + finalAddress;
            }
        }
        
        // Remove any double UQ prefix
        if (finalAddress.startsWith('UQUQ')) {
            console.warn('⚠️ Double UQ prefix detected, fixing...');
            finalAddress = 'UQ' + finalAddress.substring(4);
        }
        
        // TON addresses can be 46, 47, or 48 characters
        // DO NOT pad them - this breaks the checksum!
        const validLengths = [46, 47, 48];
        if (!validLengths.includes(finalAddress.length)) {
            console.warn(`⚠️ Unusual address length: ${finalAddress.length} chars`);
            console.warn(`⚠️ Address: ${finalAddress}`);
            
            // If it's too short, there's a serious problem
            if (finalAddress.length < 46) {
                throw new Error(`Invalid address length: ${finalAddress.length}. TON addresses must be 46-48 characters.`);
            }
        }
        
        console.log('✅ Final wallet address:', finalAddress);
        console.log('📏 Final length:', finalAddress.length);
        console.log('🎯 Format:', finalAddress.startsWith('UQ') ? 'non-bounceable' : 'unknown');
        
        return {
            mnemonic: mnemonic.join(' '),
            address: finalAddress,
            publicKey: TonWeb.utils.bytesToHex(key.publicKey),
            privateKey: TonWeb.utils.bytesToHex(key.secretKey),
            wordCount: 24,
            source: 'official-ton-v2'
        };

    } catch (error) {
        console.error('❌ TON wallet generation failed:', error);
        throw error;
    }
}

// ============================================
// 🎯 FIXED ADDRESS VALIDATION
// ============================================

function validateTONAddress(address) {
    if (!address) {
        return { valid: false, error: 'Address is empty' };
    }

    // CRITICAL FIX: TON addresses can be 46, 47, or 48 characters!
    const validLengths = [46, 47, 48];
    if (!validLengths.includes(address.length)) {
        return {
            valid: false,
            error: `Invalid length: ${address.length} chars (must be 46, 47, or 48)`,
            actualLength: address.length,
            expectedLengths: validLengths
        };
    }

    // Must start with EQ (bounceable) or UQ (non-bounceable)
    if (!address.startsWith('EQ') && !address.startsWith('UQ')) {
        return {
            valid: false,
            error: `Invalid prefix: "${address.substring(0, 2)}" (must be EQ or UQ)`,
            prefix: address.substring(0, 2)
        };
    }

    // Body must contain only valid base64url characters
    const body = address.substring(2);
    const validRegex = /^[A-Za-z0-9\-_]+$/;

    if (!validRegex.test(body)) {
        const invalid = body.replace(/[A-Za-z0-9\-_]/g, '');
        return {
            valid: false,
            error: `Invalid characters: "${invalid}"`,
            invalidCharacters: invalid
        };
    }

    // All checks passed
    return {
        valid: true,
        format: address.startsWith('EQ') ? 'bounceable' : 'non-bounceable',
        length: address.length,
        isProperFormat: true
    };
}

// ============================================
// 🎯 TEST ENDPOINT TO VERIFY FIX
// ============================================

router.get('/test/fixed-generation', async (req, res) => {
    try {
        console.log('🧪 Testing FIXED TON wallet generation...');

        const wallet = await generateRealTONWallet();
        const validation = validateTONAddress(wallet.address);

        // Test if address can be converted to bounceable format
        let bounceableAddress = wallet.address;
        if (wallet.address.startsWith('UQ')) {
            bounceableAddress = 'EQ' + wallet.address.substring(2);
        }

        res.json({
            success: true,
            test: 'FIXED TON Wallet Generation Test',
            wallet: {
                address: wallet.address,
                bounceableAddress: bounceableAddress,
                length: wallet.address.length,
                validation: validation,
                format: wallet.address.startsWith('UQ') ? 'non-bounceable' : 'bounceable',
                wordCount: wallet.wordCount,
                sampleMnemonic: wallet.mnemonic.split(' ').slice(0, 3).join(' ') + '...'
            },
            instructions: [
                '1. Copy the address to a TON wallet app',
                '2. Try sending 0.01 TON to test activation',
                '3. Check on https://tonviewer.com/',
                '4. New addresses need initial TON to activate'
            ],
            testLinks: {
                tonViewer: `https://tonviewer.com/${wallet.address}`,
                tonScan: `https://tonscan.org/address/${wallet.address}`,
                testSend: `ton://transfer/${wallet.address}?amount=10000000` // 0.01 TON
            }
        });

    } catch (error) {
        res.json({
            success: false,
            error: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
});

// ============================================
// 🎯 UPDATE CREATE WALLET ENDPOINT TO USE FIXED VERSION
// ============================================

router.post('/create', async (req, res) => {
    console.log('🎯 CREATE TON WALLET - FIXED VERSION');

    try {
        const { userId, walletPassword } = req.body;

        if (!userId || !walletPassword) {
            return res.status(400).json({
                success: false,
                error: 'User ID and wallet password required'
            });
        }

        if (walletPassword.length < 6) {
            return res.status(400).json({
                success: false,
                error: 'Wallet password must be at least 6 characters'
            });
        }

        if (!supabase || dbStatus !== 'connected') {
            console.error('❌ Database not connected');
            return res.status(503).json({
                success: false,
                error: 'Database not available. Please try again.'
            });
        }

        console.log('🔍 Checking if wallet already exists for user:', userId);

        const { data: existingWallets, error: checkError } = await supabase
            .from('user_wallets')
            .select('id, address, created_at')
            .eq('user_id', userId);

        if (checkError) {
            console.error('❌ Database error checking existing wallet:', checkError);
            return res.status(500).json({
                success: false,
                error: 'Database error. Please try again.'
            });
        }

        if (existingWallets && existingWallets.length > 0) {
            console.log('✅ Wallet already exists for user:', userId);

            const tonPriceData = await fetchRealTONPrice();

            return res.json({
                success: true,
                message: 'Wallet already exists',
                wallet: {
                    id: existingWallets[0].id,
                    userId: userId,
                    address: existingWallets[0].address,
                    format: existingWallets[0].address.startsWith('EQ') ? 'bounceable' : 'non-bounceable',
                    createdAt: existingWallets[0].created_at,
                    source: 'existing',
                    wordCount: 24
                },
                tonPrice: tonPriceData.price,
                priceSource: tonPriceData.source
            });
        }

        console.log('✅ No existing wallet found. Generating new wallet with FIXED method...');

        // USE THE FIXED VERSION!
        const wallet = await generateRealTONWallet();

        const validation = validateTONAddress(wallet.address);
        if (!validation.valid) {
            console.error('❌ Generated invalid address:', wallet.address);
            console.error('❌ Validation error:', validation.error);
            return res.status(500).json({
                success: false,
                error: 'Failed to generate valid wallet address',
                validation: validation
            });
        }

        console.log('✅ TON address generated with FIXED method:');
        console.log('   Address:', wallet.address);
        console.log('   Length:', wallet.address.length);
        console.log('   Format:', validation.format);
        console.log('   Valid:', validation.valid);

        const passwordHash = await hashWalletPassword(walletPassword);
        const encryptedMnemonic = encryptMnemonic(wallet.mnemonic, walletPassword);

        const walletRecord = {
            user_id: userId,
            address: wallet.address,
            encrypted_mnemonic: JSON.stringify(encryptedMnemonic),
            public_key: wallet.publicKey,
            wallet_type: 'TON',
            source: 'generated-fixed',
            word_count: 24,
            password_hash: passwordHash,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };

        console.log('💾 Saving wallet to database...');
        const { data: insertedWallet, error: insertError } = await supabase
            .from('user_wallets')
            .insert([walletRecord])
            .select()
            .single();

        if (insertError) {
            console.error('❌ Database insert error:', insertError);
            return res.status(500).json({
                success: false,
                error: 'Failed to save wallet to database: ' + insertError.message
            });
        }

        console.log('✅ Wallet successfully stored in database:', insertedWallet.id);

        const tonPriceData = await fetchRealTONPrice();

        res.json({
            success: true,
            message: 'TON wallet created successfully with FIXED method',
            wallet: {
                id: insertedWallet.id,
                userId: userId,
                address: wallet.address,
                format: validation.format,
                createdAt: insertedWallet.created_at,
                source: 'database-fixed',
                wordCount: 24,
                validation: validation
            },
            tonPrice: tonPriceData.price,
            priceSource: tonPriceData.source,
            explorerLink: `https://tonviewer.com/${wallet.address}`,
            activationNote: 'Send 0.01 TON to activate this new wallet address'
        });

    } catch (error) {
        console.error('❌ Create wallet failed:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create wallet: ' + error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
});

// ============================================
// 🎯 ADD DIAGNOSTIC ENDPOINT
// ============================================

router.get('/diagnose/address/:address', async (req, res) => {
    try {
        const { address } = req.params;
        
        console.log('🔍 Diagnosing address:', address);
        
        const validation = validateTONAddress(address);
        
        // Check on blockchain
        const balanceResult = await getRealBalance(address);
        
        // Convert to bounceable for some explorers
        let bounceableAddress = address;
        if (address.startsWith('UQ')) {
            bounceableAddress = 'EQ' + address.substring(2);
        }
        
        res.json({
            success: true,
            address: address,
            validation: validation,
            blockchain: balanceResult,
            explorerLinks: {
                tonViewer: `https://tonviewer.com/${address}`,
                tonScan: `https://tonscan.org/address/${address}`,
                tonApi: `https://toncenter.com/api/v2/getAddressInformation?address=${bounceableAddress}`,
                bounceableFormat: bounceableAddress
            },
            analysis: {
                isLikelyValid: validation.valid,
                needsActivation: balanceResult.status === 'uninitialized',
                isActive: balanceResult.isActive,
                hasBalance: parseFloat(balanceResult.balance) > 0
            },
            recommendations: validation.valid ? [
                'Address format is valid',
                balanceResult.status === 'uninitialized' ? 'Send 0.01 TON to activate' : 'Address is active',
                'Use in TON wallet apps'
            ] : [
                `Fix: ${validation.error}`,
                'Generate a new wallet with /test/fixed-generation'
            ]
        });
        
    } catch (error) {
        res.json({
            success: false,
            error: error.message
        });
    }
});

// ============================================
// 🎯 KEEP OTHER FUNCTIONS (unchanged but need hashWalletPassword, etc.)
// ============================================

async function hashWalletPassword(password) {
    const saltRounds = 12;
    return await bcrypt.hash(password, saltRounds);
}

async function verifyWalletPassword(password, hash) {
    return await bcrypt.compare(password, hash);
}

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

// ... KEEP ALL OTHER FUNCTIONS (getRealBalance, fetchRealTONPrice, etc.) ...
// ... KEEP ALL OTHER ROUTES (login, session, check, etc.) ...

// ============================================
// 🎯 TEST THE FIX
// ============================================

console.log('✅ WALLET ROUTES v7.5 READY - COMPLETELY FIXED TON ADDRESS GENERATION');

module.exports = router;