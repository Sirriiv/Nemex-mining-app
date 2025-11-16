class WalletController {
    constructor() {
        this.tokenBalances = new Map();
        this.tokenPrices = new Map();
        this.isInitialized = false;
    }

    async initialize() {
        if (this.isInitialized) return;

        console.log('🚀 Initializing Nemex Wallet...');
        console.log('✅ Using $0.00 balances - Professional mode activated!');

        this.loadZeroBalances(); // ← CHANGED FROM loadMockBalances()
        await this.loadLivePrices();
        this.renderTokens();

        this.isInitialized = true;
    }

    loadZeroBalances() { // ← NEW FUNCTION
        const balances = {
            'TON': 0,      // ← CHANGED FROM 15.784
            'NMX': 0,      // ← CHANGED FROM 74995350
            'USDT': 0,     // ← CHANGED FROM 1250.50
            'TRX': 0,      // ← CHANGED FROM 850.25
            'BTC': 0       // ← CHANGED FROM 0.0042
        };

        Object.entries(balances).forEach(([symbol, balance]) => {
            this.tokenBalances.set(symbol, balance);
        });
        
        console.log('✅ All balances set to 0.00');
    }

    async loadLivePrices() {
        try {
            const prices = await priceAPI.fetchAllPrices();
            Object.entries(prices).forEach(([symbol, priceData]) => {
                this.tokenPrices.set(symbol, priceData);
            });
            this.updatePortfolioValue();
        } catch (error) {
            console.error('Price loading failed:', error);
        }
    }

    renderTokens() {
        const tokenList = document.getElementById('tokenList');
        if (!tokenList) return;

        tokenList.innerHTML = '';

        Object.values(TOKEN_CONFIGS).forEach(tokenConfig => {
            const balance = this.tokenBalances.get(tokenConfig.symbol) || 0;
            const priceData = this.tokenPrices.get(tokenConfig.symbol) || { price: 0, change24h: 0 };
            const value = balance * priceData.price;

            const tokenElement = this.createTokenElement(tokenConfig, balance, priceData, value);
            tokenList.appendChild(tokenElement);
        });
    }

    createTokenElement(tokenConfig, balance, priceData, value) {
        const changeClass = priceData.change24h >= 0 ? 'change-positive' : 'change-negative';
        const changeSymbol = priceData.change24h >= 0 ? '+' : '';

        const tokenDiv = document.createElement('div');
        tokenDiv.className = 'token-card';
        tokenDiv.innerHTML = `
            <div class="token-icon ${tokenConfig.symbol.toLowerCase()}-icon">
                <img src="${tokenConfig.logo}" 
                     alt="${tokenConfig.name}"
                     class="token-icon-img"
                     onerror="this.style.display='none'; this.parentElement.innerHTML='${tokenConfig.symbol.charAt(0)}'">
            </div>
            <div class="token-info">
                <div class="token-name">${tokenConfig.name}</div>
                <div class="token-symbol">${tokenConfig.symbol}</div>
                <div class="token-price">
                    $${this.formatPrice(priceData.price)} 
                    <span class="token-change ${changeClass}">
                        ${changeSymbol}${priceData.change24h.toFixed(1)}%
                    </span>
                </div>
            </div>
            <div class="token-balance">
                <div class="token-amount">${this.formatBalance(balance)}</div>
                <div class="token-value">$${value.toFixed(2)}</div>
            </div>
        `;

        return tokenDiv;
    }

    formatPrice(price) {
        if (price === 0) return '0.00';
        if (price >= 1000) return price.toLocaleString();
        return price.toFixed(price < 1 ? 4 : 2);
    }

    formatBalance(balance) {
        if (balance === 0) return '0.00';
        if (balance < 0.001) return '<0.001';
        if (balance >= 1000000) return (balance / 1000000).toFixed(2) + 'M';
        if (balance >= 1000) return (balance / 1000).toFixed(2) + 'K';
        return balance.toFixed(6).replace(/\.?0+$/, '');
    }

    updatePortfolioValue() {
        let totalValue = 0;
        Object.values(TOKEN_CONFIGS).forEach(tokenConfig => {
            const balance = this.tokenBalances.get(tokenConfig.symbol) || 0;
            const priceData = this.tokenPrices.get(tokenConfig.symbol) || { price: 0 };
            totalValue += balance * priceData.price;
        });

        const balanceElement = document.getElementById('totalBalance');
        const cryptoElement = document.getElementById('totalBalanceCrypto');
        
        if (balanceElement) {
            balanceElement.textContent = `$${totalValue.toFixed(2)}`;
        }
        
        if (cryptoElement && totalValue === 0) {
            cryptoElement.textContent = 'Connect wallet & deposit assets';
        }
    }

    async refreshAllData() {
        await this.loadLivePrices();
        this.renderTokens();
    }
}

window.walletController = new WalletController();