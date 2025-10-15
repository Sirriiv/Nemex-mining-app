// Modals Management
class Modals {
    constructor() {
        this.initializeModals();
    }

    initializeModals() {
        this.createSettingsMenu();
        this.createProfileModal();
        this.setupModalEvents();
    }

    createSettingsMenu() {
        const settingsHTML = `
            <div class="settings-item" id="profileBtn">
                <div class="settings-icon-small">👤</div>
                <div class="settings-label">Profile</div>
            </div>
            <div class="settings-item">
                <div class="settings-icon-small">🔔</div>
                <div class="settings-label">Notifications</div>
            </div>
            <div class="settings-item">
                <div class="settings-icon-small">🌙</div>
                <div class="settings-label">Dark Mode</div>
            </div>
            <div class="settings-item">
                <div class="settings-icon-small">🔒</div>
                <div class="settings-label">Security</div>
            </div>
            <div class="settings-divider"></div>
            <div class="settings-item">
                <div class="settings-icon-small">❓</div>
                <div class="settings-label">Help & Support</div>
            </div>
            <div class="settings-item">
                <div class="settings-icon-small">ℹ️</div>
                <div class="settings-label">About</div>
            </div>
            <div class="settings-divider"></div>
            <div class="settings-item logout-btn">
                <div class="settings-icon-small">🚪</div>
                <div class="settings-label">Logout</div>
            </div>
        `;
        
        document.getElementById('settingsMenu').innerHTML = settingsHTML;
    }

    createProfileModal() {
        const profileHTML = `
            <div class="profile-header">
                <div class="profile-title">👤 User Profile</div>
                <button class="close-btn" id="closeProfile">✕</button>
            </div>
            <div class="profile-info">
                <div class="profile-item">
                    <div class="profile-label">Name</div>
                    <div class="profile-value" id="profileName">Mining Enthusiast</div>
                </div>
                <div class="profile-item">
                    <div class="profile-label">Email</div>
                    <div class="profile-value" id="profileEmail">user@nemexcoin.com</div>
                </div>
                <div class="profile-item">
                    <div class="profile-label">User ID</div>
                    <div class="value-row">
                        <div class="profile-value" id="profileUserId">Loading...</div>
                        <button class="copy-btn" onclick="modals.copyToClipboard('profileUserId')">Copy</button>
                    </div>
                </div>
                <div class="profile-item">
                    <div class="profile-label">Days on Mining</div>
                    <div class="profile-value" id="profileMiningDays">1 day</div>
                </div>
                <div class="profile-item">
                    <div class="profile-label">Total NMXp Earned</div>
                    <div class="profile-value" id="profileTotalEarned">0 NMXp</div>
                </div>
                <div class="profile-item">
                    <div class="profile-label">Member Since</div>
                    <div class="profile-value" id="profileMemberSince">Today</div>
                </div>
            </div>
        `;
        
        document.getElementById('profileModal').innerHTML = profileHTML;
    }

    setupModalEvents() {
        // Settings button
        document.getElementById('settingsButton').addEventListener('click', (e) => {
            e.stopPropagation();
            document.getElementById('settingsMenu').classList.toggle('active');
            document.getElementById('overlay').classList.toggle('active');
        });

        // Overlay click
        document.getElementById('overlay').addEventListener('click', () => {
            this.closeAllModals();
        });

        // Profile modal
        document.getElementById('profileBtn').addEventListener('click', () => {
            this.closeSettings();
            this.loadProfileData();
            document.getElementById('profileModal').classList.add('active');
            document.getElementById('overlay').classList.add('active');
        });

        document.getElementById('closeProfile').addEventListener('click', () => {
            this.closeProfile();
        });

        // Settings menu items
        document.querySelectorAll('.settings-item').forEach(item => {
            if (item.id !== 'profileBtn') {
                item.addEventListener('click', () => {
                    this.handleSettingsItemClick(item);
                });
            }
        });
    }

