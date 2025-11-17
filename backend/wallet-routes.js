const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');
const crypto = require('crypto');
const bip39 = require('bip39');
const { mnemonicToWalletKey } = require('@ton/crypto');
const { WalletContractV4 } = require('@ton/ton');
const { TonClient } = require('@ton/ton');
const { toNano } = require('@ton/core');

// Initialize Supabase
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Initialize TON Client (modern approach)
const tonClient = new TonClient({
    endpoint: 'https://toncenter.com/api/v2/jsonRPC',
    apiKey: process.env.TONCENTER_API_KEY
});

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;

// =============================================
// REAL TON WALLET GENERATION
// =============================================

// Generate real TON wallet with @ton/ton
async function generateRealTONWallet() {
    try {
        // Generate 24-word mnemonic (BIP39 standard)
        const mnemonic = bip39.generateMnemonic(256);
        
        // Convert mnemonic to key pair
        const keyPair = await mnemonicToWalletKey(mnemonic.split(' '));
        
        // Create wallet contract
        const wallet = WalletContractV4.create({
            workchain: 0,
            publicKey: keyPair.publicKey
        });
        
        // Get wallet address
        const address = wallet.address.toString();
        
        return {
            mnemonic: mnemonic,
            address: address,
            publicKey: Buffer.from(keyPair.publicKey).toString('hex'),
            privateKey: Buffer.from(keyPair.secretKey).toString('hex')
        };
        
    } catch (error) {
        console.error('Real TON wallet generation failed:', error);
        throw new Error('Failed to generate TON wallet: ' + error.message);
    }
}

// Generate wallet (12 words - simpler for users)
async function generateSimpleTONWallet() {
    try {
        // Generate 12-word mnemonic (easier for users)
        const mnemonic = bip39.generateMnemonic(128);
        
        const keyPair = await mnemonicToWalletKey(mnemonic.split(' '));
        const wallet = WalletContractV4.create({
            workchain: 0,
            publicKey: keyPair.publicKey
        });
        
        return {
            mnemonic: mnemonic,
            address: wallet.address.toString(),
            publicKey: Buffer.from(keyPair.publicKey).toString('hex')
        };
        
    } catch (error) {
        console.error('Simple TON wallet generation failed:', error);
        throw error;
    }
}

// =============================================
// ENCRYPTION FUNCTIONS
// =============================================

function encrypt(text) {
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
}

function decrypt(encryptedData) {
    const decipher = crypto.createDecipheriv(
        'aes-256-gcm', 
        Buffer.from(ENCRYPTION_KEY, 'hex'), 
        Buffer.from(encryptedData.iv, 'hex')
    );
    decipher.setAuthTag(Buffer.from(encryptedData.authTag, 'hex'));
    let decrypted = decipher.update(encryptedData.data, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
}

// =============================================
// REAL TON API ROUTES
// =============================================

// Generate new TON wallet (24 words)
router.post('/generate-wallet', async (req, res) => {
    try {
        const { userId, type = '24word' } = req.body;

        let walletData;
        if (type === '12word') {
            walletData = await generateSimpleTONWallet();
        } else {
            walletData = await generateRealTONWallet();
        }

        // Encrypt mnemonic for secure storage
        const encryptedMnemonic = encrypt(walletData.mnemonic);

        // Store in Supabase
        const { data, error } = await supabase
            .from('wallets')
            .insert([
                {
                    user_id: userId,
                    address: walletData.address,
                    encrypted_mnemonic: JSON.stringify(encryptedMnemonic),
                    public_key: walletData.publicKey,
                    wallet_type: 'TON',
                    created_at: new Date().toISOString()
                }
            ]);

        if (error) throw error;

        res.json({
            success: true,
            wallet: {
                address: walletData.address,
                mnemonic: walletData.mnemonic, // Return only once
                type: 'TON',
                wordCount: walletData.mnemonic.split(' ').length
            },
            message: `TON wallet with ${walletData.mnemonic.split(' ').length} words generated successfully`
        });

    } catch (error) {
        console.error('Wallet generation error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Import TON wallet from mnemonic
router.post('/import-wallet', async (req, res) => {
    try {
        const { userId, mnemonic } = req.body;

        // Validate mnemonic
        if (!bip39.validateMnemonic(mnemonic)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid mnemonic phrase'
            });
        }

        // Generate wallet from mnemonic
        const keyPair = await mnemonicToWalletKey(mnemonic.split(' '));
        const wallet = WalletContractV4.create({
            workchain: 0,
            publicKey: keyPair.publicKey
        });

        const address = wallet.address.toString();

        // Encrypt and store
        const encryptedMnemonic = encrypt(mnemonic);

        const { data, error } = await supabase
            .from('wallets')
            .insert([
                {
                    user_id: userId,
                    address: address,
                    encrypted_mnemonic: JSON.stringify(encryptedMnemonic),
                    public_key: Buffer.from(keyPair.publicKey).toString('hex'),
                    wallet_type: 'TON',
                    created_at: new Date().toISOString()
                }
            ]);

        if (error) throw error;

        res.json({
            success: true,
            wallet: {
                address: address,
                type: 'TON'
            },
            message: 'TON wallet imported successfully'
        });

    } catch (error) {
        console.error('Wallet import error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Get real TON balance from blockchain
router.get('/real-balance/:address', async (req, res) => {
    try {
        const { address } = req.params;

        // Use modern TON client
        const balance = await tonClient.getBalance(address);
        const tonBalance = balance.toString() / 1000000000; // Convert from nanoTON

        res.json({
            success: true,
            balance: tonBalance.toFixed(4),
            address: address,
            rawBalance: balance.toString()
        });

    } catch (error) {
        console.error('Real balance check error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch balance from blockchain'
        });
    }
});

// Get transaction history
router.get('/transactions/:address', async (req, res) => {
    try {
        const { address } = req.params;

        // Get transactions from TON API
        const response = await axios.get(
            `https://toncenter.com/api/v2/getTransactions?address=${address}&limit=10`
        );

        const transactions = response.data.result.map(tx => ({
            hash: tx.transaction_id.hash,
            type: tx.in_msg.source === '' ? 'receive' : 'send',
            amount: (parseInt(tx.in_msg.value) / 1000000000).toFixed(4),
            symbol: 'TON',
            from: tx.in_msg.source,
            to: tx.in_msg.destination,
            timestamp: tx.utime * 1000, // Convert to milliseconds
            status: 'confirmed'
        }));

        res.json({
            success: true,
            transactions: transactions
        });

    } catch (error) {
        console.error('Transactions error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Check if address is valid TON address
router.get('/validate-address/:address', async (req, res) => {
    try {
        const { address } = req.params;

        // Simple TON address validation
        const isValid = address.startsWith('EQ') || address.startsWith('UQ');
        const isTestnet = address.startsWith('kQ') || address.startsWith('0Q');

        res.json({
            success: true,
            isValid: isValid,
            isTestnet: isTestnet,
            address: address
        });

    } catch (error) {
        console.error('Address validation error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

module.exports = router;