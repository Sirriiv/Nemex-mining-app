// Navigation Controller
class Navigation {
    constructor() {
        this.currentSection = 'home';
        this.init();
    }

    init() {
        console.log('📍 Initializing navigation...');
        this.setupNavListeners();
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

    navigateTo(section) {
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
        const mainContent = document.getElementById('main-content');
        if (mainContent) {
            mainContent.innerHTML = '';
        }
    }

    showLoading(section) {
        const mainContent = document.getElementById('main-content');
        const loadingHTML = `
            <div class="loading-state">
                <div class="loading-spinner"></div>
                <p>Loading ${section}...</p>
            </div>
        `;
        mainContent.innerHTML = loadingHTML;
    }

    async loadSectionContent(section) {
        const mainContent = document.getElementById('main-content');
        
        switch (section) {
            case 'home':
                mainContent.innerHTML = await this.loadHomeSection();
                break;
            case 'tasks':
                mainContent.innerHTML = await this.loadTasksSection();
                break;
            case 'buy':
                mainContent.innerHTML = await this.loadBuySection();
                break;
            case 'referrals':
                mainContent.innerHTML = await this.loadReferralsSection();
                break;
            case 'wallet':
                mainContent.innerHTML = await this.loadWalletSection();
                break;
            default:
                throw new Error(`Unknown section: ${section}`);
        }

        // Initialize section-specific JavaScript
        this.initSectionJS(section);
    }

    async loadHomeSection() {
        const response = await fetch('../sections/home.html');
        if (!response.ok) throw new Error('Failed to load home section');
        return await response.text();
    }

    async loadTasksSection() {
        const response = await fetch('../sections/tasks.html');
        if (!response.ok) throw new Error('Failed to load tasks section');
        return await response.text();
    }

    async loadBuySection() {
        const response = await fetch('../sections/buy.html');
        if (!response.ok) throw new Error('Failed to load buy section');
        return await response.text();
    }

    async loadReferralsSection() {
        const response = await fetch('../sections/referrals.html');
        if (!response.ok) throw new Error('Failed to load referrals section');
        return await response.text();
    }

    async loadWalletSection() {
        const response = await fetch('../sections/wallet.html');
        if (!response.ok) throw new Error('Failed to load wallet section');
        return await response.text();
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
        // Update navigation active states
        const navItems = document.querySelectorAll('.nav-item');
        navItems.forEach(item => {
            item.classList.remove('active');
            if (item.getAttribute('data-section') === section) {
                item.classList.add('active');
            }
        });
    }

    showError(section) {
        const mainContent = document.getElementById('main-content');
        mainContent.innerHTML = `
            <div class="error-state">
                <h3>Failed to Load</h3>
                <p>Could not load the ${section} section.</p>
                <button onclick="window.navigation.navigateTo('${section}')" class="retry-btn">
                    Try Again
                </button>
            </div>
        `;
    }

    loadInitialSection() {
        // Check URL hash or default to home
        const hash = window.location.hash.replace('#', '');
        const initialSection = hash || 'home';
        this.navigateTo(initialSection);
    }
}

// Initialize navigation
document.addEventListener('DOMContentLoaded', () => {
    window.navigation = new Navigation();
});