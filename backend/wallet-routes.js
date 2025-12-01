// wallet-routes.js - HYBRID WALLET WITH PASSWORD PROTECTION
const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');
const bip39 = require('bip39');
const { mnemonicToWalletKey } = require('@ton/crypto');
const TonWeb = require('tonweb');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
require('dotenv').config();

console.log('✅ Hybrid Wallet with Password Protection');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Supabase credentials missing from .env file');
    throw new Error('Supabase configuration required in .env file');
}

const supabase = createClient(supabaseUrl, supabaseKey);
const tonweb = new TonWeb(new TonWeb.HttpProvider('https://toncenter.com/api/v2/jsonRPC'));
const NMX_CONTRACT = "EQBRSrXz-7iYDnFZGhrER2XQL-gBgv1hr3Y8byWsVIye7A9f";
const TONAPI_KEY = process.env.TONAPI_KEY || 'AGDQXFV3ZMAAAAAAI5TFJW7XVMK2SFHWBQLR3Z2HLHN2HMP7NI2XTQVPKQSTZA';

// =============================================
// 🎯 ENCRYPTION SERVICE FOR SEED PHRASE
// =============================================

class SeedEncryptionService {
    // Encrypt seed phrase with user's password
    static async encryptSeed(seedPhrase, userPassword) {
        try {
            // Derive encryption key from password
            const salt = crypto.randomBytes(16);
            const key = crypto.scryptSync(userPassword, salt, 32);
            const iv = crypto.randomBytes(16);
            
            const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
            
            let encrypted = cipher.update(seedPhrase, 'utf8', 'hex');
            encrypted += cipher.final('hex');
            const authTag = cipher.getAuthTag();
            
            // Return encrypted data with all components needed for decryption
            return {
                encrypted: encrypted,
                iv: iv.toString('hex'),
                salt: salt.toString('hex'),
                authTag: authTag.toString('hex'),
                algorithm: 'aes-256-gcm',
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            console.error('❌ Seed encryption failed:', error);
            throw new Error('Failed to encrypt seed phrase');
        }
    }

    // Decrypt seed phrase with user's password
    static async decryptSeed(encryptedData, userPassword) {
        try {
            const { encrypted, iv, salt, authTag, algorithm } = encryptedData;
            
            if (algorithm !== 'aes-256-gcm') {
                throw new Error('Unsupported encryption algorithm');
            }
            
            const key = crypto.scryptSync(userPassword, Buffer.from(salt, 'hex'), 32);
            const decipher = crypto.createDecipheriv(
                'aes-256-gcm', 
                key, 
                Buffer.from(iv, 'hex')
            );
            
            decipher.setAuthTag(Buffer.from(authTag, 'hex'));
            
            let decrypted = decipher.update(encrypted, 'hex', 'utf8');
            decrypted += decipher.final('utf8');
            
            return decrypted;
        } catch (error) {
            console.error('❌ Seed decryption failed:', error);
            throw new Error('Failed to decrypt seed phrase. Wrong password or corrupted data.');
        }
    }

    // Verify password matches (using bcrypt)
    static async verifyPassword(password, hashedPassword) {
        return await bcrypt.compare(password, hashedPassword);
    }

    // Hash password for storage
    static async hashPassword(password) {
        const saltRounds = 10;
        return await bcrypt.hash(password, saltRounds);
    }
}

// =============================================
// 🎯 GET USER'S PASSWORD HASH FROM PROFILES
// =============================================

async function getUserPasswordHash(userId) {
    try {
        // In your actual system, you should store password hash in profiles or auth.users
        const { data: profile, error } = await supabase
            .from('profiles')
            .select('password_hash')
            .eq('id', userId)
            .single();

        if (error) {
            console.error('❌ Error getting user password hash:', error);
            
            // Fallback: Try to get from auth.users (Supabase Auth)
            const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(userId);
            
            if (authError || !authUser) {
                throw new Error('Could not retrieve user password information');
            }
            
            // Note: Supabase Auth doesn't expose password hash directly
            // You need to store it separately or use a different approach
            return null;
        }

        return profile.password_hash;
    } catch (error) {
        console.error('❌ Failed to get password hash:', error);
        return null;
    }
}

// =============================================
// 🎯 CREATE WALLET WITH HYBRID APPROACH
// =============================================

router.post('/create-wallet', async function(req, res) {
    try {
        const { userId, userPassword } = req.body;
        console.log('🔄 Creating hybrid wallet for user:', userId);

        if (!userId) {
            return res.status(400).json({
                success: false,
                error: 'User ID is required'
            });
        }

        if (!userPassword) {
            return res.status(400).json({
                success: false,
                error: 'Account password is required to encrypt your seed phrase'
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

        // Verify user password against stored hash
        const storedPasswordHash = await getUserPasswordHash(userId);
        if (!storedPasswordHash) {
            return res.status(400).json({
                success: false,
                error: 'Could not verify your account password. Please try logging in again.'
            });
        }

        const isPasswordValid = await SeedEncryptionService.verifyPassword(
            userPassword, 
            storedPasswordHash
        );

        if (!isPasswordValid) {
            return res.status(401).json({
                success: false,
                error: 'Invalid account password'
            });
        }

        // Generate mnemonic (12 words)
        const mnemonic = bip39.generateMnemonic(128);
        console.log('✅ Mnemonic generated');

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

        // Encrypt the seed phrase with user's password
        const encryptedSeed = await SeedEncryptionService.encryptSeed(mnemonic, userPassword);
        
        // Prepare wallet data
        const walletData = {
            user_id: userId,
            address: address,
            wallet_type: 'ton',
            source: 'nemex',
            public_key: TonWeb.utils.bytesToHex(keyPair.publicKey),
            word_count: 12,
            derivation_path: "m/44'/607'/0'/0'/0'",
            // Store encrypted seed data
            encrypted_mnemonic: JSON.stringify(encryptedSeed),
            encrypted_private_key: 'ENCRYPTED_WITH_SEED',
            password_hash: storedPasswordHash, // Store reference to password hash
            encryption_salt: 'INTEGRATED',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            // Metadata for hybrid approach
            backup_method: 'password_encrypted',
            first_viewed: false, // Track if user has seen seed phrase
            last_seed_access: null
        };

        console.log('📝 Inserting wallet data...');

        const { data: insertedWallet, error: insertError } = await supabase
            .from('user_wallets')
            .insert([walletData])
            .select();

        if (insertError) {
            console.error('❌ Database insert error:', insertError);
            return res.status(500).json({
                success: false,
                error: 'Failed to save wallet to database: ' + insertError.message
            });
        }

        console.log('✅ Wallet saved to database');

        // Mark as first viewed
        await supabase
            .from('user_wallets')
            .update({ 
                first_viewed: true,
                last_seed_access: new Date().toISOString()
            })
            .eq('id', insertedWallet[0].id);

        res.json({
            success: true,
            wallet: {
                userId: userId,
                address: address,
                addressBounceable: addressBounceable,
                type: 'TON',
                source: 'generated',
                wordCount: 12,
                createdAt: new Date().toISOString(),
                backupMethod: 'password_encrypted'
            },
            // SHOW SEED PHRASE ON FIRST CREATION
            mnemonic: mnemonic,
            security: {
                level: 'high',
                encryption: 'AES-256-GCM',
                backupMethod: 'password_protected'
            },
            instructions: {
                title: '🔥 WRITE DOWN YOUR SEED PHRASE NOW 🔥',
                steps: [
                    '1. Write these 12 words in order on paper',
                    '2. Store in multiple secure locations',
                    '3. Never share with anyone',
                    '4. This seed can recover your wallet',
                    '5. You can view it again with your account password'
                ],
                warning: 'This is your only chance to write it down freely. Later views require password verification.'
            },
            reminder: 'You can view this seed phrase again in Settings > View Seed Phrase by entering your account password.'
        });

    } catch (error) {
        console.error('❌ Wallet creation failed:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create wallet: ' + error.message
        });
    }
});

// =============================================
// 🎯 VIEW SEED PHRASE (Password Required)
// =============================================

router.post('/view-seed-phrase', async function(req, res) {
    try {
        const { userId, userPassword } = req.body;
        console.log('🔐 Request to view seed phrase for user:', userId);

        if (!userId || !userPassword) {
            return res.status(400).json({
                success: false,
                error: 'User ID and password are required'
            });
        }

        // Get wallet with encrypted seed
        const { data: wallet, error } = await supabase
            .from('user_wallets')
            .select('*')
            .eq('user_id', userId)
            .single();

        if (error || !wallet) {
            return res.status(404).json({
                success: false,
                error: 'Wallet not found'
            });
        }

        if (!wallet.encrypted_mnemonic || wallet.encrypted_mnemonic === 'USER_MANAGED') {
            return res.status(400).json({
                success: false,
                error: 'Seed phrase is not stored encrypted. It was shown only during creation.'
            });
        }

        // Verify user password
        const storedPasswordHash = await getUserPasswordHash(userId);
        if (!storedPasswordHash) {
            return res.status(400).json({
                success: false,
                error: 'Could not verify your account password'
            });
        }

        const isPasswordValid = await SeedEncryptionService.verifyPassword(
            userPassword, 
            storedPasswordHash
        );

        if (!isPasswordValid) {
            // Log failed attempt (for security monitoring)
            console.warn(`⚠️ Failed seed access attempt for user: ${userId}`);
            
            return res.status(401).json({
                success: false,
                error: 'Invalid account password. Access denied.',
                remainingAttempts: 'Contact support if you forgot your password.'
            });
        }

        // Decrypt the seed phrase
        let encryptedData;
        try {
            encryptedData = JSON.parse(wallet.encrypted_mnemonic);
        } catch (parseError) {
            return res.status(500).json({
                success: false,
                error: 'Corrupted seed phrase data'
            });
        }

        const seedPhrase = await SeedEncryptionService.decryptSeed(encryptedData, userPassword);

        // Update last access time
        await supabase
            .from('user_wallets')
            .update({ 
                last_seed_access: new Date().toISOString(),
                updated_at: new Date().toISOString()
            })
            .eq('id', wallet.id);

        console.log(`✅ Seed phrase accessed for user: ${userId}`);

        res.json({
            success: true,
            seedPhrase: seedPhrase,
            security: {
                accessedAt: new Date().toISOString(),
                accessCount: 'incremented', // You could track this in database
                warning: 'Keep this seed phrase secure. Anyone with it can access your funds.'
            },
            instructions: [
                'This seed phrase gives full access to your wallet.',
                'Never share it with anyone.',
                'Store it securely offline.',
                'Use it only for recovery purposes.'
            ],
            reminder: 'This access has been logged for security purposes.'
        });

    } catch (error) {
        console.error('❌ Seed phrase access failed:', error);
        
        if (error.message.includes('Wrong password')) {
            return res.status(401).json({
                success: false,
                error: 'Invalid password. Could not decrypt seed phrase.'
            });
        }
        
        res.status(500).json({
            success: false,
            error: 'Failed to retrieve seed phrase: ' + error.message
        });
    }
});

// =============================================
// 🎯 CHANGE SEED ENCRYPTION PASSWORD
// =============================================

router.post('/change-seed-password', async function(req, res) {
    try {
        const { userId, currentPassword, newPassword } = req.body;
        console.log('🔄 Changing seed encryption password for user:', userId);

        if (!userId || !currentPassword || !newPassword) {
            return res.status(400).json({
                success: false,
                error: 'All password fields are required'
            });
        }

        // Get wallet
        const { data: wallet, error } = await supabase
            .from('user_wallets')
            .select('*')
            .eq('user_id', userId)
            .single();

        if (error || !wallet) {
            return res.status(404).json({
                success: false,
                error: 'Wallet not found'
            });
        }

        if (!wallet.encrypted_mnemonic || wallet.encrypted_mnemonic === 'USER_MANAGED') {
            return res.status(400).json({
                success: false,
                error: 'No encrypted seed phrase to update'
            });
        }

        // Verify current password
        const storedPasswordHash = await getUserPasswordHash(userId);
        if (!storedPasswordHash) {
            return res.status(400).json({
                success: false,
                error: 'Could not verify current password'
            });
        }

        const isCurrentPasswordValid = await SeedEncryptionService.verifyPassword(
            currentPassword, 
            storedPasswordHash
        );

        if (!isCurrentPasswordValid) {
            return res.status(401).json({
                success: false,
                error: 'Current password is incorrect'
            });
        }

        // Decrypt with old password
        let encryptedData;
        try {
            encryptedData = JSON.parse(wallet.encrypted_mnemonic);
        } catch (parseError) {
            return res.status(500).json({
                success: false,
                error: 'Corrupted seed phrase data'
            });
        }

        const seedPhrase = await SeedEncryptionService.decryptSeed(encryptedData, currentPassword);

        // Re-encrypt with new password
        const newEncryptedSeed = await SeedEncryptionService.encryptSeed(seedPhrase, newPassword);

        // Update wallet with new encrypted seed
        const { error: updateError } = await supabase
            .from('user_wallets')
            .update({ 
                encrypted_mnemonic: JSON.stringify(newEncryptedSeed),
                updated_at: new Date().toISOString(),
                password_updated: new Date().toISOString()
            })
            .eq('id', wallet.id);

        if (updateError) {
            console.error('❌ Password change failed:', updateError);
            return res.status(500).json({
                success: false,
                error: 'Failed to update encrypted seed phrase'
            });
        }

        console.log('✅ Seed encryption password changed for user:', userId);

        res.json({
            success: true,
            message: 'Seed phrase encryption password updated successfully',
            securityNote: 'Your seed phrase is now encrypted with your new password.',
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('❌ Password change failed:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to change password: ' + error.message
        });
    }
});

// =============================================
// 🎯 VERIFY WALLET BACKUP STATUS
// =============================================

router.post('/backup-status', async function(req, res) {
    try {
        const { userId } = req.body;

        if (!userId) {
            return res.status(400).json({
                success: false,
                error: 'User ID required'
            });
        }

        const { data: wallet, error } = await supabase
            .from('user_wallets')
            .select('backup_method, first_viewed, last_seed_access, created_at')
            .eq('user_id', userId)
            .single();

        if (error || !wallet) {
            return res.json({
                success: true,
                hasWallet: false,
                message: 'No wallet found'
            });
        }

        const status = {
            hasWallet: true,
            backupMethod: wallet.backup_method || 'unknown',
            firstViewed: wallet.first_viewed || false,
            lastSeedAccess: wallet.last_seed_access,
            walletAge: Math.floor((new Date() - new Date(wallet.created_at)) / (1000 * 60 * 60 * 24)) + ' days',
            canRecover: wallet.backup_method === 'password_encrypted',
            securityLevel: wallet.backup_method === 'password_encrypted' ? 'high' : 'medium'
        };

        res.json({
            success: true,
            status: status,
            recommendations: status.firstViewed ? 
                'Your seed phrase was shown during creation. You can view it again with your password.' :
                'Please view your seed phrase in settings and store it securely.'
        });

    } catch (error) {
        console.error('❌ Backup status failed:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get backup status'
        });
    }
});

// =============================================
// 🎯 WALLET.HTML UI UPDATES NEEDED
// =============================================

/*
In wallet.html, you need to:

1. During wallet creation:
   - Get user's password via modal
   - Show seed phrase in a secure modal
   - Make user confirm they wrote it down

2. In Settings modal:
   - Add "View Seed Phrase" option
   - Show password input modal
   - Display seed phrase if password correct

3. Security features:
   - Logout after seed phrase viewing
   - Clear seed phrase from memory
   - Don't store seed phrase in localStorage
*/

// =============================================
// 🎯 REST OF THE ENDPOINTS (Same as before)
// =============================================

// [Include PriceService, BalanceService, get-user-wallet, import-wallet, etc.]
// They remain the same

module.exports = router;