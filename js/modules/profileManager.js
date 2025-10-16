import { ApiService } from '../services/apiService.js';

export class ProfileManager {
    constructor(userId) {
        this.userId = userId;
    }

    async loadProfileData() {
        try {
            this.showLoading('Loading profile...');
            const data = await ApiService.getProfile(this.userId);
            this.updateProfileUI(data);
            this.hideLoading();
        } catch (error) {
            console.error('Error loading profile:', error);
            this.hideLoading();
            this.fallbackToLocalProfile();
        }
    }

    updateProfileUI(data) {
        // ... (same profile code as before)
    }

    fallbackToLocalProfile() {
        // ... (same fallback code as before)
    }

    showLoading(message) {
        // ... (same loading code as before)
    }

    hideLoading() {
        // ... (same hide loading code as before)
    }
}