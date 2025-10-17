// Main dashboard functionality
let isLoading = false;
let countdownInterval;
let currentUserId = getStableUserId();
const API_BASE = 'https://nemex-backend.onrender.com';

// Initialize when DOM loads
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

function initializeApp() {
    setupNavigation();
    setupSettingsMenu();
    initializeUser();
    
    // Claim button event
    document.getElementById('claimButton').addEventListener('click', claimReward);
}

// Navigation
function setupNavigation() {
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', function() {
            if (isLoading) return;

            const target = this.getAttribute('data-section');
            const loading = document.getElementById('loading');

            // Disable navigation during loading
            isLoading = true;
            document.querySelectorAll('.nav-item').forEach(nav => {
                nav.style.pointerEvents = 'none';
            });

            loading.classList.remove('hidden');

            setTimeout(() => {
                document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
                document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
                document.getElementById(target).classList.add('active');
                this.classList.add('active');

                setTimeout(() => {
                    loading.classList.add('hidden');
                    isLoading = false;
                    document.querySelectorAll('.nav-item').forEach(nav => {
                        nav.style.pointerEvents = 'auto';
                    });
                }, 300);
            }, 1500);
        });
    });
}

// Settings Menu
function setupSettingsMenu() {
    const settingsButton = document.getElementById('settingsButton');
    const settingsMenu = document.getElementById('settingsMenu');
    const overlay = document.getElementById('overlay');
    const profileBtn = document.getElementById('profileBtn');
    const notificationsBtn = document.getElementById('notificationsBtn');
    const closeProfile = document.getElementById('closeProfile');

    // Settings button toggle
    settingsButton.addEventListener('click', function() {
        settingsMenu.classList.toggle('active');
        overlay.classList.toggle('active');
    });

    // Overlay click to close
    overlay.addEventListener('click', function() {
        settingsMenu.classList.remove('active');
        overlay.classList.remove('active');
        document.getElementById('profileModal').classList.remove('active');
    });

    // Profile button
    profileBtn.addEventListener('click', function() {
        settingsMenu.classList.remove('active');
        loadProfileData();
        document.getElementById('profileModal').classList.add('active');
    });

    // Notifications button
    notificationsBtn.addEventListener('click', function() {
        settingsMenu.classList.remove('active');
        overlay.classList.remove('active');
        sectionLoader.loadNotifications();
    });

    // Close profile modal
    closeProfile.addEventListener('click', function() {
        document.getElementById('profileModal').classList.remove('active');
        overlay.classList.remove('active');
    });

    // Other settings items
    document.querySelectorAll('.settings-item').forEach(item => {
        if (!item.id) {
            item.addEventListener('click', function() {
                const label = this.querySelector('.settings-label').textContent;
                const alerts = {
                    'Dark Mode': '🌙 Dark mode is already enabled!',
                    'Security': '🔒 Security settings coming soon!',
                    'Help & Support': '❓ Help & support coming soon!',
                    'About': 'ℹ️ NEMEXCOIN v1.0 - Crypto Rewards Platform',
                    'Logout': 'logout'
                };
                
                if (label === 'Logout' && confirm('Are you sure you want to logout?')) {
                    localStorage.clear();
                    window.location.href = 'index.html';
                } else if (alerts[label] && alerts[label] !== 'logout') {
                    alert(alerts[label]);
                }
                
                settingsMenu.classList.remove('active');
                overlay.classList.remove('active');
            });
        }
    });
}

// ... (Rest of your existing functions: getStableUserId, initializeUser, createNewUser, updateUI, formatTime, showLoading, hideLoading, startCountdown, claimReward, fallbackToLocalStorage, loadProfileData, fallbackToLocalProfile, copyToClipboard)

// Include all your existing mining functionality here exactly as you have it
// Just copy everything from your original script starting from "// IMPROVED USER ID MANAGEMENT" 
// to the end of the file, but remove the settings menu and navigation parts since we moved them above