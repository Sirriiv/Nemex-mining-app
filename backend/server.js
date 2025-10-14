const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// Initialize Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// Get or create user data
app.get('/api/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    // Check if user exists
    let { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error && error.code === 'PGRST116') {
      // User doesn't exist, create new user
      const newUser = {
        user_id: userId,
        balance: 0,
        countdown_end: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        last_claim: new Date().toISOString(),
        created_at: new Date().toISOString()
      };

      const { data: createdUser, error: createError } = await supabase
        .from('users')
        .insert([newUser])
        .select()
        .single();

      if (createError) throw createError;
      user = createdUser;
    } else if (error) {
      throw error;
    }

    // Calculate remaining time
    const now = new Date();
    const countdownEnd = new Date(user.countdown_end);
    const remainingTime = Math.max(0, Math.floor((countdownEnd - now) / 1000));

    res.json({
      balance: user.balance,
      remainingTime: remainingTime,
      canClaim: remainingTime <= 0
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Claim reward
app.post('/api/claim/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const now = new Date();

    // Get user current data
    const { data: user, error: fetchError } = await supabase
      .from('users')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (fetchError) throw fetchError;

    // Check if timer is finished
    const countdownEnd = new Date(user.countdown_end);
    if (countdownEnd > now) {
      return res.status(400).json({ error: 'Timer not finished' });
    }

    // Update user data
    const updates = {
      balance: user.balance + 30,
      countdown_end: new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString(),
      last_claim: now.toISOString(),
      updated_at: now.toISOString()
    };

    const { data: updatedUser, error: updateError } = await supabase
      .from('users')
      .update(updates)
      .eq('user_id', userId)
      .select()
      .single();

    if (updateError) throw updateError;

    res.json({
      balance: updatedUser.balance,
      message: 'Claim successful! +30 NMXp'
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});