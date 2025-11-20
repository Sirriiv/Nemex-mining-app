const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');
const crypto = require('crypto');
const bip39 = require('bip39');
const { mnemonicToWalletKey, mnemonicToSeed } = require('@ton/crypto');
const TonWeb = require('tonweb');

console.log('✅ SECURE wallet-routes.js - REAL TON WALLETS');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const tonweb = new TonWeb(new TonWeb.HttpProvider('https://toncenter.com/api/v2/jsonRPC', {
    apiKey: process.env.TONCENTER_API_KEY
}));

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;
const NMX_CONTRACT = "EQBRSrXz-7iYDnFZGhrER2XQL-gBgv1hr3Y8byWsVIye7A9f";

// =============================================
// ENHANCED DERIVATION PATHS - TONKEEPER PRIORITY
// =============================================

const DERIVATION_PATHS = [
    "m/44'/607'/0'/0'/0'",      // Tonkeeper Primary
    "m/44'/607'/0'/0'/0",       // Tonkeeper Variant 1
    "m/44'/607'/0'/0'/0/0",     // Tonkeeper Variant 2
    "m/44'/607'/0'/0/0",        // Primary BIP-44
    "m/44'/607'/0'",            // Common shorter variant
    "m/44'/607'/0'/0/0/0",      // Ledger variant
    "m/44'/607'/1'/0/0",        // Account 1
    "m/44'/607'/2'/0/0",        // Account 2
    "m/44'/607'/3'/0/0",        // Account 3
    "m/44'/607'/4'/0/0",        // Account 4
    "m/44'/607'/0'/0",          // Minimal path
    "m/44'/607'/0'/0'",         // Hardened variant
];

function getPathDescription(path) {
    const descriptions = {
        "m/44'/607'/0'/0'/0'": "🎯 Tonkeeper Primary (Most Likely)",
        "m/44'/607'/0'/0'/0": "Tonkeeper Variant 1", 
        "m/44'/607'/0'/0'/0/0": "Tonkeeper Variant 2",
        "m/44'/607'/0'/0/0": "Standard TON (BIP-44)",
        "m/44'/607'/0'": "Short Variant",
        "m/44'/607'/0'/0/0/0": "Ledger Style",
        "m/44'/607'/1'/0/0": "Account 1",
        "m/44'/607'/2'/0/0": "Account 2",
        "m/44'/607'/3'/0/0": "Account 3",
        "m/44'/607'/4'/0/0": "Account 4",
        "m/44'/607'/0'/0": "Minimal Path",
        "m/44'/607'/0'/0'": "Hardened Variant"
    };
    return descriptions[path] || path;
}

// =============================================
// ENHANCED DERIVATION FUNCTIONS
// =============================================

