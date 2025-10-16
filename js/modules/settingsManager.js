import { ProfileManager } from './profileManager.js';

export class SettingsManager {
    constructor(userId) {
        this.userId = userId;
        this.profileManager = new ProfileManager(userId);
        this.init();
    }

    init() {
        this.setupEventListeners();
    }

    setupEventListeners() {
        const settingsButton = document.getElementById('settingsButton');
        const overlay = document.getElementById('overlay');
        const profileBtn = document.getElementById('profileBtn');
        const closeProfile = document.getElementById('closeProfile');

        // Settings button toggle
        if (settingsButton) {
            settingsButton.addEventListener('click', (e) => {
                e.stopPropagation();
                const settingsMenu = document.getElementById('settingsMenu');
                settingsMenu.classList.toggle('active');
                overlay.classList.toggle('active');
            });
        }

        // Overlay click
        if (overlay) {
            overlay.addEventListener('click', () => {
                this.closeAllModals();
            });
        }

        // Profile button
        if (profileBtn) {
            profileBtn.addEventListener('click', () => {
                this.openProfileModal();
            });
        }

        // Close profile modal
        if (closeProfile) {
            closeProfile.addEventListener('click', () => {
                this.closeAllModals();
            });
        }

        // Settings menu items
        this.setupSettingsItems();
    }

    setupSettingsItems() {
        document.querySelectorAll('.settings-item').forEach(item => {
            if (item.id !== 'profileBtn') {
                item.addEventListener('click', () => {
                    const label = item.querySelector('.settings-label').textContent;
                    this.handleSettingsAction(label);
                });
            }
        });
    }

    handleSettingsAction(label) {
        const alerts = {
            'Notifications': '🔔 Notification settings coming soon!',
            'Dark Mode': '🌙 Dark mode is already enabled!',
            'Security': '🔒 Security settings coming soon!',
            'Help & Support': '❓ Help & support coming soon!',
            'About': 'ℹ️ NEMEXCOIN v1.0 - Crypto Rewards Platform'
        };

        if (alerts[label]) {
            alert(alerts[label]);
        } else if (label === 'Logout') {
            this.handleLogout();
        }

        this.closeAllModals();
    }

    async openProfileModal() {
        const settingsMenu = document.getElementById('settingsMenu');
        const profileModal = document.getElementById('profileModal');
        const overlay = document.getElementById('overlay');
        
        if (settingsMenu) settingsMenu.classList.remove('active');
        await this.profileManager.loadProfileData();
        if (profileModal) profileModal.classList.add('active');
        if (overlay) overlay.classList.add('active');
    }

    closeAllModals() {
        const settingsMenu = document.getElementById('settingsMenu');
        const profileModal = document.getElementById('profileModal');
        const overlay = document.getElementById('overlay');
        
        if (settingsMenu) settingsMenu.classList.remove('active');
        if (profileModal) profileModal.classList.remove('active');
        if (overlay) overlay.classList.remove('active');
    }

    handleLogout() {
        if (confirm('Are you sure you want to logout?')) {
            localStorage.clear();
            window.location.href = 'index.html';
        }
    }
}