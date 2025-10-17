// Section Loader for Dynamic Content
class SectionLoader {
    constructor() {
        this.sections = new Map();
        this.currentSection = 'home';
        this.init();
    }

    init() {
        this.loadSection('notifications', 'sections/notifications.html');
        this.loadSection('profile', 'sections/profile.html');
        this.loadSection('settings', 'sections/settings.html');
        this.setupNavigation();
    }

    async loadSection(name, url) {
        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error(`Failed to load ${url}`);
            
            const html = await response.text();
            this.sections.set(name, html);
            console.log(`Section ${name} loaded successfully`);
        } catch (error) {
            console.error(`Error loading section ${name}:`, error);
            this.sections.set(name, this.getErrorHTML(name));
        }
    }

    async showSection(name) {
        // Hide all sections
        document.querySelectorAll('.section').forEach(section => {
            section.classList.remove('active');
        });

        // Update navigation
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
        });

        document.querySelector(`[data-section="${name}"]`).classList.add('active');

        // Show main section or load dynamic content
        if (['home', 'tasks', 'buy', 'referrals', 'wallet'].includes(name)) {
            document.getElementById(name).classList.add('active');
            this.currentSection = name;
        } else {
            // For dynamic sections
            await this.renderDynamicSection(name);
        }
    }

    async renderDynamicSection(name) {
        const container = document.getElementById('dynamic-sections');
        
        if (!this.sections.has(name)) {
            await this.loadSection(name, `sections/${name}.html`);
        }

        const html = this.sections.get(name);
        container.innerHTML = html;
        container.classList.add('active');
        this.currentSection = name;

        // Initialize section-specific JavaScript
        this.initSectionJS(name);
    }

    initSectionJS(name) {
        switch (name) {
            case 'notifications':
                if (typeof initNotifications === 'function') {
                    initNotifications();
                }
                break;
            case 'profile':
                if (typeof initProfile === 'function') {
                    initProfile();
                }
                break;
            case 'settings':
                if (typeof initSettings === 'function') {
                    initSettings();
                }
                break;
        }
    }

    setupNavigation() {
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const section = item.getAttribute('data-section');
                this.showSection(section);
            });
        });

        // Settings menu navigation
        document.getElementById('profileBtn')?.addEventListener('click', () => {
            this.showSection('profile');
            this.hideSettingsMenu();
        });

        document.getElementById('notificationsBtn')?.addEventListener('click', () => {
            this.showSection('notifications');
            this.hideSettingsMenu();
        });
    }

    hideSettingsMenu() {
        document.getElementById('settingsMenu').classList.remove('active');
        document.getElementById('overlay').classList.remove('active');
    }

    getErrorHTML(sectionName) {
        return `
            <div class="error-message">
                <h3>Failed to Load</h3>
                <p>Unable to load ${sectionName} section.</p>
                <button class="retry-btn" onclick="sectionLoader.loadSection('${sectionName}', 'sections/${sectionName}.html')">
                    Retry
                </button>
            </div>
        `;
    }
}

// Initialize section loader
const sectionLoader = new SectionLoader();