// Settings Management
function initializeSettings() {
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
        loadProfileData();
        profileModal.classList.add('active');
        overlay.classList.add('active');
    });

    closeProfile.addEventListener('click', function() {
        profileModal.classList.remove('active');
        overlay.classList.remove('active');
    });

    // Settings menu items
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
                settingsMenu.classList.remove('active');
                overlay.classList.remove('active');
            });
        }
    });
}

async function loadProfileData() {
    try {
        showLoading('Loading profile...');
        const data = await API.getProfile(currentUserId);
        
        document.getElementById('profileName').textContent = data.name;
        document.getElementById('profileEmail').textContent = data.email;
        document.getElementById('profileUserId').textContent = data.userId;
        document.getElementById('profileMiningDays').textContent = `${data.miningDays} day${data.miningDays > 1 ? 's' : ''}`;
        document.getElementById('profileTotalEarned').textContent = `${data.totalEarned} NMXp`;
        const memberSinceDate = new Date(data.memberSince);
        document.getElementById('profileMemberSince').textContent = memberSinceDate.toLocaleDateString('en-US', {
            year: 'numeric', month: 'long', day: 'numeric'
        });
        hideLoading();
    } catch (error) {
        console.error('Error loading profile:', error);
        hideLoading();
        fallbackToLocalProfile();
    }
}

function fallbackToLocalProfile() {
    const userId = localStorage.getItem('userId') || currentUserId;
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