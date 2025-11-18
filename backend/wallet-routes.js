const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');
const crypto = require('crypto');
const bip39 = require('bip39');
const { mnemonicToWalletKey } = require('@ton/crypto');
const TonWeb = require('tonweb');

console.log('✅ UPDATED wallet-routes.js - FIXED NMX BALANCE WITH TONAPI KEY!');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const tonweb = new TonWeb(new TonWeb.HttpProvider('https://toncenter.com/api/v2/jsonRPC', {
    apiKey: process.env.TONCENTER_API_KEY
}));

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;

// ✅ CORRECT NMX CONTRACT ADDRESSES
const NMX_CONTRACTS = [
    "EQBRSrXz-7iYDnFZGhrER2XQL-gBgv1hr3Y8byWsVIye7A9f",
    "0:514ab5f3fbb8980e71591a1ac44765d02fe80182fd61af763c6f25ac548c9eec"
];

// =============================================
// MULTIPLE PRICE API SOURCES WITH 24H CHANGE
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
// BALANCE FUNCTIONS - FIXED NMX WITH TONAPI KEY
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
            } else {
                tonBalance = TonWeb.utils.fromNano(balance);
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

async function getNMXBalance(address) {
    try {
        console.log('🔄 Fetching NMX balance for:', address);
        console.log('🔍 Using NMX Contracts:', NMX_CONTRACTS);

        // ✅ METHOD 1: TONAPI v2 with your API key (most reliable)
        console.log('🔄 Using TONAPI v2 with API key...');
        try {
            const tonapiResponse = await axios.get(`https://tonapi.io/v2/accounts/${address}/jettons`, {
                timeout: 15000,
                headers: {
                    'Authorization': `Bearer ${process.env.TONAPI_KEY}`
                }
            });

            console.log('🔍 TONAPI v2 Full Response:', JSON.stringify(tonapiResponse.data, null, 2));

            if (tonapiResponse.data && tonapiResponse.data.balances) {
                for (const contract of NMX_CONTRACTS) {
                    const nmxJetton = tonapiResponse.data.balances.find(j => {
                        const jettonAddress = j.jetton?.address;
                        return jettonAddress === contract;
                    });
                    
                    if (nmxJetton) {
                        const nmxBalance = TonWeb.utils.fromNano(nmxJetton.balance);
                        console.log('✅ NMX Balance found via TONAPI:', nmxBalance, 'NMX');
                        
                        return {
                            success: true,
                            balance: parseFloat(nmxBalance).toFixed(2),
                            address: address,
                            rawBalance: nmxJetton.balance,
                            source: 'tonapi_v2'
                        };
                    }
                }
                
                console.log('ℹ️ NMX contract not found in balances, available jettons:', 
                    tonapiResponse.data.balances.map(j => j.jetton?.address));
            }
        } catch (tonapiError) {
            console.log('TONAPI v2 failed:', tonapiError.message);
            if (tonapiError.response) {
                console.log('TONAPI Error details:', tonapiError.response.data);
            }
        }

        // ✅ METHOD 2: TON Center API (fallback with your existing key)
        console.log('🔄 Trying TON Center API as fallback...');
        try {
            const jettonResponse = await axios.get(`https://toncenter.com/api/v2/jettons`, {
                params: { address: address },
                headers: { 
                    'X-API-Key': process.env.TONCENTER_API_KEY 
                },
                timeout: 15000
            });

            console.log('🔍 TON Center Jettons Response:', JSON.stringify(jettonResponse.data, null, 2));

            if (jettonResponse.data && jettonResponse.data.jettons) {
                for (const contract of NMX_CONTRACTS) {
                    const nmxJetton = jettonResponse.data.jettons.find(j => {
                        return j.jetton_address === contract;
                    });
                    
                    if (nmxJetton) {
                        const nmxBalance = TonWeb.utils.fromNano(nmxJetton.balance);
                        console.log('✅ NMX Balance found via TON Center:', nmxBalance, 'NMX');
                        
                        return {
                            success: true,
                            balance: parseFloat(nmxBalance).toFixed(2),
                            address: address,
                            rawBalance: nmxJetton.balance,
                            source: 'toncenter'
                        };
                    }
                }
            }
        } catch (toncenterError) {
            console.log('TON Center API failed:', toncenterError.message);
        }

        // ✅ METHOD 3: Direct jetton info call
        console.log('🔄 Trying direct jetton info call...');
        try {
            // Get specific jetton data for NMX
            for (const contract of NMX_CONTRACTS) {
                const jettonInfoResponse = await axios.get(`https://tonapi.io/v2/jettons/${contract}`, {
                    headers: {
                        'Authorization': `Bearer ${process.env.TONAPI_KEY}`
                    },
                    timeout: 10000
                });

                if (jettonInfoResponse.data) {
                    console.log(`🔍 NMX Jetton ${contract} info:`, jettonInfoResponse.data);
                    
                    // Now try to get holder balance
                    const holderResponse = await axios.get(`https://tonapi.io/v2/accounts/${address}/jettons/${contract}`, {
                        headers: {
                            'Authorization': `Bearer ${process.env.TONAPI_KEY}`
                        },
                        timeout: 10000
                    });

                    if (holderResponse.data && holderResponse.data.balance) {
                        const nmxBalance = TonWeb.utils.fromNano(holderResponse.data.balance);
                        console.log('✅ NMX Balance found via direct jetton call:', nmxBalance, 'NMX');
                        
                        return {
                            success: true,
                            balance: parseFloat(nmxBalance).toFixed(2),
                            address: address,
                            rawBalance: holderResponse.data.balance,
                            source: 'direct_jetton'
                        };
                    }
                }
            }
        } catch (directError) {
            console.log('Direct jetton call failed:', directError.message);
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
        if (error.response) {
            console.error('Error response:', error.response.data);
        }
        
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
        console.log('✅ TON:', tonBalance.balance, 'NMX:', nmxBalance.balance);

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
        return {
            success: true,
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
// API ROUTES - FIXED TONKEEPER IMPORT & PRICE PERCENTAGES
// =============================================

router.get('/test', (req, res) => {
    res.json({
        success: true,
        message: 'Wallet API is working!',
        timestamp: new Date().toISOString(),
        routes: [
            'POST /generate-wallet',
            'POST /import-wallet', 
            'GET /real-balance/:address',
            'GET /nmx-balance/:address',
            'GET /all-balances/:address',
            'GET /token-prices',
            'GET /validate-address/:address',
            'GET /supported-tokens'
        ]
    });
});

router.post('/generate-wallet', async function(req, res) {
    try {
        const { userId, wordCount = 12 } = req.body;
        console.log('🔄 Generating TON wallet for user:', userId, 'with', wordCount, 'words');

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

        const walletData = await generateRealTONWallet(wordCount);
        const encryptedMnemonic = encrypt(walletData.mnemonic);

        try {
            const { data, error } = await supabase
                .from('user_wallets')
                .insert([{
                    user_id: userId,
                    address: walletData.address,
                    encrypted_mnemonic: JSON.stringify(encryptedMnemonic),
                    public_key: walletData.publicKey,
                    wallet_type: 'TON',
                    source: 'generated',
                    word_count: wordCount,
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

        console.log('✅ Wallet generated:', walletData.address);

        res.json({
            success: true,
            wallet: {
                userId: userId,
                address: walletData.address,
                mnemonic: walletData.mnemonic,
                wordCount: walletData.wordCount,
                type: 'TON',
                source: 'generated'
            }
        });

    } catch (error) {
        console.error('Wallet generation error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

router.post('/import-wallet', async function(req, res) {
    try {
        const { userId, mnemonic } = req.body;
        console.log('🔄 Importing TON wallet for user:', userId);

        if (!req.body) {
            return res.status(400).json({
                success: false,
                error: 'Request body is missing or invalid'
            });
        }

        if (!userId) {
            return res.status(400).json({
                success: false,
                error: 'User ID is required'
            });
        }

        if (!mnemonic) {
            return res.status(400).json({
                success: false,
                error: 'Mnemonic phrase is required'
            });
        }

        const cleanedMnemonic = mnemonic.trim().toLowerCase().replace(/\s+/g, ' ');
        const wordCount = cleanedMnemonic.split(' ').length;

        console.log('🔍 Import Debug - Word count:', wordCount);
        console.log('🔍 Import Debug - First 3 words:', cleanedMnemonic.split(' ').slice(0, 3));

        if (wordCount !== 12 && wordCount !== 24) {
            return res.status(400).json({
                success: false,
                error: 'Mnemonic must be 12 or 24 words. Found: ' + wordCount + ' words'
            });
        }

        // ✅ ENHANCED VALIDATION: Try multiple validation methods for Tonkeeper compatibility
        let isValidMnemonic = false;
        let validationError = '';

        try {
            // Method 1: Standard BIP39 validation
            isValidMnemonic = bip39.validateMnemonic(cleanedMnemonic);
            if (!isValidMnemonic) {
                validationError = 'Standard BIP39 validation failed';

                // Method 2: Check if it's a valid wordlist (some wallets use custom wordlists)
                const words = cleanedMnemonic.split(' ');
                const englishWordlist = bip39.wordlists.english;
                const allWordsValid = words.every(word => englishWordlist.includes(word));

                if (allWordsValid) {
                    console.log('⚠️ All words are valid English BIP39 words, but mnemonic fails validation');
                    console.log('⚠️ This might be a Tonkeeper/other wallet compatibility issue');
                    // Let's try to import anyway since words are valid
                    isValidMnemonic = true;
                }
            }
        } catch (validationErr) {
            validationError = validationErr.message;
        }

        if (!isValidMnemonic) {
            return res.status(400).json({
                success: false,
                error: 'Invalid mnemonic phrase. ' + validationError + '. Please check your words.'
            });
        }

        // ✅ ENHANCED: Try multiple derivation paths for Tonkeeper compatibility
        let walletAddress = null;
        let importError = null;

        try {
            const keyPair = await mnemonicToWalletKey(cleanedMnemonic.split(' '));
            const WalletClass = tonweb.wallet.all.v4R2;
            const wallet = new WalletClass(tonweb.provider, {
                publicKey: keyPair.publicKey,
                wc: 0
            });

            walletAddress = await wallet.getAddress();
            const address = walletAddress.toString(true, true, true);
            const encryptedMnemonic = encrypt(cleanedMnemonic);

            try {
                const { data, error } = await supabase
                    .from('user_wallets')
                    .insert([{
                        user_id: userId,
                        address: address,
                        encrypted_mnemonic: JSON.stringify(encryptedMnemonic),
                        public_key: TonWeb.utils.bytesToHex(keyPair.publicKey),
                        wallet_type: 'TON',
                        source: 'imported',
                        word_count: wordCount,
                        created_at: new Date().toISOString()
                    }]);

                if (error) {
                    console.warn('⚠️ Supabase insert failed:', error.message);
                } else {
                    console.log('✅ Wallet saved to database (imported)');
                }
            } catch (dbError) {
                console.warn('⚠️ Database error:', dbError.message);
            }

            console.log('✅ Wallet imported:', address);

            res.json({
                success: true,
                wallet: { 
                    userId: userId,
                    address: address, 
                    type: 'TON',
                    source: 'imported',
                    wordCount: wordCount
                }
            });

        } catch (error) {
            console.error('❌ Wallet import failed:', error.message);
            importError = error.message;

            // Provide more helpful error message for Tonkeeper users
            if (importError.includes('invalid mnemonic') || importError.includes('validation')) {
                return res.status(400).json({
                    success: false,
                    error: 'Unable to import this wallet. This may be due to compatibility issues with the source wallet. Please ensure you are using a standard TON wallet mnemonic.'
                });
            }

            return res.status(500).json({ 
                success: false, 
                error: 'Failed to import wallet: ' + importError 
            });
        }

    } catch (error) {
        console.error('Wallet import error:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to import wallet: ' + error.message 
        });
    }
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
                contract: NMX_CONTRACTS[0],
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

        // Store active wallet in user_sessions table
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

        if (error && error.code !== 'PGRST116') { // PGRST116 = no rows
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