    closeAllModals() {
        document.getElementById('settingsMenu').classList.remove('active');
        document.getElementById('overlay').classList.remove('active');
        document.getElementById('profileModal').classList.remove('active');
        document.getElementById('securityModal').classList.remove('active');
        document.getElementById('changePasswordModal').classList.remove('active');
    }

    closeSettings() {
        document.getElementById('settingsMenu').classList.remove('active');
    }

    closeProfile() {
        document.getElementById('profileModal').classList.remove('active');
        document.getElementById('overlay').classList.remove('active');
    }

    handleSettingsItemClick(item) {
        const label = item.querySelector('.settings-label').textContent;
        const alerts = {
            'Notifications': '🔔 Notification settings coming soon!',
            'Dark Mode': '🌙 Dark mode is already enabled!',
            'Security': '🔒 Security settings coming soon!',
            'Help & Support': '❓ Help & support coming soon!',
            'About': 'ℹ️ NEMEXCOIN v1.0 - Crypto Rewards Platform'
        };
        
        if (alerts[label]) {
            alert(alerts[label]);
        } else if (label === 'Logout' && confirm('Are you sure you want to logout?')) {
            localStorage.clear();
            window.location.href = 'index.html';
        }
        
        this.closeSettings();
        document.getElementById('overlay').classList.remove('active');
    }

    async loadProfileData() {
        try {
            window.nemexApp.showLoading('Loading profile...');
            
            const response = await fetch(`${window.nemexApp.API_BASE}/api/profile/${window.nemexApp.currentUserId}`);
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.error || 'Failed to load profile');
            }
            
            document.getElementById('profileName').textContent = data.name;
            document.getElementById('profileEmail').textContent = data.email;
            document.getElementById('profileUserId').textContent = data.userId;
            document.getElementById('profileMiningDays').textContent = `${data.miningDays} day${data.miningDays > 1 ? 's' : ''}`;
            document.getElementById('profileTotalEarned').textContent = `${data.totalEarned} NMXp`;
            
            const memberSinceDate = new Date(data.memberSince);
            document.getElementById('profileMemberSince').textContent = memberSinceDate.toLocaleDateString('en-US', {
                year: 'numeric', month: 'long', day: 'numeric'
            });
            
            window.nemexApp.hideLoading();
        } catch (error) {
            console.error('Error loading profile:', error);
            window.nemexApp.hideLoading();
            this.fallbackToLocalProfile();
        }
    }

    fallbackToLocalProfile() {
        const userId = localStorage.getItem('userId') || window.nemexApp.currentUserId;
        const joinDate = localStorage.getItem('joinDate') || new Date().toISOString();
        const totalEarned = localStorage.getItem('totalEarned') || 0;
        
        const joinDateObj = new Date(joinDate);
        const today = new Date();
        const daysSinceJoin = Math.floor((today - joinDateObj) / (1000 * 60 * 60 * 24));
        const miningDays = daysSinceJoin + 1;
        
        document.getElementById('profileName').textContent = 'Mining Enthusiast';
        document.getElementById('profileEmail').textContent = `user_${userId.substring(0, 8)}@nemexcoin.com`;
        document.getElementById('profileUserId').textContent = userId;
        document.getElementById('profileMiningDays').textContent = `${miningDays} day${miningDays > 1 ? 's' : ''}`;
        document.getElementById('profileTotalEarned').textContent = `${totalEarned} NMXp`;
        
        document.getElementById('profileMemberSince').textContent = joinDateObj.toLocaleDateString('en-US', {
            year: 'numeric', month: 'long', day: 'numeric'
        });
        
        alert('⚠️ Using offline profile data.');
    }

    copyToClipboard(elementId) {
        const text = document.getElementById(elementId).textContent;
        navigator.clipboard.writeText(text).then(() => {
            alert('Copied to clipboard!');
        }).catch(() => {
            const textArea = document.createElement('textarea');
            textArea.value = text;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            alert('Copied to clipboard!');
        });
    }
}

// Initialize modals
document.addEventListener('DOMContentLoaded', () => {
    window.modals = new Modals();
});