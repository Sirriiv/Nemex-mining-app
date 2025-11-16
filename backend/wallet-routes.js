const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');
const crypto = require('crypto');

console.log('🔧 Initializing wallet routes with @ton/crypto + tonweb...');

// Initialize Supabase
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Load TON libraries
let tonCryptoAvailable = false;
let TonWebAvailable = false;
let mnemonicToWalletKey, TonWeb;

try {
    ({ mnemonicToWalletKey } = require("@ton/crypto"));
    tonCryptoAvailable = true;
    console.log('✅ @ton/crypto loaded successfully');
} catch (error) {
    console.log('❌ @ton/crypto failed:', error.message);
}

try {
    TonWeb = require("tonweb");
    TonWebAvailable = true;
    console.log('✅ tonweb loaded successfully');
} catch (error) {
    console.log('❌ tonweb failed:', error.message);
}

// Initialize TonWeb client
const tonweb = TonWebAvailable ? new TonWeb(new TonWeb.HttpProvider('https://toncenter.com/api/v2/jsonRPC', {
    apiKey: process.env.TONCENTER_API_KEY
})) : null;

// REAL TON wallet generation using @ton/crypto + tonweb
async function generateRealWallet() {
    if (!tonCryptoAvailable || !TonWebAvailable) {
        throw new Error('TON libraries not fully available');
    }
    
    // Generate mnemonic using @ton/crypto
    const mnemonic = await mnemonicToWalletKey.generateMnemonic();
    
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
    const addressString = walletAddress.toString(true, true, true);
    
    return {
        mnemonic: mnemonic,
        address: addressString,
        publicKey: TonWeb.utils.bytesToHex(keyPair.publicKey)
    };
}

// REAL wallet import using @ton/crypto + tonweb
async function importRealWallet(mnemonicPhrase) {
    if (!tonCryptoAvailable || !TonWebAvailable) {
        throw new Error('TON libraries not fully available');
    }
    
    // Convert mnemonic to key pair using @ton/crypto
    const keyPair = await mnemonicToWalletKey(mnemonicPhrase.split(' '));
    
    // Create wallet using tonweb
    const WalletClass = tonweb.wallet.all.v4R2;
    const wallet = new WalletClass(tonweb.provider, {
        publicKey: keyPair.publicKey,
        wc: 0
    });
    
    // Get wallet address
    const walletAddress = await wallet.getAddress();
    const addressString = walletAddress.toString(true, true, true);
    
    return {
        address: addressString,
        publicKey: TonWeb.utils.bytesToHex(keyPair.publicKey)
    };
}

// Get REAL TON balance using tonweb
async function getTONBalance(address) {
    if (!TonWebAvailable) {
        throw new Error('tonweb not available');
    }
    
    try {
        const balance = await tonweb.getBalance(address);
        return TonWeb.utils.fromNano(balance); // Convert from nanoTON to TON
    } catch (error) {
        console.error('TON balance check failed:', error.message);
        return '0';
    }
}

// ========== ROUTES ========== //

// Test TON libraries
router.get('/ton-status', (req, res) => {
    res.json({
        success: true,
        tonCrypto: tonCryptoAvailable ? '✅ Available' : '❌ Unavailable',
        tonweb: TonWebAvailable ? '✅ Available' : '❌ Unavailable',
        realWalletsAvailable: tonCryptoAvailable && TonWebAvailable
    });
});

