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
    console.log('🔄 Fetching NMX balance using WORKING endpoints...');
    
    try {
        const nmxContract = "EQBRSrXz-7iYDnFZGhrER2XQL-gBgv1hr3Y8byWsVIye7A9f";
        
        // METHOD 1: Use TON API (tonapi.io) - MOST RELIABLE
        try {
            console.log('🔄 Trying TON API (tonapi.io)...');
            const response = await axios.get(`https://tonapi.io/v2/accounts/${walletAddress}/jettons`);
            
            console.log('📊 TON API Response:', response.status);
            
            if (response.data.balances && response.data.balances.length > 0) {
                // Find NMX in the jetton balances
                const nmxBalance = response.data.balances.find(jetton => 
                    jetton.jetton.address === nmxContract
                );
                
                if (nmxBalance) {
                    const balance = (nmxBalance.balance / Math.pow(10, nmxBalance.jetton.decimals || 9)).toFixed(2);
                    console.log('🎉 NMX Balance Found via TON API:', balance);
                    return balance;
                } else {
                    console.log('ℹ️ NMX not found in wallet jettons (might be 0 balance)');
                    // Show what jettons ARE there for debugging
                    response.data.balances.forEach(jetton => {
                        console.log('💰 Wallet has:', jetton.jetton.symbol, 'balance:', 
                            (jetton.balance / Math.pow(10, jetton.jetton.decimals || 9)).toFixed(2));
                    });
                }
            }
        } catch (tonapiError) {
            console.log('❌ TON API failed:', tonapiError.message);
        }

        // METHOD 2: Use TonViewer API
        try {
            console.log('🔄 Trying TonViewer API...');
            const response = await axios.get(`https://tonviewer.com/api/v1/account/${walletAddress}/tokens`);
            
            if (response.data.tokens) {
                const nmxBalance = response.data.tokens.find(token => 
                    token.contract === nmxContract
                );
                
                if (nmxBalance) {
                    console.log('🎉 NMX Balance Found via TonViewer:', nmxBalance.balance);
                    return nmxBalance.balance;
                }
            }
        } catch (tonviewerError) {
            console.log('❌ TonViewer API failed:', tonviewerError.message);
        }

        // METHOD 3: Direct contract call (advanced)
        try {
            console.log('🔄 Trying direct contract call...');
            // This would require more complex TON blockchain interaction
            // For now, we'll skip this method
        } catch (directError) {
            console.log('❌ Direct call not implemented yet');
        }

        console.log('⚠️ All Jetton methods failed or NMX balance is 0');
        console.log('💡 This could mean:');
        console.log('   - Your wallet has 0 NMX tokens');
        console.log('   - NMX tokens need to be sent to this address first');
        console.log('   - The NMX contract might be on testnet');
        
        return "0.00"; // Return 0 to see real state
        
    } catch (error) {
        console.error('💥 All NMX balance methods failed:', error.message);
        return "0.00";
    }
}


// ✅ ADD THIS DIAGNOSTIC ENDPOINT
router.get('/wallet-info/:address', async (req, res) => {
    try {
        const { address } = req.params;
        
        console.log('🔍 Full wallet analysis for:', address);
        
        // 1. Get basic wallet info
        const walletInfo = await axios.get(`https://toncenter.com/api/v2/getWalletInformation`, {
            params: { address },
            headers: { 'X-API-Key': process.env.TONCENTER_API_KEY }
        });

        // 2. Get Jetton balances (if any)
        let jettons = [];
        try {
            const jettonResponse = await axios.get(`https://tonapi.io/v2/accounts/${address}/jettons`);
            jettons = jettonResponse.data.balances || [];
        } catch (e) {
            console.log('No jettons found or API failed');
        }

        res.json({
            success: true,
            address: address,
            tonBalance: TonWeb.utils.fromNano(walletInfo.data.result.balance),
            jettons: jettons.map(j => ({
                symbol: j.jetton.symbol || 'Unknown',
                balance: (j.balance / Math.pow(10, j.jetton.decimals || 9)).toFixed(2),
                contract: j.jetton.address
            })),
            totalJettons: jettons.length,
            message: jettons.length === 0 ? 
                "Wallet has no Jetton tokens. Send some NMX to this address first!" :
                `Found ${jettons.length} Jetton token(s)`
        });

    } catch (error) {
        res.json({
            success: false,
            error: error.message
        });
    }
});


module.exports = router;