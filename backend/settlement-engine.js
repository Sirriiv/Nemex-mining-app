// settlement-engine.js
// Nemex Settlement Engine – Phase 6
// Executes TON/NMX transfers between user wallets and Treasury.
// All signing is off-chain, server-side. Mnemonics never exposed to clients.
const crypto = require('crypto');
const argon2 = require('argon2');
const bcrypt = require('bcrypt');
const axios = require('axios');
const { mnemonicToPrivateKey } = require('@ton/crypto');
const { WalletContractV4, WalletContractV5R1, TonClient, Address, internal, toNano, fromNano, beginCell } = require('@ton/ton');

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || '';
const TREASURY_TON_WALLET = process.env.TREASURY_WALLET_ADDRESS || 'UQB_FCa2k5M5aybZ63llTR91dvUSoEDdlqOkbiORv6hNKOSC';
const NMX_JETTON_MASTER = '0:514ab5f3fbb8980e71591a1ac44765d02fe80182fd61af763c6f25ac548c9eec';

// RPC endpoints in priority order
const RPC_ENDPOINTS = [
    { name: 'TON Console', endpoint: 'https://tonapi.io/v2/jsonRPC', apiKey: (process.env.TON_CONSOLE_API_KEY || '').replace('bearer_', '') },
    { name: 'TON Center', endpoint: 'https://toncenter.com/api/v2/jsonRPC', apiKey: process.env.TONCENTER_API_KEY || '' },
    { name: 'Public', endpoint: 'https://toncenter.com/api/v2/jsonRPC', apiKey: undefined }
];

// ─── TREASURY MNEMONIC MANAGEMENT ──────────────────────────────

let _treasuryKeyPair = null;
let _treasuryWalletContract = null;

