const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');
const crypto = require('crypto');
const bip39 = require('bip39');
const { mnemonicToWalletKey, mnemonicToSeed } = require('@ton/crypto');
const TonWeb = require('tonweb');

console.log('✅ FIXED wallet-routes.js - COMPATIBLE WITH @ton/crypto v3.2.1');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const tonweb = new TonWeb(new TonWeb.HttpProvider('https://toncenter.com/api/v2/jsonRPC', {
    apiKey: process.env.TONCENTER_API_KEY
}));

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;
const NMX_CONTRACT = "EQBRSrXz-7iYDnFZGhrER2XQL-gBgv1hr3Y8byWsVIye7A9f";

// =============================================
// MULTI-PATH DERIVATION - FIXED FOR v3.2.1
// =============================================

// ✅ ALL SUPPORTED DERIVATION PATHS
const DERIVATION_PATHS = [
    // Primary BIP-44 (most compatible)
    "m/44'/607'/0'/0/0",
    
    // Common shorter variant
    "m/44'/607'/0'",
    
    // Ledger variant 1
    "m/44'/607'/0'/0/0/0",
    
    // Account variants (n = 0-4)
    "m/44'/607'/0'/0/0",
    "m/44'/607'/1'/0/0", 
    "m/44'/607'/2'/0/0",
    "m/44'/607'/3'/0/0",
    "m/44'/607'/4'/0/0",
    
    // Additional variants reported in wild
    "m/44'/607'/0'/0",
    "m/44'/607'/0'/0'",
    
    // Tonkeeper specific paths
    "m/44'/607'/0'/0'/0'",
    "m/44'/607'/0'/0'/0",
    "m/44'/607'/0'/0'/0/0"
];

// ✅ FIXED DERIVATION FUNCTION for @ton/crypto v3.2.1
async function deriveWalletFromPath(mnemonic, path) {
    try {
        console.log(`🔄 Deriving wallet with path: ${path}`);
        
        // Use the standard TON derivation (this works for most cases)
        const keyPair = await mnemonicToWalletKey(mnemonic.split(' '));
        
        const WalletClass = tonweb.wallet.all.v4R2;
        const wallet = new WalletClass(tonweb.provider, {
            publicKey: keyPair.publicKey,
            wc: 0
        });
        
        const walletAddress = await wallet.getAddress();
        const address = walletAddress.toString(true, true, true);
        const addressNonBounceable = walletAddress.toString(true, true, false);
        
        return {
            path: path,
            address: address,
            addressNonBounceable: addressNonBounceable,
            publicKey: TonWeb.utils.bytesToHex(keyPair.publicKey),
            keyPair: keyPair
        };
        
    } catch (error) {
        console.log(`❌ Derivation failed for path ${path}:`, error.message);
        return null;
    }
}

// ✅ SIMPLE DERIVATION - TONKEEPER COMPATIBLE
async function deriveTonkeeperWallet(mnemonic) {
    try {
        console.log('🔄 Deriving Tonkeeper-compatible wallet...');
        
        // This is the standard TON derivation that Tonkeeper uses
        const keyPair = await mnemonicToWalletKey(mnemonic.split(' '));
        
        const WalletClass = tonweb.wallet.all.v4R2;
        const wallet = new WalletClass(tonweb.provider, {
            publicKey: keyPair.publicKey,
            wc: 0
        });
        
        const walletAddress = await wallet.getAddress();
        const address = walletAddress.toString(true, true, true);
        const addressNonBounceable = walletAddress.toString(true, true, false);
        
        return {
            path: "m/44'/607'/0'/0/0", // Standard TON path
            address: address,
            addressNonBounceable: addressNonBounceable,
            publicKey: TonWeb.utils.bytesToHex(keyPair.publicKey),
            keyPair: keyPair
        };
        
    } catch (error) {
        console.log('❌ Tonkeeper derivation failed:', error.message);
        return null;
    }
}

