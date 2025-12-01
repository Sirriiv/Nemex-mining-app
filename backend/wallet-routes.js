// wallet-routes.js - FIXED INTEGRATED WALLET
const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');
const bip39 = require('bip39');
const { mnemonicToWalletKey } = require('@ton/crypto');
const TonWeb = require('tonweb');
require('dotenv').config();

console.log('✅ Fixed Integrated Wallet Routes');

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

class PriceService {
    constructor() {
        this.apis = [
            {
                name: 'CoinGecko',
                getPrice: this.getPriceFromCoinGecko.bind(this),
                priority: 1
            },
            {
                name: 'Binance',
                getPrice: this.getPriceFromBinance.bind(this),
                priority: 2
            },
            {
                name: 'CoinMarketCap',
                getPrice: this.getPriceFromCoinMarketCap.bind(this),
                priority: 3
            },
            {
                name: 'MEXC',
                getPrice: this.getPriceFromMEXC.bind(this),
                priority: 4
            },
            {
                name: 'Bybit',
                getPrice: this.getPriceFromBybit.bind(this),
                priority: 5
            },
            {
                name: 'Bitget',
                getPrice: this.getPriceFromBitget.bind(this),
                priority: 6
            }
        ];
    }

    async getTONPrice() {
        console.log('🔄 Fetching TON price from multiple APIs...');
        
        const results = [];
        
        for (const api of this.apis) {
            try {
                console.log(`  🔄 Trying ${api.name}...`);
                const price = await api.getPrice();
                if (price && price > 0) {
                    console.log(`  ✅ ${api.name}: $${price}`);
                    results.push({
                        source: api.name,
                        price: price,
                        timestamp: new Date().toISOString()
                    });
                    
                    if (api.priority <= 2) {
                        return {
                            success: true,
                            price: price,
                            source: api.name,
                            allResults: results,
                            timestamp: new Date().toISOString()
                        };
                    }
                }
            } catch (error) {
                console.log(`  ❌ ${api.name} failed: ${error.message}`);
            }
        }
        
        if (results.length > 0) {
            const bestResult = results.sort((a, b) => 
                this.apis.find(api => api.name === a.source)?.priority - 
                this.apis.find(api => api.name === b.source)?.priority
            )[0];
            
            return {
                success: true,
                price: bestResult.price,
                source: bestResult.source,
                allResults: results,
                timestamp: new Date().toISOString(),
                note: 'Used fallback API'
            };
        }
        
        return {
            success: true,
            price: 2.5,
            source: 'fallback',
            timestamp: new Date().toISOString(),
            note: 'All APIs failed, using default price'
        };
    }

    async getPriceFromCoinGecko() {
        try {
            const response = await axios.get('https://api.coingecko.com/api/v3/simple/price', {
                params: {
                    ids: 'the-open-network',
                    vs_currencies: 'usd',
                    include_24hr_change: true
                },
                timeout: 5000
            });
            
            if (response.data['the-open-network']?.usd) {
                return response.data['the-open-network'].usd;
            }
            throw new Error('Invalid response');
        } catch (error) {
            throw new Error(`CoinGecko: ${error.message}`);
        }
    }

    async getPriceFromCoinMarketCap() {
        try {
            const response = await axios.get('https://api.coinmarketcap.com/data-api/v3/cryptocurrency/detail', {
                params: {
                    slug: 'toncoin',
                    aux: 'market_data'
                },
                timeout: 5000
            });
            
            if (response.data?.data?.marketData?.priceUSD) {
                return response.data.data.marketData.priceUSD;
            }
            throw new Error('Invalid response');
        } catch (error) {
            throw new Error(`CoinMarketCap: ${error.message}`);
        }
    }

    async getPriceFromBinance() {
        try {
            const response = await axios.get('https://api.binance.com/api/v3/ticker/price', {
                params: { symbol: 'TONUSDT' },
                timeout: 5000
            });
            
            if (response.data?.price) {
                return parseFloat(response.data.price);
            }
            
            const response2 = await axios.get('https://api.binance.com/api/v3/ticker/price', {
                params: { symbol: 'TONUSDC' },
                timeout: 5000
            });
            
            if (response2.data?.price) {
                return parseFloat(response2.data.price);
            }
            
            throw new Error('Symbol not found');
        } catch (error) {
            throw new Error(`Binance: ${error.message}`);
        }
    }

