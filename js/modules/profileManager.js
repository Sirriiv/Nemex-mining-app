// Profile Management
class ProfileManager {
    constructor() {
        this.userProfile = null;
    }

    async loadProfile() {
        try {
            console.log('👤 Loading user profile...');
            
            // Try to get from storage first
            this.userProfile = StorageManager.get('userProfile');
            
            if (!this.userProfile) {
                // Load from API
                this.userProfile = await this.fetchProfileFromAPI();
                StorageManager.set('userProfile', this.userProfile);
            }
            
            this.updateProfileDisplay();
            return this.userProfile;
            
        } catch (error) {
            console.error('❌ Failed to load profile:', error);
            this.showError('Failed to load profile data');
            return null;
        }
    }

    async fetchProfileFromAPI() {
        // Simulate API call - replace with actual API
        await new Promise(resolve => setTimeout(resolve, 800));
        
        const user = userManager.getCurrentUser();
        if (!user) {
            throw new Error('No user logged in');
        }

        return {
            userId: user.id,
            fullName: user.fullName,
            email: user.email,
            joinDate: user.joinDate,
            miningStats: {
                totalMined: 150,
                miningDays: 7,
                currentStreak: 3,
                totalEarned: 185
            },
            referralStats: {
                totalReferrals: 2,
                referralEarnings: 100,
                pendingBonus: 50
            },
            achievements: [
                { id: 1, name: 'First Miner', unlocked: true, progress: 100 },
                { id: 2, name: 'Week Streak', unlocked: false, progress: 42 },
                { id: 3, name: 'Referral Master', unlocked: false, progress: 66 }
            ]
        };
    }

    updateProfileDisplay() {
        if (!this.userProfile) return;

        // Update profile modal
        this.updateProfileModal();
        
        // Update profile section if active
        this.updateProfileSection();
    }

    updateProfileModal() {
        const elements = {
            profileName: this.userProfile.fullName,
            profileEmail: this.userProfile.email,
            profileUserId: this.userProfile.userId,
            profileMiningDays: `${this.userProfile.miningStats.miningDays} days`,
            profileTotalEarned: `${this.userProfile.miningStats.totalEarned} NMXp`,
            profileMemberSince: new Date(this.userProfile.joinDate).toLocaleDateString()
        };

        Object.keys(elements).forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.textContent = elements[id];
            }
        });
    }

    updateProfileSection() {
        // Update profile header
        const profileName = document.querySelector('.profile-name');
        const profileEmail = document.querySelector('.profile-email');
        
        if (profileName) profileName.textContent = this.userProfile.fullName;
        if (profileEmail) profileEmail.textContent = this.userProfile.email;

        // Update stats
        const statValues = document.querySelectorAll('.stat-value');
        if (statValues.length >= 3) {
            statValues[0].textContent = this.userProfile.miningStats.totalEarned + ' NMXp';
            statValues[1].textContent = this.userProfile.miningStats.miningDays;
            statValues[2].textContent = this.userProfile.referralStats.totalReferrals;
        }

        // Update detailed info
        this.updateProfileDetails();
    }

    updateProfileDetails() {
        const profileInfo = document.querySelector('.profile-info');
        if (!profileInfo) return;

        profileInfo.innerHTML = `
            <div class="info-card">
                <div class="info-card-header">
                    <div class="info-card-icon">👤</div>
                    <div class="info-card-title">Account Information</div>
                </div>
                <div class="info-item">
                    <div class="info-label">User ID</div>
                    <div class="copyable-value">
                        <span class="info-value">${this.userProfile.userId}</span>
                        <button class="copy-btn-small" onclick="copyToClipboard('${this.userProfile.userId}')">Copy</button>
                    </div>
                </div>
                <div class="info-item">
                    <div class="info-label">Member Since</div>
                    <div class="info-value">${new Date(this.userProfile.joinDate).toLocaleDateString()}</div>
                </div>
                <div class="info-item">
                    <div class="info-label">Email Verified</div>
                    <div class="info-value" style="color: var(--gold);">Verified ✓</div>
                </div>
            </div>

            <div class="info-card">
                <div class="info-card-header">
                    <div class="info-card-icon">💰</div>
                    <div class="info-card-title">Mining Stats</div>
                </div>
                <div class="info-item">
                    <div class="info-label">Total NMXp Earned</div>
                    <div class="info-value">${this.userProfile.miningStats.totalEarned} NMXp</div>
                </div>
                <div class="info-item">
                    <div class="info-label">Active Mining Days</div>
                    <div class="info-value">${this.userProfile.miningStats.miningDays} days</div>
                </div>
                <div class="info-item">
                    <div class="info-label">Current Streak</div>
                    <div class="info-value">${this.userProfile.miningStats.currentStreak} days</div>
                </div>
                <div class="info-item">
                    <div class="info-label">Referral Earnings</div>
                    <div class="info-value">${this.userProfile.referralStats.referralEarnings} NMXp</div>
                </div>
            </div>
        `;
    }

    async updateProfile(updates) {
        try {
            console.log('🔄 Updating profile...');
            
            // Simulate API call
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Update local profile
            this.userProfile = { ...this.userProfile, ...updates };
            StorageManager.set('userProfile', this.userProfile);
            
            // Update user manager
            if (updates.fullName || updates.email) {
                userManager.updateProfile(updates);
            }
            
            this.updateProfileDisplay();
            console.log('✅ Profile updated successfully');
            
            return { success: true };
            
        } catch (error) {
            console.error('❌ Profile update failed:', error);
            return { success: false, error: error.message };
        }
    }

    showError(message) {
        // Show error message to user
        const errorDiv = document.createElement('div');
        errorDiv.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: var(--error);
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            z-index: 10000;
        `;
        errorDiv.textContent = message;
        
        document.body.appendChild(errorDiv);
        
        setTimeout(() => {
            errorDiv.remove();
        }, 3000);
    }
}

// Initialize profile manager
window.profileManager = new ProfileManager();