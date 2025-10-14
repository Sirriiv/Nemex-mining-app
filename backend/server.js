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

// Claim reward
app.post('/api/claim/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const now = new Date();

        console.log('Claim attempt by user:', userId);

        // Get user current data
        const { data: user, error: fetchError } = await supabase
            .from('users')
            .select('*')
            .eq('user_id', userId)
            .single();

        if (fetchError) {
            console.error('Error fetching user for claim:', fetchError);
            throw fetchError;
        }

        // Check if timer is finished
        const countdownEnd = new Date(user.countdown_end);
        if (countdownEnd > now) {
            const remaining = Math.floor((countdownEnd - now) / 1000);
            console.log('Claim rejected - time remaining:', remaining);
            return res.status(400).json({ 
                error: `Timer not finished. ${Math.floor(remaining/3600)}h ${Math.floor((remaining%3600)/60)}m remaining` 
            });
        }

        // Update user data - CLAIM REWARD
        const updates = {
            balance: user.balance + 30,
            countdown_end: new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString(),
            last_claim: now.toISOString()
        };

        const { data: updatedUser, error: updateError } = await supabase
            .from('users')
            .update(updates)
            .eq('user_id', userId)
            .select()
            .single();

        if (updateError) {
            console.error('Error updating user:', updateError);
            throw updateError;
        }

        console.log('Claim successful for user:', userId, 'New balance:', updatedUser.balance);
        
        res.json({
            balance: updatedUser.balance,
            message: 'Claim successful! +30 NMXp'
        });
    } catch (error) {
        console.error('Claim Error:', error);
        res.status(500).json({ error: error.message });
    }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log('Supabase URL:', process.env.SUPABASE_URL ? 'Set' : 'Missing');
    console.log('Supabase Key:', process.env.SUPABASE_ANON_KEY ? 'Set' : 'Missing');
});