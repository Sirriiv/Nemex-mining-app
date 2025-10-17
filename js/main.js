// Main Application JavaScript
class NemexApp {
    constructor() {
        this.balance = 0;
        this.timer = 24 * 60 * 60; // 24 hours in seconds
        this.isClaimable = false;
        this.interval = null;
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.startTimer();
        this.loadUserData();
        this.initializeApp();
    }

    initializeApp() {
        // Simulate app initialization
        setTimeout(() => {
            document.getElementById('loading').classList.add('hidden');
        }, 2000);
    }

    setupEventListeners() {
        // Settings button
        document.getElementById('settingsButton').addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggleSettingsMenu();
        });

        // Overlay click
        document.getElementById('overlay').addEventListener('click', () => {
            this.hideAllModals();
        });

        // Close profile modal
        document.getElementById('closeProfile').addEventListener('click', () => {
            this.hideProfileModal();
        });

        // Claim button
        document.getElementById('claimButton').addEventListener('click', () => {
            this.claimReward();
        });

        // Close settings when clicking outside
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.settings-menu') && !e.target.closest('.settings-icon')) {
                this.hideSettingsMenu();
            }
        });

        // Profile button in settings
        document.getElementById('profileBtn').addEventListener('click', () => {
            this.showProfileModal();
        });
    }

    toggleSettingsMenu() {
        const menu = document.getElementById('settingsMenu');
        const overlay = document.getElementById('overlay');
        
        if (menu.classList.contains('active')) {
            this.hideSettingsMenu();
        } else {
            menu.classList.add('active');
            overlay.classList.add('active');
        }
    }

    hideSettingsMenu() {
        document.getElementById('settingsMenu').classList.remove('active');
        document.getElementById('overlay').classList.remove('active');
    }

    showProfileModal() {
        document.getElementById('profileModal').classList.add('active');
        document.getElementById('overlay').classList.add('active');
        this.hideSettingsMenu();
    }

    hideProfileModal() {
        document.getElementById('profileModal').classList.remove('active');
        document.getElementById('overlay').classList.remove('active');
    }

    hideAllModals() {
        this.hideSettingsMenu();
        this.hideProfileModal();
    }

    startTimer() {
        this.interval = setInterval(() => {
            this.timer--;
            this.updateTimerDisplay();

            if (this.timer <= 0) {
                this.enableClaim();
            }
        }, 1000);
    }

    updateTimerDisplay() {
        const timerDisplay = document.getElementById('timerDisplay');
        const hours = Math.floor(this.timer / 3600);
        const minutes = Math.floor((this.timer % 3600) / 60);
        const seconds = this.timer % 60;

        timerDisplay.textContent = `Claim in ${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }

    enableClaim() {
        this.isClaimable = true;
        const claimBtn = document.getElementById('claimButton');
        claimBtn.disabled = false;
        claimBtn.textContent = 'Claim 30 NMXp';
        document.getElementById('timerDisplay').textContent = 'Ready to Claim!';
    }

    claimReward() {
        if (!this.isClaimable) return;

        // Add reward to balance
        this.balance += 30;
        this.updateBalanceDisplay();

        // Reset timer
        this.timer = 24 * 60 * 60;
        this.isClaimable = false;
        
        const claimBtn = document.getElementById('claimButton');
        claimBtn.disabled = true;
        claimBtn.textContent = '30 NMXp';

        // Show success feedback
        this.showClaimSuccess();
    }

    updateBalanceDisplay() {
        document.getElementById('balanceDisplay').textContent = this.balance.toString().padStart(2, '0');
    }

    showClaimSuccess() {
        // Create success notification
        const successMsg = document.createElement('div');
        successMsg.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: var(--darker-bg);
            border: 2px solid var(--gold);
            border-radius: 15px;
            padding: 20px;
            text-align: center;
            z-index: 2000;
            animation: fadeIn 0.3s;
        `;
        successMsg.innerHTML = `
            <div style="font-size: 48px; margin-bottom: 10px;">🎉</div>
            <h3 style="color: var(--gold); margin-bottom: 10px;">Reward Claimed!</h3>
            <p style="color: var(--text);">+30 NMXp added to your balance</p>
        `;

        document.body.appendChild(successMsg);

        // Remove after 2 seconds
        setTimeout(() => {
            successMsg.remove();
        }, 2000);
    }

    loadUserData() {
        // Simulate loading user data
        setTimeout(() => {
            document.getElementById('profileName').textContent = 'Mining Enthusiast';
            document.getElementById('profileEmail').textContent = 'user@nemexcoin.com';
            document.getElementById('profileUserId').textContent = 'NMX' + Date.now().toString().slice(-8);
            document.getElementById('profileMiningDays').textContent = '1 day';
            document.getElementById('profileTotalEarned').textContent = this.balance + ' NMXp';
            document.getElementById('profileMemberSince').textContent = new Date().toLocaleDateString();
        }, 1000);
    }
}

// Utility Functions
function copyToClipboard(elementId) {
    const element = document.getElementById(elementId);
    const text = element.textContent;
    
    navigator.clipboard.writeText(text).then(() => {
        // Show copy feedback
        const originalText = element.textContent;
        element.textContent = 'Copied!';
        element.style.color = 'var(--gold)';
        
        setTimeout(() => {
            element.textContent = originalText;
            element.style.color = '';
        }, 1500);
    }).catch(err => {
        console.error('Failed to copy: ', err);
    });
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.nemexApp = new NemexApp();
});