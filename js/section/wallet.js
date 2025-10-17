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
                    <button class="modal-btn secondary" onclick="walletSection.closeModal()">Cancel</button>
                    <button class="modal-btn primary" onclick="walletSection.confirmSend()">Send</button>
                </div>
            </div>
        `);
    }

    showReceiveModal() {
        const address = 'NMX' + Date.now().toString().slice(-8) + 'WALLET';
        this.showModal('Receive NMXp', `
            <div class="modal-content" style="text-align: center;">
                <div style="font-size: 48px; margin-bottom: 15px;">📬</div>
                <h3 style="color: var(--gold); margin-bottom: 15px;">Your Wallet Address</h3>
                <div class="wallet-address" style="
                    background: var(--dark-bg);
                    padding: 15px;
                    border-radius: 10px;
                    border: 1px solid #333;
                    margin-bottom: 20px;
                    word-break: break-all;
                    font-family: monospace;
                ">${address}</div>
                <button class="modal-btn primary" onclick="walletSection.copyWalletAddress('${address}')">
                    Copy Address
                </button>
                <div style="margin-top: 15px; color: var(--muted); font-size: 12px;">
                    Share this address to receive NMXp tokens
                </div>
            </div>
        `);
    }

    showSwapModal() {
        this.showModal('Swap Tokens', `
            <div class="modal-content">
                <div class="swap-container">
                    <div class="swap-from">
                        <label>From</label>
                        <div class="token-selector">
                            <select>
                                <option>NMXp</option>
                                <option>BTC</option>
                                <option>ETH</option>
                                <option>USDT</option>
                            </select>
                            <input type="number" placeholder="0.00" max="${this.balance}">
                        </div>
                    </div>
                    <div class="swap-arrow" style="text-align: center; margin: 10px 0; font-size: 20px;">⇅</div>
                    <div class="swap-to">
                        <label>To</label>
                        <div class="token-selector">
                            <select>
                                <option>USDT</option>
                                <option>BTC</option>
                                <option>ETH</option>
                                <option>NMXp</option>
                            </select>
                            <input type="number" placeholder="0.00" readonly>
                        </div>
                    </div>
                </div>
                <div class="swap-info">
                    <div class="info-item">
                        <span>Exchange Rate</span>
                        <span>1 NMXp = 0.10 USDT</span>
                    </div>
                    <div class="info-item">
                        <span>Network Fee</span>
                        <span>1 NMXp</span>
                    </div>
                </div>
                <div class="modal-actions">
                    <button class="modal-btn secondary" onclick="walletSection.closeModal()">Cancel</button>
                    <button class="modal-btn primary" onclick="walletSection.confirmSwap()">Swap</button>
                </div>
            </div>
        `);
    }

    showModal(title, content) {
        const modal = document.createElement('div');
        modal.className = 'wallet-modal';
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.8);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 10000;
        `;

        modal.innerHTML = `
            <div class="modal-dialog" style="
                background: var(--darker-bg);
                border: 1px solid #333;
                border-radius: 15px;
                padding: 25px;
                width: 90%;
                max-width: 400px;
                max-height: 80vh;
                overflow-y: auto;
            ">
                <div class="modal-header" style="
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 20px;
                    padding-bottom: 15px;
                    border-bottom: 1px solid #333;
                ">
                    <h2 style="color: var(--gold); margin: 0;">${title}</h2>
                    <button onclick="walletSection.closeModal()" style="
                        background: none;
                        border: none;
                        color: var(--muted);
                        font-size: 20px;
                        cursor: pointer;
                    ">✕</button>
                </div>
                ${content}
            </div>
        `;

        document.body.appendChild(modal);
        this.currentModal = modal;

        // Add modal styles if not already added
        if (!document.querySelector('#wallet-modal-styles')) {
            const styles = document.createElement('style');
            styles.id = 'wallet-modal-styles';
            styles.textContent = `
                .modal-actions {
                    display: flex;
                    gap: 10px;
                    margin-top: 20px;
                }
                
                .modal-btn {
                    flex: 1;
                    padding: 12px;
                    border: none;
                    border-radius: 8px;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.3s;
                }
                
                .modal-btn.primary {
                    background: var(--gold);
                    color: var(--darker-bg);
                }
                
                .modal-btn.secondary {
                    background: transparent;
                    color: var(--text);
                    border: 1px solid #333;
                }
                
                .modal-btn:hover {
                    transform: translateY(-1px);
                }
                
                .swap-container {
                    margin-bottom: 20px;
                }
                
                .token-selector {
                    display: flex;
                    gap: 10px;
                    margin-top: 8px;
                }
                
                .token-selector select {
                    flex: 1;
                    padding: 10px;
                    background: var(--dark-bg);
                    border: 1px solid #333;
                    border-radius: 6px;
                    color: var(--text);
                }
                
                .token-selector input {
                    flex: 2;
                    padding: 10px;
                    background: var(--dark-bg);
                    border: 1px solid #333;
                    border-radius: 6px;
                    color: var(--text);
                }
                
                .swap-info {
                    background: var(--dark-bg);
                    border: 1px solid #333;
                    border-radius: 8px;
                    padding: 15px;
                }
                
                .info-item {
                    display: flex;
                    justify-content: space-between;
                    margin-bottom: 8px;
                }
                
                .info-item:last-child {
                    margin-bottom: 0;
                }
            `;
            document.head.appendChild(styles);
        }
    }

    closeModal() {
        if (this.currentModal) {
            this.currentModal.remove();
            this.currentModal = null;
        }
    }

    copyWalletAddress(address) {
        AppUtils.copyToClipboard(address);
        this.closeModal();
    }

    async confirmSend() {
        // Implement send functionality
        AppUtils.showToast('Send functionality would be implemented here', 'info');
        this.closeModal();
    }

    async confirmSwap() {
        // Implement swap functionality
        AppUtils.showToast('Swap functionality would be implemented here', 'info');
        this.closeModal();
    }

    showTransactionDetails(transactionId) {
        const transaction = this.transactions.find(t => t.id === transactionId);
        if (!transaction) return;

        this.showModal('Transaction Details', `
            <div class="transaction-details">
                <div class="detail-item">
                    <span>Type:</span>
                    <span>${transaction.title}</span>
                </div>
                <div class="detail-item">
                    <span>Amount:</span>
                    <span style="color: ${transaction.amount > 0 ? '#2ecc71' : '#e74c3c'}">
                        ${transaction.amount > 0 ? '+' : ''}${transaction.amount} NMXp
                    </span>
                </div>
                <div class="detail-item">
                    <span>Date:</span>
                    <span>${AppUtils.formatDateTime(transaction.date)}</span>
                </div>
                <div class="detail-item">
                    <span>Status:</span>
                    <span style="color: #2ecc71;">Completed</span>
                </div>
                <div class="detail-item">
                    <span>Transaction ID:</span>
                    <span style="font-family: monospace; font-size: 12px;">TX${transaction.id.toString().padStart(8, '0')}</span>
                </div>
            </div>
        `);
    }
}

// Initialize wallet section
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('wallet-section')) {
        window.walletSection = new WalletSection();
    }
});