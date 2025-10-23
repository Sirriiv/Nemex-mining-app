// js/telegram-integration.js - SIMPLIFIED VERSION
class TelegramIntegration {
    constructor() {
        this.telegram = window.Telegram?.WebApp;
        this.isTelegram = !!this.telegram;
        this.user = null;
    }

    init() {
        if (!this.isTelegram) {
            console.log('🌐 Running in web browser');
            return;
        }

        console.log('📱 Running in Telegram');
        
        try {
            // Initialize Telegram Web App
            this.telegram.expand();
            this.telegram.enableClosingConfirmation();
            
            // Get user data
            this.user = this.telegram.initDataUnsafe?.user;
            
            if (this.user) {
                console.log('👤 Telegram user:', this.user);
                this.handleTelegramUser(this.user);
            }
            
            // Set up back button
            this.telegram.BackButton.onClick(() => {
                window.history.back();
            });
            
        } catch (error) {
            console.error('❌ Telegram initialization error:', error);
        }
    }

    handleTelegramUser(user) {
        // Store user info
        localStorage.setItem('telegram_user', JSON.stringify(user));
        
        // Update UI
        this.showTelegramUI(user);
    }

    showTelegramUI(user) {
        // Add Telegram class to body
        document.body.classList.add('telegram-app');
        
        // Show welcome message
        setTimeout(() => {
            if (window.showSuccess) {
                window.showSuccess(`Welcome ${user.first_name}! 🎉`);
            }
        }, 1000);
    }

    isTelegramUser() {
        return this.isTelegram && this.user !== null;
    }

    sendDataToBot(data) {
        if (this.isTelegram) {
            this.telegram.sendData(JSON.stringify(data));
        }
    }
}

// Create global instance
const telegramApp = new TelegramIntegration();