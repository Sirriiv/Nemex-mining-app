// treasury-routes.js
// Treasury Module - Financial reserve manager for the Nemex ecosystem
const express = require('express');
const router = express.Router();
const treasurySync = require('./treasury-sync');

// Admin authorization middleware
const checkAdmin = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Authentication required' });
    }
    const token = authHeader.replace('Bearer ', '');
    if (!token || token === 'null' || token === 'undefined') {
        return res.status(401).json({ error: 'Invalid authentication token' });
    }
    req.adminToken = token;
    next();
};

// ─── TREASURY OVERVIEW ─────────────────────────────────────────

router.get('/overview', async (req, res) => {
    try {
        const supabase = req.supabase;

        const [tonWallet, nmxWallet] = await Promise.all([
            supabase.from('treasury_wallets').select('balance, status, last_synced_at').eq('asset', 'TON').single(),
            supabase.from('treasury_wallets').select('balance, status, last_synced_at').eq('asset', 'NMX').single()
        ]);

        const tonBalance = tonWallet.data?.balance || 0;
        const nmxBalance = nmxWallet.data?.balance || 0;
        const referenceValue = nmxBalance > 0 ? (tonBalance / nmxBalance) : 0;

        const [inflow, outflow, txCount, lastSync] = await Promise.all([
            supabase.from('treasury_transactions').select('amount').eq('tx_type', 'deposit').eq('status', 'completed'),
            supabase.from('treasury_transactions').select('amount').in('tx_type', ['withdrawal', 'fee']).eq('status', 'completed'),
            supabase.from('treasury_transactions').select('id', { count: 'exact', head: true }),
            supabase.from('treasury_sync_logs').select('status, synced_at').order('synced_at', { ascending: false }).limit(1)
        ]);

        const totalInflow = (inflow.data || []).reduce((sum, t) => sum + parseFloat(t.amount), 0);
        const totalOutflow = (outflow.data || []).reduce((sum, t) => sum + parseFloat(t.amount), 0);
        const lastSuccessfulSync = lastSync.data?.[0];

        const tonHealthy = tonWallet.data?.status === 'active';
        const nmxHealthy = nmxWallet.data?.status === 'active';

        res.json({
            tonReserve: tonBalance,
            nmxReserve: nmxBalance,
            treasuryReferenceValue: referenceValue,
            totalInflow,
            totalOutflow,
            transactionCount: txCount.count || 0,
            treasuryHealth: {
                tonWalletConnected: tonHealthy,
                nmxWalletConnected: nmxHealthy,
                overall: tonHealthy && nmxHealthy ? 'healthy' : (tonHealthy || nmxHealthy ? 'degraded' : 'critical'),
                lastSuccessfulSync: lastSuccessfulSync?.synced_at || null,
                syncStatus: lastSuccessfulSync?.status || 'unknown'
            },
            wallets: {
                ton: tonWallet.data || null,
                nmx: nmxWallet.data || null
            }
        });
    } catch (error) {
        console.error('Treasury overview error:', error);
        res.status(500).json({ error: 'Failed to load treasury overview' });
    }
});

// ─── TREASURY REFERENCE VALUE ───────────────────────────────────

router.get('/reference-value', async (req, res) => {
    try {
        const supabase = req.supabase;
        const [tonWallet, nmxWallet] = await Promise.all([
            supabase.from('treasury_wallets').select('balance').eq('asset', 'TON').single(),
            supabase.from('treasury_wallets').select('balance').eq('asset', 'NMX').single()
        ]);

        const tonBalance = tonWallet.data?.balance || 0;
        const nmxBalance = nmxWallet.data?.balance || 0;
        const referenceValue = nmxBalance > 0 ? (tonBalance / nmxBalance) : 0;

        res.json({
            treasuryReferenceValue: referenceValue,
            tonReserve: tonBalance,
            nmxReserve: nmxBalance,
            label: 'Treasury Reference Value'
        });
    } catch (error) {
        console.error('Reference value error:', error);
        res.status(500).json({ error: 'Failed to calculate reference value' });
    }
});

// ─── TREASURY WALLETS ──────────────────────────────────────────

