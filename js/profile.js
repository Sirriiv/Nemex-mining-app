// Profile Management
function initProfile() {
    loadProfileData();
    setupProfileActions();
    loadAchievements();
}

function loadProfileData() {
    // Simulate loading profile data
    const profileData = {
        name: 'Mining Enthusiast',
        email: 'user@nemexcoin.com',
        userId: 'NMX' + Date.now().toString().slice(-8),
        joinDate: new Date().toLocaleDateString(),
        totalEarned: 150,
        miningDays: 7,
        referralCount: 3,
        tasksCompleted: 12
    };

    displayProfileData(profileData);
}

function displayProfileData(data) {
    // Update profile header
    const nameElement = document.querySelector('.profile-name');
    const emailElement = document.querySelector('.profile-email');
    const statsElements = document.querySelectorAll('.stat-value');

    if (nameElement) nameElement.textContent = data.name;
    if (emailElement) emailElement.textContent = data.email;

    // Update stats
    if (statsElements.length >= 3) {
        statsElements[0].textContent = data.totalEarned + ' NMXp';
        statsElements[1].textContent = data.miningDays;
        statsElements[2].textContent = data.referralCount;
    }

    // Update detailed info
    updateProfileDetails(data);
}

function updateProfileDetails(data) {
    const detailsContainer = document.querySelector('.profile-info');
    if (!detailsContainer) return;

    const detailsHTML = `
        <div class="info-card">
            <div class="info-card-header">
                <div class="info-card-icon">👤</div>
                <div class="info-card-title">Account Information</div>
            </div>
            <div class="info-item">
                <div class="info-label">User ID</div>
                <div class="copyable-value">
                    <span class="info-value">${data.userId}</span>
                    <button class="copy-btn-small" onclick="copyToClipboard('profileUserId')">Copy</button>
                </div>
            </div>
            <div class="info-item">
                <div class="info-label">Member Since</div>
                <div class="info-value">${data.joinDate}</div>
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
                <div class="info-value">${data.totalEarned} NMXp</div>
            </div>
            <div class="info-item">
                <div class="info-label">Active Mining Days</div>
                <div class="info-value">${data.miningDays} days</div>
            </div>
            <div class="info-item">
                <div class="info-label">Tasks Completed</div>
                <div class="info-value">${data.tasksCompleted}</div>
            </div>
            <div class="info-item">
                <div class="info-label">Referral Earnings</div>
                <div class="info-value">45 NMXp</div>
            </div>
        </div>
    `;

    detailsContainer.innerHTML = detailsHTML;
}

function setupProfileActions() {
    const actionButtons = document.querySelectorAll('.profile-action-btn');
    
    actionButtons.forEach(button => {
        button.addEventListener('click', function() {
            const action = this.getAttribute('data-action');
            handleProfileAction(action);
        });
    });
}

function handleProfileAction(action) {
    switch (action) {
        case 'edit':
            editProfile();
            break;
        case 'security':
            openSecuritySettings();
            break;
        case 'backup':
            backupWallet();
            break;
        case 'referral':
            shareReferral();
            break;
        default:
            console.log('Action not implemented:', action);
    }
}

function editProfile() {
    alert('Edit profile functionality would open here');
    // In a real app, this would open a form to edit profile information
}

function openSecuritySettings() {
    // Navigate to security settings
    sectionLoader.showSection('settings');
    // You could also scroll to security section
}

function backupWallet() {
    alert('Wallet backup functionality would start here');
    // In a real app, this would initiate wallet backup process
}

function shareReferral() {
    const referralCode = 'NMX' + Date.now().toString().slice(-6);
    const shareText = `Join me on NEMEXCOIN and start mining NMXp tokens! Use my referral code: ${referralCode}`;
    
    if (navigator.share) {
        navigator.share({
            title: 'Join NEMEXCOIN',
            text: shareText,
            url: 'https://nemexcoin.com'
        });
    } else {
        // Fallback: copy to clipboard
        navigator.clipboard.writeText(shareText).then(() => {
            alert('Referral link copied to clipboard!');
        });
    }
}

function loadAchievements() {
    const achievements = [
        { id: 1, name: 'First Miner', icon: '⛏️', unlocked: true },
        { id: 2, name: 'Week Streak', icon: '🔥', unlocked: true },
        { id: 3, name: 'Referral Master', icon: '👥', unlocked: false },
        { id: 4, name: 'Task Hunter', icon: '✅', unlocked: true },
        { id: 5, name: 'Early Adopter', icon: '🚀', unlocked: true },
        { id: 6, name: 'NMX Collector', icon: '💰', unlocked: false },
        { id: 7, name: 'Loyal Miner', icon: '💎', unlocked: false },
        { id: 8, name: 'Top Performer', icon: '🏆', unlocked: false }
    ];

    displayAchievements(achievements);
}

function displayAchievements(achievements) {
    const container = document.querySelector('.badges-grid');
    if (!container) return;

    const badgesHTML = achievements.map(achievement => `
        <div class="badge ${achievement.unlocked ? '' : 'locked'}" 
             onclick="showAchievementDetail(${achievement.id})">
            <div class="badge-icon">${achievement.icon}</div>
            <div class="badge-name">${achievement.name}</div>
        </div>
    `).join('');

    container.innerHTML = badgesHTML;
}

function showAchievementDetail(achievementId) {