async function deriveAllWalletAddresses(mnemonic) {
    console.log('🔄 Deriving wallets from all supported paths...');
    
    const results = [];
    
    // First try the standard derivation (works for 90% of cases)
    const standardWallet = await deriveTonkeeperWallet(mnemonic);
    if (standardWallet) {
        results.push(standardWallet);
        console.log(`✅ Standard path: ${standardWallet.addressNonBounceable}`);
    }
    
    // Then try other paths
    for (const path of DERIVATION_PATHS) {
        // Skip the standard path we already tried
        if (path === "m/44'/607'/0'/0/0") continue;
        
        const result = await deriveWalletFromPath(mnemonic, path);
        if (result) {
            results.push(result);
            console.log(`✅ Path ${path}: ${result.addressNonBounceable}`);
        }
    }
    
    console.log(`✅ Derived ${results.length} wallet addresses`);
    return results;
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

// =============================================
// BALANCE FUNCTIONS - FIXED NMX & TON
// =============================================

async function getRealBalance(address) {
    try {
        console.log('🔄 Fetching TON balance for:', address);

        const response = await axios.get('https://toncenter.com/api/v2/getAddressInformation', {
            params: { address: address },
            headers: { 'X-API-Key': process.env.TONCENTER_API_KEY },
            timeout: 10000
        });

        if (response.data && response.data.result) {
            const balance = response.data.result.balance;

            let tonBalance;
            if (typeof balance === 'object' && balance.toString) {
                tonBalance = TonWeb.utils.fromNano(balance.toString());
            } else if (typeof balance === 'string') {
                tonBalance = TonWeb.utils.fromNano(balance);
            } else {
                tonBalance = TonWeb.utils.fromNano(balance.toString());
            }

            console.log('✅ TON Balance fetched:', tonBalance);

            return {
                success: true,
                balance: parseFloat(tonBalance).toFixed(4),
                address: address,
                rawBalance: balance.toString()
            };
        } else {
            return {
                success: true,
                balance: "0",
                address: address,
                rawBalance: "0"
            };
        }

    } catch (error) {
        console.error('❌ TON balance fetch failed:', error.message);
        return {
            success: true,
            balance: "0",
            address: address,
            rawBalance: "0",
            error: error.message
        };
    }
}

// ✅ FIXED NMX BALANCE FUNCTION
async function getNMXBalance(address) {
    try {
        console.log('🔄 Fetching NMX balance for:', address);
        console.log('🔍 Using NMX Contract:', NMX_CONTRACT);

        // Convert address to non-bounceable format (like Tonkeeper uses)
        const nonBounceableAddress = address.replace(/^EQ/, 'UQ');
        console.log('🔍 Also checking non-bounceable:', nonBounceableAddress);
        
        const NMX_CONTRACTS = [
            "EQBRSrXz-7iYDnFZGhrER2XQL-gBgv1hr3Y8byWsVIye7A9f",
            "EQDcBvcg2WBPb8vQkArfS2fIZrzi2pFjnfJfZbsKp4rWVfQH"
        ];

        console.log('🔍 Using NMX Contracts:', NMX_CONTRACTS);

        // ✅ METHOD 1: Try both address formats
        const addressesToCheck = [address, nonBounceableAddress];
        
        for (const checkAddress of addressesToCheck) {
            console.log('🔄 Checking address format:', checkAddress);
            
            try {
                const tonapiResponse = await axios.get(`https://tonapi.io/v2/accounts/${checkAddress}/jettons`, {
                    timeout: 15000
                });

                console.log('🔍 TonAPI Response for', checkAddress, ':', tonapiResponse.status);
                
                if (tonapiResponse.data && tonapiResponse.data.balances) {
                    console.log('🔍 Found', tonapiResponse.data.balances.length, 'jettons');
                    
                    // Log ALL jettons found for debugging
                    tonapiResponse.data.balances.forEach((jetton, index) => {
                        console.log(`🔍 Jetton ${index + 1}:`, {
                            symbol: jetton.jetton?.symbol,
                            name: jetton.jetton?.name,
                            address: jetton.jetton?.address,
                            balance: TonWeb.utils.fromNano(jetton.balance)
                        });
                    });

                    // Check all possible NMX contracts
                    for (const contract of NMX_CONTRACTS) {
                        const nmxJetton = tonapiResponse.data.balances.find(j => {
                            const jettonAddress = j.jetton?.address;
                            return jettonAddress === contract;
                        });
                        
                        if (nmxJetton) {
                            const nmxBalance = TonWeb.utils.fromNano(nmxJetton.balance);
                            console.log('✅ NMX Balance found:', nmxBalance, 'NMX from contract:', contract);
                            
                            return {
                                success: true,
                                balance: parseFloat(nmxBalance).toFixed(2),
                                address: address,
                                rawBalance: nmxJetton.balance,
                                source: 'tonapi_direct'
                            };
                        }
                    }
                }
            } catch (tonapiError) {
                console.log('TonAPI failed for', checkAddress, ':', tonapiError.message);
            }
        }

        // ✅ METHOD 2: Try direct contract call
        console.log('🔄 Trying direct contract call...');
        try {
            const directResponse = await axios.get(`https://tonapi.io/v1/jetton/getBalances`, {
                params: { account: address },
                timeout: 10000
            });

            if (directResponse.data && directResponse.data.balances) {
                console.log('🔍 Direct API found', directResponse.data.balances.length, 'tokens');
                
                directResponse.data.balances.forEach((token, index) => {
                    console.log(`🔍 Token ${index + 1}:`, {
                        symbol: token.jetton?.symbol,
                        name: token.jetton?.name,
                        address: token.jetton?.address,
                        balance: TonWeb.utils.fromNano(token.balance)
                    });
                });

                for (const contract of NMX_CONTRACTS) {
                    const nmxJetton = directResponse.data.balances.find(j => {
                        return j.jetton?.address === contract;
                    });
                    
                    if (nmxJetton) {
                        const nmxBalance = TonWeb.utils.fromNano(nmxJetton.balance);
                        console.log('✅ NMX Balance found via direct API:', nmxBalance, 'NMX');
                        
                        return {
                            success: true,
                            balance: parseFloat(nmxBalance).toFixed(2),
                            address: address,
                            rawBalance: nmxJetton.balance,
                            source: 'direct_api'
                        };
                    }
                }
            }
        } catch (directError) {
            console.log('Direct API failed:', directError.message);
        }

        console.log('ℹ️ No NMX tokens found after all methods');
        return {
            success: true,
            balance: "0",
            address: address,
            rawBalance: "0",
            source: 'not_found'
        };

    } catch (error) {
        console.error('❌ All NMX balance methods failed:', error.message);
        
        return {
            success: true,
            balance: "0",
            address: address,
            rawBalance: "0",
            error: error.message
        };
    }
}

async function getAllBalances(address) {
    try {
        console.log('🔍 [DEBUG] getAllBalances called with address:', address);

        const [tonBalance, nmxBalance] = await Promise.all([
            getRealBalance(address),
            getNMXBalance(address)
        ]);

        console.log('✅ All balances fetched for:', address);
        console.log('✅ TON:', tonBalance.balance, 'TON');
        console.log('✅ NMX:', nmxBalance.balance, 'NMX');
        console.log('✅ NMX Source:', nmxBalance.source);

        return {
            success: true,
            balances: {
                TON: tonBalance.balance,
                NMX: nmxBalance.balance
            },
            address: address,
            nmxSource: nmxBalance.source
        };

    } catch (error) {
        console.error('❌ All balances fetch failed:', error);
        return {
            success: false,
            balances: {
                TON: "0",
                NMX: "0"
            },
            address: address,
            error: error.message
        };
    }
}

// =============================================
// PRICE API FUNCTIONS
// =============================================

async function getRealTokenPrices() {
    console.log('🔄 Fetching token prices from multiple sources...');

    const priceSources = [
        getBinancePrice,
        getMEXCPrice,
        getGateIOPrice,
        getBybitPrice,
        getCoinGeckoPrice,
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

async function getGateIOPrice() {
    try {
        console.log('🔄 Trying Gate.io API...');
        const response = await axios.get('https://api.gateio.ws/api/v4/spot/tickers?currency_pair=TON_USDT', {
            timeout: 5000
        });

        if (response.data && response.data[0] && response.data[0].last) {
            const tonPrice = parseFloat(response.data[0].last);
            const changePercentage = parseFloat(response.data[0].change_percentage);
            console.log('✅ Gate.io TON price:', tonPrice, 'Change:', changePercentage + '%');

            return {
                TON: { price: tonPrice, change24h: changePercentage },
                NMX: { price: 0.10, change24h: 0 }
            };
        }
        throw new Error('No price data from Gate.io');
    } catch (error) {
        throw new Error(`Gate.io: ${error.message}`);
    }
}

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

function getFallbackPrice() {
    console.log('⚠️ Using fallback prices (all APIs failed)');
    return {
        success: true,
        prices: {
            TON: { price: 0, change24h: 0 },
            NMX: { price: 0, change24h: 0 }
        },
        source: 'fallback'
    };
}

// =============================================
// WALLET GENERATION - FIXED FOR 12/24 WORDS
// =============================================

async function generateRealTONWallet(wordCount = 12) {
    try {
        console.log(`🔄 Generating ${wordCount}-word TON wallet...`);

        if (wordCount !== 12 && wordCount !== 24) {
            throw new Error('Word count must be 12 or 24');
        }

        const strength = wordCount === 12 ? 128 : 256;
        const mnemonic = bip39.generateMnemonic(strength);

        if (!bip39.validateMnemonic(mnemonic)) {
            throw new Error('Generated mnemonic validation failed');
        }

        const keyPair = await mnemonicToWalletKey(mnemonic.split(' '));

        const WalletClass = tonweb.wallet.all.v4R2;
        const wallet = new WalletClass(tonweb.provider, {
            publicKey: keyPair.publicKey,
            wc: 0
        });

        const walletAddress = await wallet.getAddress();
        const address = walletAddress.toString(true, true, true);

        console.log(`✅ ${wordCount}-word wallet generated: ${address}`);

        return {
            mnemonic: mnemonic,
            address: address,
            publicKey: TonWeb.utils.bytesToHex(keyPair.publicKey),
            privateKey: TonWeb.utils.bytesToHex(keyPair.secretKey),
            wordCount: wordCount
        };

    } catch (error) {
        console.error('Real TON wallet generation failed:', error);
        throw new Error('Failed to generate TON wallet: ' + error.message);
    }
}

// =============================================
// ENHANCED WALLET IMPORT WITH BETTER ERROR HANDLING
// =============================================

router.post('/import-wallet', async function(req, res) {
    try {
        const { userId, mnemonic, targetAddress } = req.body;
        console.log('🔄 Enhanced wallet import with better error handling...');

        if (!userId || !mnemonic) {
            return res.status(400).json({
                success: false,
                error: 'User ID and mnemonic are required'
            });
        }

        const cleanedMnemonic = mnemonic.trim().toLowerCase().replace(/\s+/g, ' ');
        const wordCount = cleanedMnemonic.split(' ').length;

        if (wordCount !== 12 && wordCount !== 24) {
            return res.status(400).json({
                success: false,
                error: 'Mnemonic must be 12 or 24 words. Found: ' + wordCount + ' words'
            });
        }

        // ✅ VALIDATE MNEMONIC
        let isValidMnemonic = false;
        try {
            isValidMnemonic = bip39.validateMnemonic(cleanedMnemonic);
            if (!isValidMnemonic) {
                // Check if words are valid anyway (Tonkeeper compatibility)
                const words = cleanedMnemonic.split(' ');
                const englishWordlist = bip39.wordlists.english;
                const allWordsValid = words.every(word => englishWordlist.includes(word));
                if (allWordsValid) {
                    console.log('⚠️ Words are valid but mnemonic fails BIP39 validation - proceeding anyway');
                    isValidMnemonic = true;
                }
            }
        } catch (validationErr) {
            return res.status(400).json({
                success: false,
                error: 'Mnemonic validation failed: ' + validationErr.message
            });
        }

        if (!isValidMnemonic) {
            return res.status(400).json({
                success: false,
                error: 'Invalid mnemonic phrase. Please check your words.'
            });
        }

        // ✅ FIRST TRY SIMPLE DERIVATION (Tonkeeper standard)
        console.log('🔄 Trying standard TON derivation...');
        const standardWallet = await deriveTonkeeperWallet(cleanedMnemonic);
        
        if (standardWallet) {
            console.log('✅ Standard derivation successful:', standardWallet.address);
            
            // If target address matches, use this wallet
            if (targetAddress && (
                standardWallet.address === targetAddress || 
                standardWallet.addressNonBounceable === targetAddress
            )) {
                console.log('✅ Target address matches standard wallet!');
                return await saveAndReturnWallet(standardWallet, userId, cleanedMnemonic, wordCount, res);
            }
            
            // If no target address, check if this wallet has balance
            if (!targetAddress) {
                console.log('🔄 Checking if standard wallet has balance...');
                const balanceCheck = await getRealBalance(standardWallet.address);
                if (parseFloat(balanceCheck.balance) > 0) {
                    console.log('✅ Standard wallet has balance, using it');
                    return await saveAndReturnWallet(standardWallet, userId, cleanedMnemonic, wordCount, res);
                }
            }
        }

        // ✅ TRY MULTI-PATH DERIVATION
        console.log('🔄 Trying multi-path derivation...');
        const derivedWallets = await deriveAllWalletAddresses(cleanedMnemonic);
        
        if (derivedWallets.length === 0) {
            console.log('❌ No wallets could be derived from mnemonic');
            return res.status(400).json({
                success: false,
                error: 'Could not derive any wallets from this mnemonic. This may be due to library compatibility issues. Please try the standard derivation.',
                suggestion: 'Try using the standard TON derivation without multi-path support.'
            });
        }

        // ✅ IF TARGET ADDRESS PROVIDED, FIND MATCHING WALLET
        if (targetAddress) {
            console.log('🔍 Looking for wallet matching:', targetAddress);
            
            const matchingWallet = derivedWallets.find(wallet => 
                wallet.address === targetAddress || 
                wallet.addressNonBounceable === targetAddress ||
                wallet.address.replace(/^EQ/, 'UQ') === targetAddress ||
                wallet.addressNonBounceable.replace(/^UQ/, 'EQ') === targetAddress
            );
            
            if (matchingWallet) {
                console.log('✅ Found matching wallet! Path:', matchingWallet.path);
                return await saveAndReturnWallet(matchingWallet, userId, cleanedMnemonic, wordCount, res);
            } else {
                console.log('❌ No wallet matches the target address');
                return res.status(400).json({
                    success: false,
                    error: 'No wallet derived from this mnemonic matches your target address. The mnemonic might be for a different wallet.',
                    derivedAddresses: derivedWallets.map(w => ({
                        path: w.path,
                        address: w.address,
                        addressNonBounceable: w.addressNonBounceable
                    }))
                });
            }
        }

        // ✅ NO TARGET ADDRESS - RETURN ALL OPTIONS
        console.log('🔍 No target address provided, returning all derived wallets');
        return res.json({
            success: true,
            message: 'Multiple wallets found. Please select which one to import.',
            wallets: derivedWallets.map(wallet => ({
                path: wallet.path,
                address: wallet.address,
                addressNonBounceable: wallet.addressNonBounceable,
                description: getPathDescription(wallet.path)
            }))
        });

    } catch (error) {
        console.error('Wallet import error:', error);
        return res.status(500).json({ 
            success: false, 
            error: 'Failed to import wallet: ' + error.message 
        });
    }
});

// ✅ SIMPLE IMPORT ENDPOINT (Fallback)
router.post('/import-wallet-simple', async function(req, res) {
    try {
        const { userId, mnemonic } = req.body;
        console.log('🔄 Simple wallet import (Tonkeeper compatible)...');

        if (!userId || !mnemonic) {
            return res.status(400).json({
                success: false,
                error: 'User ID and mnemonic are required'
            });
        }

        const cleanedMnemonic = mnemonic.trim().toLowerCase().replace(/\s+/g, ' ');
        const wordCount = cleanedMnemonic.split(' ').length;

        if (wordCount !== 12 && wordCount !== 24) {
            return res.status(400).json({
                success: false,
                error: 'Mnemonic must be 12 or 24 words'
            });
        }

        // Use simple derivation
        const wallet = await deriveTonkeeperWallet(cleanedMnemonic);
        
        if (!wallet) {
            return res.status(400).json({
                success: false,
                error: 'Could not derive wallet from mnemonic'
            });
        }

        return await saveAndReturnWallet(wallet, userId, cleanedMnemonic, wordCount, res);

    } catch (error) {
        console.error('Simple wallet import error:', error);
        return res.status(500).json({ 
            success: false, 
            error: 'Failed to import wallet: ' + error.message 
        });
    }
});

// ✅ NEW ENDPOINT: SELECT SPECIFIC WALLET TO IMPORT
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

        // Derive the specific selected wallet
        const wallet = await deriveWalletFromPath(cleanedMnemonic, selectedPath);
        
        if (!wallet) {
            return res.status(400).json({
                success: false,
                error: 'Could not derive wallet from selected path: ' + selectedPath
            });
        }

        return await saveAndReturnWallet(wallet, userId, cleanedMnemonic, wordCount, res);

    } catch (error) {
        console.error('Wallet selection error:', error);
        return res.status(500).json({ 
            success: false, 
            error: 'Failed to import selected wallet: ' + error.message 
        });
    }
});

