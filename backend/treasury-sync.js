// treasury-sync.js
// Nemex Treasury Synchronization Engine – Phase 3
// Connects Treasury module to live TON blockchain for real balance data.
// READ-ONLY: never stores or exposes private keys, never sends transactions.
const axios = require('axios');
const { Address } = require('@ton/ton');

const TON_API_URL = process.env.TON_API_URL || 'https://tonapi.io/v2';
const TONCENTER_API_KEY = process.env.TONCENTER_API_KEY || '';
const TON_CONSOLE_API_KEY = process.env.TON_CONSOLE_API_KEY || '';

const TREASURY_TON_WALLET = process.env.TREASURY_WALLET_ADDRESS || 'UQB_FCa2k5M5aybZ63llTR91dvUSoEDdlqOkbiORv6hNKOSC';
const NMX_JETTON_MASTER = '0:514ab5f3fbb8980e71591a1ac44765d02fe80182fd61af763c6f25ac548c9eec';

const DEFAULT_SYNC_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

let syncIntervalHandle = null;

// ─── TON BALANCE LOOKUP ────────────────────────────────────────

async function fetchTonBalance(address) {
    const queryAddress = normalizeToEQ(address);

    const endpoints = [
        {
            name: 'TON Console',
            url: `${TON_API_URL}/accounts/${queryAddress}`,
            headers: TON_CONSOLE_API_KEY
                ? { Authorization: `Bearer ${TON_CONSOLE_API_KEY.replace('bearer_', '')}`, Accept: 'application/json' }
                : {},
            parser(data) {
                if (data.balance !== undefined) {
                    const nano = BigInt(data.balance);
                    return Number(nano) / 1_000_000_000;
                }
                return null;
            }
        },
        {
            name: 'TON Center',
            url: 'https://toncenter.com/api/v2/getAddressInformation',
            params: { address: queryAddress },
            headers: TONCENTER_API_KEY ? { 'X-API-Key': TONCENTER_API_KEY } : {},
            parser(data) {
                if (data.ok !== undefined) data = data.result;
                if (data && data.balance !== undefined) {
                    return Number(BigInt(data.balance)) / 1_000_000_000;
                }
                return null;
            }
        },
        {
            name: 'Tonkeeper',
            url: `https://api.tonkeeper.com/address/${queryAddress}/balance`,
            parser(data) {
                if (data.balance !== undefined) {
                    return data.balance / 1_000_000_000;
                }
                return null;
            }
        }
    ];

    const races = endpoints.map(async (ep) => {
        try {
            const cfg = { headers: ep.headers || {}, timeout: 8000 };
            if (ep.params) cfg.params = ep.params;
            const resp = await axios.get(ep.url, cfg);
            const balance = await ep.parser(resp.data);
            if (balance !== null && balance !== undefined) {
                return { source: ep.name, balance };
            }
            return null;
        } catch {
            return null;
        }
    });

    // Try all in parallel race, then fall back to sequential if race fails
    try {
        const winner = await Promise.any(races);
        if (winner) return winner;
    } catch {}

    // Sequential fallback — try each API one at a time
    for (const ep of endpoints) {
        try {
            const cfg = { headers: ep.headers || {}, timeout: 10000 };
            if (ep.params) cfg.params = ep.params;
            const resp = await axios.get(ep.url, cfg);
            const balance = await ep.parser(resp.data);
            if (balance !== null && balance !== undefined) {
                return { source: ep.name + ' (sequential)', balance };
            }
        } catch {}
    }

    throw new Error('All TON balance APIs failed');
}

// ─── NMX JETTON BALANCE LOOKUP ─────────────────────────────────