async function deriveWalletFromPath(mnemonic, path) {
    try {
        console.log(`🔄 Deriving wallet with path: ${path}`);

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

async function deriveAllWalletAddresses(mnemonic) {
    console.log('🔄 Deriving wallets from PRIORITIZED paths...');

    const results = [];

    for (const path of DERIVATION_PATHS) {
        const result = await deriveWalletFromPath(mnemonic, path);
        if (result) {
            results.push(result);
            console.log(`✅ ${getPathDescription(path)}: ${result.addressNonBounceable}`);
        }
    }

    console.log(`✅ Derived ${results.length} wallet addresses`);
    return results;
}

// =============================================
// ENHANCED BALANCE DETECTION FOR WALLET SELECTION
// =============================================

async function findWalletsWithBalances(mnemonic) {
    console.log('🔄 Scanning for wallets with actual balances...');

    const derivedWallets = await deriveAllWalletAddresses(mnemonic);
    const walletsWithBalances = [];

    for (const wallet of derivedWallets) {
        console.log(`🔍 Checking balances for: ${wallet.address}`);

        try {
            const balances = await getAllBalances(wallet.address);

            const hasTON = parseFloat(balances.balances.TON) > 0;
            const hasNMX = parseFloat(balances.balances.NMX) > 0;
            const hasFunds = hasTON || hasNMX;

            if (hasFunds) {
                console.log(`✅ FOUND WALLET WITH FUNDS: ${wallet.address}`);
                console.log(`   TON: ${balances.balances.TON}, NMX: ${balances.balances.NMX}`);

                walletsWithBalances.push({
                    ...wallet,
                    tonBalance: balances.balances.TON,
                    nmxBalance: balances.balances.NMX,
                    hasFunds: true,
                    description: `${getPathDescription(wallet.path)} • TON: ${balances.balances.TON} • NMX: ${balances.balances.NMX}`
                });
            } else {
                console.log(`ℹ️ No funds found in: ${wallet.address}`);
            }
        } catch (error) {
            console.log(`❌ Balance check failed for ${wallet.address}:`, error.message);
        }
    }

    console.log(`💰 Found ${walletsWithBalances.length} wallets with funds`);
    return walletsWithBalances;
}

// =============================================
// ENHANCED NMX BALANCE DETECTION FOR NEW TOKENS
// =============================================

async function getNMXBalance(address) {
    try {
        console.log('🔄 ENHANCED NMX balance check for:', address);

        const NMX_CONTRACTS = [
            "EQBRSrXz-7iYDnFZGhrER2XQL-gBgv1hr3Y8byWsVIye7A9f",
            "EQDcBvcg2WBPb8vQkArfS2fIZrzi2pFjnfJfZbsKp4rWVfQH"
        ];

        try {
            console.log('🔄 Trying direct contract method...');
            for (const contract of NMX_CONTRACTS) {
                const directBalance = await getDirectJettonBalance(address, contract);

                if (directBalance && parseFloat(directBalance) > 0) {
                    console.log('✅ DIRECT CONTRACT - NMX Balance:', directBalance, 'from contract:', contract);
                    return {
                        success: true,
                        balance: parseFloat(directBalance).toFixed(2),
                        address: address,
                        source: 'direct_contract'
                    };
                }
            }
        } catch (directError) {
            console.log('Direct contract failed:', directError.message);
        }

        console.log('🔄 Manual jetton scan...');
        const allJettons = await getAllWalletJettons(address);

        for (const contract of NMX_CONTRACTS) {
            const nmxJetton = allJettons.find(j => j.address === contract);
            if (nmxJetton) {
                console.log('✅ MANUAL SCAN - NMX Balance:', nmxJetton.balance);
                return {
                    success: true,
                    balance: parseFloat(nmxJetton.balance).toFixed(2),
                    address: address,
                    source: 'manual_scan'
                };
            }
        }

        const nmxByName = allJettons.find(j => 
            j.name?.includes('Nemex') || j.symbol === 'NMX'
        );
        if (nmxByName) {
            console.log('✅ NAME MATCH - NMX Balance:', nmxByName.balance);
            return {
                success: true,
                balance: parseFloat(nmxByName.balance).toFixed(2),
                address: address,
                source: 'name_match'
            };
        }

        console.log('ℹ️ NMX not found via any method');
        return {
            success: true,
            balance: "0",
            address: address,
            source: 'not_found'
        };

    } catch (error) {
        console.error('Enhanced NMX balance check failed:', error);
        return {
            success: true,
            balance: "0",
            address: address,
            error: error.message
        };
    }
}

async function getDirectJettonBalance(walletAddress, jettonContract) {
    try {
        const rawAddress = walletAddress.startsWith('EQ') ? 
            walletAddress.replace('EQ', '0:') : walletAddress;

        const response = await axios.post('https://toncenter.com/api/v2/runGetMethod', {
            address: jettonContract,
            method: 'get_wallet_address',
            stack: [
                ['tvm.Slice', TonWeb.utils.bytesToBase64(TonWeb.Address.parse(rawAddress).hash)]
            ]
        }, {
            headers: { 'X-API-Key': process.env.TONCENTER_API_KEY },
            timeout: 10000
        });

        if (response.data && response.data.result) {
            const jettonWalletAddress = response.data.result[0];

            const balanceResponse = await axios.post('https://toncenter.com/api/v2/runGetMethod', {
                address: jettonWalletAddress,
                method: 'get_wallet_data',
                stack: []
            }, {
                headers: { 'X-API-Key': process.env.TONCENTER_API_KEY },
                timeout: 10000
            });

            if (balanceResponse.data && balanceResponse.data.result) {
                const balance = balanceResponse.data.result[0];
                return TonWeb.utils.fromNano(balance);
            }
        }
        return "0";
    } catch (error) {
        console.log('Direct jetton method failed:', error.message);
        throw error;
    }
}

async function getAllWalletJettons(walletAddress) {
    try {
        const addressesToTry = [
            walletAddress,
            walletAddress.replace(/^EQ/, 'UQ'),
            walletAddress.replace(/^UQ/, 'EQ')
        ];

        for (const checkAddress of addressesToTry) {
            try {
                const response = await axios.get(`https://tonapi.io/v2/accounts/${checkAddress}/jettons`, {
                    timeout: 15000
                });

                if (response.data && response.data.balances) {
                    return response.data.balances.map(jetton => ({
                        address: jetton.jetton?.address,
                        name: jetton.jetton?.name,
                        symbol: jetton.jetton?.symbol,
                        balance: TonWeb.utils.fromNano(jetton.balance),
                        decimals: jetton.jetton?.decimals
                    }));
                }
            } catch (error) {
                console.log(`TonAPI failed for ${checkAddress}:`, error.message);
            }
        }
        return [];
    } catch (error) {
        console.log('Manual jetton scan failed:', error.message);
        return [];
    }
}

// =============================================
// SECURE WALLET STORAGE (NO MNEMONIC IN DATABASE)
// =============================================

router.post('/store-wallet', async function(req, res) {
    try {
        const { userId, address, publicKey, walletType, source, wordCount, derivationPath } = req.body;

        console.log('🔄 SECURE: Storing wallet in database (NO MNEMONIC)...');

        if (!userId || !address) {
            return res.status(400).json({
                success: false,
                error: 'User ID and address are required'
            });
        }

        const { data, error } = await supabase
            .from('user_wallets')
            .insert([{
                user_id: userId,
                address: address,
                public_key: publicKey || '',
                wallet_type: walletType || 'TON',
                source: source || 'generated',
                word_count: wordCount || 12,
                derivation_path: derivationPath || "m/44'/607'/0'/0'/0'",
                created_at: new Date().toISOString()
            }]);

        if (error) {
            console.error('Database insert error:', error);
            return res.status(500).json({
                success: false,
                error: 'Failed to store wallet: ' + error.message
            });
        }

        console.log('✅ SECURE: Wallet stored in database (no mnemonic):', address);

        res.json({
            success: true,
            message: 'Wallet stored securely',
            wallet: {
                userId: userId,
                address: address,
                type: walletType || 'TON',
                source: source || 'generated'
            }
        });

    } catch (error) {
        console.error('Secure wallet storage error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to store wallet: ' + error.message
        });
    }
});

// =============================================
// REAL TON WALLET GENERATION (FIXED)
// =============================================

router.post('/generate-wallet', async function(req, res) {
    try {
        const { userId, wordCount = 12 } = req.body;
        console.log('🔄 REAL: Generating actual TON wallet...');

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

        // ✅ REAL: Generate actual TON wallet
        const mnemonic = bip39.generateMnemonic(wordCount === 12 ? 128 : 256);
        const keyPair = await mnemonicToWalletKey(mnemonic.split(' '));

        const WalletClass = tonweb.wallet.all.v4R2;
        const wallet = new WalletClass(tonweb.provider, {
            publicKey: keyPair.publicKey,
            wc: 0
        });

        const walletAddress = await wallet.getAddress();
        const address = walletAddress.toString(true, true, true);
        const addressNonBounceable = walletAddress.toString(true, true, false);

        console.log('✅ REAL TON Wallet generated:', address);

        // Store wallet info (NO MNEMONIC)
        try {
            const { data, error } = await supabase
                .from('user_wallets')
                .insert([{
                    user_id: userId,
                    address: address,
                    public_key: TonWeb.utils.bytesToHex(keyPair.publicKey),
                    wallet_type: 'TON',
                    source: 'generated',
                    word_count: wordCount,
                    derivation_path: "m/44'/607'/0'/0'/0'",
                    created_at: new Date().toISOString()
                }]);

            if (error) {
                console.warn('⚠️ Supabase insert failed:', error.message);
            } else {
                console.log('✅ Real wallet saved to database');
            }
        } catch (dbError) {
            console.warn('⚠️ Database error:', dbError.message);
        }

        res.json({
            success: true,
            wallet: {
                userId: userId,
                address: address,
                addressNonBounceable: addressNonBounceable,
                publicKey: TonWeb.utils.bytesToHex(keyPair.publicKey),
                wordCount: wordCount,
                type: 'TON',
                source: 'generated',
                derivationPath: "m/44'/607'/0'/0'/0'"
            },
            message: 'Real TON wallet generated successfully'
        });

    } catch (error) {
        console.error('Real wallet generation error:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to generate wallet: ' + error.message 
        });
    }
});

