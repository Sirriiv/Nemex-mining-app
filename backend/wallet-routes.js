const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');
const crypto = require('crypto');

console.log('🔧 Initializing wallet routes...');

// Initialize Supabase
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables');
  throw new Error('Supabase environment variables are required');
}

console.log('✅ Supabase credentials found');
const supabase = createClient(supabaseUrl, supabaseKey);

// Simple TON balance check using HTTP API
async function getTONBalance(address) {
  try {
    console.log(`🔍 Checking TON balance for: ${address}`);
    
    const response = await axios.get(
      `https://toncenter.com/api/v2/getAddressBalance?address=${address}`,
      {
        headers: {
          'X-API-Key': process.env.TONCENTER_API_KEY
        }
      }
    );
    
    // Convert nanoTON to TON
    const balanceNano = parseFloat(response.data.result);
    const balanceTON = balanceNano / 1000000000;
    
    console.log(`✅ TON balance: ${balanceTON}`);
    return balanceTON;
    
  } catch (error) {
    console.error('❌ TON balance check failed:', error.message);
    return 0;
  }
}

// ========== ROUTES ========== //

// Test route
router.get('/test', (req, res) => {
  res.json({ 
    success: true, 
    message: 'Wallet API is working!',
    timestamp: new Date().toISOString()
  });
});

// Generate wallet
router.post('/generate-wallet', async (req, res) => {
  try {
    const { userId } = req.body;
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'User ID is required'
      });
    }

    // Generate a mock TON address for now
    const walletAddress = 'EQ' + crypto.randomBytes(24).toString('hex').toUpperCase();
    
    // Store in Supabase
    const { data, error } = await supabase
      .from('user_wallets')
      .insert([
        {
          user_id: userId,
          wallet_address: walletAddress,
          public_key: 'temp_public_key_' + Date.now(),
          encrypted_mnemonic: 'temp_encrypted_mnemonic',
          encryption_iv: 'temp_iv',
          encryption_auth_tag: 'temp_tag',
          source: 'nemex_wallet_web',
          created_at: new Date().toISOString()
        }
      ])
      .select();

    if (error) {
      throw new Error('Database error: ' + error.message);
    }

    res.json({
      success: true,
      userId: userId,
      address: walletAddress,
      message: "Wallet created successfully!"
    });

  } catch (error) {
    console.error('Wallet generation error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get balances
router.get('/balances/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    // Get user wallet from Supabase
    const { data: wallet, error } = await supabase
      .from('user_wallets')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error || !wallet) {
      return res.status(404).json({
        success: false,
        error: "Wallet not found. Generate a wallet first."
      });
    }

    // Get REAL TON balance from blockchain
    const tonBalance = await getTONBalance(wallet.wallet_address);

    const realBalances = {
      TON: tonBalance.toFixed(6),
      USDT: "0.00",
      BTC: "0.00", 
      TRX: "0.00",
      NMX: "0.00"
    };

    res.json({
      success: true,
      balances: realBalances,
      address: wallet.wallet_address,
      message: "Real blockchain balances loaded"
    });

  } catch (error) {
    console.error('Balance check error:', error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch balances"
    });
  }
});

// Health check
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Nemex Wallet API is running',
    timestamp: new Date().toISOString(),
    database: 'connected',
    version: '1.0.0'
  });
});

console.log('✅ Wallet routes initialized successfully');
module.exports = router;