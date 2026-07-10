// finance-routes.js
// Nemex Financial Engine – Phase 2
// Middleware between Treasury and Wallet (reads live Treasury data from DB)
const express = require('express');
const router = express.Router();
const settlement = require('./settlement-engine');

// ─── UTILITY ───────────────────────────────────────────────────

async function getTreasuryState(supabase) {
    const [configRes, tonWallet, nmxWallet] = await Promise.all([
        supabase.from('treasury_config').select('*').eq('id', 1).single(),
        supabase.from('treasury_wallets').select('balance, status').eq('asset', 'TON').single(),
        supabase.from('treasury_wallets').select('balance, status').eq('asset', 'NMX').single()
    ]);

    const config = configRes.data || {};
    const tonBalance = tonWallet.data?.balance ?? 0;
    const nmxBalance = nmxWallet.data?.balance ?? 0;
    const referenceValue = nmxBalance > 0 ? (tonBalance / nmxBalance) : 0;

    return {
        buyFee: parseFloat(config.buy_fee) || 3,
        sellFee: parseFloat(config.sell_fee) || 3,
        quoteExpiration: parseInt(config.quote_expiration_seconds) || 60,
        minTrade: config.min_trade_amount != null ? parseFloat(config.min_trade_amount) : 1,
        maxTrade: parseFloat(config.max_trade_amount) || 100000,
        tradingEnabled: config.trading_enabled === true || config.trading_enabled === null,
        tonReserve: parseFloat(tonBalance),
        nmxReserve: parseFloat(nmxBalance),
        referenceValue
    };
}

async function writeLedger(supabase, eventType, entityType, entityId, userId, details) {
    await supabase.from('fe_ledger').insert({
        user_id: userId,
        event_type: eventType,
        entity_type: entityType,
        entity_id: entityId,
        details
    });
}

function createQuoteId() {
    return 'q_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 8);
}

// ─── QUOTE ENGINE ──────────────────────────────────────────────

async function generateQuote(supabase, userId, quoteType, amount) {
    const treasury = await getTreasuryState(supabase);

    if (!treasury.tradingEnabled) {
        return { valid: false, error: 'Trading is currently disabled' };
    }

    if (amount < treasury.minTrade) {
        return { valid: false, error: `Amount below minimum trade: ${treasury.minTrade}` };
    }

    if (amount > treasury.maxTrade) {
        return { valid: false, error: `Amount exceeds maximum trade: ${treasury.maxTrade}` };
    }

    const feePercent = quoteType === 'buy' ? treasury.buyFee : treasury.sellFee;
    const feeMultiplier = feePercent / 100;
    let rate, assetFrom, assetTo, amountRequested, amountReceivable, feeAmount;

    if (quoteType === 'buy') {
        // User buys NMX with TON: amount = TON being spent
        assetFrom = 'TON';
        assetTo = 'NMX';
        amountRequested = amount;
        // rate = NMX per TON = 1 / reference_value (if reference_value = TON/NMX)
        // We want: NMX received = TON spent / reference_value (approximately)
        // Using treasury reference value as the base rate
        rate = treasury.referenceValue > 0 ? (1 / treasury.referenceValue) : 2000;
        const grossNmx = amountRequested / treasury.referenceValue;
        feeAmount = grossNmx * feeMultiplier;
        amountReceivable = grossNmx - feeAmount;
    } else {
        // User sells NMX for TON: amount = NMX being sold
        assetFrom = 'NMX';
        assetTo = 'TON';
        amountRequested = amount;
        // TON received = NMX sold * reference_value
        rate = treasury.referenceValue;
        const grossTon = amountRequested * treasury.referenceValue;
        feeAmount = grossTon * feeMultiplier;
        amountReceivable = grossTon - feeAmount;
    }

    // Check treasury reserves
    if (quoteType === 'buy' && amountReceivable > treasury.nmxReserve) {
        return { valid: false, error: 'Insufficient NMX in treasury reserves' };
    }
    if (quoteType === 'sell' && amountReceivable > treasury.tonReserve) {
        return { valid: false, error: 'Insufficient TON in treasury reserves' };
    }

    const expiresAt = new Date(Date.now() + treasury.quoteExpiration * 1000).toISOString();
    const quoteData = {
        user_id: userId,
        quote_type: quoteType,
        asset_from: assetFrom,
        asset_to: assetTo,
        amount_requested: amountRequested,
        rate: parseFloat(rate.toFixed(8)),
        fee_percent: feePercent,
        fee_amount: parseFloat(feeAmount.toFixed(8)),
        amount_receivable: parseFloat(amountReceivable.toFixed(8)),
        reference_value: parseFloat(treasury.referenceValue.toFixed(8)),
        expires_at: expiresAt,
        status: 'active',
        treasury_ton_reserve: treasury.tonReserve,
        treasury_nmx_reserve: treasury.nmxReserve
    };

    const { data, error } = await supabase
        .from('fe_quotes')
        .insert(quoteData)
        .select()
        .single();

    if (error) throw error;

    await writeLedger(supabase, 'quote_requested', 'quote', data.id, userId, {
        quote_type: quoteType,
        amount: amountRequested,
        rate: quoteData.rate,
        reference_value: quoteData.reference_value
    });

    return {
        valid: true,
        quote: data
    };
}