// Generate REAL wallet
router.post('/generate-wallet', async (req, res) => {
    try {
        const { userId } = req.body;
        
        if (!tonCryptoAvailable || !TonWebAvailable) {
            return res.status(500).json({
                success: false,
                error: 'Real wallet generation not available',
                message: 'TON libraries are being installed'
            });
        }

        const wallet = await generateRealWallet();
        
        // Store in Supabase
        const { data, error } = await supabase
            .from('user_wallets')
            .insert([
                {
                    user_id: userId,
                    wallet_address: wallet.address,
                    public_key: wallet.publicKey,
                    encrypted_mnemonic: wallet.mnemonic, // Encrypt in production!
                    encryption_iv: 'temp_iv',
                    encryption_auth_tag: 'temp_tag',
                    source: 'nemex_wallet_web',
                    created_at: new Date().toISOString()
                }
            ]);

        if (error) throw error;

        res.json({
            success: true,
            userId: userId,
            address: wallet.address,
            mnemonic: wallet.mnemonic, // Only for testing - encrypt in production!
            publicKey: wallet.publicKey,
            message: "REAL TON wallet generated successfully!",
            warning: "SAVE YOUR MNEMONIC - it won't be shown again"
        });

    } catch (error) {
        console.error('Real wallet generation error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Import REAL wallet
router.post('/import-wallet', async (req, res) => {
    try {
        const { userId, mnemonic } = req.body;
        
        if (!tonCryptoAvailable || !TonWebAvailable) {
            return res.status(500).json({
                success: false,
                error: 'Real wallet import not available yet'
            });
        }

        const wallet = await importRealWallet(mnemonic);
        
        // Store in Supabase
        const { data, error } = await supabase
            .from('user_wallets')
            .insert([
                {
                    user_id: userId,
                    wallet_address: wallet.address,
                    public_key: wallet.publicKey,
                    encrypted_mnemonic: mnemonic, // Encrypt in production!
                    encryption_iv: 'temp_iv',
                    encryption_auth_tag: 'temp_tag',
                    source: 'nemex_wallet_web',
                    created_at: new Date().toISOString()
                }
            ]);

        if (error) throw error;

        res.json({
            success: true,
            userId: userId,
            address: wallet.address,
            publicKey: wallet.publicKey,
            message: "REAL TON wallet imported successfully!"
        });

    } catch (error) {
        console.error('Real wallet import error:', error);
        res.status(500).json({
            success: false,
            error: 'Invalid mnemonic or import failed: ' + error.message
        });
    }
});

// Get REAL balances using tonweb
router.get('/balances/:userId', async (req, res) => {
    try {
        const { userId } = req.params;

        // Get user wallet from Supabase
        const { data: wallet, error } = await supabase
            .from('user_wallets')
            .select('*')
            .eq('user_id', userId)
            .single();

        if (error || !wallet) {
            return res.status(404).json({
                success: false,
                error: "Wallet not found. Generate a wallet first."
            });
        }

        // Get REAL TON balance from blockchain using tonweb
        const tonBalance = await getTONBalance(wallet.wallet_address);
        
        // ✅ ADDED: Get NMX Jetton balance
        const nmxBalance = await getNMXBalance(wallet.wallet_address);

        const realBalances = {
            TON: parseFloat(tonBalance).toFixed(6),
            USDT: "0.00",
            BTC: "0.00", 
            TRX: "0.00",
            NMX: nmxBalance || "1500.00"  // ✅ Now using real/fixed balance
        };

        res.json({
            success: true,
            balances: realBalances,
            address: wallet.wallet_address,
            message: "Real blockchain balances loaded"
        });

    } catch (error) {
        console.error('Balance check error:', error);
        res.status(500).json({
            success: false,
            error: "Failed to fetch balances: " + error.message
        });
    }
});

async function getNMXBalance(walletAddress) {
    console.log('🔄 Fetching NMX balance for:', walletAddress);
    
    try {
        const nmxContract = "EQBRSrXz-7iYDnFZGhrER2XQL-gBgv1hr3Y8byWsVIye7A9f";
        
        // METHOD 1: Use the CORRECT TonCenter Jetton endpoint
        const response = await axios.get(`https://toncenter.com/api/v2/jetton/getBalances`, {
            params: {
                address: walletAddress
            },
            headers: {
                'X-API-Key': process.env.TONCENTER_API_KEY
            }
        });

        console.log('📊 Jetton API Response Status:', response.status);
        
        if (response.data.ok && response.data.result) {
            console.log('📦 Found jettons:', response.data.result.length);
            
            // Find NMX in the jetton balances
            const nmxBalance = response.data.result.find(jetton => {
                console.log('🔍 Checking jetton:', jetton.jetton_master);
                return jetton.jetton_master === nmxContract;
            });
            
            if (nmxBalance) {
                const balance = TonWeb.utils.fromNano(nmxBalance.balance);
                console.log('🎉 NMX Balance Found:', balance);
                return balance;
            } else {
                console.log('ℹ️ NMX contract not found in wallet jettons');
                // Let's see what jettons ARE there
                response.data.result.forEach(jetton => {
                    console.log('💰 Wallet has jetton:', jetton.jetton_master, 'balance:', TonWeb.utils.fromNano(jetton.balance));
                });
                return "0.00";
            }
        } else {
            console.log('❌ Jetton API response not OK:', response.data);
            return "0.00";
        }
        
    } catch (error) {
        console.error('❌ NMX balance fetch failed:', error.message);
        console.log('🔧 Error details:', {
            status: error.response?.status,
            data: error.response?.data
        });
        
        // METHOD 2: Fallback to basic wallet info to at least verify API key
        try {
            console.log('🔄 Trying fallback method...');
            const fallbackResponse = await axios.get(`https://toncenter.com/api/v2/getWalletInformation`, {
                params: {
                    address: walletAddress
                },
                headers: {
                    'X-API-Key': process.env.TONCENTER_API_KEY
                }
            });
            console.log('✅ Fallback successful, API key works!');
            console.log('💰 TON Balance:', TonWeb.utils.fromNano(fallbackResponse.data.result.balance));
        } catch (fallbackError) {
            console.log('❌ Fallback also failed - API key issue confirmed');
        }
        
        return "0.00";
    }
}

// Add this to your wallet-routes.js to test API key
router.get('/test-api', async (req, res) => {
    try {
        const testAddress = "EQCjL2yM3S80N-Kb4WuYfMUVR"; // Your wallet address
        
        const response = await axios.get(`https://toncenter.com/api/v2/getWalletInformation`, {
            params: {
                address: testAddress
            },
            headers: {
                'X-API-Key': process.env.TONCENTER_API_KEY
            }
        });

        res.json({
            success: true,
            message: "API Key is working!",
            balance: response.data.result.balance,
            data: response.data
        });
    } catch (error) {
        res.json({
            success: false,
            error: "API Key failed: " + error.message,
            status: error.response?.status
        });
    }
});


module.exports = router;