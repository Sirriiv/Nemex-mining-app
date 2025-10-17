// API Service for backend communication
class ApiService {
    constructor() {
        this.baseURL = 'http://localhost:3000/api'; // Update with your backend URL
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
            console.log(`🌐 API Request: ${endpoint}`, config);
            const response = await fetch(url, config);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            console.log(`✅ API Response: ${endpoint}`, data);
            return data;
            
        } catch (error) {
            console.error(`❌ API Error: ${endpoint}`, error);
            throw error;
        }
    }

    // Auth endpoints
    async login(credentials) {
        return await this.request('/auth/login', {
            method: 'POST',
            body: JSON.stringify(credentials)
        });
    }

    async register(userData) {
        return await this.request('/auth/register', {
            method: 'POST',
            body: JSON.stringify(userData)
        });
    }

    async verifyToken(token) {
        return await this.request('/auth/verify', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
    }

    // User endpoints
    async getUserProfile() {
        return await this.request('/user/profile');
    }

    async updateUserProfile(updates) {
        return await this.request('/user/profile', {
            method: 'PUT',
            body: JSON.stringify(updates)
        });
    }

    // Mining endpoints
    async getMiningStats() {
        return await this.request('/mining/stats');
    }

    async claimMiningReward() {
        return await this.request('/mining/claim', {
            method: 'POST'
        });
    }

    // Wallet endpoints
    async getWalletBalance() {
        return await this.request('/wallet/balance');
    }

    async getTransactionHistory() {
        return await this.request('/wallet/transactions');
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
        return await this.request('/referrals/stats');
    }

    async getReferralHistory() {
        return await this.request('/referrals/history');
    }

    // Mock methods for development (remove when backend is ready)
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
}

// Initialize API service
window.apiService = new ApiService();