// Fixed Navigation Controller
class Navigation {
    constructor() {
        this.currentSection = 'home';
        this.mainSections = ['home', 'tasks', 'buy', 'referrals', 'wallet'];
        this.settingsSections = ['profile', 'notifications', 'security', 'help', 'about'];
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
                
                if (this.mainSections.includes(section)) {
                    this.navigateTo(section);
                }
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
        if (!this.mainSections.includes(section)) {
            console.error(`Unknown section: ${section}`);
            return;
        }

        // Update URL without page reload
        const newUrl = `${window.location.pathname}#${section}`;
        window.history.pushState({ section }, '', newUrl);
        
        this.showSection(section);
        this.updateActiveNav(section);
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
            // Load from sections folder
            const response = await fetch(`../sections/${section}.html`);
            if (!response.ok) throw new Error(`Failed to load ${section} section`);
            
            const htmlContent = await response.text();
            sectionContainer.innerHTML = htmlContent;
            
            // Initialize section-specific JavaScript
            this.initSectionJS(section);

        } catch (error) {
            throw error;
        }
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
        // Update bottom nav for main sections only
        const navItems = document.querySelectorAll('.nav-item');
        navItems.forEach(item => {
            item.classList.remove('active');
            if (item.getAttribute('data-section') === section) {
                item.classList.add('active');
            }
        });
    }

    getSectionTitle(section) {
        const titles = {
            'home': 'Home',
            'tasks': 'Tasks',
            'buy': 'Buy NMXp',
            'referrals': 'Referrals',
            'wallet': 'Wallet'
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
        const initialSection = this.mainSections.includes(hash) ? hash : 'home';
        this.navigateTo(initialSection);
    }
}

// Global functions for settings menu
function openSettingsSection(section) {
    console.log(`Opening settings section: ${section}`);
    // For now, just show an alert. In real app, you'd open a modal for each settings section
    alert(`${section.charAt(0).toUpperCase() + section.slice(1)} settings would open here`);
    
    // Close settings menu after selection
    if (window.navigation) {
        window.navigation.hideSettingsMenu();
    }
}

function toggleDarkMode() {
    console.log('Dark mode toggle clicked');
    // Implement dark mode toggle functionality
    alert('Dark mode toggle would work here');
}

function logout() {
    if (window.nemexApp) {
        window.nemexApp.logout();
    } else if (window.userManager) {
        window.userManager.logout();
        window.location.href = 'login.html';
    } else {
        window.location.href = 'login.html';
    }
}

// Initialize navigation
document.addEventListener('DOMContentLoaded', () => {
    window.navigation = new Navigation();
});