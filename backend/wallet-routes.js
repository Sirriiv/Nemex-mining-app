const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');
const crypto = require('crypto');
const bip39 = require('bip39');
const { mnemonicToWalletKey } = require('@ton/crypto');
const TonWeb = require('tonweb');

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
// REAL TON WALLET GENERATION WITH @ton/crypto
// =============================================

async function generateRealTONWallet(wordCount = 24) {
    try {
        // Generate secure mnemonic using bip39
        const strength = wordCount === 12 ? 128 : 256;
        const mnemonic = bip39.generateMnemonic(strength);

        // Convert mnemonic to key pair using @ton/crypto
        const keyPair = await mnemonicToWalletKey(mnemonic.split(' '));

        // Create wallet using tonweb
        const WalletClass = tonweb.wallet.all.v4R2;
        const wallet = new WalletClass(tonweb.provider, {
            publicKey: keyPair.publicKey,
            wc: 0
        });

        // Get wallet address
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

function decrypt(encryptedData) {
    try {
        const decipher = crypto.createDecipheriv(
            'aes-256-gcm', 
            Buffer.from(ENCRYPTION_KEY, 'hex'), 
            Buffer.from(encryptedData.iv, 'hex')
        );
        decipher.setAuthTag(Buffer.from(encryptedData.authTag, 'hex'));
        let decrypted = decipher.update(encryptedData.data, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
    } catch (error) {
        console.error('Decryption failed:', error);
        throw new Error('Decryption error');
    }
}

// =============================================
// BALANCE CONTROLLER FUNCTIONS
// =============================================

async function getRealBalance(address) {
    try {
        console.log('🔄 Fetching real balance for:', address);
        
        // Validate address format first
        if (!address.startsWith('EQ') && !address.startsWith('UQ')) {
            throw new Error('Invalid TON address format');
        }

        // Use toncenter API directly for better reliability
        const response = await axios.get('https://toncenter.com/api/v2/getAddressInformation', {
            params: { address: address },
            headers: {
                'X-API-Key': process.env.TONCENTER_API_KEY
            }
        });

        const balance = response.data.result.balance;
        const tonBalance = TonWeb.utils.fromNano(balance);

        return {
            success: true,
            balance: parseFloat(tonBalance).toFixed(4),
            address: address,
            rawBalance: balance.toString()
        };

    } catch (error) {
        console.error('❌ Balance check failed:', error.message);
        
        // Fallback to tonweb if direct API fails
        try {
            const balance = await tonweb.provider.getBalance(address);
            const tonBalance = TonWeb.utils.fromNano(balance);
            
            return {
                success: true,
                balance: parseFloat(tonBalance).toFixed(4),
                address: address,
                rawBalance: balance.toString()
            };
        } catch (fallbackError) {
            throw new Error(`Balance fetch failed: ${fallbackError.message}`);
        }
    }
}

async function getNMXBalance(address) {
    try {
        console.log('🔄 Fetching NMX balance for:', address);
        
        // Use the Jetton balances endpoint to get NMX balance
        const response = await axios.get('https://toncenter.com/api/v2/jetton/balances', {
            params: { 
                address: address 
            },
            headers: {
                'X-API-Key': process.env.TONCENTER_API_KEY
            }
        });

        // Find NMX token in the balances using YOUR contract address
        const nmxJetton = response.data.balances.find(j => 
            j.jetton.address === "0:514ab5f3fbb8980e71591a1ac44765d02fe80182fd61af763c6f25ac548c9eec"
        );

        if (nmxJetton) {
            // Convert balance from nano units (assuming 9 decimals like TON)
            const nmxBalance = TonWeb.utils.fromNano(nmxJetton.balance);
            return {
                success: true,
                balance: parseFloat(nmxBalance).toFixed(2),
                address: address,
                rawBalance: nmxJetton.balance,
                token: "NMX"
            };
        } else {
            // No NMX tokens found
            return {
                success: true,
                balance: "0",
                address: address,
                rawBalance: "0",
                token: "NMX"
            };
        }
        
    } catch (error) {
        console.error('❌ NMX balance check failed:', error.message);
        
        // Return zero balance as fallback
        return {
            success: true,
            balance: "0",
            address: address,
            rawBalance: "0",
            token: "NMX",
            error: error.message
        };
    }
}

async function getAllBalances(address) {
    try {
        console.log('🔄 Fetching all balances for:', address);
        
        const [tonBalance, nmxBalance] = await Promise.all([
            getRealBalance(address),
            getNMXBalance(address)
        ]);

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
        throw new Error(`Failed to fetch balances: ${error.message}`);
    }
}

// =============================================
// API ROUTES
// =============================================

// Generate new TON wallet
router.post('/generate-wallet', async (req, res) => {
    try {
        const { userId, wordCount = 24 } = req.body;

        console.log('🔄 Generating TON wallet with', wordCount, 'words...');

        const walletData = await generateRealTONWallet(wordCount);

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

        console.log('✅ Wallet generated successfully:', walletData.address);

        res.json({
            success: true,
            wallet: {
                address: walletData.address,
                mnemonic: walletData.mnemonic, // Return only once
                wordCount: walletData.mnemonic.split(' ').length,
                type: 'TON'
            },
            message: `TON wallet with ${wordCount} words generated successfully`
        });

    } catch (error) {
        console.error('❌ Wallet generation error:', error);
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

        console.log('🔄 Importing TON wallet...');

        // Validate mnemonic
        if (!bip39.validateMnemonic(mnemonic)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid mnemonic phrase. Must be valid BIP39 mnemonic.'
            });
        }

        // Generate wallet from mnemonic
        const keyPair = await mnemonicToWalletKey(mnemonic.split(' '));

        const WalletClass = tonweb.wallet.all.v4R2;
        const wallet = new WalletClass(tonweb.provider, {
            publicKey: keyPair.publicKey,
            wc: 0
        });

        const walletAddress = await wallet.getAddress();
        const address = walletAddress.toString(true, true, true);

        // Encrypt and store
        const encryptedMnemonic = encrypt(mnemonic);

        const { data, error } = await supabase
            .from('wallets')
            .insert([
                {
                    user_id: userId,
                    address: address,
                    encrypted_mnemonic: JSON.stringify(encryptedMnemonic),
                    public_key: TonWeb.utils.bytesToHex(keyPair.publicKey),
                    wallet_type: 'TON',
                    created_at: new Date().toISOString()
                }
            ]);

        if (error) throw error;

        console.log('✅ Wallet imported successfully:', address);

        res.json({
            success: true,
            wallet: {
                address: address,
                type: 'TON'
            },
            message: 'TON wallet imported successfully'
        });

    } catch (error) {
        console.error('❌ Wallet import error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Get real TON balance from blockchain - UPDATED
router.get('/real-balance/:address', async (req, res) => {
    try {
        const { address } = req.params;
        const result = await getRealBalance(address);
        res.json(result);
    } catch (error) {
        console.error('❌ Balance check error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Get NMX balance - NEW ENDPOINT
router.get('/nmx-balance/:address', async (req, res) => {
    try {
        const { address } = req.params;
        const result = await getNMXBalance(address);
        res.json(result);
    } catch (error) {
        console.error('❌ NMX balance error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Get all balances at once - NEW ENDPOINT
router.get('/all-balances/:address', async (req, res) => {
    try {
        const { address } = req.params;
        const result = await getAllBalances(address);
        res.json(result);
    } catch (error) {
        console.error('❌ All balances error:', error);
        res.status(500).json({
            success: false,
            error: error.message
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
            timestamp: tx.utime * 1000,
            status: 'confirmed'
        }));

        res.json({
            success: true,
            transactions: transactions
        });

    } catch (error) {
        console.error('❌ Transactions error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Validate TON address
router.get('/validate-address/:address', async (req, res) => {
    try {
        const { address } = req.params;

        const isValid = address.startsWith('EQ') || address.startsWith('UQ');
        const isTestnet = address.startsWith('kQ') || address.startsWith('0Q');

        res.json({
            success: true,
            isValid: isValid,
            isTestnet: isTestnet,
            address: address
        });

    } catch (error) {
        console.error('❌ Address validation error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Get supported tokens - UPDATED (TON as native, NMX as featured)
router.get('/supported-tokens', async (req, res) => {
    try {
        const tokens = [
            {
                symbol: "TON",
                name: "Toncoin",
                contract: "Native TON",
                decimals: 9,
                logo: "https://assets.coingecko.com/coins/images/17980/large/ton_symbol.png",
                price: 2.50,
                canSend: true,
                isNative: true,
                isFeatured: true
            },
            {
                symbol: "NMX",
                name: "NemexCoin",
                contract: "0:514ab5f3fbb8980e71591a1ac44765d02fe80182fd61af763c6f25ac548c9eec",
                decimals: 9,
                logo: "https://turquoise-obedient-frog-86.mypinata.cloud/ipfs/QmZo4rNnhhpWq6qQBkXBaAGqTdrawEzmW4w4QQsuMSjjW1",
                price: 0.10,
                canSend: true,
                isNative: false,
                isFeatured: true
            }
        ];

        res.json({
            success: true,
            tokens: tokens,
            primaryToken: "TON" // Changed to TON as primary
        });

    } catch (error) {
        console.error('❌ Supported tokens error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

module.exports = router;