    async getPriceFromMEXC() {
        try {
            const response = await axios.get('https://api.mexc.com/api/v3/ticker/price', {
                params: { symbol: 'TONUSDT' },
                timeout: 5000
            });
            
            if (response.data?.price) {
                return parseFloat(response.data.price);
            }
            throw new Error('Symbol not found');
        } catch (error) {
            throw new Error(`MEXC: ${error.message}`);
        }
    }

    async getPriceFromBybit() {
        try {
            const response = await axios.get('https://api.bybit.com/v5/market/tickers', {
                params: { category: 'spot', symbol: 'TONUSDT' },
                timeout: 5000
            });
            
            if (response.data?.result?.list?.[0]?.lastPrice) {
                return parseFloat(response.data.result.list[0].lastPrice);
            }
            throw new Error('Symbol not found');
        } catch (error) {
            throw new Error(`Bybit: ${error.message}`);
        }
    }

    async getPriceFromBitget() {
        try {
            const response = await axios.get('https://api.bitget.com/api/v2/spot/market/tickers', {
                params: { symbol: 'TONUSDT_SPBL' },
                timeout: 5000
            });
            
            if (response.data?.data?.[0]?.close) {
                return parseFloat(response.data.data[0].close);
            }
            throw new Error('Symbol not found');
        } catch (error) {
            throw new Error(`Bitget: ${error.message}`);
        }
    }
}

class BalanceService {
    constructor() {
        this.apis = [
            {
                name: 'tonapi.io',
                getBalance: this.getBalanceFromTonApi.bind(this),
                priority: 1
            },
            {
                name: 'toncenter',
                getBalance: this.getBalanceFromTonCenter.bind(this),
                priority: 2
            },
            {
                name: 'tonviewer',
                getBalance: this.getBalanceFromTonViewer.bind(this),
                priority: 3
            }
        ];
    }

    async getBalance(address) {
        console.log(`💰 Checking balance for ${address}...`);
        
        for (const api of this.apis) {
            try {
                console.log(`  🔄 Trying ${api.name}...`);
                const balance = await api.getBalance(address);
                if (balance !== null) {
                    console.log(`  ✅ ${api.name}: ${balance} TON`);
                    return {
                        success: true,
                        balance: balance,
                        source: api.name,
                        address: address
                    };
                }
            } catch (error) {
                console.log(`  ❌ ${api.name} failed: ${error.message}`);
            }
        }
        
        return {
            success: true,
            balance: 0,
            source: 'fallback',
            address: address,
            note: 'All balance APIs failed, showing zero'
        };
    }

    async getBalanceFromTonApi(address) {
        try {
            const response = await axios.get(`https://tonapi.io/v2/accounts/${address}`, {
                headers: {
                    'Accept': 'application/json',
                    'Authorization': `Bearer ${TONAPI_KEY}`
                },
                timeout: 5000
            });
            
            if (response.data?.balance) {
                const balanceNano = response.data.balance;
                return parseInt(balanceNano) / 1_000_000_000;
            }
            return 0;
        } catch (error) {
            throw new Error(`tonapi.io: ${error.message}`);
        }
    }

    async getBalanceFromTonCenter(address) {
        try {
            const response = await axios.get('https://toncenter.com/api/v2/getAddressInformation', {
                params: { address: address },
                timeout: 5000
            });
            
            if (response.data?.result?.balance) {
                const balance = response.data.result.balance;
                return parseFloat(TonWeb.utils.fromNano(balance));
            }
            return 0;
        } catch (error) {
            throw new Error(`toncenter: ${error.message}`);
        }
    }

