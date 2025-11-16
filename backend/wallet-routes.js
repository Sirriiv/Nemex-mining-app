const express = require('express');
const router = express.Router();

// Simple test route
router.get('/test', (req, res) => {
    res.json({ 
        success: true, 
        message: 'Wallet API is working!',
        timestamp: new Date().toISOString()
    });
});

// Get wallet addresses 
router.get('/addresses', (req, res) => {
    res.json({
        success: true,
        addresses: {
            TON: "EQDemoAddress123456789012345678901234567890123456789012",
            USDT: "TDemoAddress123456789012345678901234567890",
            BTC: "1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa",
            TRX: "TDemoAddress123456789012345678901234567890"
        },
        message: "Real addresses coming in Phase 2!"
    });
});

// Get balances
router.get('/balances', (req, res) => {
    res.json({
        success: true,
        balances: {
            TON: "12.45",
            USDT: "450.25", 
            BTC: "0.00542",
            TRX: "1250.75"
        },
        message: "Real blockchain balances coming in Phase 2!"
    });
});

module.exports = router;