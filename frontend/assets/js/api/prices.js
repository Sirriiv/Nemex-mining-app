class PriceAPI {
    constructor() {
        this.cache = new Map();
        this.cacheDuration = 120000;
    }

    async fetchAllPrices() {
        try {
            const tokens = Object.values(TOKEN_CONFIGS).filter(t => t.coinGeckoId);
            const coinIds = tokens.map(t => t.coinGeckoId);
            
            const response = await fetch(
                `https://api.coingecko.com/api/v3/simple/price?ids=${coinIds.join(',')}&vs_currencies=usd&include_24hr_change=true`
            );
            
            if (!response.ok) throw new Error(`API error: ${response.status}`);
            
            const data = await response.json();
            this.cache.set('prices', { data, timestamp: Date.now() });
            
            return this.formatPriceData(data);
            
        } catch (error) {
            console.warn('CoinGecko API failed, using fallback:', error);
            return this.getFallbackPrices();
        }
    }

    formatPriceData(apiData) {
        const prices = {};
        
        Object.values(TOKEN_CONFIGS).forEach(token => {
            if (token.coinGeckoId && apiData[token.coinGeckoId]) {
                prices[token.symbol] = {
                    price: apiData[token.coinGeckoId].usd,
                    change24h: apiData[token.coinGeckoId].usd_24h_change || 0
                };
            } else if (token.customPrice !== undefined) {
                prices[token.symbol] = {
                    price: token.customPrice,
                    change24h: 0
                };
            } else {
                prices[token.symbol] = {
                    price: 0,
                    change24h: 0
                };
            }
        });
        
        return prices;
    }

    getFallbackPrices() {
        return {
            'TON': { price: 2.45, change24h: 1.2 },
            'USDT': { price: 1.00, change24h: 0.0 },
            'TRX': { price: 0.11, change24h: 0.5 },
            'BTC': { price: 43210, change24h: 2.3 },
            'NMX': { price: 0.00, change24h: 0.0 }
        };
    }
}

window.priceAPI = new PriceAPI();
