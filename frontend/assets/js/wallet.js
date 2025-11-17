
class NemexWallet {
    constructor() {
        this.apiBase = '/api/wallet';
        this.currentUser = null;
        this.init();
    }

    init() {
        console.log('🔄 Initializing Nemex Wallet...');
        this.bindEvents();
        this.checkAuthentication();
    }

    bindEvents() {
        // Create new wallet button
        const createWalletBtn = document.getElementById('createWalletBtn');
        if (createWalletBtn) {
            createWalletBtn.addEventListener('click', () => {
                this.createNewWallet();
            });
        }

        // Import wallet button
        const importWalletBtn = document.getElementById('importWalletBtn');
        if (importWalletBtn) {
            importWalletBtn.addEventListener('click', () => {
                this.showImportModal();
            });
        }

        // Confirm import button
        const confirmImportBtn = document.getElementById('confirmImportBtn');
        if (confirmImportBtn) {
            confirmImportBtn.addEventListener('click', () => {
                this.importWallet();
            });
        }

        // Close modals
        this.setupModalCloses();
    }

    async checkAuthentication() {
        // Get user from your existing auth system
        const { data: { user } } = await window.supabase.auth.getUser();
        if (user) {
            this.currentUser = user;
            console.log('✅ User authenticated:', user.id);
        } else {
            console.log('❌ User not authenticated');
            // Redirect to login or show login prompt
        }
    }

    async createNewWallet() {
        try {
            if (!this.currentUser) {
                this.showError('Please log in to create a wallet');
                return;
            }

            this.showLoading('Creating your secure wallet...');

            const response = await fetch(`${this.apiBase}/generate-wallet`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    userId: this.currentUser.id,
                    wordCount: 24
                })
            });

            const result = await response.json();

            if (result.success) {
                this.showMnemonic(result.wallet.mnemonic);
                this.showSuccess('Wallet created successfully!');
            } else {
                this.showError(result.error);
            }
        } catch (error) {
            console.error('Wallet creation error:', error);
            this.showError('Failed to create wallet. Please try again.');
        } finally {
            this.hideLoading();
        }
    }

    async importWallet() {
        try {
            if (!this.currentUser) {
                this.showError('Please log in to import a wallet');
                return;
            }

            const mnemonic = document.getElementById('importMnemonic').value.trim();
            
            if (!mnemonic) {
                this.showError('Please enter your recovery phrase');
                return;
            }

            // Basic validation - should be 12 or 24 words
            const wordCount = mnemonic.split(' ').length;
            if (wordCount !== 12 && wordCount !== 24) {
                this.showError('Recovery phrase should be 12 or 24 words');
                return;
            }

            this.showLoading('Importing your wallet...');

            const response = await fetch(`${this.apiBase}/import-wallet`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    userId: this.currentUser.id,
                    mnemonic: mnemonic
                })
            });

            const result = await response.json();

            if (result.success) {
                this.showSuccess('Wallet imported successfully!');
                this.hideImportModal();
                // Redirect to wallet dashboard or refresh
                setTimeout(() => {
                    window.location.href = 'wallet.html?imported=true';
                }, 1500);
            } else {
                this.showError(result.error);
            }
        } catch (error) {
            console.error('Wallet import error:', error);
            this.showError('Failed to import wallet. Please check your recovery phrase.');
        } finally {
            this.hideLoading();
        }
    }

    showMnemonic(mnemonic) {
        const mnemonicDisplay = document.getElementById('mnemonicDisplay');
        const backupModal = document.getElementById('backupModal');
        
        if (mnemonicDisplay && backupModal) {
            mnemonicDisplay.innerHTML = mnemonic.split(' ').map((word, index) => 
                `<div class="word-box"><span class="word-number">${index + 1}.</span> ${word}</div>`
            ).join('');
            backupModal.style.display = 'flex';
        }
    }

    showImportModal() {
        const importModal = document.getElementById('importModal');
        if (importModal) {
            importModal.style.display = 'flex';
        }
    }

    hideImportModal() {
        const importModal = document.getElementById('importModal');
        const importMnemonic = document.getElementById('importMnemonic');
        
        if (importModal) importModal.style.display = 'none';
        if (importMnemonic) importMnemonic.value = '';
    }

    setupModalCloses() {
        // Close modals when clicking outside or on close buttons
        const modals = document.querySelectorAll('.modal');
        modals.forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.style.display = 'none';
                }
            });
        });

        // Close buttons
        const closeButtons = document.querySelectorAll('.close-modal');
        closeButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                btn.closest('.modal').style.display = 'none';
            });
        });
    }

    showLoading(message = 'Loading...') {
        // You can implement a loading spinner
        console.log('Loading:', message);
    }

    hideLoading() {
        // Hide loading spinner
    }

    showError(message) {
        alert('❌ Error: ' + message); // Replace with your UI notification system
    }

    showSuccess(message) {
        alert('✅ ' + message); // Replace with your UI notification system
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.nemexWallet = new NemexWallet();
});