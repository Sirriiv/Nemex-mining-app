const { v4: uuidv4 } = require('uuid');

// Mock tasks database
const tasks = new Map();
const userTasks = new Map();

// Predefined tasks
const predefinedTasks = [
    {
        id: 'task_daily_checkin',
        title: 'Daily Check-in',
        description: 'Visit the app daily to claim your reward',
        reward: 10,
        type: 'daily',
        icon: '📱',
        maxCompletions: 1,
        cooldown: 24 * 60 * 60 * 1000 // 24 hours
    },
    {
        id: 'task_invite_friends',
        title: 'Invite Friends',
        description: 'Invite 3 friends to join NEMEXCOIN',
        reward: 50,
        type: 'social',
        icon: '👥',
        maxCompletions: null, // No limit
        target: 3
    },
    {
        id: 'task_mining_streak',
        title: 'Mining Streak',
        description: 'Maintain a 7-day mining streak',
        reward: 25,
        type: 'streak',
        icon: '💰',
        maxCompletions: 1,
        target: 7
    },
    {
        id: 'task_first_purchase',
        title: 'First Purchase',
        description: 'Make your first NMXp purchase',
        reward: 100,
        type: 'purchase',
        icon: '🛒',
        maxCompletions: 1
    }
];

// Initialize predefined tasks
predefinedTasks.forEach(task => {
    tasks.set(task.id, task);
});

class TaskController {
    // Get all available tasks
    async getTasks(req, res) {
        try {
            const userId = req.user.id;
            
            // Get user's task progress
            const userTaskProgress = userTasks.get(userId) || {};
            
            // Format tasks with user progress
            const tasksWithProgress = predefinedTasks.map(task => {
                const progress = userTaskProgress[task.id] || { completions: 0, lastCompletion: null };
                
                return {
                    ...task,
                    completed: progress.completions >= (task.maxCompletions || 1),
                    progress: progress.completions,
                    canComplete: this.canCompleteTask(task, progress)
                };
            });

            res.json({
                success: true,
                tasks: tasksWithProgress
            });

        } catch (error) {
            console.error('❌ Get tasks error:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error'
            });
        }
    }

    // Complete a task
    async completeTask(req, res) {
        try {
            const userId = req.user.id;
            const { taskId } = req.params;

            const task = tasks.get(taskId);
            if (!task) {
                return res.status(404).json({
                    success: false,
                    message: 'Task not found'
                });
            }

            // Get user's task progress
            if (!userTasks.has(userId)) {
                userTasks.set(userId, {});
            }
            const userTaskProgress = userTasks.get(userId);
            const progress = userTaskProgress[taskId] || { completions: 0, lastCompletion: null };

            // Check if task can be completed
            if (!this.canCompleteTask(task, progress)) {
                return res.status(400).json({
                    success: false,
                    message: 'Task cannot be completed at this time'
                });
            }

            // Get user from mock database (you'll need to import users)
            const { users } = require('../middleware/auth');
            const user = users.get(userId);
            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: 'User not found'
                });
            }

            // Update task progress
            progress.completions += 1;
            progress.lastCompletion = new Date().toISOString();
            userTaskProgress[taskId] = progress;

            // Award reward
            user.balance += task.reward;
            user.totalEarned += task.reward;

            // Create transaction record
            const transaction = {
                id: uuidv4(),
                userId: user.id,
                type: 'task_reward',
                amount: task.reward,
                description: `Task completed: ${task.title}`,
                timestamp: new Date().toISOString()
            };

            console.log(`✅ Task completed: ${user.email} completed "${task.title}" and earned ${task.reward} NMXp`);

            res.json({
                success: true,
                message: `Task completed! You earned ${task.reward} NMXp`,
                reward: task.reward,
                newBalance: user.balance,
                task: {
                    ...task,
                    completed: progress.completions >= (task.maxCompletions || 1),
                    progress: progress.completions
                }
            });

        } catch (error) {
            console.error('❌ Complete task error:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error'
            });
        }
    }

    // Check if task can be completed
    canCompleteTask(task, progress) {
        // Check max completions
        if (task.maxCompletions && progress.completions >= task.maxCompletions) {
            return false;
        }

        // Check cooldown
        if (task.cooldown && progress.lastCompletion) {
            const timeSinceLastCompletion = Date.now() - new Date(progress.lastCompletion).getTime();
            if (timeSinceLastCompletion < task.cooldown) {
                return false;
            }
        }

        // Check target for progress-based tasks
        if (task.target && progress.completions >= task.target) {
            return false;
        }

        return true;
    }

    // Get user's task statistics
    async getTaskStats(req, res) {
        try {
            const userId = req.user.id;
            const userTaskProgress = userTasks.get(userId) || {};

            let completedCount = 0;
            let totalRewards = 0;

            predefinedTasks.forEach(task => {
                const progress = userTaskProgress[task.id] || { completions: 0 };
                if (progress.completions > 0) {
                    completedCount++;
                    totalRewards += task.reward * progress.completions;
                }
            });

            res.json({
                success: true,
                stats: {
                    totalTasks: predefinedTasks.length,
                    completedTasks: completedCount,
                    availableTasks: predefinedTasks.length - completedCount,
                    totalRewards: totalRewards
                }
            });

        } catch (error) {
            console.error('❌ Get task stats error:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error'
            });
        }
    }
}

module.exports = new TaskController();