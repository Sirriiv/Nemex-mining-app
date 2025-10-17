// Home Section Controller
class HomeSection {
    constructor() {
        this.balance = 0;
        this.timer = 24 * 60 * 60; // 24 hours in seconds
        this.isClaimable = false;
        this.timerInterval = null;
        this.init();
    }

    init() {
        console.log('🏠 Initializing home section...');
        this.loadUserData();
        this.startTimer();
        this.setupEventListeners();
        this.updateDisplay();
    }

    async loadUserData() {
        try {
            // Load balance from API or storage
            const balanceData = await apiService.mockGetBalance();
            this.balance = balanceData.balance;
            this.updateBalanceDisplay();

            // Load mining stats
            await this.loadMiningStats();

        } catch (error) {
            console.error('Failed to load user data:', error);
            AppUtils.showToast('Failed to load data', 'error');
        }
    }

    async loadMiningStats() {
        // Update stats display
        const stats = {
            totalMined: this.balance,
            miningDays: 7,
            referralCount: 2,
            tasksCompleted: 5
        };

        document.getElementById('totalMined').textContent = stats.totalMined;
        document.getElementById('miningDays').textContent = stats.miningDays;
        document.getElementById('referralCount').textContent = stats.referralCount;
        document.getElementById('tasksCompleted').textContent = stats.tasksCompleted;
    }

    startTimer() {
        // Load saved timer from storage
        const savedTimer = StorageManager.get('mining_timer');
        if (savedTimer && savedTimer.endTime > Date.now()) {
            this.timer = Math.floor((savedTimer.endTime - Date.now()) / 1000);
            this.isClaimable = false;
        } else {
            this.timer = 24 * 60 * 60;
            this.isClaimable = true;
        }

        this.timerInterval = setInterval(() => {
            this.timer--;
            this.updateTimerDisplay();

            if (this.timer <= 0 && !this.isClaimable) {
                this.enableClaim();
            }
        }, 1000);
    }

    updateTimerDisplay() {
        const timerDisplay = document.getElementById('miningTimer');
        if (!timerDisplay) return;

        if (this.isClaimable) {
            timerDisplay.textContent = 'Ready to Claim!';
            timerDisplay.style.color = 'var(--gold)';
        } else {
            const hours = Math.floor(this.timer / 3600);
            const minutes = Math.floor((this.timer % 3600) / 60);
            const seconds = this.timer % 60;
            timerDisplay.textContent = `Claim in ${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
            timerDisplay.style.color = 'var(--muted)';
        }
    }

    updateBalanceDisplay() {
        const balanceEl = document.getElementById('balanceAmount');
        const walletBalanceEl = document.getElementById('walletBalance');
        
        if (balanceEl) {
            AppUtils.animateValue(balanceEl, parseInt(balanceEl.textContent) || 0, this.balance, 1000);
        }
        if (walletBalanceEl) {
            walletBalanceEl.textContent = this.balance.toString().padStart(2, '0');
        }
    }

    setupEventListeners() {
        // Claim button
        const claimBtn = document.getElementById('claimButton');
        if (claimBtn) {
            claimBtn.addEventListener('click', () => this.claimReward());
        }

        // Settings button
        const settingsBtn = document.getElementById('settingsButton');
        if (settingsBtn) {
            settingsBtn.addEventListener('click', this.toggleSettings);
        }

        // Profile button in settings
        const profileBtn = document.querySelector('.settings-item:nth-child(1)');
        if (profileBtn) {
            profileBtn.addEventListener('click', this.showProfileModal);
        }
    }

    async claimReward() {
        if (!this.isClaimable) return;

        try {
            console.log('💰 Claiming mining reward...');
            AppUtils.showLoading('Claiming your reward...');

            // Simulate API call
            await new Promise(resolve => setTimeout(resolve, 1500));

            // Update balance
            this.balance += 30;
            this.updateBalanceDisplay();

            // Reset timer
            this.isClaimable = false;
            this.timer = 24 * 60 * 60;

            // Save timer state
            StorageManager.set('mining_timer', {
                endTime: Date.now() + (24 * 60 * 60 * 1000)
            });

            // Update claim button
            const claimBtn = document.getElementById('claimButton');
            if (claimBtn) {
                claimBtn.disabled = true;
                claimBtn.textContent = '30 NMXp';
            }

            AppUtils.hideLoading();
            AppUtils.showToast('🎉 Successfully claimed 30 NMXp!', 'success');
            AppUtils.createConfetti();

            // Update mining stats
            await this.loadMiningStats();

        } catch (error) {
            console.error('Claim failed:', error);
            AppUtils.hideLoading();
            AppUtils.showToast('Failed to claim reward', 'error');
        }
    }

    enableClaim() {
        this.isClaimable = true;
        const claimBtn = document.getElementById('claimButton');
        if (claimBtn) {
            claimBtn.disabled = false;
            claimBtn.textContent = 'Claim 30 NMXp';
        }
        this.updateTimerDisplay();
    }

    toggleSettings() {
        const modal = document.getElementById('settingsModal');
        const overlay = document.getElementById('modalOverlay');
        
        if (modal && overlay) {
            const isActive = modal.classList.contains('active');
            modal.classList.toggle('active', !isActive);
            overlay.classList.toggle('active', !isActive);
        }
    }

    showProfileModal() {
        // Load profile data first
        profileManager.loadProfile().then(() => {
            const modal = document.getElementById('profileModal');
            const overlay = document.getElementById('modalOverlay');
            
            if (modal && overlay) {
                // Close settings first
                this.toggleSettings();
                
                // Show profile modal
                modal.classList.add('active');
                overlay.classList.add('active');
            }
        });
    }

    updateDisplay() {
        this.updateBalanceDisplay();
        this.updateTimerDisplay();
        
        // Update claim button state
        const claimBtn = document.getElementById('claimButton');
        if (claimBtn) {
            claimBtn.disabled = !this.isClaimable;
            claimBtn.textContent = this.isClaimable ? 'Claim 30 NMXp' : '30 NMXp';
        }
    }

    destroy() {
        // Cleanup when section changes
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
        }
    }
}

// Initialize home section when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Check if we're on the home section
    if (document.getElementById('home-section')) {
        window.homeSection = new HomeSection();
    }
});

// Handle section changes
if (typeof window.navigation !== 'undefined') {
    window.navigation.on('sectionChange', (section) => {
        if (section === 'home' && !window.homeSection) {
            setTimeout(() => {
                window.homeSection = new HomeSection();
            }, 100);
        } else if (section !== 'home' && window.homeSection) {
            window.homeSection.destroy();
            window.homeSection = null;
        }
    });
}