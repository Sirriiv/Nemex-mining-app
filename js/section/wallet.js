// Wallet Section Controller
class WalletSection {
    constructor() {
        this.transactions = [];
        this.balance = 0;
        this.init();
    }

    async init() {
        console.log('💰 Initializing wallet section...');
        await this.loadWalletData();
        this.setupEventListeners();
        this.updateDisplay();
    }

    async loadWalletData() {
        try {
            AppUtils.showLoading('Loading wallet data...');

            // Load balance from home section or API
            if (window.homeSection) {
                this.balance = window.homeSection.balance;
            } else {
                const balanceData = await apiService.mockGetBalance();
                this.balance = balanceData.balance;
            }

            // Load transactions
            await this.loadTransactions();

            AppUtils.hideLoading();

        } catch (error) {
            console.error('Failed to load wallet data:', error);
            AppUtils.hideLoading();
            AppUtils.showToast('Failed to load wallet data', 'error');
        }
    }

    async loadTransactions() {
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 600));

        // Mock transactions data
        this.transactions = [
            {
                id: 1,
                type: 'mining_reward',
                title: 'Daily Mining Reward',
                amount: 30,
                date: new Date().toISOString(),
                status: 'completed',
                icon: '💰'
            },
            {
                id: 2,
                type: 'task_reward',
                title: 'Task Completion',
                amount: 10,
                date: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
                status: 'completed',
                icon: '📋'
            },
            {
                id: 3,
                type: 'referral_bonus',
                title: 'Referral Bonus',
                amount: 50,
                date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
                status: 'completed',
                icon: '👥'
            },
            {
                id: 4,
                type: 'purchase',
                title: 'NMXp Purchase',
                amount: 100,
                date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
                status: 'completed',
                icon: '🛒'
            }
        ];
    }

    updateDisplay() {
        // Update balance
        const balanceElement = document.getElementById('walletBalance');
        if (balanceElement) {
            balanceElement.textContent = this.balance.toString().padStart(2, '0');
        }

        // Update transactions
        this.updateTransactions();
    }

    updateTransactions() {
        const container = document.getElementById('transactionsList');
        if (!container) return;

        if (this.transactions.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">💸</div>
                    <h3>No Transactions</h3>
                    <p>Your transaction history will appear here</p>
                </div>
            `;
            return;
        }

        container.innerHTML = this.transactions.map(transaction => `
            <div class="transaction-item" onclick="walletSection.showTransactionDetails(${transaction.id})">
                <div class="transaction-icon">${transaction.icon}</div>
                <div class="transaction-details">
                    <div class="transaction-title">${transaction.title}</div>
                    <div class="transaction-date">${AppUtils.formatDateTime(transaction.date)}</div>
                </div>
                <div class="transaction-amount ${transaction.amount > 0 ? 'positive' : 'negative'}">
                    ${transaction.amount > 0 ? '+' : ''}${transaction.amount} NMXp
                </div>
            </div>
        `).join('');
    }

    setupEventListeners() {
        // Wallet action buttons
        document.querySelectorAll('.wallet-action-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const action = e.currentTarget.querySelector('.action-label').textContent.toLowerCase();
                this.handleWalletAction(action);
            });
        });
    }

    handleWalletAction(action) {
        switch (action) {
            case 'send':
                this.showSendModal();
                break;
            case 'receive':
                this.showReceiveModal();
                break;
            case 'buy more':
                window.navigation.navigateTo('buy');
                break;
            case 'swap':
                this.showSwapModal();
                break;
            default:
                console.log('Unknown wallet action:', action);
        }
    }

    showSendModal() {
        this.showModal('Send NMXp', `
            <div class="modal-content">
                <div class="form-group">
                    <label for="sendAddress">Recipient Address</label>
                    <input type="text" id="sendAddress" placeholder="Enter NMX wallet address">
                </div>
                <div class="form-group">
                    <label for="sendAmount">Amount (NMXp)</label>
                    <input type="number" id="sendAmount" placeholder="0.00" max="${this.balance}">
                </div>
                <div class="form-group">
                    <label for="sendNote">Note (Optional)</label>
                    <input type="text" id="sendNote" placeholder="Add a note">
                </div>
                <div class="modal-actions">
                    <button class="modal-btn secondary" onclick="