// frontend/assets/api/price.js - UPDATED FOR REAL DATA
class PriceAPI {
    constructor() {
        this.cache = new Map();
        this.cacheDuration = 60000; // 1 minute cache
        this.fallbackPrices = {
            'TON': { price: 0, change24h: 0 },
            'NMX': { price: 0, change24h: 0 }
        };
    }

    async fetchAllPrices() {
        try {
            // Use your backend API instead of direct CoinGecko
            const response = await fetch('/api/wallet/token-prices', {
                timeout: 10000
            });

            if (!response.ok) throw new Error(`API error: ${response.status}`);

            const data = await response.json();
            
            if (data.success && data.prices) {
                this.cache.set('prices', { data: data.prices, timestamp: Date.now() });
                return data.prices;
            } else {
                throw new Error('Invalid price data received');
            }

        } catch (error) {
            console.warn('Price API failed, using fallback:', error);
            return this.getFallbackPrices();
        }
    }

    getFallbackPrices() {
        return this.fallbackPrices;
    }

    // Get cached prices or fetch new ones
    async getPrices() {
        const cached = this.cache.get('prices');
        if (cached && (Date.now() - cached.timestamp) < this.cacheDuration) {
            return cached.data;
        }
        return await this.fetchAllPrices();
    }
}

window.priceAPI = new PriceAPI();