async function fetchNmxJettonBalance(ownerAddress, jettonMaster) {
    const tonApiKey = TON_CONSOLE_API_KEY ? TON_CONSOLE_API_KEY.replace('bearer_', '') : '';

    let jettonMasterRaw = jettonMaster;
    try {
        if (jettonMaster.startsWith('EQ') || jettonMaster.startsWith('UQ')) {
            const parsed = Address.parse(jettonMaster);
            jettonMasterRaw = `${parsed.workChain}:${parsed.hash.toString('hex')}`;
        }
    } catch {
        // use as-is
    }

    const headers = tonApiKey ? { Authorization: `Bearer ${tonApiKey}` } : {};

    // Direct jetton balance endpoint
    const directUrl = `${TON_API_URL}/accounts/${ownerAddress}/jettons/${jettonMasterRaw}`;
    try {
        const resp = await axios.get(directUrl, { headers, timeout: 10000, validateStatus: () => true });
        if (resp.status === 200 && resp.data && resp.data.balance) {
            const decimals = resp.data.jetton?.decimals || 9;
            const balance = (BigInt(resp.data.balance) / BigInt(10 ** decimals)).toString();
            return { balance: parseFloat(balance), rawBalance: resp.data.balance, decimals, source: 'TonAPI direct' };
        }
    } catch {
        // fall through to list endpoint
    }

    // Fallback: list all jettons
    const listUrl = `${TON_API_URL}/accounts/${ownerAddress}/jettons`;
    const listResp = await axios.get(listUrl, { headers, timeout: 10000, validateStatus: () => true });
    if (listResp.status === 200 && listResp.data && Array.isArray(listResp.data.balances)) {
        let jettonMasterHex = jettonMasterRaw;
        try {
            const parsed = Address.parse(jettonMaster);
            jettonMasterHex = `${parsed.workChain}:${parsed.hash.toString('hex')}`;
        } catch {
            // use raw
        }

        for (const j of listResp.data.balances) {
            const jm = j.jetton?.address;
            if (!jm) continue;
            if (jm === jettonMasterHex || jm === jettonMasterRaw) {
                const decimals = j.jetton?.decimals || 9;
                const balance = (BigInt(j.balance || '0') / BigInt(10 ** decimals)).toString();
                return { balance: parseFloat(balance), rawBalance: j.balance, decimals, source: 'TonAPI list' };
            }
        }
    }

    throw new Error('NMX Jetton balance not found');
}

// ─── HELPERS ───────────────────────────────────────────────────

function normalizeToEQ(address) {
    if (address.startsWith('UQ')) {
        try {
            return Address.parse(address).toString({ urlSafe: true, bounceable: true, testOnly: false });
        } catch {
            return address;
        }
    }
    return address;
}

// ─── CORE SYNC FUNCTION ────────────────────────────────────────