router.get('/wallets', async (req, res) => {
    try {
        const supabase = req.supabase;
        const { data, error } = await supabase
            .from('treasury_wallets')
            .select('*')
            .order('asset', { ascending: true });

        if (error) throw error;
        res.json({ wallets: data });
    } catch (error) {
        console.error('Wallets fetch error:', error);
        res.status(500).json({ error: 'Failed to load treasury wallets' });
    }
});

router.put('/wallets/:id', async (req, res) => {
    try {
        const supabase = req.supabase;
        const { id } = req.params;
        const { wallet_address, label, status } = req.body;

        const updateData = {};
        if (wallet_address !== undefined) updateData.wallet_address = wallet_address;
        if (label !== undefined) updateData.label = label;
        if (status !== undefined) updateData.status = status;
        updateData.updated_at = new Date().toISOString();

        const { data, error } = await supabase
            .from('treasury_wallets')
            .update(updateData)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;

        // Audit log
        await supabase.from('treasury_audit_logs').insert({
            action: `Updated ${data.asset} wallet`,
            category: 'wallet',
            details: { previous: req.body, updated: updateData },
            ip_address: req.ip
        });

        res.json({ wallet: data });
    } catch (error) {
        console.error('Wallet update error:', error);
        res.status(500).json({ error: 'Failed to update wallet' });
    }
});

// ─── TREASURY TRANSACTIONS ─────────────────────────────────────

router.get('/transactions', async (req, res) => {
    try {
        const supabase = req.supabase;
        const { asset, type, status, limit = 50, offset = 0 } = req.query;

        let query = supabase
            .from('treasury_transactions')
            .select('*', { count: 'exact' })
            .order('created_at', { ascending: false })
            .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);

        if (asset) query = query.eq('asset', asset);
        if (type) query = query.eq('tx_type', type);
        if (status) query = query.eq('status', status);

        const { data, error, count } = await query;

        if (error) throw error;
        res.json({ transactions: data, count });
    } catch (error) {
        console.error('Transactions fetch error:', error);
        res.status(500).json({ error: 'Failed to load treasury transactions' });
    }
});

router.post('/transactions', async (req, res) => {
    try {
        const supabase = req.supabase;
        const { asset, amount, tx_type, transaction_hash, wallet_address, description, status } = req.body;

        if (!asset || !amount || !tx_type) {
            return res.status(400).json({ error: 'asset, amount, and tx_type are required' });
        }

        const { data, error } = await supabase
            .from('treasury_transactions')
            .insert({
                asset,
                amount: parseFloat(amount),
                tx_type,
                transaction_hash: transaction_hash || null,
                wallet_address: wallet_address || null,
                description: description || null,
                status: status || 'pending'
            })
            .select()
            .single();

        if (error) throw error;

        // Update wallet balance on completed transactions
        if (data.status === 'completed') {
            const walletField = data.tx_type === 'deposit'
                ? { balance: supabase.rpc ? null : null }
                : {};

            const wallet = await supabase
                .from('treasury_wallets')
                .select('balance')
                .eq('asset', data.asset)
                .single();

            if (wallet.data) {
                const delta = data.tx_type === 'deposit' ? data.amount : -data.amount;
                const newBalance = parseFloat(wallet.data.balance) + delta;
                await supabase
                    .from('treasury_wallets')
                    .update({ balance: Math.max(0, newBalance), updated_at: new Date().toISOString() })
                    .eq('asset', data.asset);
            }
        }

        await supabase.from('treasury_audit_logs').insert({
            action: `Created ${data.tx_type} transaction`,
            category: 'transaction',
            details: { transaction: data },
            ip_address: req.ip
        });

        res.json({ transaction: data });
    } catch (error) {
        console.error('Transaction creation error:', error);
        res.status(500).json({ error: 'Failed to create transaction' });
    }
});

router.patch('/transactions/:id', async (req, res) => {
    try {
        const supabase = req.supabase;
        const { id } = req.params;
        const { status, transaction_hash } = req.body;

        const { data: existing } = await supabase
            .from('treasury_transactions')
            .select('*')
            .eq('id', id)
            .single();

        if (!existing) {
            return res.status(404).json({ error: 'Transaction not found' });
        }

        const updateData = { updated_at: new Date().toISOString() };
        if (status) updateData.status = status;
        if (transaction_hash) updateData.transaction_hash = transaction_hash;

        const { data, error } = await supabase
            .from('treasury_transactions')
            .update(updateData)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;

        await supabase.from('treasury_audit_logs').insert({
            action: `Updated transaction #${id} status to ${data.status}`,
            category: 'transaction',
            details: { previous: existing, updated: data },
            ip_address: req.ip
        });

        res.json({ transaction: data });
    } catch (error) {
        console.error('Transaction update error:', error);
        res.status(500).json({ error: 'Failed to update transaction' });
    }
});

