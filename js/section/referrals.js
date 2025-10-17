// Referrals Section Controller
class ReferralsSection {
    constructor() {
        this.referralData = null;
        this.init();
    }

    async init() {
        console.log('👥 Initializing referrals section...');
        await this.loadReferralData();
        this.setupEventListeners();
        this.updateDisplay();
    }

    async loadReferralData() {
        try {
            AppUtils.showLoading('Loading referral data...');

            // Simulate API call
            await new Promise(resolve => setTimeout(resolve, 800));

            // Mock referral data
            this.referralData = {
                totalReferrals: 2,
                referralEarnings: 100,
                pendingBonus: 50,
                referralCode: 'NMX' + Date.now().toString().slice(-6),
                history: [
                    {
                        id: 1,
                        friendName: 'John Doe',
                        friendEmail: 'john@example.com',
                        joinDate: '2024-01-15',
                        status: 'active',
                        earnings: 50
                    },
                    {
                        id: 2,
                        friendName: 'Jane Smith',
                        friendEmail: 'jane@example.com',
                        joinDate: '2024-01-10',
                        status: 'pending',
                        earnings: 0
                    }
                ]
            };

            this.updateDisplay();
            AppUtils.hideLoading();

        } catch (error) {
            console.error('Failed to load referral data:', error);
            AppUtils.hideLoading();
            AppUtils.showToast('Failed to load referral data', 'error');
        }
    }

    updateDisplay() {
        if (!this.referralData) return;

        // Update stats
        document.getElementById('totalReferrals').textContent = this.referralData.totalReferrals;
        document.getElementById('referralEarnings').textContent = this.referralData.referralEarnings;
        document.getElementById('pendingBonus').textContent = this.referralData.pendingBonus;

        // Update referral code
        const codeElement = document.getElementById('referralCode');
        if (codeElement) {
            codeElement.textContent = this.referralData.referralCode;
        }

        // Update history
        this.updateHistory();
    }

    updateHistory() {
        const historyContainer = document.getElementById('referralHistory');
        if (!historyContainer || !this.referralData.history) return;

        if (this.referralData.history.length === 0) {
            historyContainer.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">👥</div>
                    <h3>No Referrals Yet</h3>
                    <p>Start sharing your referral code to earn rewards!</p>
                </div>
            `;
            return;
        }

        historyContainer.innerHTML = this.referralData.history.map(ref => `
            <div class="referral-history-item">
                <div class="referral-avatar">${ref.friendName.charAt(0)}</div>
                <div class="referral-details">
                    <div class="referral-name">${ref.friendName}</div>
                    <div class="referral-email">${ref.friendEmail}</div>
                    <div class="referral-date">Joined ${new Date(ref.joinDate).toLocaleDateString()}</div>
                </div>
                <div class="referral-status ${ref.status}">
                    <div class="status-indicator"></div>
                    <div class="status-text">${ref.status}</div>
                    <div class="referral-earnings">+${ref.earnings} NMXp</div>
                </div>
            </div>
        `).join('');

        // Add styles for history items if not already added
        if (!document.querySelector('#referral-history-styles')) {
            const styles = document.createElement('style');
            styles.id = 'referral-history-styles';
            styles.textContent = `
                .referral-history-item {
                    display: flex;
                    align-items: center;
                    gap: 15px;
                    padding: 15px;
                    background: var(--darker-bg);
                    border: 1px solid #333;
                    border-radius: 10px;
                    margin-bottom: 10px;
                    transition: all 0.3s;
                }
                
                .referral-history-item:hover {
                    border-color: var(--gold);
                    transform: translateX(5px);
                }
                
                .referral-avatar {
                    width: 40px;
                    height: 40px;
                    border-radius: 50%;
                    background: linear-gradient(135deg, var(--gold), #b8941f);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-weight: bold;
                    color: var(--darker-bg);
                    font-size: 16px;
                }
                
                .referral-details {
                    flex: 1;
                }
                
                .referral-name {
                    color: var(--text);
                    font-weight: 600;
                    margin-bottom: 4px;
                }
                
                .referral-email {
                    color: var(--muted);
                    font-size: 12px;
                    margin-bottom: 4px;
                }
                
                .referral-date {
                    color: var(--muted);
                    font-size: 11px;
                }
                
                .referral-status {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 4px;
                }
                
                .status-indicator {
                    width: 8px;
                    height: 8px;
                    border-radius: 50%;
                }
                
                .referral-status.active .status-indicator {
                    background: #2ecc71;
                }
                
                .referral-status.pending .status-indicator {
                    background: #f39c12;
                }
                
                .status-text {
                    font-size: 11px;
                    text-transform: uppercase;
                    font-weight: 600;
                }
                
                .referral-status.active .status-text {
                    color: #2ecc71;
                }
                
                .referral-status.pending .status-text {
                    color: #f39c12;
                }
                
                .referral-earnings {
                    color: var(--gold);
                    font-size: 12px;
                    font-weight: 600;
                }
            `;
            document.head.appendChild(styles);
        }
    }

    setupEventListeners() {
        // Copy referral code
        const copyBtn = document.querySelector('.referral-copy-btn');
        if (copyBtn) {
            copyBtn.addEventListener('click', () => this.copyReferralCode());
        }

        // Share buttons
        document.querySelectorAll('.share-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const platform = e.currentTarget.querySelector('.share-label').textContent.toLowerCase();
                this.shareReferral(platform);
            });
        });
    }

    copyReferralCode() {
        if (!this.referralData) return;

        AppUtils.copyToClipboard(this.referralData.referralCode).then(success => {
            if (success) {
                // Visual feedback
                const copyBtn = document.querySelector('.referral-copy-btn');
                if (copyBtn) {
                    const originalText = copyBtn.textContent;
                    copyBtn.textContent = '✓ Copied!';
                    copyBtn.style.background = '#2ecc71';
                    
                    setTimeout(() => {
                        copyBtn.textContent = originalText;
                        copyBtn.style.background = '';
                    }, 2000);
                }
            }
        });
    }

    shareReferral(platform) {
        if (!this.referralData) return;

        const message = `Join me on NEMEXCOIN and start mining NMXp tokens! Use my referral code: ${this.referralData.referralCode} - https://nemexcoin.com`;
        
        let shareUrl = '';
        switch(platform) {
            case 'whatsapp':
                shareUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
                break;
            case 'telegram':
                shareUrl = `https://t.me/share/url?url=${encodeURIComponent('https://nemexcoin.com')}&text=${encodeURIComponent(message)}`;
                break;
            case 'message':
                if (/iPhone|iPad|iPod|Android/i.test(navigator.userAgent)) {
                    shareUrl = `sms:?body=${encodeURIComponent(message)}`;
                } else {
                    // Fallback for desktop
                    AppUtils.copyToClipboard(message);
                    AppUtils.showToast('Message copied to clipboard!', 'success');
                    return;
                }
                break;
            default:
                AppUtils.copyToClipboard(message);
                AppUtils.showToast('Message copied to clipboard!', 'success');
                return;
        }
        
        if (shareUrl) {
            window.open(shareUrl, '_blank', 'width=600,height=400');
        }
    }

    async refreshData() {
        await this.loadReferralData();
        AppUtils.showToast('Referral data updated', 'success');
    }
}

// Initialize referrals section
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('referrals-section')) {
        window.referralsSection = new ReferralsSection();
    }
});