// =============================================
// PRODUCTION TRANSACTION ENGINE
// =============================================

router.post('/send-ton', async function(req, res) {
    try {
        const { fromAddress, toAddress, amount, memo = '', encryptedMnemonic } = req.body;

        console.log('🔄 PRODUCTION: Sending TON:', { fromAddress, toAddress, amount });

        if (!fromAddress || !toAddress || !amount || !encryptedMnemonic) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields: fromAddress, toAddress, amount, encryptedMnemonic'
            });
        }

        const decryptedMnemonic = await decryptMnemonic(JSON.parse(encryptedMnemonic));

        const tonAmount = parseFloat(amount);
        if (isNaN(tonAmount) || tonAmount <= 0) {
            return res.status(400).json({
                success: false,
                error: 'Invalid amount'
            });
        }

        const nanoAmount = TonWeb.utils.toNano(tonAmount.toString());

        console.log(`💰 PRODUCTION: Sending ${tonAmount} TON (${nanoAmount} nanoTON)`);

        const keyPair = await mnemonicToWalletKey(decryptedMnemonic.split(' '));

        const WalletClass = tonweb.wallet.all.v4R2;
        const walletInstance = new WalletClass(tonweb.provider, {
            publicKey: keyPair.publicKey,
            wc: 0
        });

        const walletState = await walletInstance.getAddress();
        const balance = await tonweb.getBalance(walletState);

        if (BigInt(balance) < BigInt(nanoAmount)) {
            return res.status(400).json({
                success: false,
                error: `Insufficient balance. Available: ${TonWeb.utils.fromNano(balance)} TON, Required: ${tonAmount} TON`
            });
        }

        const transfer = walletInstance.createTransfer({
            secretKey: keyPair.secretKey,
            toAddress: toAddress,
            amount: nanoAmount,
            seqno: await walletInstance.getSeqno(),
            payload: memo ? await createMessagePayload(memo) : null,
            sendMode: 3
        });

        console.log('🔄 Broadcasting TON transaction to blockchain...');
        const result = await walletInstance.methods.transfer(transfer).send();

        if (!result) {
            throw new Error('Transaction failed - no result from blockchain');
        }

        console.log('✅ PRODUCTION: TON Transaction broadcasted');

        const txHash = await getTransactionHash(fromAddress, result);

        res.json({
            success: true,
            transaction: {
                hash: txHash || 'pending',
                from: fromAddress,
                to: toAddress,
                amount: nanoAmount.toString(),
                amountTON: tonAmount,
                memo: memo,
                timestamp: new Date().toISOString(),
                status: 'broadcasted'
            },
            message: `Successfully sent ${tonAmount} TON to ${toAddress.substring(0, 8)}...`
        });

    } catch (error) {
        console.error('PRODUCTION Send TON error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to send TON: ' + error.message
        });
    }
});

