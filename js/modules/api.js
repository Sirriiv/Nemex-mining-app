// API Service for backend communication
class ApiService {
    constructor() {
        // Use environment variable for production, localhost for development
        this.baseURL = window.location.origin + '/api';
        this.token = StorageManager.get('token');
    }

    async request(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;
        
        const config = {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        };

        // Add auth token if available
        if (this.token) {
            config.headers['Authorization'] = `Bearer ${this.token}`;
        }

        try {
            console.log(`🌐 API Request: ${endpoint}`);
            const response = await fetch(url, config);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            return data;
            
        } catch (error) {
            console.error(`❌ API Error: ${endpoint}`, error);
            
            // Show user-friendly error message
            if (error.message.includes('Failed to fetch')) {
                throw new Error('Cannot connect to server. Please check your internet connection.');
            }
            
            throw error;
        }
    }

    // Auth endpoints
    async login(credentials) {
        return await this.request('/users/login', {
            method: 'POST',
            body: JSON.stringify(credentials)
        });
    }

    async register(userData) {
        return await this.request('/users/register', {
            method: 'POST',
            body: JSON.stringify(userData)
        });
    }

    async verifyToken(token) {
        return await this.request('/users/profile', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
    }

    // User endpoints
    async getUserProfile() {
        return await this.request('/users/profile');
    }

    async updateUserProfile(updates) {
        return await this.request('/users/profile', {
            method: 'PUT',
            body: JSON.stringify(updates)
        });
    }

    // Mining endpoints
    async getMiningStats() {
        return await this.request('/users/balance');
    }

    async claimMiningReward() {
        return await this.request('/users/mining/claim', {
            method: 'POST'
        });
    }

    // Wallet endpoints
    async getWalletBalance() {
        return await this.request('/users/balance');
    }

    async getTransactionHistory() {
        // This endpoint doesn't exist yet in backend, using mock
        return await this.mockGetTransactionHistory();
    }

    // Tasks endpoints
    async getTasks() {
        return await this.request('/tasks');
    }

    async completeTask(taskId) {
        return await this.request(`/tasks/${taskId}/complete`, {
            method: 'POST'
        });
    }

    // Referrals endpoints
    async getReferralStats() {
        // This endpoint doesn't exist yet in backend, using mock
        return await this.mockGetReferralStats();
    }

    async getReferralHistory() {
        // This endpoint doesn't exist yet in backend, using mock
        return await this.mockGetReferralHistory();
    }

    // Mock methods for development (remove when backend endpoints are implemented)
    async mockGetBalance() {
        await new Promise(resolve => setTimeout(resolve, 500));
        return { balance: 150, currency: 'NMXp' };
    }

    async mockGetNotifications() {
        await new Promise(resolve => setTimeout(resolve, 300));
        return [
            {
                id: 1,
                type: 'reward',
                title: 'Daily Reward Available',
                message: 'Your 24-hour mining reward is ready to claim!',
                time: '2 hours ago',
                read: false
            },
            {
                id: 2,
                type: 'system',
                title: 'Welcome to NEMEXCOIN',
                message: 'Start mining NMXp tokens and grow your portfolio',
                time: '1 day ago',
                read: true
            }
        ];
    }

    async mockGetTransactionHistory() {
        await new Promise(resolve => setTimeout(resolve, 400));
        return [
            {
                id: 1,
                type: 'mining_reward',
                title: 'Daily Mining Reward',
                amount: 30,
                date: new Date().toISOString(),
                status: 'completed',
                icon: '💰'
            },
            {
                id: 2,
                type: 'task_reward',
                title: 'Task Completion',
                amount: 10,
                date: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
                status: 'completed',
                icon: '📋'
            }
        ];
    }

    async mockGetReferralStats() {
        await new Promise(resolve => setTimeout(resolve, 400));
        return {
            totalReferrals: 2,
            referralEarnings: 100,
            pendingBonus: 50,
            referralCode: 'NMX' + Date.now().toString().slice(-6)
        };
    }

    async mockGetReferralHistory() {
        await new Promise(resolve => setTimeout(resolve, 400));
        return [
            {
                id: 1,
                friendName: 'John Doe',
                friendEmail: 'john@example.com',
                joinDate: '2024-01-15',
                status: 'active',
                earnings: 50
            },
            {
                id: 2,
                friendName: 'Jane Smith',
                friendEmail: 'jane@example.com',
                joinDate: '2024-01-10',
                status: 'pending',
                earnings: 0
            }
        ];
    }

    // Health check
    async healthCheck() {
        return await this.request('/health');
    }
}

// Initialize API service
window.apiService = new ApiService();