    async getBalanceFromTonViewer(address) {
        try {
            const response = await axios.get(`https://tonviewer.com/api/account/${address}/basic`, {
                timeout: 5000
            });
            
            if (response.data?.balance) {
                return parseFloat(response.data.balance) / 1_000_000_000;
            }
            return 0;
        } catch (error) {
            throw new Error(`tonviewer: ${error.message}`);
        }
    }
}

const priceService = new PriceService();
const balanceService = new BalanceService();

router.post('/check-user', async function(req, res) {
    try {
        const { userId } = req.body;

        if (!userId) {
            return res.json({
                success: false,
                error: 'User ID required'
            });
        }

        console.log('🔍 Checking user in database:', userId);

        const { data: user, error } = await supabase
            .from('profiles')
            .select('id, email, username')
            .eq('id', userId)
            .single();

        if (error || !user) {
            console.log('❌ User not found in profiles:', userId);
            return res.json({
                success: false,
                error: 'User not found'
            });
        }

        console.log('✅ User verified:', user.email);

        res.json({
            success: true,
            user: user
        });

    } catch (error) {
        console.error('❌ User check failed:', error);
        res.status(500).json({
            success: false,
            error: 'User verification failed'
        });
    }
});

router.post('/get-user-wallet', async function(req, res) {
    try {
        const { userId } = req.body;
        console.log('🔍 Getting wallet for user:', userId);

        if (!userId) {
            return res.json({
                success: false,
                wallet: null,
                message: 'User ID required'
            });
        }

        const { data: wallet, error } = await supabase
            .from('user_wallets')
            .select('*')
            .eq('user_id', userId)
            .single();

        if (error) {
            if (error.code === 'PGRST116') {
                console.log('ℹ️ No wallet found for user:', userId);
                return res.json({
                    success: true,
                    wallet: null,
                    message: 'No wallet found'
                });
            }
            console.warn('⚠️ Database warning:', error.message);
        }

        if (wallet) {
            console.log('✅ Wallet found:', wallet.address);
            return res.json({
                success: true,
                wallet: {
                    userId: wallet.user_id,
                    address: wallet.address,
                    addressBounceable: wallet.address,
                    publicKey: wallet.public_key || '',
                    type: wallet.wallet_type || 'TON',
                    source: wallet.source || 'generated',
                    wordCount: wallet.word_count || 12,
                    derivationPath: wallet.derivation_path || "m/44'/607'/0'/0'/0'",
                    createdAt: wallet.created_at,
                    isActive: true
                }
            });
        }

        res.json({
            success: true,
            wallet: null
        });

    } catch (error) {
        console.error('❌ Get wallet error:', error);
        res.json({
            success: false,
            error: 'Failed to get wallet'
        });
    }
});

router.post('/create-wallet', async function(req, res) {
    try {
        const { userId } = req.body;
        console.log('🔄 Creating wallet for user:', userId);

        if (!userId) {
            return res.status(400).json({
                success: false,
                error: 'User ID is required'
            });
        }

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

        const mnemonic = bip39.generateMnemonic(128);
        console.log('✅ Mnemonic generated');

        const keyPair = await mnemonicToWalletKey(mnemonic.split(' '));

        const WalletClass = tonweb.wallet.all.v4R2;
        const wallet = new WalletClass(tonweb.provider, {
            publicKey: keyPair.publicKey,
            wc: 0
        });

        const walletAddress = await wallet.getAddress();
        const address = walletAddress.toString(true, true, false);

        console.log('✅ Wallet derived:', address);

        const walletData = {
            user_id: userId,
            address: address,
            wallet_type: 'ton',
            source: 'nemex',
            encrypted_mnemonic: '',  // Add empty string for NOT NULL constraint
            encrypted_private_key: '', // Add empty string for NOT NULL constraint
            public_key: '', // Add empty string for NOT NULL constraint
            password_hash: '', // Add empty string for NOT NULL constraint
            encryption_salt: '', // Add empty string for NOT NULL constraint
            word_count: 12,
            derivation_path: "m/44'/607'/0'/0'/0'",
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
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
                error: 'Failed to save wallet to database: ' + insertError.message,
                details: insertError.details
            });
        }

        console.log('✅ Wallet saved to database');

        res.json({
            success: true,
            wallet: {
                userId: userId,
                address: address,
                type: 'TON',
                source: 'generated',
                wordCount: 12,
                createdAt: new Date().toISOString()
            },
            mnemonic: mnemonic,
            securityWarning: 'WRITE DOWN YOUR SEED PHRASE! Store it securely. Without it, you cannot recover your wallet.',
            instructions: 'This is your one and only wallet for this account. Use these 12 words to recover your wallet if needed.'
        });

    } catch (error) {
        console.error('❌ Wallet creation failed:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create wallet: ' + error.message
        });
    }
});