// ─── TREASURY CONFIG ────────────────────────────────────────────

router.get('/config', async (req, res) => {
    try {
        const supabase = req.supabase;
        const { data, error } = await supabase
            .from('treasury_config')
            .select('*')
            .eq('id', 1)
            .single();

        if (error && error.code !== 'PGRST116') throw error;
        res.json({ config: data || {} });
    } catch (error) {
        console.error('Config fetch error:', error);
        res.status(500).json({ error: 'Failed to load treasury config' });
    }
});

router.put('/config', async (req, res) => {
    try {
        const supabase = req.supabase;
        const { buy_fee, sell_fee, quote_expiration_seconds, min_trade_amount, max_trade_amount, trading_enabled } = req.body;

        const updateData = { updated_at: new Date().toISOString() };
        if (buy_fee !== undefined) updateData.buy_fee = parseFloat(buy_fee);
        if (sell_fee !== undefined) updateData.sell_fee = parseFloat(sell_fee);
        if (quote_expiration_seconds !== undefined) updateData.quote_expiration_seconds = parseInt(quote_expiration_seconds);
        if (min_trade_amount !== undefined) updateData.min_trade_amount = parseFloat(min_trade_amount);
        if (max_trade_amount !== undefined) updateData.max_trade_amount = parseFloat(max_trade_amount);
        if (trading_enabled !== undefined) updateData.trading_enabled = trading_enabled;

        const { data: existing } = await supabase.from('treasury_config').select('*').eq('id', 1).single();

        const { data, error } = await supabase
            .from('treasury_config')
            .upsert({ id: 1, ...updateData }, { onConflict: 'id' })
            .select()
            .single();

        if (error) throw error;

        await supabase.from('treasury_audit_logs').insert({
            action: 'Updated treasury configuration',
            category: 'config',
            details: { previous: existing, updated: data },
            ip_address: req.ip
        });

        res.json({ config: data });
    } catch (error) {
        console.error('Config update error:', error);
        res.status(500).json({ error: 'Failed to update treasury config' });
    }
});

// ─── AUDIT LOGS ─────────────────────────────────────────────────

router.get('/audit-logs', async (req, res) => {
    try {
        const supabase = req.supabase;
        const { category, limit = 50, offset = 0 } = req.query;

        let query = supabase
            .from('treasury_audit_logs')
            .select('*', { count: 'exact' })
            .order('created_at', { ascending: false })
            .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);

        if (category) query = query.eq('category', category);

        const { data, error, count } = await query;
        if (error) throw error;
        res.json({ logs: data, count });
    } catch (error) {
        console.error('Audit logs error:', error);
        res.status(500).json({ error: 'Failed to load audit logs' });
    }
});

// ─── SYNC LOGS ──────────────────────────────────────────────────

router.get('/sync-logs', async (req, res) => {
    try {
        const supabase = req.supabase;
        const { data, error } = await supabase
            .from('treasury_sync_logs')
            .select(`
                *,
                treasury_wallets ( asset, label )
            `)
            .order('synced_at', { ascending: false })
            .limit(50);

        if (error) throw error;
        res.json({ syncLogs: data });
    } catch (error) {
        console.error('Sync logs error:', error);
        res.status(500).json({ error: 'Failed to load sync logs' });
    }
});

router.post('/sync', async (req, res) => {
    try {
        const supabase = req.supabase;
        const { wallet_id } = req.body;

        const results = await treasurySync.syncTreasury(
            supabase,
            treasurySync.TREASURY_TON_WALLET,
            treasurySync.NMX_JETTON_MASTER
        );

        await supabase.from('treasury_audit_logs').insert({
            action: 'Manual treasury synchronization triggered',
            category: 'sync',
            details: { triggeredBy: 'admin', results },
            ip_address: req.ip
        });

        res.json({
            success: true,
            results
        });
    } catch (error) {
        console.error('Sync error:', error);
        res.status(500).json({ error: 'Sync failed', message: error.message });
    }
});