async function decryptTreasuryMnemonic() {
    const encoded = process.env.TREASURY_MNEMONIC_ENCRYPTED;
    if (!encoded) throw new Error('TREASURY_MNEMONIC_ENCRYPTED not set in environment');
    if (!ENCRYPTION_KEY) throw new Error('ENCRYPTION_KEY not set in environment');

    const data = JSON.parse(Buffer.from(encoded, 'base64').toString('utf8'));

    const iv = Buffer.from(data.iv, 'hex');
    const authTag = Buffer.from(data.authTag, 'hex');
    const salt = Buffer.from(data.salt, 'hex');

    const key = await argon2.hash(ENCRYPTION_KEY, {
        salt, raw: true, hashLength: 32,
        type: argon2.argon2id,
        timeCost: data.kdfParams?.timeCost || 3,
        memoryCost: data.kdfParams?.memoryCost || (1 << 16)
    });

    const decipher = crypto.createDecipheriv(data.algorithm, key, iv);
    decipher.setAuthTag(authTag);
    let decrypted = decipher.update(data.encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
}

async function getTreasurySigner() {
    if (_treasuryKeyPair && _treasuryWalletContract) {
        return { keyPair: _treasuryKeyPair, walletContract: _treasuryWalletContract };
    }

    const mnemonic = await decryptTreasuryMnemonic();
    const words = mnemonic.trim().split(/\s+/);
    _treasuryKeyPair = await mnemonicToPrivateKey(words);

    // Try V5R1 first (most common for modern wallets), then V4
    const contracts = [];
    for (let sub = 0; sub <= 15; sub++) {
        try {
            contracts.push(WalletContractV5R1.create({
                workchain: 0, publicKey: _treasuryKeyPair.publicKey,
                walletId: { networkGlobalId: -239, context: { workchain: 0, walletVersion: 'v5r1', subwalletNumber: sub } }
            }));
        } catch {}
    }
    contracts.push(WalletContractV4.create({ workchain: 0, publicKey: _treasuryKeyPair.publicKey }));

    for (const c of contracts) {
        const derived = c.address.toString({ urlSafe: true, bounceable: false });
        if (derived === TREASURY_TON_WALLET) {
            _treasuryWalletContract = c;
            return { keyPair: _treasuryKeyPair, walletContract: _treasuryWalletContract };
        }
    }

    // No match — report the first derived address for debugging
    const firstDerived = contracts.length > 0
        ? contracts[0].address.toString({ urlSafe: true, bounceable: false })
        : 'none';
    _treasuryKeyPair = null;
    _treasuryWalletContract = null;
    throw new Error(`Treasury mnemonic mismatch. Expected ${TREASURY_TON_WALLET}, derived ${firstDerived}`);
}

function clearTreasurySignerCache() {
    _treasuryKeyPair = null;
    _treasuryWalletContract = null;
}

// ─── TON CLIENT ────────────────────────────────────────────────

async function connectTonClient() {
    for (const rpc of RPC_ENDPOINTS) {
        try {
            const cfg = { endpoint: rpc.endpoint, timeout: 15000 };
            if (rpc.apiKey) cfg.apiKey = rpc.apiKey;
            const client = new TonClient(cfg);
            await client.getBalance(Address.parse(TREASURY_TON_WALLET));
            return { client, name: rpc.name };
        } catch {
            continue;
        }
    }
    throw new Error('All TON RPC endpoints unreachable');
}

// ─── USER WALLET HELPERS ───────────────────────────────────────

async function getUserWallet(supabase, userId) {
    const { data: wallet, error } = await supabase
        .from('user_wallets')
        .select('id, user_id, address, password_hash, encrypted_mnemonic')
        .eq('user_id', userId)
        .maybeSingle();

    if (error || !wallet) throw new Error('User wallet not found');
    return wallet;
}

async function decryptUserMnemonic(wallet, walletPassword) {
    if (!wallet.password_hash) throw new Error('Wallet has no password');
    const valid = await bcrypt.compare(walletPassword, wallet.password_hash);
    if (!valid) throw new Error('Invalid wallet password');

    const data = typeof wallet.encrypted_mnemonic === 'string'
        ? JSON.parse(wallet.encrypted_mnemonic)
        : wallet.encrypted_mnemonic;

    const algorithm = data.algorithm || 'aes-256-gcm';

    // Detect encoding: hex (wallet creation) vs base64 (password recovery)
    const hasAlgorithmField = !!data.algorithm;
    const encoding = hasAlgorithmField ? 'hex' : 'base64';

    const iv = Buffer.from(data.iv, encoding);
    const authTag = Buffer.from(data.authTag, encoding);
    const decryptedText = data.encrypted;

    let key;
    if (data.kdf === 'argon2id' && data.salt) {
        const salt = Buffer.from(data.salt, encoding);
        key = await argon2.hash(walletPassword, {
            salt, raw: true, hashLength: 32,
            type: argon2.argon2id,
            timeCost: data.kdfParams?.timeCost || 3,
            memoryCost: data.kdfParams?.memoryCost || (1 << 16)
        });
    } else {
        // scrypt fallback (password recovery format)
        const salt = Buffer.from(data.salt || 'nemex-salt', encoding);
        key = await new Promise((resolve, reject) => {
            crypto.scrypt(walletPassword, salt, 32, (err, derivedKey) => {
                if (err) reject(err);
                else resolve(derivedKey);
            });
        });
    }

    const decipher = crypto.createDecipheriv(algorithm, key, iv);
    decipher.setAuthTag(authTag);
    let decrypted = decipher.update(decryptedText, encoding, 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
}

// ─── TON TRANSFER ──────────────────────────────────────────────

async function sendTon(supabase, fromKeyPair, fromWalletContract, toAddress, amountTon) {
    const { client, name } = await connectTonClient();

    const amountNano = toNano(amountTon.toFixed(9));
    const minKeep = toNano('0.01');

    const balance = await client.getBalance(fromWalletContract.address);
    const balanceTon = Number(BigInt(balance)) / 1_000_000_000;
    if (balanceTon < amountTon + 0.02) {
        throw new Error(`Insufficient TON: have ${balanceTon.toFixed(4)}, need ${amountTon.toFixed(4)} + gas`);
    }

    const contractState = await client.getContractState(fromWalletContract.address);
    const seqno = contractState.seqno ?? 0;

    const transfer = fromWalletContract.createTransfer({
        secretKey: fromKeyPair.secretKey,
        seqno,
        messages: [internal({
            to: toAddress,
            value: amountNano,
            bounce: false
        })],
        sendMode: 3
    });

    await client.sendExternalMessage(fromWalletContract, transfer);
    console.log(`[Settle] Sent ${amountTon} TON → ${toAddress.substring(0, 12)}... via ${name}, seqno=${seqno}`);

    // Record transaction
    const txHash = crypto.createHash('sha256')
        .update(fromWalletContract.address.toString() + toAddress + amountNano.toString() + Date.now().toString())
        .digest('hex');

    await supabase.from('treasury_transactions').insert({
        asset: 'TON',
        amount: amountTon,
        tx_type: 'transfer',
        transaction_hash: txHash,
        wallet_address: TREASURY_TON_WALLET,
        status: 'completed',
        description: `Settlement: ${balanceTon} TON sent to ${toAddress}`
    });

    return { txHash, seqno };
}

// ─── NMX JETTON TRANSFER ───────────────────────────────────────

async function sendNmxJetton(supabase, fromKeyPair, fromWalletContract, toAddress, amountNmx) {
    const { client, name } = await connectTonClient();

    const jettonMasterAddr = parseJettonMaster(NMX_JETTON_MASTER);

    // Get Jetton wallet address for sender
    const jettonWalletAddr = await runGetMethod(
        client, jettonMasterAddr, 'get_wallet_address',
        [{ type: 'slice', value: fromWalletContract.address.toString() }]
    );

    if (!jettonWalletAddr) throw new Error('Failed to derive Jetton wallet address');
    const parsedJettonWallet = Address.parse(jettonWalletAddr);

    const amount = BigInt(Math.floor(amountNmx * 1_000_000_000));

    // Build Jetton transfer internal message
    const forwardPayload = beginCell()
        .storeUint(0, 32)
        .storeStringTail('Nemex Settlement')
        .endCell();

    const jettonTransferBody = beginCell()
        .storeUint(0x0f8a7ea5, 32)
        .storeUint(0, 64)
        .storeCoins(amount)
        .storeAddress(Address.parse(toAddress))
        .storeAddress(fromWalletContract.address)
        .storeBit(false)
        .storeCoins(toNano('0.01'))
        .storeBit(true)
        .storeRef(forwardPayload)
        .endCell();

    const contractState = await client.getContractState(fromWalletContract.address);
    const seqno = contractState.seqno ?? 0;

    const transfer = fromWalletContract.createTransfer({
        secretKey: fromKeyPair.secretKey,
        seqno,
        messages: [internal({
            to: parsedJettonWallet,
            value: toNano('0.05'),
            body: jettonTransferBody,
            bounce: true
        })],
        sendMode: 3
    });

    await client.sendExternalMessage(fromWalletContract, transfer);
    console.log(`[Settle] Sent ${amountNmx} NMX → ${toAddress.substring(0, 12)}... via ${name}, seqno=${seqno}`);

    const txHash = crypto.createHash('sha256')
        .update(fromWalletContract.address.toString() + toAddress + amount.toString() + Date.now().toString())
        .digest('hex');

    await supabase.from('treasury_transactions').insert({
        asset: 'NMX',
        amount: amountNmx,
        tx_type: 'transfer',
        transaction_hash: txHash,
        wallet_address: TREASURY_TON_WALLET,
        status: 'completed',
        description: `Settlement: ${amountNmx} NMX sent to ${toAddress}`
    });

    return { txHash, seqno };
}

// ─── JETTON HELPERS ────────────────────────────────────────────

function parseJettonMaster(address) {
    try {
        return Address.parse(address);
    } catch {
        if (address.includes(':')) {
            const [wc, hex] = address.split(':');
            return new Address(parseInt(wc), Buffer.from(hex, 'hex'));
        }
        throw new Error('Cannot parse Jetton master address: ' + address);
    }
}

async function runGetMethod(client, contractAddress, method, stackParams = []) {
    try {
        const { stack } = await client.runMethod(contractAddress, method, stackParams);
        if (stack && stack.length > 0 && stack[0][1] === 'slice') {
            const cell = stack[0][2];
            const slice = cell.beginParse();
            const addr = slice.loadAddress();
            return addr.toString({ urlSafe: true, bounceable: true });
        }
        return null;
    } catch (e) {
        console.error(`[Settle] runGetMethod(${method}) failed:`, e.message);
        return null;
    }
}

// ─── DEDUP CHECK ───────────────────────────────────────────────

async function checkAlreadySettled(supabase, tradeId) {
    const { data } = await supabase
        .from('fe_trades')
        .select('status, settlement_tx_hash')
        .eq('id', tradeId)
        .single();
    return data?.status === 'completed' || data?.status === 'settled';
}

// ─── CORE SETTLEMENT ───────────────────────────────────────────

async function settleBuy(supabase, trade, quote, userId, walletPassword) {
    if (await checkAlreadySettled(supabase, trade.id)) {
        throw new Error('Trade already settled');
    }

    // Load Treasury signer and user wallet in parallel
    const [treasurySigner, userWallet] = await Promise.all([
        getTreasurySigner(),
        getUserWallet(supabase, userId)
    ]);

    const userMnemonic = await decryptUserMnemonic(userWallet, walletPassword);
    const userWords = userMnemonic.split(' ');
    const userKeyPair = await mnemonicToPrivateKey(userWords);
    const userContract = WalletContractV4.create({
        workchain: 0,
        publicKey: userKeyPair.publicKey
    });

    const tonAmount = parseFloat(trade.amount_from);
    const nmxAmount = parseFloat(trade.amount_to);

    console.log(`[Settle] BUY: user→Treasury ${tonAmount} TON, Treasury→user ${nmxAmount} NMX`);

    // Step 1: User sends TON to Treasury
    const tonTx = await sendTon(supabase, userKeyPair, userContract, TREASURY_TON_WALLET, tonAmount);

    // Step 2: Treasury sends NMX to user
    let nmxTx;
    try {
        nmxTx = await sendNmxJetton(supabase, treasurySigner.keyPair, treasurySigner.walletContract, userWallet.address, nmxAmount);
    } catch (err) {
        // Treasury NMX send failed after user paid TON — log for manual resolution
        await supabase.from('treasury_audit_logs').insert({
            action: 'CRITICAL: Settlement partial failure — TON received, NMX not sent',
            category: 'sync',
            details: { tradeId: trade.id, userId, tonTx, nmxError: err.message },
            ip_address: 'settlement-engine'
        });
        throw new Error(`TON sent but NMX transfer failed: ${err.message}. Support has been notified.`);
    }

    await supabase.from('treasury_audit_logs').insert({
        action: 'Buy settlement completed',
        category: 'sync',
        details: { tradeId: trade.id, userId, tonTx, nmxTx, tonAmount, nmxAmount },
        ip_address: 'settlement-engine'
    });

    return { tonTx, nmxTx };
}

async function settleSell(supabase, trade, quote, userId, walletPassword) {
    if (await checkAlreadySettled(supabase, trade.id)) {
        throw new Error('Trade already settled');
    }

    const [treasurySigner, userWallet] = await Promise.all([
        getTreasurySigner(),
        getUserWallet(supabase, userId)
    ]);

    const userMnemonic = await decryptUserMnemonic(userWallet, walletPassword);
    const userWords = userMnemonic.split(' ');
    const userKeyPair = await mnemonicToPrivateKey(userWords);
    const userContract = WalletContractV4.create({
        workchain: 0,
        publicKey: userKeyPair.publicKey
    });

    const nmxAmount = parseFloat(trade.amount_from);
    const tonAmount = parseFloat(trade.amount_to);

    console.log(`[Settle] SELL: user→Treasury ${nmxAmount} NMX, Treasury→user ${tonAmount} TON`);

    // Step 1: User sends NMX to Treasury
    const nmxTx = await sendNmxJetton(supabase, userKeyPair, userContract, TREASURY_TON_WALLET, nmxAmount);

    // Step 2: Treasury sends TON to user
    let tonTx;
    try {
        tonTx = await sendTon(supabase, treasurySigner.keyPair, treasurySigner.walletContract, userWallet.address, tonAmount);
    } catch (err) {
        await supabase.from('treasury_audit_logs').insert({
            action: 'CRITICAL: Settlement partial failure — NMX received, TON not sent',
            category: 'sync',
            details: { tradeId: trade.id, userId, nmxTx, tonError: err.message },
            ip_address: 'settlement-engine'
        });
        throw new Error(`NMX sent but TON transfer failed: ${err.message}. Support has been notified.`);
    }

    await supabase.from('treasury_audit_logs').insert({
        action: 'Sell settlement completed',
        category: 'sync',
        details: { tradeId: trade.id, userId, nmxTx, tonTx, nmxAmount, tonAmount },
        ip_address: 'settlement-engine'
    });

    return { nmxTx, tonTx };
}

// ─── MAIN SETTLE ENTRYPOINT ────────────────────────────────────

async function settleTrade(supabase, tradeId, userId, walletPassword) {
    const { data: trade, error: tradeErr } = await supabase
        .from('fe_trades')
        .select('*')
        .eq('id', tradeId)
        .eq('user_id', userId)
        .single();

    if (tradeErr || !trade) throw new Error('Trade not found');
    if (trade.status === 'completed' || trade.status === 'settled') {
        throw new Error('Trade already settled');
    }

    const { data: quote } = await supabase
        .from('fe_quotes')
        .select('*')
        .eq('id', trade.quote_id)
        .single();

    if (!quote) throw new Error('Quote not found');

    // Re-validate quote expiry
    if (new Date(quote.expires_at) < new Date()) {
        await supabase.from('fe_trades').update({ status: 'failed', updated_at: new Date().toISOString() }).eq('id', tradeId);
        await supabase.from('fe_quotes').update({ status: 'expired' }).eq('id', quote.id);
        throw new Error('Quote has expired');
    }

    // Mark trade as processing
    await supabase.from('fe_trades').update({ status: 'processing', updated_at: new Date().toISOString() }).eq('id', tradeId);

    let settlement;
    try {
        if (trade.trade_type === 'buy') {
            settlement = await settleBuy(supabase, trade, quote, userId, walletPassword);
        } else {
            settlement = await settleSell(supabase, trade, quote, userId, walletPassword);
        }

        // Mark trade as completed
        await supabase.from('fe_trades').update({
            status: 'completed',
            treasury_ton_after: null,
            treasury_nmx_after: null,
            updated_at: new Date().toISOString()
        }).eq('id', tradeId);

        // Consume the quote
        await supabase.from('fe_quotes').update({ status: 'consumed' }).eq('id', quote.id);

        // Trigger Treasury sync
        try {
            const treasurySync = require('./treasury-sync');
            await treasurySync.syncTreasury(supabase, TREASURY_TON_WALLET, NMX_JETTON_MASTER);
        } catch (syncErr) {
            console.error('[Settle] Post-settlement Treasury sync failed:', syncErr.message);
        }

        return { success: true, trade, settlement };
    } catch (err) {
        console.error('[Settle] Settlement failed:', err.message);

        // Mark trade as failed
        await supabase.from('fe_trades').update({
            status: 'failed',
            updated_at: new Date().toISOString()
        }).eq('id', tradeId);

        await supabase.from('treasury_audit_logs').insert({
            action: 'Settlement failed',
            category: 'sync',
            details: { tradeId, userId, tradeType: trade.trade_type, error: err.message },
            ip_address: 'settlement-engine'
        });

        throw err;
    }
}

module.exports = {
    settleTrade,
    settleBuy,
    settleSell,
    decryptTreasuryMnemonic,
    getTreasurySigner,
    clearTreasurySignerCache,
    TREASURY_TON_WALLET,
    NMX_JETTON_MASTER
};