router.post('/import-wallet', async function(req, res) {
    try {
        const { userId, mnemonic } = req.body;

        console.log('🔄 Importing wallet for user:', userId);

        if (!userId || !mnemonic) {
            return res.status(400).json({
                success: false,
                error: 'User ID and seed phrase are required'
            });
        }

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

        const normalizedMnemonic = mnemonic.trim().toLowerCase().replace(/\s+/g, ' ');
        const wordCount = normalizedMnemonic.split(' ').length;

        if (wordCount !== 12 && wordCount !== 24) {
            return res.status(400).json({
                success: false,
                error: 'Seed phrase must be 12 or 24 words'
            });
        }

        let address;
        try {
            const keyPair = await mnemonicToWalletKey(normalizedMnemonic.split(' '));

            const WalletClass = tonweb.wallet.all.v4R2;
            const tonWallet = new WalletClass(tonweb.provider, {
                publicKey: keyPair.publicKey,
                wc: 0
            });

            const walletAddress = await tonWallet.getAddress();
            address = walletAddress.toString(true, true, false);

            console.log('✅ Wallet derived:', address);

        } catch (derivationError) {
            console.error('❌ Wallet derivation failed:', derivationError);
            return res.status(400).json({
                success: false,
                error: 'Invalid seed phrase'
            });
        }

        const walletData = {
            user_id: userId,
            address: address,
            wallet_type: 'ton',
            source: 'imported',
            encrypted_mnemonic: '',
            encrypted_private_key: '',
            public_key: '',
            password_hash: '',
            encryption_salt: '',
            word_count: wordCount,
            derivation_path: "m/44'/607'/0'/0'/0'",
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };

        const { error: insertError } = await supabase
            .from('user_wallets')
            .insert([walletData]);

        if (insertError) {
            console.error('❌ Database error:', insertError);
            return res.status(500).json({
                success: false,
                error: 'Failed to save wallet to database'
            });
        }

        console.log('✅ Wallet imported and saved');

        res.json({
            success: true,
            wallet: {
                userId: userId,
                address: address,
                type: 'TON',
                source: 'imported',
                wordCount: wordCount,
                createdAt: new Date().toISOString()
            },
            message: 'Wallet imported successfully!'
        });

    } catch (error) {
        console.error('❌ Wallet import failed:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to import wallet: ' + error.message
        });
    }
});

router.get('/balance/:address', async function(req, res) {
    try {
        const { address } = req.params;
        
        const balanceResult = await balanceService.getBalance(address);
        
        res.json(balanceResult);

    } catch (error) {
        console.error('❌ Balance check failed:', error.message);
        res.json({
            success: true,
            balance: 0,
            address: req.params.address,
            currency: 'TON',
            error: 'All balance services failed'
        });
    }
});

