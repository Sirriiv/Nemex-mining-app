// Buy Section Controller
class BuySection {
    constructor() {
        this.selectedPackage = null;
        this.selectedPayment = null;
        this.init();
    }

    init() {
        console.log('🛒 Initializing buy section...');
        this.setupEventListeners();
        this.loadPackages();
    }

    setupEventListeners() {
        // Package selection
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('buy-btn')) {
                const packageCard = e.target.closest('.package-card');
                if (packageCard) {
                    this.selectPackage(packageCard);
                }
            }

            if (e.target.classList.contains('method-card')) {
                this.selectPaymentMethod(e.target);
            }
        });
    }

    loadPackages() {
        // Packages are already in HTML, just initialize selection
        const packages = document.querySelectorAll('.package-card');
        packages.forEach(pkg => {
            pkg.addEventListener('click', (e) => {
                if (!e.target.classList.contains('buy-btn')) {
                    this.selectPackage(pkg);
                }
            });
        });
    }

    selectPackage(packageElement) {
        // Remove previous selection
        document.querySelectorAll('.package-card').forEach(pkg => {
            pkg.classList.remove('selected');
        });

        // Add selection to clicked package
        packageElement.classList.add('selected');
        
        const packageName = packageElement.querySelector('.package-name').textContent;
        this.selectedPackage = packageName.toLowerCase();
        
        console.log('Selected package:', this.selectedPackage);
        
        // Show payment options if not already visible
        this.showPaymentOptions();
    }

    selectPaymentMethod(methodElement) {
        // Remove previous selection
        document.querySelectorAll('.method-card').forEach(method => {
            method.classList.remove('selected');
        });

        // Add selection to clicked method
        methodElement.classList.add('selected');
        
        this.selectedPayment = methodElement.querySelector('.method-name').textContent.toLowerCase();
        
        console.log('Selected payment method:', this.selectedPayment);
        
        // Enable purchase button
        this.enablePurchase();
    }

    showPaymentOptions() {
        const paymentSection = document.querySelector('.payment-methods');
        if (paymentSection) {
            paymentSection.style.display = 'block';
            
            // Add smooth appearance
            paymentSection.style.opacity = '0';
            paymentSection.style.transform = 'translateY(20px)';
            
            setTimeout(() => {
                paymentSection.style.transition = 'all 0.3s ease';
                paymentSection.style.opacity = '1';
                paymentSection.style.transform = 'translateY(0)';
            }, 100);
        }
    }

    enablePurchase() {
        // Create or update purchase button
        let purchaseBtn = document.getElementById('purchase-button');
        
        if (!purchaseBtn) {
            purchaseBtn = document.createElement('button');
            purchaseBtn.id = 'purchase-button';
            purchaseBtn.className = 'purchase-btn';
            purchaseBtn.textContent = 'Complete Purchase';
            purchaseBtn.onclick = () => this.completePurchase();
            
            const paymentSection = document.querySelector('.payment-methods');
            if (paymentSection) {
                paymentSection.after(purchaseBtn);
            }
        }

        purchaseBtn.disabled = !(this.selectedPackage && this.selectedPayment);
    }

    async completePurchase() {
        if (!this.selectedPackage || !this.selectedPayment) {
            AppUtils.showToast('Please select a package and payment method', 'error');
            return;
        }

        try {
            AppUtils.showLoading('Processing purchase...');

            // Simulate payment processing
            await new Promise(resolve => setTimeout(resolve, 2000));

            // Calculate tokens based on package
            const tokens = this.calculateTokens(this.selectedPackage);
            
            // Simulate successful purchase
            await this.processPurchase(tokens);

            AppUtils.hideLoading();
            AppUtils.showToast(`🎉 Successfully purchased ${tokens} NMXp!`, 'success');
            AppUtils.createConfetti();

            // Update balance if home section is active
            if (window.homeSection) {
                window.homeSection.balance += tokens;
                window.homeSection.updateBalanceDisplay();
            }

            // Reset selection
            this.resetSelection();

        } catch (error) {
            console.error('Purchase failed:', error);
            AppUtils.hideLoading();
            AppUtils.showToast('Purchase failed. Please try again.', 'error');
        }
    }

    calculateTokens(packageType) {
        const packages = {
            'starter': 100,
            'pro miner': 600,
            'whale': 1300
        };
        
        return packages[packageType] || 0;
    }

    async processPurchase(tokens) {
        // Simulate API call to process purchase
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // In a real app, this would call your backend API
        console.log(`Processing purchase of ${tokens} NMXp`);
        
        return { success: true, tokens: tokens };
    }

    resetSelection() {
        // Clear selections
        this.selectedPackage = null;
        this.selectedPayment = null;
        
        // Reset UI
        document.querySelectorAll('.package-card').forEach(pkg => {
            pkg.classList.remove('selected');
        });
        
        document.querySelectorAll('.method-card').forEach(method => {
            method.classList.remove('selected');
        });
        
        // Remove purchase button
        const purchaseBtn = document.getElementById('purchase-button');
        if (purchaseBtn) {
            purchaseBtn.remove();
        }
        
        // Hide payment options
        const paymentSection = document.querySelector('.payment-methods');
        if (paymentSection) {
            paymentSection.style.display = 'none';
        }
    }
}

// Add CSS for purchase button
const buyStyles = document.createElement('style');
buyStyles.textContent = `
    .package-card.selected {
        border-color: var(--gold);
        background: linear-gradient(135deg, var(--darker-bg), rgba(212,175,55,0.1));
        transform: scale(1.02);
    }
    
    .method-card.selected {
        border-color: var(--gold);
        background: rgba(212,175,55,0.1);
    }
    
    .purchase-btn {
        width: 100%;
        padding: 16px;
        background: linear-gradient(135deg, var(--gold), #b8941f);
        color: var(--darker-bg);
        border: none;
        border-radius: 12px;
        font-size: 18px;
        font-weight: 700;
        cursor: pointer;
        transition: all 0.3s;
        margin-top: 20px;
        box-shadow: 0 4px 15px rgba(212,175,55,0.3);
    }
    
    .purchase-btn:hover:not(:disabled) {
        transform: translateY(-2px);
        box-shadow: 0 6px 20px rgba(212,175,55,0.4);
    }
    
    .purchase-btn:disabled {
        background: #333;
        color: #666;
        cursor: not-allowed;
        transform: none;
        box-shadow: none;
    }
`;
document.head.appendChild(buyStyles);

// Initialize buy section
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('buy-section')) {
        window.buySection = new BuySection();
    }
});