// ─── SYNC CONFIG ────────────────────────────────────────────────

router.get('/sync-config', async (req, res) => {
    try {
        const supabase = req.supabase;

        const { data: config } = await supabase
            .from('treasury_config')
            .select('auto_sync_enabled, sync_interval_minutes')
            .eq('id', 1)
            .single();

        res.json({
            autoSyncEnabled: config?.auto_sync_enabled ?? true,
            syncIntervalMinutes: config?.sync_interval_minutes ?? 5,
            isRunning: treasurySync.isAutoSyncRunning(),
            treasuryTonWallet: treasurySync.TREASURY_TON_WALLET,
            nmxJettonMaster: treasurySync.NMX_JETTON_MASTER
        });
    } catch (error) {
        console.error('Sync config error:', error);
        res.status(500).json({ error: 'Failed to load sync config' });
    }
});

router.put('/sync-config', async (req, res) => {
    try {
        const supabase = req.supabase;
        const { auto_sync_enabled, sync_interval_minutes } = req.body;

        const updateData = { updated_at: new Date().toISOString() };
        if (auto_sync_enabled !== undefined) updateData.auto_sync_enabled = auto_sync_enabled;
        if (sync_interval_minutes !== undefined) updateData.sync_interval_minutes = parseInt(sync_interval_minutes);

        const { data, error } = await supabase
            .from('treasury_config')
            .upsert({ id: 1, ...updateData }, { onConflict: 'id' })
            .select()
            .single();

        if (error) throw error;

        await supabase.from('treasury_audit_logs').insert({
            action: 'Updated treasury sync configuration',
            category: 'sync',
            details: { updated: updateData },
            ip_address: req.ip
        });

        // Restart auto-sync with new interval
        if (auto_sync_enabled !== undefined || sync_interval_minutes !== undefined) {
            if (treasurySync.isAutoSyncRunning()) {
                treasurySync.stopAutoSync();
            }
            if (updateData.auto_sync_enabled !== false) {
                const intervalMs = (updateData.sync_interval_minutes || 5) * 60 * 1000;
                treasurySync.startAutoSync(supabase, intervalMs);
            }
        }

        res.json({ config: data });
    } catch (error) {
        console.error('Sync config update error:', error);
        res.status(500).json({ error: 'Failed to update sync config' });
    }
});

// ─── HEALTH ─────────────────────────────────────────────────────

router.get('/health', async (req, res) => {
    try {
        const supabase = req.supabase;

        // Treasury signer check (safe — no keys exposed)
        let treasurySignerInfo = null;
        try {
            const settlement = require('./settlement-engine');
            const signer = await settlement.getTreasurySigner();
            treasurySignerInfo = {
                derived: signer.walletContract.address.toString({ urlSafe: true, bounceable: false }),
                expected: settlement.TREASURY_TON_WALLET,
                match: signer.walletContract.address.toString({ urlSafe: true, bounceable: false }) === settlement.TREASURY_TON_WALLET
            };
        } catch (e) {
            treasurySignerInfo = { error: e.message };
        }

        const [wallets, lastSync] = await Promise.all([
            supabase.from('treasury_wallets').select('*'),
            supabase.from('treasury_sync_logs')
                .select('*')
                .order('synced_at', { ascending: false })
                .limit(10)
        ]);

        const walletConnectionStatus = (wallets.data || []).map(w => ({
            asset: w.asset,
            address: w.wallet_address,
            balance: w.balance,
            status: w.status,
            lastSynced: w.last_synced_at
        }));

        res.json({
            walletConnectionStatus,
            lastSuccessfulSync: lastSync.data?.find(l => l.status === 'success')?.synced_at || null,
            syncLogs: lastSync.data || [],
            overallHealth: walletConnectionStatus.every(w => w.status === 'active') ? 'healthy' : 'degraded',
            treasurySigner: treasurySignerInfo
        });
    } catch (error) {
        console.error('Health error:', error);
        res.status(500).json({ error: 'Failed to load health data' });
    }
});

module.exports = router;