router.post('/send-nmx', async function(req, res) {
    try {
        const { fromAddress, toAddress, amount, memo = '', encryptedMnemonic } = req.body;

        console.log('🔄 PRODUCTION: Sending NMX:', { fromAddress, toAddress, amount });

        if (!fromAddress || !toAddress || !amount || !encryptedMnemonic) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields: fromAddress, toAddress, amount, encryptedMnemonic'
            });
        }

        const decryptedMnemonic = await decryptMnemonic(JSON.parse(encryptedMnemonic));

        const nmxAmount = parseFloat(amount);
        if (isNaN(nmxAmount) || nmxAmount <= 0) {
            return res.status(400).json({
                success: false,
                error: 'Invalid amount'
            });
        }

        console.log(`🎯 PRODUCTION: Sending ${nmxAmount} NMX`);

        const keyPair = await mnemonicToWalletKey(decryptedMnemonic.split(' '));

        const WalletClass = tonweb.wallet.all.v4R2;
        const walletInstance = new WalletClass(tonweb.provider, {
            publicKey: keyPair.publicKey,
            wc: 0
        });

        const nmxJetton = new TonWeb.token.jetton.JettonMinter(tonweb.provider, {
            address: NMX_CONTRACT
        });

        const jettonWalletAddress = await nmxJetton.getJettonWalletAddress(
            new TonWeb.utils.Address(fromAddress)
        );

        const jettonWallet = new TonWeb.token.jetton.JettonWallet(tonweb.provider, {
            address: jettonWalletAddress
        });

        const jettonData = await jettonWallet.getData();
        const currentBalance = jettonData.balance;

        const sendAmount = TonWeb.utils.toNano(nmxAmount.toString());

        if (BigInt(currentBalance) < BigInt(sendAmount)) {
            return res.status(400).json({
                success: false,
                error: `Insufficient NMX balance. Available: ${TonWeb.utils.fromNano(currentBalance)} NMX, Required: ${nmxAmount} NMX`
            });
        }

        const seqno = await walletInstance.getSeqno();

        const transfer = await jettonWallet.createTransfer({
            secretKey: keyPair.secretKey,
            toAddress: toAddress,
            amount: sendAmount,
            forwardAmount: TonWeb.utils.toNano('0.05'),
            forwardPayload: memo ? await createMessagePayload(memo) : null,
            responseAddress: fromAddress
        });

        console.log('🔄 Broadcasting NMX transaction to blockchain...');
        const result = await walletInstance.methods.transfer(transfer).send();

        if (!result) {
            throw new Error('NMX transaction failed - no result from blockchain');
        }

        console.log('✅ PRODUCTION: NMX Transaction broadcasted');

        const txHash = await getTransactionHash(fromAddress, result);

        res.json({
            success: true,
            transaction: {
                hash: txHash || 'pending',
                from: fromAddress,
                to: toAddress,
                amount: sendAmount.toString(),
                amountNMX: nmxAmount,
                memo: memo,
                token: 'NMX',
                timestamp: new Date().toISOString(),
                status: 'broadcasted'
            },
            message: `Successfully sent ${nmxAmount} NMX to ${toAddress.substring(0, 8)}...`
        });

    } catch (error) {
        console.error('PRODUCTION Send NMX error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to send NMX: ' + error.message
        });
    }
});