// ─── TRADE VALIDATION ──────────────────────────────────────────

async function validateTrade(supabase, quoteId, userId) {
    const { data: quote, error: quoteErr } = await supabase
        .from('fe_quotes')
        .select('*')
        .eq('id', quoteId)
        .eq('user_id', userId)
        .single();

    if (quoteErr || !quote) {
        return { valid: false, error: 'Quote not found' };
    }

    if (quote.status !== 'active') {
        return { valid: false, error: `Quote is ${quote.status}` };
    }

    if (new Date(quote.expires_at) < new Date()) {
        await supabase.from('fe_quotes').update({ status: 'expired' }).eq('id', quoteId);
        return { valid: false, error: 'Quote has expired' };
    }

    const treasury = await getTreasuryState(supabase);

    if (!treasury.tradingEnabled) {
        return { valid: false, error: 'Trading is currently disabled' };
    }

    if (quote.amount_requested < treasury.minTrade) {
        return { valid: false, error: `Trade below minimum: ${treasury.minTrade}` };
    }

    if (quote.amount_requested > treasury.maxTrade) {
        return { valid: false, error: `Trade exceeds maximum: ${treasury.maxTrade}` };
    }

    // Check treasury reserves for the requested asset
    if (quote.quote_type === 'buy' && quote.amount_receivable > treasury.nmxReserve) {
        return { valid: false, error: 'Insufficient NMX in treasury reserves' };
    }
    if (quote.quote_type === 'sell' && quote.amount_receivable > treasury.tonReserve) {
        return { valid: false, error: 'Insufficient TON in treasury reserves' };
    }

    return { valid: true };
}

// ─── TRADE PROCESSOR ───────────────────────────────────────────

async function processTrade(supabase, quoteId, userId) {
    // Step 1: Validate
    const validation = await validateTrade(supabase, quoteId, userId);
    if (!validation.valid) {
        return { success: false, error: validation.error, step: 'validation' };
    }

    const { data: quote } = await supabase
        .from('fe_quotes')
        .select('*')
        .eq('id', quoteId)
        .single();

    const treasury = await getTreasuryState(supabase);

    // Step 2: Create trade record
    const tradeData = {
        user_id: userId,
        quote_id: quote.id,
        trade_type: quote.quote_type,
        asset_from: quote.asset_from,
        asset_to: quote.asset_to,
        amount_from: quote.amount_requested,
        amount_to: quote.amount_receivable,
        rate: quote.rate,
        fee_percent: quote.fee_percent,
        fee_amount: quote.fee_amount,
        reference_value: quote.reference_value,
        status: 'validated',
        treasury_ton_before: treasury.tonReserve,
        treasury_nmx_before: treasury.nmxReserve
    };

    const { data: trade, error: tradeErr } = await supabase
        .from('fe_trades')
        .insert(tradeData)
        .select()
        .single();

    if (tradeErr) throw tradeErr;

    await writeLedger(supabase, 'trade_submitted', 'trade', trade.id, userId, {
        trade_type: trade.trade_type,
        amount_from: trade.amount_from,
        amount_to: trade.amount_to,
        fee: trade.fee_amount
    });

    await writeLedger(supabase, 'trade_validated', 'trade', trade.id, userId, {
        treasury_ton: treasury.tonReserve,
        treasury_nmx: treasury.nmxReserve
    });

    // Step 3: Mark as processing
    await supabase
        .from('fe_trades')
        .update({ status: 'processing', updated_at: new Date().toISOString() })
        .eq('id', trade.id);

    await writeLedger(supabase, 'trade_completed', 'trade', trade.id, userId, {
        note: 'Trade recorded — blockchain settlement pending (Phase 3)'
    });

    // Step 4: Mark quote as consumed
    await supabase.from('fe_quotes').update({ status: 'consumed' }).eq('id', quote.id);

    // Step 5: Update trade to completed
    const { data: finalTrade, error: updateErr } = await supabase
        .from('fe_trades')
        .update({ status: 'completed', updated_at: new Date().toISOString() })
        .eq('id', trade.id)
        .select()
        .single();

    if (updateErr) throw updateErr;

    return {
        success: true,
        trade: finalTrade
    };
}

