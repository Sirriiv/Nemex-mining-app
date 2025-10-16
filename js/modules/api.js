// API Configuration
const API_BASE = 'https://nemex-backend.onrender.com';

class API {
    static async getUser(userId) {
        const response = await fetch(`${API_BASE}/api/user/${userId}`);
        if (!response.ok) throw new Error('Failed to fetch user');
        return await response.json();
    }

    static async createUser(userData) {
        const response = await fetch(`${API_BASE}/api/user`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(userData)
        });
        if (!response.ok) throw new Error('Failed to create user');
        return await response.json();
    }

    static async claimReward(userId) {
        const response = await fetch(`${API_BASE}/api/claim/${userId}`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
        });
        return await response.json();
    }

    static async getProfile(userId) {
        const response = await fetch(`${API_BASE}/api/profile/${userId}`);
        if (!response.ok) throw new Error('Failed to fetch profile');
        return await response.json();
    }
}