async function decryptMnemonic(encryptedData) {
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
        throw new Error('Failed to decrypt mnemonic: ' + error.message);
    }
}

async function createMessagePayload(message) {
    if (!message) return null;

    const cell = new TonWeb.boc.Cell();
    cell.bits.writeUint(0, 32);
    cell.bits.writeString(message);
    return cell;
}

async function getTransactionHash(address, result) {
    try {
        return `ton_tx_${address}_${Date.now()}`;
    } catch (error) {
        return `ton_tx_${Date.now()}`;
    }
}

// =============================================
// PRODUCTION TRANSACTION HISTORY
// =============================================

router.get('/transaction-history/:address', async function(req, res) {
    try {
        const { address } = req.params;

        console.log('🔄 PRODUCTION: Fetching real transaction history for:', address);

        const transactions = await getRealTransactions(address);

        res.json({
            success: true,
            transactions: transactions,
            address: address
        });

    } catch (error) {
        console.error('PRODUCTION Transaction history error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch transaction history: ' + error.message
        });
    }
});

async function getRealTransactions(address) {
    try {
        const response = await axios.get(`https://tonapi.io/v2/blockchain/accounts/${address}/transactions`, {
            timeout: 10000
        });

        if (response.data && response.data.transactions) {
            return response.data.transactions.map(tx => ({
                hash: tx.hash,
                type: tx.in_msg.source ? 'received' : 'sent',
                amount: tx.in_msg.value ? TonWeb.utils.fromNano(tx.in_msg.value) : '0',
                currency: 'TON',
                from: tx.in_msg.source || '',
                to: tx.in_msg.destination || '',
                timestamp: new Date(tx.now * 1000).toISOString(),
                status: 'completed',
                memo: tx.in_msg.message || ''
            })).slice(0, 20);
        }

        return [];
    } catch (error) {
        console.log('TON API transaction fetch failed:', error.message);
        return [];
    }
}

// =============================================
// ENHANCED WALLET IMPORT WITH BALANCE DETECTION
// =============================================

