const express = require('express');
const router = express.Router();
const { TonClient, Address } = require("@ton/ton");
const { mnemonicToWalletKey } = require("@ton/crypto");
const { WalletContractV4 } = require("@ton/ton");

// In-memory wallet storage (use database in production)
let userWallets = {};

// Generate new TON wallet
router.post('/generate-wallet', async (req, res) => {
    try {
        const { userId } = req.body;
        
        // Generate new mnemonic (24 words)
        const mnemonic = await require('@ton/crypto').generateMnemonic();
        
        // Convert mnemonic to wallet key
        const keyPair = await mnemonicToWalletKey(mnemonic.split(' '));
        
        // Create wallet contract
        const wallet = WalletContractV4.create({ 
            workchain: 0, 
            publicKey: keyPair.publicKey 
        });
        
        const walletAddress = wallet.address;
        
        // Store securely (in production, use encrypted database)
        userWallets[userId] = {
            mnemonic: mnemonic, // NEVER expose this to frontend!
            keyPair: keyPair,
            address: walletAddress.toString(),
            publicKey: keyPair.publicKey.toString('hex')
        };

        res.json({
            success: true,
            address: walletAddress.toString(),
            publicKey: keyPair.publicKey.toString('hex'),
            message: "New TON wallet generated successfully!",
            warning: "SAVE YOUR MNEMONIC SECURELY - IT WON'T BE SHOWN AGAIN"
        });
    } catch (error) {
        console.error('Wallet generation error:', error);
        res.status(500).json({
            success: false,
            error: "Failed to generate wallet"
        });
    }
});

// Import existing wallet from mnemonic
router.post('/import-wallet', async (req, res) => {
    try {
        const { userId, mnemonic } = req.body;
        
        // Convert mnemonic to wallet key
        const keyPair = await mnemonicToWalletKey(mnemonic.split(' '));
        
        // Create wallet contract
        const wallet = WalletContractV4.create({ 
            workchain: 0, 
            publicKey: keyPair.publicKey 
        });
        
        const walletAddress = wallet.address;
        
        // Store securely
        userWallets[userId] = {
            mnemonic: mnemonic,
            keyPair: keyPair,
            address: walletAddress.toString(),
            publicKey: keyPair.publicKey.toString('hex')
        };

        res.json({
            success: true,
            address: walletAddress.toString(),
            message: "Wallet imported successfully!"
        });
    } catch (error) {
        console.error('Wallet import error:', error);
        res.status(500).json({
            success: false,
            error: "Invalid mnemonic phrase"
        });
    }
});

// Get REAL TON balance for generated wallet
router.get('/balances/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const userWallet = userWallets[userId];
        
        if (!userWallet) {
            return res.status(404).json({
                success: false,
                error: "Wallet not found. Generate or import a wallet first."
            });
        }

        const tonClient = new TonClient({
            endpoint: 'https://toncenter.com/api/v2/jsonRPC'
        });

        // Get REAL balance from blockchain
        const walletAddress = Address.parse(userWallet.address);
        const balance = await tonClient.getBalance(walletAddress);
        const tonBalance = parseFloat(balance.toString()) / 1000000000; // nanoTON to TON

        res.json({
            success: true,
            balances: {
                TON: tonBalance.toFixed(6),
                USDT: "0.00", // Will add USDT later
                BTC: "0.00",
                TRX: "0.00", 
                NMX: "0.00"
            },
            address: userWallet.address,
            message: "Real TON balance from blockchain!"
        });
    } catch (error) {
        console.error('Balance check error:', error);
        res.status(500).json({
            success: false,
            error: "Failed to fetch blockchain balance"
        });
    }
});

// Send TON transaction
router.post('/send-ton', async (req, res) => {
    try {
        const { userId, toAddress, amount } = req.body;
        const userWallet = userWallets[userId];
        
        if (!userWallet) {
            return res.status(404).json({
                success: false,
                error: "Wallet not found"
            });
        }

        // In production, you'd sign and send real transaction here
        // This is simplified for demo
        
        res.json({
            success: true,
            transactionHash: "simulated_tx_hash_" + Date.now(),
            message: `Sent ${amount} TON to ${toAddress} (simulated)`
        });
    } catch (error) {
        console.error('Send transaction error:', error);
        res.status(500).json({
            success: false,
            error: "Transaction failed"
        });
    }
});

// Get wallet info (SAFE - no private keys)
router.get('/wallet-info/:userId', (req, res) => {
    const { userId } = req.params;
    const userWallet = userWallets[userId];
    
    if (!userWallet) {
        return res.status(404).json({
            success: false,
            error: "Wallet not found"
        });
    }

    // Only return public info
    res.json({
        success: true,
        address: userWallet.address,
        publicKey: userWallet.publicKey,
        hasWallet: true
    });
});

module.exports = router;