// ─── API ENDPOINTS ─────────────────────────────────────────────

// GET /api/finance/quote/buy — Get a buy quote (buy NMX with TON)
router.get('/quote/buy', async (req, res) => {
    try {
        const { user_id, amount } = req.query;
        if (!user_id) return res.status(400).json({ success: false, error: 'user_id required' });
        if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
            return res.status(400).json({ success: false, error: 'Valid positive amount required' });
        }

        const result = await generateQuote(req.supabase, user_id, 'buy', parseFloat(amount));

        if (!result.valid) {
            return res.status(400).json({ success: false, error: result.error });
        }

        res.json({
            success: true,
            quote: {
                id: result.quote.id,
                type: result.quote.quote_type,
                assetFrom: result.quote.asset_from,
                assetTo: result.quote.asset_to,
                amountRequested: result.quote.amount_requested,
                rate: result.quote.rate,
                feePercent: result.quote.fee_percent,
                feeAmount: result.quote.fee_amount,
                amountReceivable: result.quote.amount_receivable,
                referenceValue: result.quote.reference_value,
                expiresAt: result.quote.expires_at
            }
        });
    } catch (err) {
        console.error('Buy quote error:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// GET /api/finance/quote/sell — Get a sell quote (sell NMX for TON)
router.get('/quote/sell', async (req, res) => {
    try {
        const { user_id, amount } = req.query;
        if (!user_id) return res.status(400).json({ success: false, error: 'user_id required' });
        if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
            return res.status(400).json({ success: false, error: 'Valid positive amount required' });
        }

        const result = await generateQuote(req.supabase, user_id, 'sell', parseFloat(amount));

        if (!result.valid) {
            return res.status(400).json({ success: false, error: result.error });
        }

        res.json({
            success: true,
            quote: {
                id: result.quote.id,
                type: result.quote.quote_type,
                assetFrom: result.quote.asset_from,
                assetTo: result.quote.asset_to,
                amountRequested: result.quote.amount_requested,
                rate: result.quote.rate,
                feePercent: result.quote.fee_percent,
                feeAmount: result.quote.fee_amount,
                amountReceivable: result.quote.amount_receivable,
                referenceValue: result.quote.reference_value,
                expiresAt: result.quote.expires_at
            }
        });
    } catch (err) {
        console.error('Sell quote error:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// POST /api/finance/trade/validate — Validate a quote before executing
router.post('/trade/validate', async (req, res) => {
    try {
        const { quote_id, user_id } = req.body;
        if (!quote_id || !user_id) {
            return res.status(400).json({ success: false, error: 'quote_id and user_id required' });
        }

        const result = await validateTrade(req.supabase, quote_id, user_id);

        if (!result.valid) {
            return res.status(400).json({ success: false, error: result.error });
        }

        res.json({ success: true, message: 'Trade is valid and ready to execute' });
    } catch (err) {
        console.error('Trade validation error:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// POST /api/finance/trade/create — Create and process a trade
router.post('/trade/create', async (req, res) => {
    try {
        const { quote_id, user_id } = req.body;
        if (!quote_id || !user_id) {
            return res.status(400).json({ success: false, error: 'quote_id and user_id required' });
        }

        const result = await processTrade(req.supabase, quote_id, user_id);

        if (!result.success) {
            // Record rejection in ledger
            await writeLedger(req.supabase, 'trade_rejected', 'trade', 0, user_id, {
                quote_id,
                reason: result.error,
                step: result.step
            });

            return res.status(400).json({
                success: false,
                error: result.error,
                step: result.step
            });
        }

        res.json({
            success: true,
            message: 'Trade processed successfully',
            trade: {
                id: result.trade.id,
                type: result.trade.trade_type,
                amountFrom: result.trade.amount_from,
                amountTo: result.trade.amount_to,
                fee: result.trade.fee_amount,
                rate: result.trade.rate,
                status: result.trade.status,
                createdAt: result.trade.created_at
            }
        });
    } catch (err) {
        console.error('Trade creation error:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// POST /api/finance/trade/settle — Execute blockchain settlement
router.post('/trade/settle', async (req, res) => {
    try {
        const { trade_id, user_id, wallet_password } = req.body;
        if (!trade_id || !user_id || !wallet_password) {
            return res.status(400).json({
                success: false,
                error: 'trade_id, user_id, and wallet_password are required'
            });
        }

        const result = await settlement.settleTrade(
            req.supabase,
            trade_id,
            user_id,
            wallet_password
        );

        res.json({
            success: true,
            message: 'Settlement completed successfully',
            tradeId: result.trade.id,
            settlement: result.settlement
        });
    } catch (err) {
        console.error('Settle error:', err);

        const message = err.message.includes('already settled') ? err.message
            : err.message.includes('expired') ? err.message
            : err.message.includes('Invalid wallet password') ? 'Invalid wallet password'
            : err.message.includes('Insufficient') ? err.message
            : 'Settlement failed: ' + err.message;

        res.status(400).json({ success: false, error: message });
    }
});

// GET /api/finance/trade/:id/status — Get trade status
router.get('/trade/:id/status', async (req, res) => {
    try {
        const { id } = req.params;

        const { data: trade, error } = await req.supabase
            .from('fe_trades')
            .select('*')
            .eq('id', id)
            .single();

        if (error || !trade) {
            return res.status(404).json({ success: false, error: 'Trade not found' });
        }

        // Get associated quote
        const { data: quote } = await req.supabase
            .from('fe_quotes')
            .select('asset_from, asset_to, amount_requested, amount_receivable, expires_at')
            .eq('id', trade.quote_id)
            .single();

        res.json({
            success: true,
            trade: {
                id: trade.id,
                type: trade.trade_type,
                status: trade.status,
                assetFrom: trade.asset_from,
                assetTo: trade.asset_to,
                amountFrom: trade.amount_from,
                amountTo: trade.amount_to,
                rate: trade.rate,
                feePercent: trade.fee_percent,
                feeAmount: trade.fee_amount,
                referenceValue: trade.reference_value,
                validationErrors: trade.validation_errors,
                createdAt: trade.created_at,
                updatedAt: trade.updated_at,
                quote: quote ? {
                    id: trade.quote_id,
                    expiresAt: quote.expires_at
                } : null
            }
        });
    } catch (err) {
        console.error('Trade status error:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// GET /api/finance/trade/history — Get user trade history
router.get('/trade/history', async (req, res) => {
    try {
        const { user_id, limit = 50 } = req.query;
        if (!user_id) return res.status(400).json({ success: false, error: 'user_id required' });

        const { data: trades, error, count } = await req.supabase
            .from('fe_trades')
            .select('*', { count: 'exact' })
            .eq('user_id', user_id)
            .order('created_at', { ascending: false })
            .limit(parseInt(limit));

        if (error) throw error;

        res.json({
            success: true,
            trades: trades || [],
            count: count || 0
        });
    } catch (err) {
        console.error('Trade history error:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// GET /api/finance/ledger — Get financial ledger entries
router.get('/ledger', async (req, res) => {
    try {
        const { user_id, event_type, limit = 100 } = req.query;

        let query = req.supabase
            .from('fe_ledger')
            .select('*', { count: 'exact' })
            .order('created_at', { ascending: false })
            .limit(parseInt(limit));

        if (user_id) query = query.eq('user_id', user_id);
        if (event_type) query = query.eq('event_type', event_type);

        const { data, error, count } = await query;
        if (error) throw error;

        res.json({ success: true, entries: data || [], count: count || 0 });
    } catch (err) {
        console.error('Ledger error:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// GET /api/finance/config — Public financial engine config (for Wallet UI)
router.get('/config', async (req, res) => {
    try {
        const treasury = await getTreasuryState(req.supabase);

        res.json({
            success: true,
            config: {
                tradingEnabled: treasury.tradingEnabled,
                buyFeePercent: treasury.buyFee,
                sellFeePercent: treasury.sellFee,
                quoteExpirationSeconds: treasury.quoteExpiration,
                minTradeAmount: treasury.minTrade,
                maxTradeAmount: treasury.maxTrade,
                treasuryReferenceValue: treasury.referenceValue,
                treasuryTonReserve: treasury.tonReserve,
                treasuryNmxReserve: treasury.nmxReserve
            }
        });
    } catch (err) {
        console.error('Config error:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

module.exports = router;
