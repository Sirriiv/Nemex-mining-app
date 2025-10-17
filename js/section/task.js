// Tasks Section Controller
class TasksSection {
    constructor() {
        this.tasks = [];
        this.completedTasks = 0;
        this.init();
    }

    async init() {
        console.log('📋 Initializing tasks section...');
        await this.loadTasks();
        this.setupEventListeners();
        this.updateStats();
    }

    async loadTasks() {
        try {
            AppUtils.showLoading('Loading tasks...');

            // Simulate API call
            await new Promise(resolve => setTimeout(resolve, 800));

            // Mock tasks data
            this.tasks = [
                {
                    id: 1,
                    title: 'Daily Check-in',
                    description: 'Visit the app daily to claim your reward',
                    reward: 10,
                    completed: true,
                    type: 'daily',
                    icon: '📱'
                },
                {
                    id: 2,
                    title: 'Invite Friends',
                    description: 'Invite 3 friends to join NEMEXCOIN',
                    reward: 50,
                    completed: false,
                    type: 'social',
                    icon: '👥',
                    progress: 1,
                    target: 3
                },
                {
                    id: 3,
                    title: 'Mining Streak',
                    description: 'Maintain a 7-day mining streak',
                    reward: 25,
                    completed: false,
                    type: 'streak',
                    icon: '💰',
                    progress: 3,
                    target: 7
                },
                {
                    id: 4,
                    title: 'First Purchase',
                    description: 'Make your first NMXp purchase',
                    reward: 100,
                    completed: false,
                    type: 'purchase',
                    icon: '🛒'
                }
            ];

            this.renderTasks();
            AppUtils.hideLoading();

        } catch (error) {
            console.error('Failed to load tasks:', error);
            AppUtils.hideLoading();
            AppUtils.showToast('Failed to load tasks', 'error');
        }
    }

    renderTasks() {
        const container = document.querySelector('.tasks-container');
        if (!container) return;

        this.tasks.forEach(task => {
            const taskElement = this.createTaskElement(task);
            container.appendChild(taskElement);
        });
    }

    createTaskElement(task) {
        const taskDiv = document.createElement('div');
        taskDiv.className = 'task-card';
        taskDiv.innerHTML = `
            <div class="task-header">
                <div class="task-icon">${task.icon}</div>
                <div class="task-info">
                    <div class="task-title">${task.title}</div>
                    <div class="task-reward">+${task.reward} NMXp</div>
                </div>
            </div>
            <div class="task-description">${task.description}</div>
            ${task.progress ? `
                <div class="task-progress">
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${(task.progress / task.target) * 100}%"></div>
                    </div>
                    <div class="progress-text">${task.progress}/${task.target}</div>
                </div>
            ` : ''}
            <button class="task-btn ${task.completed ? 'completed' : ''} ${task.progress ? 'in-progress' : ''}" 
                    onclick="tasksSection.completeTask(${task.id})"
                    ${task.completed ? 'disabled' : ''}>
                ${task.completed ? 'Completed' : task.progress ? `${task.progress}/${task.target}` : 'Start'}
            </button>
        `;

        // Add progress bar styles if needed
        if (task.progress && !document.querySelector('#progress-styles')) {
            const styles = document.createElement('style');
            styles.id = 'progress-styles';
            styles.textContent = `
                .task-progress {
                    margin-bottom: 15px;
                }
                .progress-bar {
                    width: 100%;
                    height: 6px;
                    background: #333;
                    border-radius: 3px;
                    overflow: hidden;
                    margin-bottom: 5px;
                }
                .progress-fill {
                    height: 100%;
                    background: var(--gold);
                    border-radius: 3px;
                    transition: width 0.3s ease;
                }
                .progress-text {
                    font-size: 12px;
                    color: var(--muted);
                    text-align: center;
                }
            `;
            document.head.appendChild(styles);
        }

        return taskDiv;
    }

    async completeTask(taskId) {
        try {
            const task = this.tasks.find(t => t.id === taskId);
            if (!task) return;

            AppUtils.showLoading('Completing task...');

            // Simulate API call
            await new Promise(resolve => setTimeout(resolve, 1000));

            // Update task state
            if (task.progress) {
                task.progress++;
                if (task.progress >= task.target) {
                    task.completed = true;
                    this.completedTasks++;
                }
            } else {
                task.completed = true;
                this.completedTasks++;
            }

            // Update UI
            this.updateTaskDisplay(taskId);
            this.updateStats();

            AppUtils.hideLoading();
            AppUtils.showToast(`Task completed! +${task.reward} NMXp`, 'success');

            // Update global balance if home section is active
            if (window.homeSection) {
                window.homeSection.balance += task.reward;
                window.homeSection.updateBalanceDisplay();
            }

        } catch (error) {
            console.error('Failed to complete task:', error);
            AppUtils.hideLoading();
            AppUtils.showToast('Failed to complete task', 'error');
        }
    }

    updateTaskDisplay(taskId) {
        const task = this.tasks.find(t => t.id === taskId);
        if (!task) return;

        // Find the task element and update it
        const taskCards = document.querySelectorAll('.task-card');
        taskCards.forEach(card => {
            const title = card.querySelector('.task-title');
            if (title && title.textContent === task.title) {
                const btn = card.querySelector('.task-btn');
                if (task.completed) {
                    btn.textContent = 'Completed';
                    btn.className = 'task-btn completed';
                    btn.disabled = true;
                } else if (task.progress) {
                    btn.textContent = `${task.progress}/${task.target}`;
                    
                    // Update progress bar
                    const progressFill = card.querySelector('.progress-fill');
                    if (progressFill) {
                        progressFill.style.width = `${(task.progress / task.target) * 100}%`;
                    }
                    
                    const progressText = card.querySelector('.progress-text');
                    if (progressText) {
                        progressText.textContent = `${task.progress}/${task.target}`;
                    }
                }
            }
        });
    }

    updateStats() {
        const completedTasks = this.tasks.filter(t => t.completed).length;
        const availableTasks = this.tasks.filter(t => !t.completed).length;
        const totalRewards = this.tasks
            .filter(t => t.completed)
            .reduce((sum, task) => sum + task.reward, 0);

        document.getElementById('completedTasks').textContent = completedTasks;
        document.getElementById('availableTasks').textContent = availableTasks;
        document.getElementById('totalRewards').textContent = totalRewards;
    }

    setupEventListeners() {
        // Add any task-specific event listeners here
    }
}

// Initialize tasks section
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('tasks-section')) {
        window.tasksSection = new TasksSection();
    }
});