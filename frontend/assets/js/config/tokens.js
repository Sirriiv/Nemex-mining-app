// Token configurations with guaranteed working logos
const TOKEN_CONFIGS = {
    TON: {
        symbol: "TON",
        name: "Toncoin",
        coinGeckoId: "the-open-network",
        logo: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ton/info/logo.png",
        contract: null,
        decimals: 9,
        type: "native"
    },
    NMX: {
    symbol: "NMX",
    name: "NemexCoin",
    coinGeckoId: null,
    balance: 0,
    logo: "https://turquoise-obedient-frog-86.mypinata.cloud/ipfs/QmZo4rNnhhpWq6qQBkXBaAGqTdrawEzmW4w4QQsuMSjjW1",
    contract: "EQBRSrXz-7iYDnFZGhrER2XQL-gBgv1hr3Y8byWsVIye7A9f", // ✅ PERFECT!
    decimals: 9,
    price: 0.10,
    change24h: 0.0,
    canSend: true,
    isJetton: true
}
    USDT: {
        symbol: "USDT",
        name: "Tether",
        coinGeckoId: "tether",
        logo: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xdAC17F958D2ee523a2206206994597C13D831ec7/logo.png",
        contract: "EQDQoc5M3Bh8eXepkcykshnEJ2u6Q5WXIwdkk6eU7UUTAahp",
        decimals: 6,
        type: "jetton" 
    },
    TRX: {
        symbol: "TRX",
        name: "TRON",
        coinGeckoId: "tron",
        logo: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/tron/info/logo.png",
        contract: "native",
        decimals: 6,
        type: "native"
    },
    BTC: {
        symbol: "BTC",
        name: "Bitcoin",
        coinGeckoId: "bitcoin", 
        logo: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/bitcoin/info/logo.png",
        contract: "native",
        decimals: 8,
        type: "native"
    }
};

window.TOKEN_CONFIGS = TOKEN_CONFIGS;