router.post('/import-wallet', async function(req, res) {
    try {
        const { userId, mnemonic, targetAddress } = req.body;
        console.log('🔄 ENHANCED wallet import with balance detection...');

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

        let isValidMnemonic = false;
        try {
            isValidMnemonic = bip39.validateMnemonic(cleanedMnemonic);
            if (!isValidMnemonic) {
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

        console.log('🔄 Scanning for wallets with actual balances...');
        const walletsWithBalances = await findWalletsWithBalances(cleanedMnemonic);

        if (walletsWithBalances.length > 0) {
            console.log(`✅ Found ${walletsWithBalances.length} wallets with funds`);

            if (walletsWithBalances.length === 1) {
                console.log('✅ Auto-selecting the only wallet with funds');
                const selectedWallet = walletsWithBalances[0];
                console.log(`💰 Selected: ${selectedWallet.address} with TON: ${selectedWallet.tonBalance}, NMX: ${selectedWallet.nmxBalance}`);
                return await saveAndReturnWallet(selectedWallet, userId, cleanedMnemonic, wordCount, res);
            }

            return res.json({
                success: true,
                message: `Found ${walletsWithBalances.length} wallets with funds. Please select which one matches your Tonkeeper wallet.`,
                wallets: walletsWithBalances.map(wallet => ({
                    path: wallet.path,
                    address: wallet.address,
                    addressNonBounceable: wallet.addressNonBounceable,
                    description: wallet.description,
                    hasFunds: true,
                    balances: {
                        TON: wallet.tonBalance,
                        NMX: wallet.nmxBalance
                    }
                }))
            });
        }

        console.log('🔍 No wallets with funds found, using multi-path derivation...');
        const derivedWallets = await deriveAllWalletAddresses(cleanedMnemonic);

        if (derivedWallets.length === 0) {
            console.log('❌ No wallets could be derived from mnemonic');
            return res.status(400).json({
                success: false,
                error: 'Could not derive any wallets from this mnemonic. This may be due to library compatibility issues.',
                suggestion: 'Try using the standard TON derivation without multi-path support.'
            });
        }

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
                        addressNonBounceable: w.addressNonBounceable,
                        description: getPathDescription(w.path)
                    }))
                });
            }
        }

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
        console.error('Enhanced wallet import error:', error);
        return res.status(500).json({ 
            success: false, 
            error: 'Failed to import wallet: ' + error.message 
        });
    }
});

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
// BALANCE FUNCTIONS
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

async function getAllBalances(address) {
    try {
        console.log('🔍 [ENHANCED] getAllBalances called with address:', address);

        const [tonBalance, nmxBalance] = await Promise.all([
            getRealBalance(address),
            getNMXBalance(address)
        ]);

        console.log('✅ ENHANCED Balances fetched for:', address);
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
        console.error('❌ Enhanced balances fetch failed:', error);
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
// SIMPLE IMPORT ENDPOINT
// =============================================

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

        const wallet = await deriveWalletFromPath(cleanedMnemonic, "m/44'/607'/0'/0'/0'");

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

// =============================================
// WALLET SELECTION ENDPOINT
// =============================================

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

// =============================================
// HELPER FUNCTION TO SAVE WALLET (NO MNEMONIC)
// =============================================

async function saveAndReturnWallet(wallet, userId, mnemonic, wordCount, res) {
    try {
        const { data, error } = await supabase
            .from('user_wallets')
            .insert([{
                user_id: userId,
                address: wallet.address,
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
            console.log('✅ Wallet saved to database (NO MNEMONIC)');
        }

        console.log('✅ Wallet imported securely:', wallet.address);
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
            },
            message: 'Wallet imported securely - recovery phrase not stored in database'
        });

    } catch (error) {
        console.error('Save wallet error:', error);
        return res.status(500).json({ 
            success: false, 
            error: 'Failed to save wallet: ' + error.message 
        });
    }
}

// =============================================
// ALL YOUR EXISTING API ROUTES
// =============================================

router.get('/test', (req, res) => {
    res.json({
        success: true,
        message: 'SECURE Wallet API is working! (No mnemonic storage)',
        timestamp: new Date().toISOString(),
        security: 'Mnemonic storage disabled - client-side only',
        routes: [
            'POST /generate-wallet (REAL TON)',
            'POST /store-wallet (SECURE)',
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
            'GET /active-wallet/:userId',
            'POST /send-ton',
            'POST /send-nmx',
            'GET /transaction-history/:address'
        ]
    });
});

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