const supabase = require('../config/supabase');

const userController = {
    // Get user by ID
    async getUser(req, res) {
        try {
            const { userId } = req.params;

            const { data: user, error } = await supabase
                .from('users')
                .select('*')
                .eq('user_id', userId)
                .single();

            if (error) {
                if (error.code === 'PGRST116') {
                    return res.status(404).json({ error: 'User not found' });
                }
                throw error;
            }

            res.json(user);
        } catch (error) {
            console.error('Get user error:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    },

    // Create new user
    async createUser(req, res) {
        try {
            const { userId, balance = 0, remainingTime = 86400, joinDate } = req.body;

            const { data: user, error } = await supabase
                .from('users')
                .insert([
                    {
                        user_id: userId,
                        balance: balance,
                        remaining_time: remainingTime,
                        join_date: joinDate || new Date().toISOString(),
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString()
                    }
                ])
                .select()
                .single();

            if (error) {
                if (error.code === '23505') { // Unique violation
                    return res.status(409).json({ error: 'User already exists' });
                }
                throw error;
            }

            res.status(201).json(user);
        } catch (error) {
            console.error('Create user error:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    },

    // Claim mining reward
    async claimReward(req, res) {
        try {
            const { userId } = req.params;

            // Get current user data
            const { data: user, error: userError } = await supabase
                .from('users')
                .select('*')
                .eq('user_id', userId)
                .single();

            if (userError) {
                return res.status(404).json({ error: 'User not found' });
            }

            // Check if user can claim (remaining_time should be 0)
            if (user.remaining_time > 0) {
                return res.status(400).json({ error: 'Reward not ready to claim' });
            }

            // Update user balance and reset timer
            const newBalance = user.balance + 30;
            const { data: updatedUser, error: updateError } = await supabase
                .from('users')
                .update({
                    balance: newBalance,
                    remaining_time: 86400, // 24 hours in seconds
                    updated_at: new Date().toISOString()
                })
                .eq('user_id', userId)
                .select()
                .single();

            if (updateError) {
                throw updateError;
            }

            // Create transaction record
            await supabase
                .from('transactions')
                .insert([
                    {
                        user_id: userId,
                        type: 'mining_reward',
                        amount: 30,
                        description: 'Daily mining reward',
                        created_at: new Date().toISOString()
                    }
                ]);

            res.json({
                balance: updatedUser.balance,
                remainingTime: updatedUser.remaining_time,
                message: 'Successfully claimed 30 NMXp!'
            });
        } catch (error) {
            console.error('Claim reward error:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    },

    // Get user profile
    async getProfile(req, res) {
        try {
            const { userId } = req.params;

            const { data: user, error } = await supabase
                .from('users')
                .select('*')
                .eq('user_id', userId)
                .single();

            if (error) {
                return res.status(404).json({ error: 'User not found' });
            }

            // Calculate mining days
            const joinDate = new Date(user.join_date);
            const today = new Date();
            const miningDays = Math.floor((today - joinDate) / (1000 * 60 * 60 * 24)) + 1;

            // Calculate total earned (you might want to get this from transactions table)
            const totalEarned = user.balance; // Simplified for now

            res.json({
                userId: user.user_id,
                name: 'Mining Enthusiast',
                email: `user_${user.user_id.substring(0, 8)}@nemexcoin.com`,
                miningDays: miningDays,
                totalEarned: totalEarned,
                memberSince: user.join_date
            });
        } catch (error) {
            console.error('Get profile error:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
};

module.exports = userController;