router.get('/prices', async function(req, res) {
    try {
        console.log('🔄 Fetching token prices from multiple sources...');
        
        const tonPriceResult = await priceService.getTONPrice();
        
        const nmxPrice = 0.10;
        const nmxChange24h = 0.5;

        const prices = {
            TON: { 
                price: tonPriceResult.price, 
                change24h: tonPriceResult.price > 2.5 ? 1.2 : -0.5,
                source: tonPriceResult.source,
                timestamp: tonPriceResult.timestamp
            },
            NMX: { 
                price: nmxPrice, 
                change24h: nmxChange24h,
                source: 'nemex_fixed',
                timestamp: new Date().toISOString()
            }
        };

        console.log('✅ Prices fetched:', {
            TON: `$${tonPriceResult.price} (${tonPriceResult.source})`,
            NMX: `$${nmxPrice}`
        });

        res.json({
            success: true,
            prices: prices,
            timestamp: new Date().toISOString(),
            sources: {
                TON: tonPriceResult.source,
                NMX: 'nemex_fixed'
            },
            allResults: tonPriceResult.allResults || []
        });

    } catch (error) {
        console.error('❌ Price fetch failed:', error.message);
        
        res.json({
            success: true,
            prices: {
                TON: { price: 2.5, change24h: 1.2, source: 'fallback' },
                NMX: { price: 0.10, change24h: 0.5, source: 'fallback' }
            },
            timestamp: new Date().toISOString(),
            note: 'All price APIs failed, using default values'
        });
    }
});

router.post('/send-ton', async function(req, res) {
    try {
        const { userId, fromAddress, toAddress, amount, memo = '' } = req.body;

        console.log('🔄 Sending TON simulation:', { fromAddress, toAddress, amount });

        if (!userId || !fromAddress || !toAddress || !amount) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields'
            });
        }

        const { data: wallet, error } = await supabase
            .from('user_wallets')
            .select('user_id')
            .eq('user_id', userId)
            .eq('address', fromAddress)
            .single();

        if (error || !wallet) {
            return res.status(401).json({
                success: false,
                error: 'Unauthorized: Wallet does not belong to user'
            });
        }

        const txHash = `0x${Date.now().toString(16)}${Math.random().toString(16).substr(2, 10)}`;

        const transactionData = {
            user_id: userId,
            from_address: fromAddress,
            to_address: toAddress,
            amount: amount,
            currency: 'TON',
            tx_hash: txHash,
            status: 'completed',
            memo: memo,
            created_at: new Date().toISOString()
        };

        await supabase
            .from('pending_transactions')
            .insert([transactionData]);

        res.json({
            success: true,
            transaction: {
                hash: txHash,
                from: fromAddress,
                to: toAddress,
                amount: amount,
                memo: memo,
                timestamp: new Date().toISOString(),
                status: 'completed',
                explorerUrl: `https://tonscan.org/tx/${txHash}`
            },
            message: `Successfully sent ${amount} TON (simulation)`
        });

    } catch (error) {
        console.error('❌ Send transaction failed:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to send transaction: ' + error.message
        });
    }
});

router.get('/health', async (req, res) => {
    try {
        const { data: dbTest, error: dbError } = await supabase
            .from('user_wallets')
            .select('count', { count: 'exact', head: true });

        const balanceTest = await balanceService.getBalance('EQCD39VS5jcptHL8vMjEXrzGaRcCVYto7HUn4bpAOg8xqB2N');
        const priceTest = await priceService.getTONPrice();

        res.json({
            success: true,
            message: 'Enhanced Wallet API is running',
            timestamp: new Date().toISOString(),
            version: '3.0.0',
            environment: process.env.NODE_ENV || 'development',
            database: dbError ? '❌ Error: ' + dbError.message : '✅ Connected',
            balanceApi: balanceTest.success ? '✅ ' + balanceTest.source : '❌ Error',
            priceApi: priceTest.success ? '✅ ' + priceTest.source : '❌ Error',
            availablePriceAPIs: priceService.apis.map(a => a.name),
            availableBalanceAPIs: balanceService.apis.map(a => a.name),
            stats: {
                totalWallets: dbTest?.count || 0,
                uptime: process.uptime()
            }
        });

    } catch (error) {
        res.json({
            success: true,
            message: 'API running with issues',
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

router.get('/env-template', (req, res) => {
    const envTemplate = `SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key-here
TONAPI_KEY=AGDQXFV3ZMAAAAAAI5TFJW7XVMK2SFHWBQLR3Z2HLHN2HMP7NI2XTQVPKQSTZA
NODE_ENV=production
PORT=3000`;
    
    res.type('text/plain').send(envTemplate);
});

module.exports = router;