async function syncTreasury(supabase, treasuryAddress, jettonMaster) {
    const syncStart = new Date();
    const results = {
        ton: { success: false, balance: null, error: null, source: null },
        nmx: { success: false, balance: null, error: null, source: null },
        referenceValue: null,
        syncedAt: syncStart.toISOString()
    };

    // Get wallet records from DB
    const { data: wallets } = await supabase
        .from('treasury_wallets')
        .select('*')
        .in('asset', ['TON', 'NMX']);

    const tonWallet = (wallets || []).find(w => w.asset === 'TON');
    const nmxWallet = (wallets || []).find(w => w.asset === 'NMX');

    // Mark wallets as syncing
    const syncUpdates = { status: 'syncing', updated_at: syncStart.toISOString() };
    if (tonWallet) await supabase.from('treasury_wallets').update(syncUpdates).eq('id', tonWallet.id);
    if (nmxWallet) await supabase.from('treasury_wallets').update(syncUpdates).eq('id', nmxWallet.id);

    // ── Sync TON balance ──
    try {
        const tonResult = await fetchTonBalance(treasuryAddress);
        results.ton.success = true;
        results.ton.balance = tonResult.balance;
        results.ton.source = tonResult.source;

        if (tonWallet) {
            await supabase.from('treasury_wallets').update({
                balance: tonResult.balance,
                status: 'active',
                last_synced_at: syncStart.toISOString(),
                updated_at: syncStart.toISOString()
            }).eq('id', tonWallet.id);
        }

        if (tonWallet) {
            await logSync(supabase, tonWallet.id, 'success', tonResult.balance, null);
        }
    } catch (err) {
        results.ton.error = err.message;
        if (tonWallet) {
            await supabase.from('treasury_wallets').update({
                status: 'error',
                updated_at: syncStart.toISOString()
            }).eq('id', tonWallet.id);
            await logSync(supabase, tonWallet.id, 'failed', null, err.message);
        }
    }

    // ── Sync NMX balance ──
    try {
        const nmxResult = await fetchNmxJettonBalance(treasuryAddress, jettonMaster);
        results.nmx.success = true;
        results.nmx.balance = nmxResult.balance;
        results.nmx.source = nmxResult.source;

        if (nmxWallet) {
            await supabase.from('treasury_wallets').update({
                balance: nmxResult.balance,
                status: 'active',
                last_synced_at: syncStart.toISOString(),
                updated_at: syncStart.toISOString()
            }).eq('id', nmxWallet.id);
        }

        if (nmxWallet) {
            await logSync(supabase, nmxWallet.id, 'success', nmxResult.balance, null);
        }
    } catch (err) {
        results.nmx.error = err.message;
        if (nmxWallet) {
            await supabase.from('treasury_wallets').update({
                status: 'error',
                updated_at: syncStart.toISOString()
            }).eq('id', nmxWallet.id);
            await logSync(supabase, nmxWallet.id, 'failed', null, err.message);
        }
    }

    // ── Calculate & update reference value ──
    const tonBalance = results.ton.balance || 0;
    const nmxBalance = results.nmx.balance || 0;
    const referenceValue = nmxBalance > 0 ? tonBalance / nmxBalance : 0;
    results.referenceValue = parseFloat(referenceValue.toFixed(12));

    // ── Audit log ──
    const overallHealth = results.ton.success && results.nmx.success
        ? 'healthy'
        : results.ton.success || results.nmx.success
            ? 'degraded'
            : 'critical';

    await supabase.from('treasury_audit_logs').insert({
        action: 'Treasury blockchain synchronization completed',
        category: 'sync',
        details: {
            ton: { balance: results.ton.balance, source: results.ton.source, error: results.ton.error },
            nmx: { balance: results.nmx.balance, source: results.nmx.source, error: results.nmx.error },
            referenceValue: results.referenceValue,
            health: overallHealth,
            syncedAt: results.syncedAt
        },
        ip_address: 'system'
    });

    return results;
}

async function logSync(supabase, walletId, status, balanceSnapshot, errorMessage) {
    await supabase.from('treasury_sync_logs').insert({
        wallet_id: walletId,
        status,
        balance_snapshot: balanceSnapshot,
        error_message: errorMessage,
        synced_at: new Date().toISOString()
    });
}

// ─── SYNC INTERVAL MANAGEMENT ──────────────────────────────────

function startAutoSync(supabase, intervalMs) {
    if (syncIntervalHandle) {
        clearInterval(syncIntervalHandle);
    }

    const ms = intervalMs || DEFAULT_SYNC_INTERVAL_MS;

    // Run immediately on start
    syncTreasury(supabase, TREASURY_TON_WALLET, NMX_JETTON_MASTER).catch(err => {
        console.error('[TreasurySync] Initial auto-sync failed:', err.message);
    });

    // Schedule recurring syncs
    syncIntervalHandle = setInterval(() => {
        syncTreasury(supabase, TREASURY_TON_WALLET, NMX_JETTON_MASTER).catch(err => {
            console.error('[TreasurySync] Auto-sync failed:', err.message);
        });
    }, ms);

    console.log(`[TreasurySync] Auto-sync started (interval: ${ms / 1000}s)`);
    return syncIntervalHandle;
}

function stopAutoSync() {
    if (syncIntervalHandle) {
        clearInterval(syncIntervalHandle);
        syncIntervalHandle = null;
        console.log('[TreasurySync] Auto-sync stopped');
    }
}

function isAutoSyncRunning() {
    return syncIntervalHandle !== null;
}

// ─── EXPORTS ───────────────────────────────────────────────────

module.exports = {
    syncTreasury,
    startAutoSync,
    stopAutoSync,
    isAutoSyncRunning,
    fetchTonBalance,
    fetchNmxJettonBalance,
    TREASURY_TON_WALLET,
    NMX_JETTON_MASTER,
    DEFAULT_SYNC_INTERVAL_MS
};
