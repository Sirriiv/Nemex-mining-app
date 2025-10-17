// Enhanced Navigation Controller
class Navigation {
    constructor() {
        this.currentSection = 'home';
        this.sections = ['home', 'tasks', 'buy', 'referrals', 'wallet', 'profile', 'notifications', 'security', 'help', 'about'];
        this.init();
    }

    init() {
        console.log('📍 Initializing navigation system...');
        this.setupNavListeners();
        this.setupSettingsListeners();
        this.loadInitialSection();
    }

    setupNavListeners() {
        const navItems = document.querySelectorAll('.nav-item');
        
        navItems.forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const section = item.getAttribute('data-section');
                this.navigateTo(section);
            });
        });

        // Handle browser back/forward buttons
        window.addEventListener('popstate', (event) => {
            if (event.state && event.state.section) {
                this.showSection(event.state.section);
            }
        });
    }

    setupSettingsListeners() {
        // Settings button click
        const settingsBtn = document.getElementById('settingsButton');
        if (settingsBtn) {
            settingsBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleSettingsMenu();
            });
        }

        // Close settings when clicking outside
        document.addEventListener('click', (e) => {
            const settingsModal = document.getElementById('settingsModal');
            const settingsButton = document.getElementById('settingsButton');
            
            if (settingsModal && settingsModal.classList.contains('active') && 
                !settingsModal.contains(e.target) && 
                !settingsButton.contains(e.target)) {
                this.hideSettingsMenu();
            }
        });

        // Close settings with Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.hideSettingsMenu();
            }
        });
    }

    toggleSettingsMenu() {
        const modal = document.getElementById('settingsModal');
        const overlay = document.getElementById('modalOverlay');
        
        if (modal.classList.contains('active')) {
            this.hideSettingsMenu();
        } else {
            this.showSettingsMenu();
        }
    }

    showSettingsMenu() {
        const modal = document.getElementById('settingsModal');
        const overlay = document.getElementById('modalOverlay');
        
        modal.classList.add('active');
        overlay.classList.add('active');
    }

    hideSettingsMenu() {
        const modal = document.getElementById('settingsModal');
        const overlay = document.getElementById('modalOverlay');
        
        modal.classList.remove('active');
        overlay.classList.remove('active');
    }

    navigateTo(section) {
        if (!this.sections.includes(section)) {
            console.error(`Unknown section: ${section}`);
            return;
        }

        // Update URL without page reload
        const newUrl = `${window.location.pathname}#${section}`;
        window.history.pushState({ section }, '', newUrl);
        
        this.showSection(section);
        this.updateActiveNav(section);
        this.hideSettingsMenu();
    }

    async showSection(section) {
        console.log(`🔄 Loading section: ${section}`);
        
        // Hide all sections
        this.hideAllSections();
        
        // Show loading state
        this.showLoading(section);
        
        try {
            // Load section content
            await this.loadSectionContent(section);
            this.currentSection = section;
            
        } catch (error) {
            console.error(`❌ Failed to load section ${section}:`, error);
            this.showError(section);
        }
    }

    hideAllSections() {
        const sectionContainer = document.getElementById('section-container');
        if (sectionContainer) {
            sectionContainer.innerHTML = '';
        }
    }

    showLoading(section) {
        const sectionContainer = document.getElementById('section-container');
        const loadingHTML = `
            <div class="loading-state">
                <div class="loading-spinner"></div>
                <p>Loading ${this.getSectionTitle(section)}...</p>
            </div>
        `;
        sectionContainer.innerHTML = loadingHTML;
    }

    async loadSectionContent(section) {
        const sectionContainer = document.getElementById('section-container');
        
        try {
            let htmlContent = '';
            
            if (['home', 'tasks', 'buy', 'referrals', 'wallet'].includes(section)) {
                // Load from sections folder
                const response = await fetch(`../sections/${section}.html`);
                if (!response.ok) throw new Error(`Failed to load ${section} section`);
                htmlContent = await response.text();
            } else {
                // Load settings sections (profile, notifications, etc.)
                htmlContent = await this.loadSettingsSection(section);
            }

            sectionContainer.innerHTML = htmlContent;
            
            // Initialize section-specific JavaScript
            this.initSectionJS(section);

        } catch (error) {
            throw error;
        }
    }

    async loadSettingsSection(section) {
        // For now, we'll create simple placeholder content
        // In a real app, you'd load these from separate HTML files
        const sectionTitles = {
            'profile': 'User Profile',
            'notifications': 'Notifications',
            'security': 'Security Settings',
            'help': 'Help & Support',
            'about': 'About NEMEXCOIN'
        };

        return `
            <section class="dashboard-section" id="${section}-section">
                <div class="section-header">
                    <h2>${this.getSectionIcon(section)} ${sectionTitles[section]}</h2>
                    <p>${this.getSectionDescription(section)}</p>
                </div>
                <div class="settings-content">
                    ${this.getSettingsSectionContent(section)}
                </div>
            </section>
        `;
    }

    getSectionIcon(section) {
        const icons = {
            'profile': '👤',
            'notifications': '🔔',
            'security': '🔒',
            'help': '❓',
            'about': 'ℹ️'
        };
        return icons[section] || '📄';
    }

    getSectionDescription(section) {
        const descriptions = {
            'profile': 'Manage your personal information and account settings',
            'notifications': 'Configure your notification preferences',
            'security': 'Enhance your account security and privacy',
            'help': 'Get help and support for using NEMEXCOIN',
            'about': 'Learn more about NEMEXCOIN and its features'
        };
        return descriptions[section] || 'Section content';
    }

    getSettingsSectionContent(section) {
        const content = {
            'profile': `
                <div class="profile-settings">
                    <div class="setting-group">
                        <div class="setting-header">
                            <h3>Personal Information</h3>
                        </div>
                        <div class="setting-description">
                            Update your name, email, and other personal details
                        </div>
                        <button class="setting-action-btn" onclick="openProfileEditor()">
                            Edit Profile
                        </button>
                    </div>
                    
                    <div class="setting-group">
                        <div class="setting-header">
                            <h3>Account Statistics</h3>
                        </div>
                        <div class="stats-grid">
                            <div class="stat-card">
                                <div class="stat-value" id="profileTotalEarned">0</div>
                                <div class="stat-label">Total Earned</div>
                            </div>
                            <div class="stat-card">
                                <div class="stat-value" id="profileMiningDays">1</div>
                                <div class="stat-label">Mining Days</div>
                            </div>
                            <div class="stat-card">
                                <div class="stat-value" id="profileReferrals">0</div>
                                <div class="stat-label">Referrals</div>
                            </div>
                        </div>
                    </div>
                </div>
            `,
            
            'notifications': `
                <div class="notification-settings">
                    <div class="setting-group">
                        <div class="setting-header">
                            <h3>Push Notifications</h3>
                            <label class="toggle-switch">
                                <input type="checkbox" id="pushNotifications" checked>
                                <span class="toggle-slider"></span>
                            </label>
                        </div>
                        <div class="setting-description">
                            Receive push notifications for rewards and updates
                        </div>
                    </div>
                    
                    <div class="setting-group">
                        <div class="setting-header">
                            <h3>Email Notifications</h3>
                            <label class="toggle-switch">
                                <input type="checkbox" id="emailNotifications">
                                <span class="toggle-slider"></span>
                            </label>
                        </div>
                        <div class="setting-description">
                            Get important updates via email
                        </div>
                    </div>
                    
                    <div class="setting-group">
                        <div class="setting-header">
                            <h3>Mining Alerts</h3>
                            <label class="toggle-switch">
                                <input type="checkbox" id="miningAlerts" checked>
                                <span class="toggle-slider"></span>
                            </label>
                        </div>
                        <div class="setting-description">
                            Notify when mining rewards are ready
                        </div>
                    </div>
                </div>
            `,
            
            'security': `
                <div class="security-settings">
                    <div class="setting-group">
                        <div class="setting-header">
                            <h3>Two-Factor Authentication</h3>
                            <span class="security-status disabled">Disabled</span>
                        </div>
                        <div class="setting-description">
                            Add an extra layer of security to your account
                        </div>
                        <button class="security-btn" onclick="enable2FA()">
                            Enable 2FA
                        </button>
                    </div>
                    
                    <div class="setting-group">
                        <div class="setting-header">
                            <h3>Change Password</h3>
                        </div>
                        <div class="setting-description">
                            Update your account password regularly
                        </div>
                        <button class="security-btn secondary" onclick="changePassword()">
                            Change Password
                        </button>
                    </div>
                    
                    <div class="setting-group">
                        <div class="setting-header">
                            <h3>Login Activity</h3>
                        </div>
                        <div class="setting-description">
                            Review your recent account activity
                        </div>
                        <button class="security-btn secondary" onclick="viewLoginActivity()">
                            View Activity
                        </button>
                    </div>
                </div>
            `,
            
            'help': `
                <div class="help-section">
                    <div class="help-cards">
                        <div class="help-card" onclick="showHelp('getting-started')">
                            <div class="help-icon">🚀</div>
                            <div class="help-title">Getting Started</div>
                            <div class="help-description">Learn how to start mining NMXp</div>
                        </div>
                        
                        <div class="help-card" onclick="showHelp('faq')">
                            <div class="help-icon">❓</div>
                            <div class="help-title">FAQ</div>
                            <div class="help-description">Frequently asked questions</div>
                        </div>
                        
                        <div class="help-card" onclick="showHelp('contact')">
                            <div class="help-icon">💬</div>
                            <div class="help-title">Contact Support</div>
                            <div class="help-description">Get help from our team</div>
                        </div>
                    </div>
                </div>
            `,
            
            'about': `
                <div class="about-section">
                    <div class="about-header">
                        <div class="about-logo">NMX</div>
                        <h3>NEMEXCOIN</h3>
                        <p>Version 1.0.0</p>
                    </div>
                    
                    <div class="about-info">
                        <div class="info-item">
                            <span>Build Date:</span>
                            <span>${new Date().toLocaleDateString()}</span>
                        </div>
                        <div class="info-item">
                            <span>User ID:</span>
                            <span id="aboutUserId">Loading...</span>
                        </div>
                        <div class="info-item">
                            <span>Mining Status:</span>
                            <span style="color: var(--gold);">Active</span>
                        </div>
                    </div>
                    
                    <div class="about-links">
                        <button class="about-link" onclick="openLink('privacy')">
                            Privacy Policy
                        </button>
                        <button class="about-link" onclick="openLink('terms')">
                            Terms of Service
                        </button>
                    </div>
                </div>
            `
        };
        
        return content[section] || '<p>Section content coming soon...</p>';
    }

    initSectionJS(section) {
        // Load section-specific JavaScript
        const scriptMap = {
            'home': '../js/section/home.js',
            'tasks': '../js/section/task.js',
            'buy': '../js/section/buy.js',
            'referrals': '../js/section/referrals.js',
            'wallet': '../js/section/wallet.js'
        };

        if (scriptMap[section]) {
            this.loadSectionScript(scriptMap[section]);
        }
        
        // Initialize settings sections
        this.initSettingsSection(section);
    }

    initSettingsSection(section) {
        // Initialize settings section functionality
        switch(section) {
            case 'profile':
                this.initProfileSection();
                break;
            case 'notifications':
                this.initNotificationsSection();
                break;
            case 'security':
                this.initSecuritySection();
                break;
            // Add other sections as needed
        }
    }

    initProfileSection() {
        // Load profile data
        if (window.profileManager) {
            window.profileManager.loadProfile().then(() => {
                // Update profile stats in settings
                const user = window.userManager?.getCurrentUser();
                if (user) {
                    document.getElementById('profileTotalEarned').textContent = user.totalEarned || '0';
                    document.getElementById('profileMiningDays').textContent = user.miningDays || '1';
                    document.getElementById('profileReferrals').textContent = user.totalReferrals || '0';
                }
            });
        }
    }

    initNotificationsSection() {
        // Initialize notification toggles
        const toggles = document.querySelectorAll('.toggle-switch input');
        toggles.forEach(toggle => {
            toggle.addEventListener('change', (e) => {
                const setting = e.target.id;
                const value = e.target.checked;
                this.saveNotificationSetting(setting, value);
            });
        });
    }

    initSecuritySection() {
        // Initialize security section
        console.log('Security section initialized');
    }

    loadSectionScript(src) {
        // Remove existing section script if any
        const existingScript = document.querySelector(`script[data-section-script]`);
        if (existingScript) {
            existingScript.remove();
        }

        // Load new section script
        const script = document.createElement('script');
        script.src = src;
        script.setAttribute('data-section-script', 'true');
        script.onerror = () => console.error(`Failed to load script: ${src}`);
        document.body.appendChild(script);
    }

    updateActiveNav(section) {
        // Only update bottom nav for main sections
        if (['home', 'tasks', 'buy', 'referrals', 'wallet'].includes(section)) {
            const navItems = document.querySelectorAll('.nav-item');
            navItems.forEach(item => {
                item.classList.remove('active');
                if (item.getAttribute('data-section') === section) {
                    item.classList.add('active');
                }
            });
        }
    }

    getSectionTitle(section) {
        const titles = {
            'home': 'Home',
            'tasks': 'Tasks',
            'buy': 'Buy NMXp',
            'referrals': 'Referrals',
            'wallet': 'Wallet',
            'profile': 'Profile',
            'notifications': 'Notifications',
            'security': 'Security',
            'help': 'Help & Support',
            'about': 'About'
        };
        return titles[section] || section;
    }

    showError(section) {
        const sectionContainer = document.getElementById('section-container');
        sectionContainer.innerHTML = `
            <div class="error-state">
                <h3>Failed to Load</h3>
                <p>Could not load the ${this.getSectionTitle(section)} section.</p>
                <button onclick="window.navigation.navigateTo('${section}')" class="retry-btn">
                    Try Again
                </button>
            </div>
        `;
    }

    loadInitialSection() {
        // Check URL hash or default to home
        const hash = window.location.hash.replace('#', '');
        const initialSection = this.sections.includes(hash) ? hash : 'home';
        this.navigateTo(initialSection);
    }

    saveNotificationSetting(setting, value) {
        console.log(`Saving notification setting: ${setting} = ${value}`);
        // Save to localStorage or send to backend
        StorageManager.set(`notification_${setting}`, value);
    }
}

// Global functions for HTML onclick handlers
function openSection(section) {
    if (window.navigation) {
        window.navigation.navigateTo(section);
    }
}

function toggleDarkMode() {
    console.log('Dark mode toggle clicked');
    // Implement dark mode toggle functionality
}

function logout() {
    if (window.nemexApp) {
        window.nemexApp.logout();
    } else if (window.userManager) {
        window.userManager.logout();
        window.location.href = 'login.html';
    }
}

// Initialize navigation
document.addEventListener('DOMContentLoaded', () => {
    window.navigation = new Navigation();
});