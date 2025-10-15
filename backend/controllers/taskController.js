const supabase = require('../config/supabase');

const taskController = {
    // Get user tasks
    async getTasks(req, res) {
        try {
            const { userId } = req.params;

            // For now, return static tasks. Later you can store tasks in database
            const tasks = [
                {
                    id: 1,
                    title: 'Daily Check-in',
                    description: 'Claim your daily reward',
                    reward: 10,
                    type: 'daily',
                    completed: false
                },
                {
                    id: 2,
                    title: 'Watch Tutorial',
                    description: 'Learn about NemexCoin',
                    reward: 15,
                    type: 'one_time',
                    completed: false
                },
                {
                    id: 3,
                    title: 'Invite Friends',
                    description: 'Earn referral bonuses',
                    reward: 50,
                    type: 'referral',
                    completed: false
                }
            ];

            res.json(tasks);
        } catch (error) {
            console.error('Get tasks error:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    },

    // Complete a task
    async completeTask(req, res) {
        try {
            const { userId } = req.params;
            const { taskId } = req.body;

            // Get task details (in a real app, you'd get this from database)
            const tasks = {
                1: { reward: 10, title: 'Daily Check-in' },
                2: { reward: 15, title: 'Watch Tutorial' },
                3: { reward: 50, title: 'Invite Friends' }
            };

            const task = tasks[taskId];
            if (!task) {
                return res.status(404).json({ error: 'Task not found' });
            }

            // Update user balance
            const { data: user, error: userError } = await supabase
                .from('users')
                .select('balance')
                .eq('user_id', userId)
                .single();

            if (userError) {
                return res.status(404).json({ error: 'User not found' });
            }

            const newBalance = user.balance + task.reward;

            const { data: updatedUser, error: updateError } = await supabase
                .from('users')
                .update({
                    balance: newBalance,
                    updated_at: new Date().toISOString()
                })
                .eq('user_id', userId)
                .select()
                .single();

            if (updateError) {
                throw updateError;
            }

            // Record transaction
            await supabase
                .from('transactions')
                .insert([
                    {
                        user_id: userId,
                        type: 'task_reward',
                        amount: task.reward,
                        description: `Completed task: ${task.title}`,
                        created_at: new Date().toISOString()
                    }
                ]);

            res.json({
                balance: updatedUser.balance,
                reward: task.reward,
                message: `Task completed! Earned ${task.reward} NMXp`
            });
        } catch (error) {
            console.error('Complete task error:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
};

module.exports = taskController;