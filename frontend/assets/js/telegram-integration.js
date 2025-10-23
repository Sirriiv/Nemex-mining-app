// js/telegram-integration.js
class TelegramIntegration {
    constructor() {
        this.telegram = window.Telegram?.WebApp;
        this.isTelegram = !!this.telegram;
        this.user = null;
    }

    init() {
        if (!this.isTelegram) {
            console.log('Not in Telegram environment');
            return;
        }

        console.log('🚀 Initializing NemexCoin Telegram Web App...');
        
        // Expand to full screen and configure
        this.telegram.expand();
        this.telegram.enableClosingConfirmation();
        this.telegram.setHeaderColor('#d4af37');
        this.telegram.setBackgroundColor('#0f0f0f');
        
        // Get user data
        this.user = this.telegram.initDataUnsafe?.user;
        
        if (this.user) {
            console.log('Telegram user detected:', this.user);
            this.handleTelegramUser(this.user);
        } else {
            console.log('No Telegram user data available');
        }
        
        this.setupTelegramUI();
        this.setupBackButton();
    }

    setupTelegramUI() {
        // Add Telegram-specific body class
        document.body.classList.add('telegram-app');
        
        // Hide header for Telegram app (we'll use Telegram's native header)
        const header = document.querySelector('header');
        if (header) {
            header.style.display = 'none';
        }
        
        // Add padding for Telegram header
        const mainContent = document.querySelector('main');
        if (mainContent) {
            mainContent.style.paddingTop = '0';
        }
    }

    setupBackButton() {
        this.telegram.BackButton.onClick(() => {
            if (window.history.length > 1) {
                window.history.back();
            } else {
                this.telegram.close();
            }
        });
        
        // Show back button when appropriate
        this.updateBackButton();
    }

    updateBackButton() {
        // Show back button on sub-pages, hide on main dashboard
        const isMainPage = window.location.pathname.includes('dashboard');
        if (isMainPage) {
            this.telegram.BackButton.hide();
        } else {
            this.telegram.BackButton.show();
        }
    }

    async handleTelegramUser(user) {
        // Store Telegram user info
        localStorage.setItem('telegram_user', JSON.stringify(user));
        
        // Update UI with Telegram user info
        this.updateUIWithTelegramUser(user);
        
        // Handle authentication
        await this.handleTelegramAuth(user);
    }

    updateUIWithTelegramUser(user) {
        // Update user profile in UI
        const userAvatar = document.querySelector('.user-avatar, .avatar');
        const userName = document.querySelector('.user-name, .username');
        
        if (userAvatar && user.photo_url) {
            userAvatar.src = user.photo_url;
            userAvatar.style.display = 'block';
        }
        
        if (userName) {
            userName.textContent = user.first_name + (user.last_name ? ' ' + user.last_name : '');
        }
        
        // Add Telegram badge
        const telegramBadge = document.createElement('div');
        telegramBadge.className = 'telegram-badge';
        telegramBadge.innerHTML = '📱 Telegram User';
        telegramBadge.style.cssText = `
            background: #0088cc;
            color: white;
            padding: 4px 8px;
            border-radius: 12px;
            font-size: 12px;
            margin-left: 10px;
        `;
        
        if (userName) {
            userName.parentNode.appendChild(telegramBadge);
        }
    }

    async handleTelegramAuth(user) {
        try {
            console.log('Starting Telegram authentication...');
            
            // Check if user exists in database
            const { data: existingUser, error: queryError } = await supabase
                .from('profiles')
                .select('*')
                .eq('telegram_id', user.id)
                .single();

            if (queryError && queryError.code !== 'PGRST116') {
                console.error('Error checking user:', queryError);
                return;
            }

            if (existingUser) {
                // Auto-login existing user
                console.log('Existing Telegram user found, auto-logging in:', existingUser);
                await this.loginTelegramUser(existingUser);
            } else {
                // Create new user
                console.log('Creating new Telegram user...');
                await this.createTelegramUser(user);
            }
        } catch (error) {
            console.error('Telegram auth error:', error);
        }
    }

    async createTelegramUser(telegramUser) {
        const userData = {
            telegram_id: telegramUser.id,
            username: telegramUser.username || `tg_${telegramUser.id}`,
            full_name: `${telegramUser.first_name} ${telegramUser.last_name || ''}`.trim(),
            avatar_url: telegramUser.photo_url,
            created_via: 'telegram',
            updated_at: new Date().toISOString()
        };

        const { data, error } = await supabase
            .from('profiles')
            .insert([userData])
            .select()
            .single();

        if (error) {
            console.error('Error creating Telegram user:', error);
            // Still proceed with local session
            this.setLocalTelegramSession(userData);
        } else {
            console.log('Telegram user created successfully:', data);
            this.setLocalTelegramSession(data);
        }
    }

    async loginTelegramUser(userData) {
        // Set user session locally
        this.setLocalTelegramSession(userData);
        
        // Update last login time
        await supabase
            .from('profiles')
            .update({ last_login: new Date().toISOString() })
            .eq('telegram_id', userData.telegram_id);
    }

    setLocalTelegramSession(userData) {
        // Store user data in localStorage
        localStorage.setItem('nemex_user', JSON.stringify(userData));
        localStorage.setItem('nemex_token', 'telegram_' + userData.telegram_id);
        
        // Update UI
        this.updateUIWithTelegramUser(userData);
        
        // Dispatch event for other components
        window.dispatchEvent(new CustomEvent('userLoggedIn', { detail: userData }));
        
        console.log('Telegram session established for:', userData.full_name);
    }

    // Method to send data back to Telegram bot
    sendDataToBot(data) {
        if (this.isTelegram) {
            this.telegram.sendData(JSON.stringify(data));
        }
    }

    // Show main button for actions
    showMainButton(text, callback, color = '#d4af37') {
        if (this.isTelegram) {
            this.telegram.MainButton.setText(text);
            this.telegram.MainButton.setParams({ color: color });
            this.telegram.MainButton.onClick(callback);
            this.telegram.MainButton.show();
        }
    }

    hideMainButton() {
        if (this.isTelegram) {
            this.telegram.MainButton.hide();
        }
    }

    // Close the web app
    closeApp() {
        if (this.isTelegram) {
            this.telegram.close();
        }
    }

    // Get Telegram platform info
    getPlatform() {
        return this.isTelegram ? this.telegram.platform : 'web';
    }

    // Check if user is from Telegram
    isTelegramUser() {
        return this.isTelegram && this.user !== null;
    }
}

// Initialize global instance
const telegramApp = new TelegramIntegration();