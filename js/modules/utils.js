// Navigation functionality
const Navigation = {
    isLoading: false,
    currentSection: 'home',

    init() {
        this.setupNavigation();
        this.loadInitialSection();
        console.log('Navigation module initialized');
    },

    setupNavigation() {
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', function() {
                if (Navigation.isLoading) return;

                const target = this.getAttribute('data-section');
                Navigation.switchSection(target, this);
            });
        });
    },

    switchSection(sectionName, clickedElement) {
        if (this.isLoading || this.currentSection === sectionName) return;

        const loading = document.getElementById('loading');
        
        // Disable navigation during transition
        this.isLoading = true;
        document.querySelectorAll('.nav-item').forEach(nav => {
            nav.style.pointerEvents = 'none';
        });

        Core.showLoading(`Loading ${sectionName}...`);

        setTimeout(() => {
            this.loadSection(sectionName);
            document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
            clickedElement.classList.add('active');
            this.currentSection = sectionName;

            setTimeout(() => {
                Core.hideLoading();
                // Re-enable navigation
                this.isLoading = false;
                document.querySelectorAll('.nav-item').forEach(nav => {
                    nav.style.pointerEvents = 'auto';
                });
            }, 300);
        }, 800);
    },

    loadInitialSection() {
        this.loadSection('home');
    },

    loadSection(sectionName) {
        fetch(`sections/${sectionName}.html`)
            .then(response => {
                if (!response.ok) throw new Error('Section not found');
                return response.text();
            })
            .then(html => {
                document.getElementById('content').innerHTML = html;
                this.initializeSection(sectionName);
            })
            .catch(error => {
                console.error('Error loading section:', error);
                this.showErrorSection(sectionName);
            });
    },

    initializeSection(sectionName) {
        switch(sectionName) {
            case 'home':
                this.initializeHomeSection();
                break;
            case 'tasks':
                this.initializeTasksSection();
                break;
            case 'buy':
                this.initializeBuySection();
                break;
            case 'referrals':
                this.initializeReferralsSection();
                break;
            case 'wallet':
                this.initializeWalletSection();
                break;
        }
    },

    initializeHomeSection() {
        const claimButton = document.getElementById('claimButton');
        if (claimButton) {
            claimButton.addEventListener('click', User.claimReward);
        }
        
        // Initialize home-specific functionality
        User.initializeUser();
    },

    initializeTasksSection() {
        // Initialize task buttons
        document.querySelectorAll('.task-btn').forEach(button => {
            button.addEventListener('click', function() {
                const taskName = this.closest('.task-item').querySelector('h3').textContent;
                Utils.showNotification(`Starting ${taskName}...`, 'info');
                // Add task completion logic here
            });
        });
    },

    initializeBuySection() {
        // Initialize buy buttons
        document.querySelectorAll('.buy-btn').forEach(button => {
            button.addEventListener('click', function() {
                const packageName = this.closest('.buy-option').querySelector('h3').textContent;
                Utils.showNotification(`Processing purchase of ${packageName}...`, 'info');
                // Add purchase logic here
            });
        });
    },

    initializeReferralsSection() {
        // Initialize referral functionality
        const copyBtn = document.querySelector('.copy-btn');
        if (copyBtn) {
            copyBtn.addEventListener('click', this.copyReferralLink);
        }
        
        // Load referral stats
        this.loadReferralStats();
    },

    initializeWalletSection() {
        // Load wallet data
        this.loadWalletData();
    },

    async loadReferralStats() {
        try {
            const stats = await API.getReferralStats(Core.currentUserId);
            document.getElementById('referralCount').textContent = stats.count || '0';
            document.getElementById('referralEarnings').textContent = `${stats.earnings || '0'} NMXp`;
            
            const referralLink = document.getElementById('referralLink');
            if (referralLink) {
                referralLink.value = `https://nemexcoin.com/ref/${Core.currentUserId}`;
            }
        } catch (error) {
            console.error('Error loading referral stats:', error);
            // Fallback to local data
            document.getElementById('referralCount').textContent = '0';
            document.getElementById('referralEarnings').textContent = '0 NMXp';
        }
    },

    async loadWalletData() {
        try {
            const wallet = await API.getWallet(Core.currentUserId);
            document.getElementById('walletBalance').textContent = `${wallet.balance || '0'} NMXp`;
        } catch (error) {
            console.error('Error loading wallet data:', error);
            // Fallback to local data
            const savedBalance = localStorage.getItem('nmxBalance') || '0';
            document.getElementById('walletBalance').textContent = `${savedBalance} NMXp`;
        }
    },

    copyReferralLink() {
        const referralLink = document.getElementById('referralLink');
        if (referralLink) {
            Utils.copyToClipboard(referralLink.value);
            Utils.showNotification('Referral link copied to clipboard!', 'success');
        }
    },

    showErrorSection(sectionName) {
        document.getElementById('content').innerHTML = `
            <div class="section active">
                <h2>⚠️ Error</h2>
                <p>Failed to load ${sectionName} section. Please try again.</p>
                <button class="claim-btn" onclick="Navigation.loadSection('${sectionName}')">Retry</button>
            </div>
        `;
    }
};