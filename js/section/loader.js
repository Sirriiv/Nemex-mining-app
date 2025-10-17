// Central section loader for the dashboard
class SectionLoader {
    constructor() {
        this.currentSection = null;
    }

    // Load any section dynamically
    async loadSection(sectionName, sectionData = {}) {
        try {
            // Hide current active section
            this.hideCurrentSection();

            // Create or get section container
            let sectionElement = document.querySelector(`#${sectionName}-section`);
            
            if (!sectionElement) {
                sectionElement = document.createElement('div');
                sectionElement.id = `${sectionName}-section`;
                sectionElement.className = 'section active';
                document.getElementById('dynamic-sections').appendChild(sectionElement);
            } else {
                sectionElement.classList.add('active');
            }

            // Show loading state
            sectionElement.innerHTML = this.getLoadingHTML();
            this.currentSection = sectionName;

            // Load section HTML
            const html = await this.fetchSectionHTML(sectionName);
            sectionElement.innerHTML = html;

            // Load section CSS
            await this.loadSectionCSS(sectionName);

            // Load section JS
            await this.loadSectionJS(sectionName, sectionData);

            // Close any open menus
            this.closeMenus();

            console.log(`✅ ${sectionName} section loaded successfully`);

        } catch (error) {
            console.error(`❌ Error loading ${sectionName}:`, error);
            this.showErrorState(sectionName, error);
        }
    }

    async fetchSectionHTML(sectionName) {
        const response = await fetch(`sections/${sectionName}.html`);
        if (!response.ok) {
            throw new Error(`Failed to load ${sectionName}.html`);
        }
        return await response.text();
    }

    async loadSectionCSS(sectionName) {
        const cssUrl = `styles/${sectionName}.css`;
        
        // Check if CSS already loaded
        if (document.querySelector(`link[href="${cssUrl}"]`)) {
            return;
        }

        return new Promise((resolve, reject) => {
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = cssUrl;
            link.onload = resolve;
            link.onerror = reject;
            document.head.appendChild(link);
        });
    }

    async loadSectionJS(sectionName, sectionData) {
        const jsUrl = `JS/${sectionName}.js`;
        
        // Check if JS already loaded
        const existingScript = document.querySelector(`script[src="${jsUrl}"]`);
        if (existingScript) {
            // If already loaded, just initialize
            if (window[`${sectionName}Manager`]) {
                window[`${sectionName}Manager`].init(sectionData);
            }
            return;
        }

        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = jsUrl;
            script.onload = () => {
                // Initialize the section manager if it exists
                if (window[`${sectionName}Manager`]) {
                    window[`${sectionName}Manager`].init(sectionData);
                }
                resolve();
            };
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }

    hideCurrentSection() {
        const currentActive = document.querySelector('.section.active');
        if (currentActive) {
            currentActive.classList.remove('active');
        }
    }

    closeMenus() {
        // Close settings menu if open
        const settingsMenu = document.querySelector('.settings-menu');
        const overlay = document.querySelector('.overlay');
        
        if (settingsMenu) settingsMenu.classList.remove('active');
        if (overlay) overlay.classList.remove('active');
    }

    getLoadingHTML() {
        return `
            <div class="loading-state">
                <div class="loading-spinner"></div>
                <p>Loading content...</p>
            </div>
        `;
    }

    showErrorState(sectionName, error) {
        const sectionElement = document.querySelector(`#${sectionName}-section`);
        if (sectionElement) {
            sectionElement.innerHTML = `
                <div class="error-message">
                    <h3>⚠️ Error Loading ${sectionName.charAt(0).toUpperCase() + sectionName.slice(1)}</h3>
                    <p>${error.message}</p>
                    <button onclick="sectionLoader.loadSection('${sectionName}')" class="retry-btn">Try Again</button>
                </div>
            `;
        }
    }

    // Quick access methods for common sections
    loadDashboard() {
        // Show home section
        this.hideCurrentSection();
        document.getElementById('home').classList.add('active');
        this.updateNavigation('home');
    }

    loadNotifications() {
        this.loadSection('notifications');
        this.updateNavigation('notifications');
    }

    loadProfile() {
        this.loadSection('profile');
        this.updateNavigation('profile');
    }

    loadSettings() {
        this.loadSection('settings');
        this.updateNavigation('settings');
    }

    updateNavigation(section) {
        document.querySelectorAll('.nav-item').forEach(nav => {
            nav.classList.remove('active');
        });
        
        const navItem = document.querySelector(`[data-section="${section}"]`);
        if (navItem) {
            navItem.classList.add('active');
        }
    }
}

// Initialize global section loader
window.sectionLoader = new SectionLoader();