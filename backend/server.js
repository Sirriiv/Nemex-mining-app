const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// Initialize Supabase
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase environment variables');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Get or create user data
app.get('/api/user/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        console.log('Fetching user:', userId);

        // Check if user exists
        let { data: user, error } = await supabase
            .from('users')
            .select('*')
            .eq('user_id', userId)
            .single();

        if (error && error.code === 'PGRST116') {
            // User doesn't exist - CREATE NEW USER
            console.log('Creating new user:', userId);
            const newUser = {
                user_id: userId,
                balance: 0,
                countdown_end: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
                last_claim: new Date().toISOString()
            };

            const { data: createdUser, error: createError } = await supabase
                .from('users')
                .insert([newUser])
                .select()
                .single();

            if (createError) {
                console.error('Error creating user:', createError);
                throw createError;
            }
            user = createdUser;
            console.log('New user created:', user);
        } else if (error) {
            console.error('Error fetching user:', error);
            throw error;
        }

        // Calculate remaining time
        const now = new Date();
        const countdownEnd = new Date(user.countdown_end);
        const remainingTime = Math.max(0, Math.floor((countdownEnd - now) / 1000));

        console.log('User data:', { 
            userId, 
            balance: user.balance, 
            remainingTime,
            countdownEnd: user.countdown_end 
        });

        res.json({
            balance: user.balance,
            remainingTime: remainingTime,
            canClaim: remainingTime <= 0
        });
    } catch (error) {
        console.error('API Error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Claim