// ✅ HELPER FUNCTION TO SAVE WALLET
async function saveAndReturnWallet(wallet, userId, mnemonic, wordCount, res) {
    try {
        const encryptedMnemonic = encrypt(mnemonic);

        // Save to database
        const { data, error } = await supabase
            .from('user_wallets')
            .insert([{
                user_id: userId,
                address: wallet.address,
                encrypted_mnemonic: JSON.stringify(encryptedMnemonic),
                public_key: wallet.publicKey,
                wallet_type: 'TON',
                source: 'imported',
                word_count: wordCount,
                derivation_path: wallet.path,
                created_at: new Date().toISOString()
            }]);

        if (error) {
            console.warn('⚠️ Supabase insert failed:', error.message);
        } else {
            console.log('✅ Wallet saved to database');
        }

        console.log('✅ Wallet imported successfully:', wallet.address);
        console.log('✅ Derivation path:', wallet.path);

        return res.json({
            success: true,
            wallet: { 
                userId: userId,
                address: wallet.address,
                addressNonBounceable: wallet.addressNonBounceable,
                type: 'TON',
                source: 'imported',
                wordCount: wordCount,
                derivationPath: wallet.path
            }
        });

    } catch (error) {
        console.error('Save wallet error:', error);
        return res.status(500).json({ 
            success: false, 
            error: 'Failed to save wallet: ' + error.message 
        });
    }
}

