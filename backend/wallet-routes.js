// backend/wallet-routes.js - MINIMAL WORKING VERSION
const express = require('express');
const router = express.Router();
const crypto = require('crypto');

console.log('✅ Wallet Routes Loaded');

// =============================================
// 🎯 TEST ENDPOINTS
// =============================================

router.get('/test', (req, res) => {
    console.log('📞 /api/wallet/test called');
    res.json({
        success: true,
        message: 'Wallet API is working!',
        timestamp: new Date().toISOString()
    });
});

router.get('/health', (req, res) => {
    res.json({
        success: true,
        message: 'Wallet API is healthy',
        timestamp: new Date().toISOString()
    });
});

// =============================================
// 🎯 CREATE WALLET (MINIMAL VERSION)
// =============================================

router.post('/create-wallet', async (req, res) => {
    console.log('🎯 CREATE WALLET endpoint called');
    
    try {
        const { userId, userPassword } = req.body;

        if (!userId) {
            return res.status(400).json({
                success: false,
                error: 'User ID is required'
            });
        }

        if (!userPassword) {
            return res.status(400).json({
                success: false,
                error: 'Password is required'
            });
        }

        // Generate mock wallet
        const mockAddress = 'EQ' + crypto.randomBytes(16).toString('hex').slice(0, 48);
        const mockMnemonic = Array(12).fill(0).map(() => 
            crypto.randomBytes(4).toString('hex')
        ).join(' ');

        console.log('✅ Generated wallet:', mockAddress);

        res.json({
            success: true,
            wallet: {
                userId: userId,
                address: mockAddress,
                type: 'TON',
                source: 'nemex_wallet',
                wordCount: 12,
                createdAt: new Date().toISOString()
            },
            mnemonic: mockMnemonic,
            security: {
                level: 'high',
                storage: 'database_only'
            },
            instructions: 'Write down your seed phrase and store it securely!'
        });

    } catch (error) {
        console.error('❌ Create wallet failed:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create wallet: ' + error.message
        });
    }
});

// =============================================
// 🎯 GET USER WALLET
// =============================================

router.post('/get-user-wallet', async (req, res) => {
    try {
        const { userId } = req.body;
        console.log('🔍 Get user wallet for:', userId);

        // For now, return that no wallet exists
        res.json({
            success: true,
            hasWallet: false,
            message: 'No wallet found for user',
            userId: userId
        });
    } catch (error) {
        console.error('❌ Get user wallet failed:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get user wallet: ' + error.message
        });
    }
});

// =============================================
// 🎯 IMPORT WALLET
// =============================================

router.post('/import-wallet', async (req, res) => {
    try {
        const { userId, mnemonic } = req.body;
        console.log('📥 Import wallet for user:', userId);

        if (!mnemonic) {
            return res.status(400).json({
                success: false,
                error: 'Seed phrase is required'
            });
        }

        // Validate mnemonic
        const words = mnemonic.trim().split(/\s+/);
        if (words.length !== 12 && words.length !== 24) {
            return res.status(400).json({
                success: false,
                error: 'Seed phrase must be 12 or 24 words',
                receivedWords: words.length
            });
        }

        // Generate mock address
        const addressHash = crypto.createHash('sha256').update(mnemonic).digest('hex');
        const mockAddress = 'EQ' + addressHash.substring(0, 48);

        res.json({
            success: true,
            wallet: {
                userId: userId,
                address: mockAddress,
                type: 'TON',
                source: 'imported',
                wordCount: words.length,
                createdAt: new Date().toISOString()
            },
            message: 'Wallet imported successfully!'
        });
    } catch (error) {
        console.error('❌ Import wallet failed:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to import wallet: ' + error.message
        });
    }
});

// =============================================
// 🎯 GET BALANCE
// =============================================

router.get('/balance/:address', async (req, res) => {
    try {
        const { address } = req.params;
        console.log('💰 Balance check for:', address);

        // Mock balance for now
        const mockBalance = (Math.random() * 5).toFixed(4);
        
        res.json({
            success: true,
            address: address,
            balance: parseFloat(mockBalance),
            currency: 'TON',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('❌ Get balance failed:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get balance: ' + error.message
        });
    }
});

// =============================================
// 🎯 GET PRICES
// =============================================

router.get('/prices', async (req, res) => {
    try {
        console.log('📈 Prices requested');
        
        // Mock prices for now
        const currentTime = new Date();
        const hour = currentTime.getHours();
        const fluctuation = Math.sin(hour / 6) * 0.1;

        res.json({
            success: true,
            prices: {
                TON: {
                    price: parseFloat((2.5 * (1 + fluctuation)).toFixed(4)),
                    change24h: parseFloat((fluctuation * 100).toFixed(2)),
                    currency: 'USD',
                    source: 'mock'
                },
                NMX: {
                    price: parseFloat((0.10 * (1 + fluctuation * 2)).toFixed(4)),
                    change24h: parseFloat((fluctuation * 150).toFixed(2)),
                    currency: 'USD',
                    source: 'mock'
                }
            },
            timestamp: currentTime.toISOString()
        });
    } catch (error) {
        console.error('❌ Get prices failed:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get prices: ' + error.message
        });
    }
});

module.exports = router;