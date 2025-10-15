// Settings functionality
const Settings = {
    init() {
        this.setupSettings();
        this.setupSettingsMenuItems();
        console.log('Settings module initialized');
    },

    setupSettings() {
        const settingsButton = document.getElementById('settingsButton');
        const settingsMenu = document.getElementById('settingsMenu');
        const overlay = document.getElementById('overlay');
        const profileModal = document.getElementById('profileModal');
        const closeProfile = document.getElementById('closeProfile');
        const profileBtn = document.getElementById('profileBtn');

        settingsButton.addEventListener('click', function(e) {
            e.stopPropagation();
            settingsMenu.classList.toggle('active');
            overlay.classList.toggle('active');
        });

        overlay.addEventListener('click', function() {
            settingsMenu.classList.remove('active');
            overlay.classList.remove('active');
            profileModal.classList.remove('active');
        });

        document.addEventListener('click', function(e) {
            if (!settingsMenu.contains(e.target) && e.target !== settingsButton) {
                settingsMenu.classList.remove('active');
                overlay.classList.remove('active');
            }
        });

        // Profile Modal
        profileBtn.addEventListener('click', function() {
            settingsMenu.classList.remove('active');
            User.loadProfileData();
            profileModal.classList.add('active');
            overlay.classList.add('active');
        });

        closeProfile.addEventListener('click', function() {
            profileModal.classList.remove('active');
            overlay.classList.remove('active');
        });
    },

    setupSettingsMenuItems() {
        document.querySelectorAll('.settings-item').forEach(item => {
            if (item.id !== 'profileBtn') {
                item.addEventListener('click', function() {
                    const label = this.querySelector('.settings-label').textContent;
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
                    document.getElementById('settingsMenu').classList.remove('active');
                    document.getElementById('overlay').classList.remove('active');
                });
            }
        });
    }
};