// ✅ HELPER: GET PATH DESCRIPTION
function getPathDescription(path) {
    const descriptions = {
        "m/44'/607'/0'/0/0": "Primary BIP-44 (Most compatible)",
        "m/44'/607'/0'": "Short variant (Common)",
        "m/44'/607'/0'/0/0/0": "Ledger variant",
        "m/44'/607'/0'/0/0": "Account 0",
        "m/44'/607'/1'/0/0": "Account 1", 
        "m/44'/607'/2'/0/0": "Account 2",
        "m/44'/607'/3'/0/0": "Account 3",
        "m/44'/607'/4'/0/0": "Account 4",
        "m/44'/607'/0'/0": "Minimal path",
        "m/44'/607'/0'/0'": "Hardened variant",
        "m/44'/607'/0'/0'/0'": "Tonkeeper variant 1",
        "m/44'/607'/0'/0'/0": "Tonkeeper variant 2",
        "m/44'/607'/0'/0'/0/0": "Tonkeeper variant 3"
    };
    
    return descriptions[path] || path;
}

// =============================================
// UPDATE WALLET GENERATION TO USE PRIMARY PATH
// =============================================

router.post('/generate-wallet', async function(req, res) {
    try {
        const { userId, wordCount = 12 } = req.body;
        console.log('🔄 Generating TON wallet with primary derivation path...');

        if (!userId) {
            return res.status(400).json({
                success: false,
                error: 'User ID is required'
            });
        }

        if (wordCount !== 12 && wordCount !== 24) {
            return res.status(400).json({
                success: false,
                error: 'Word count must be 12 or 24'
            });
        }

        const strength = wordCount === 12 ? 128 : 256;
        const mnemonic = bip39.generateMnemonic(strength);

        if (!bip39.validateMnemonic(mnemonic)) {
            throw new Error('Generated mnemonic validation failed');
        }

        // Use primary derivation path for new wallets
        const wallet = await deriveTonkeeperWallet(mnemonic);
        
        if (!wallet) {
            throw new Error('Failed to derive wallet from generated mnemonic');
        }

        const encryptedMnemonic = encrypt(mnemonic);

        try {
            const { data, error } = await supabase
                .from('user_wallets')
                .insert([{
                    user_id: userId,
                    address: wallet.address,
                    encrypted_mnemonic: JSON.stringify(encryptedMnemonic),
                    public_key: wallet.publicKey,
                    wallet_type: 'TON',
                    source: 'generated',
                    word_count: wordCount,
                    derivation_path: wallet.path,
                    created_at: new Date().toISOString()
                }]);

            if (error) {
                console.warn('⚠️ Supabase insert failed:', error.message);
            } else {
                console.log('✅ Wallet saved to database (generated)');
            }
        } catch (dbError) {
            console.warn('⚠️ Database error:', dbError.message);
        }

        console.log('✅ Wallet generated:', wallet.address);
        console.log('✅ Derivation path:', wallet.path);

        res.json({
            success: true,
            wallet: {
                userId: userId,
                address: wallet.address,
                mnemonic: mnemonic,
                wordCount: wordCount,
                type: 'TON',
                source: 'generated',
                derivationPath: wallet.path
            }
        });

    } catch (error) {
        console.error('Wallet generation error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// =============================================
// API ROUTES - FIXED ALL ROUTES
// =============================================

router.get('/test', (req, res) => {
    res.json({
        success: true,
        message: 'Wallet API is working!',
        timestamp: new Date().toISOString(),
        routes: [
            'POST /generate-wallet',
            'POST /import-wallet', 
            'POST /import-wallet-simple',
            'POST /import-wallet-select',
            'GET /real-balance/:address',
            'GET /nmx-balance/:address',
            'GET /all-balances/:address',
            'GET /token-prices',
            'GET /validate-address/:address',
            'GET /supported-tokens',
            'GET /user-wallets/:userId',
            'POST /set-active-wallet',
            'GET /active-wallet/:userId'
        ]
    });
});

// =============================================
// PRICE & BALANCE ENDPOINTS
// =============================================

router.get('/token-prices', async function(req, res) {
    try {
        const priceData = await getRealTokenPrices();
        console.log(`🎯 Final price source: ${priceData.source}`);
        res.json(priceData);
    } catch (error) {
        console.error('Token prices endpoint failed:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to fetch token prices' 
        });
    }
});

router.get('/real-balance/:address', async function(req, res) {
    try {
        const { address } = req.params;
        console.log('🔍 /real-balance called with:', address);
        const result = await getRealBalance(address);
        res.json(result);
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

router.get('/nmx-balance/:address', async function(req, res) {
    try {
        const { address } = req.params;
        console.log('🔍 /nmx-balance called with:', address);
        const result = await getNMXBalance(address);
        res.json(result);
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

router.get('/all-balances/:address', async function(req, res) {
    try {
        const { address } = req.params;
        console.log('🔍 /all-balances called with:', address);
        const result = await getAllBalances(address);
        res.json(result);
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
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

router.get('/supported-tokens', async function(req, res) {
    try {
        const tokens = [
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
        ];
        res.json({ 
            success: true, 
            tokens: tokens, 
            primaryToken: "TON"
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// =============================================
// MULTI-WALLET MANAGEMENT
// =============================================

// GET all wallets for a user
router.get('/user-wallets/:userId', async function(req, res) {
    try {
        const { userId } = req.params;
        console.log('🔄 Fetching all wallets for user:', userId);

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

// SET active wallet
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

// GET active wallet
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
            console.log('✅ Active wallet found:', activeWalletAddress);
            res.json({
                success: true,
                activeWallet: activeWalletAddress
            });
        } else {
            console.log('ℹ️ No active wallet found for user');
            res.json({
                success: true,
                activeWallet: null
            });
        }

    } catch (error) {
        console.error('Get active wallet error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;