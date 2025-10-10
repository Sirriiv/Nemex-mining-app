// SERVER WITH SUPABASE
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const PORT = 3000;

// Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

console.log('🔗 Supabase Initialized:', supabaseUrl ? '✅' : '❌');

// Middleware
app.use(cors());
app.use(express.json());

// Test route
app.get('/', (req, res) => {
  res.json({ 
    message: '🎉 Server with Supabase!',
    status: 'online',
    database: 'Supabase connected',
    timestamp: new Date().toISOString()
  });
});

// Health check with database
app.get('/health', async (req, res) => {
  try {
    // Test database connection
    const { data, error } = await supabase.from('User').select('*').limit(1);
    
    res.json({ 
      status: 'healthy ❤️',
      serverTime: new Date().toLocaleString(),
      database: error ? '❌ disconnected' : '✅ connected',
      usersCount: data ? data.length : 0
    });
  } catch (error) {
    res.json({
      status: 'healthy',
      serverTime: new Date().toLocaleString(),
      database: '❌ connection failed',
      error: error.message
    });
  }
});

// Register user with Supabase
app.post('/api/register', async (req, res) => {
  const { username, password } = req.body;
  
  console.log('📝 Registration attempt:', username);
  
  try {
    // Insert user into Supabase
    const { data, error } = await supabase
      .from('User')
      .insert([
        {
          username: username,
          password_harsh: password, // We'll hash this later
          balance: 1000,
          created_at: new Date().toISOString()
        }
      ])
      .select();
    
    if (error) {
      console.log('❌ Database error:', error.message);
      return res.status(400).json({ error: error.message });
    }
    
    console.log('✅ User registered:', data[0].id);
    
    res.json({
      status: 'success 🎊',
      message: 'User registered in Supabase!',
      user: data[0]
    });
    
  } catch (error) {
    console.log('❌ Server error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Get all users from Supabase
app.get('/api/users', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('User')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      return res.status(400).json({ error: error.message });
    }
    
    res.json({
      total: data.length,
      users: data
    });
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get user by ID
app.get('/api/user/:id', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('User')
      .select('*')
      .eq('id', req.params.id)
      .single();
    
    if (error) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({ user: data });
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Start server
app.listen(PORT, () => {
  console.log('✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨');
  console.log('🚀 SERVER WITH SUPABASE RUNNING!');
  console.log('✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨');
  console.log(`📍 http://localhost:${PORT}`);
  console.log(`🔗 Supabase: ${supabaseUrl ? '✅ CONNECTED' : '❌ NO CREDENTIALS'}`);
  console.log('');
  console.log('🎯 ENDPOINTS:');
  console.log('   GET  /              - Server status');
  console.log('   GET  /health        - Health + DB check');
  console.log('   POST /api/register  - Register user');
  console.log('   GET  /api/users     - All users');
  console.log('   GET  /api/user/:id  - User by ID');
  console.log('✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨');
});
