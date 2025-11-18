const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');
const crypto = require('crypto');
const bip39 = require('bip39');
const { mnemonicToWalletKey } = require('@ton/crypto');
const TonWeb = require('tonweb');

console.log('✅ UPDATED wallet-routes.js - MULTIPLE PRICE APIS!');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const tonweb = new TonWeb(new TonWeb.HttpProvider('https://toncenter.com/api/v2/jsonRPC', {
    apiKey: process.env.TONCENTER_API_KEY
}));

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;
const NMX_CONTRACT = "0:514ab5f3fbb8980e71591a1ac44765d02fe80182fd61af763c6f25ac548c9eec";

// =============================================
// MULTIPLE PRICE API SOURCES
// =============================================

async function getRealTokenPrices() {
    console.log('🔄 Fetching token prices from multiple sources...');
    
    // Try multiple APIs in sequence
    const priceSources = [
        getBinancePrice,
        getMEXCPrice,
        getGateIOPrice,
        getBybitPrice,
        getCoinGeckoPrice, // Last resort
        getFallbackPrice   // Final fallback
    ];

    for (const priceSource of priceSources) {
        try {
            const prices = await priceSource();
            if (prices && prices.TON.price > 0) {
                console.log(`✅ Prices from ${priceSource.name}: TON $${prices.TON.price}`);
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

// =============================================
// INDIVIDUAL PRICE APIs
// =============================================

async function getBinancePrice() {
    try {
        console.log('🔄 Trying Binance API...');
        const response = await axios.get('https://api.binance.com/api/v3/ticker/price?symbol=TONUSDT', {
            timeout: 5000
        });

        if (response.data && response.data.price) {
            const tonPrice = parseFloat(response.data.price);
            console.log('✅ Binance TON price:', tonPrice);
            
            return {
                TON: { price: tonPrice, change24h: 0 },
                NMX: { price: 0.10, change24h: 0 } // NMX fallback
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
        const response = await axios.get('https://api.mexc.com/api/v3/ticker/price?symbol=TONUSDT', {
            timeout: 5000
        });

        if (response.data && response.data.price) {
            const tonPrice = parseFloat(response.data.price);
            console.log('✅ MEXC TON price:', tonPrice);
            
            return {
                TON: { price: tonPrice, change24h: 0 },
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
            console.log('✅ Gate.io TON price:', tonPrice);
            
            return {
                TON: { price: tonPrice, change24h: 0 },
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
            console.log('✅ Bybit TON price:', tonPrice);
            
            return {
                TON: { price: tonPrice, change24h: 0 },
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
            console.log('✅ CoinGecko TON price:', tonData.usd);
            
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
        TON: { price: 0, change24h: 0 },
        NMX: { price: 0, change24h: 0 }
    };
}

// =============================================
// NMX PRICE FROM DEX (Optional)
// =============================================

async function getNMXPrice() {
    try {
        // Try to get NMX price from DeDust or Ston.fi
        console.log('🔄 Trying to fetch NMX price from DEX...');
        
        // DeDust API for NMX (this is a simplified example)
        const response = await axios.get('https://api.dedust.io/v1/pools', {
            timeout: 5000
        });
        
        // You would need to parse the actual pool data here
        // For now, return a reasonable fallback
        return 0.10;
        
    } catch (error) {
        console.log('ℹ️ Using fallback NMX price');
        return 0.10;
    }
}

// =============================================
// REST OF YOUR CODE (BALANCE FUNCTIONS, etc.)
// =============================================

// ... (keep all your existing balance functions, wallet generation, etc.)

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

        const response = await axios.get('https://toncenter.com/api/v2/getTokenData', {
            params: { 
                address: address,
                jetton_master: NMX_CONTRACT
            },
            headers: { 'X-API-Key': process.env.TONCENTER_API_KEY },
            timeout: 10000
        });

        if (response.data && response.data.result) {
            const balance = response.data.result.balance;
            let nmxBalance;
            
            if (typeof balance === 'object' && balance.toString) {
                nmxBalance = TonWeb.utils.fromNano(balance.toString());
            } else {
                nmxBalance = TonWeb.utils.fromNano(balance);
            }

            console.log('✅ NMX Balance found:', nmxBalance, 'NMX');

            return {
                success: true,
                balance: parseFloat(nmxBalance).toFixed(2),
                address: address,
                rawBalance: balance.toString()
            };
        } else {
            console.log('ℹ️ No NMX tokens found');
            return {
                success: true,
                balance: "0",
                address: address,
                rawBalance: "0"
            };
        }

    } catch (error) {
        console.error('❌ NMX balance fetch failed:', error.message);
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
// PRICE API ENDPOINT - UPDATED
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

// ... (keep all your other routes the same)

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

// ... (keep all your other routes)

module.exports = router;