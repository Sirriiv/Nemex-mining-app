import { initializeUser } from './sections/home.js';
import { SettingsManager } from './modules/settingsManager.js';

// Global variables
let isLoading = false;
let currentUserId = getStableUserId();
let settingsManager;

// Initialize the app
document.addEventListener('DOMContentLoaded', function() {
    initializeNavigation();
    initializeSettings();
    initializeUser();
});

function initializeNavigation() {
    // Set up tab click events
    document.querySelectorAll('.nav-item').forEach(button => {
        button.addEventListener('click', function() {
            if (isLoading) return;
            
            const section = this.getAttribute('data-section');
            loadSection(section);
            
            // Update active nav
            document.querySelectorAll('.nav-item').forEach(nav => {
                nav.classList.remove('active');
            });
            this.classList.add('active');
        });
    });
    
    // Load home by default
    loadSection('home');
}

function initializeSettings() {
    settingsManager = new SettingsManager(currentUserId);
}

async function loadSection(sectionName) {
    try {
        isLoading = true;
        showLoading(`Loading ${sectionName}...`);
        
        // Disable navigation during load
        document.querySelectorAll('.nav-item').forEach(nav => {
            nav.style.pointerEvents = 'none';
        });

        // Load the HTML content
        const response = await fetch(`../SECTIONS/${sectionName}.html`);
        if (!response.ok) throw new Error('Failed to load section');
        
        const html = await response.text();
        document.getElementById('section-content').innerHTML = html;
        
        // Load section-specific JavaScript
        await loadSectionScript(sectionName);
        
    } catch (error) {
        console.error('Error loading section:', error);
        document.getElementById('section-content').innerHTML = 
            `<div class="error" style="text-align: center; padding: 40px; color: var(--muted);">
                Failed to load ${sectionName} section
            </div>`;
    } finally {
        hideLoading();
        isLoading = false;
        document.querySelectorAll('.nav-item').forEach(nav => {
            nav.style.pointerEvents = 'auto';
        });
    }
}

async function loadSectionScript(sectionName) {
    try {
        // Import the section-specific JavaScript
        const module = await import(`./sections/${sectionName}.js`);
        
        // Initialize the section if it has an init function
        if (module.initSection) {
            module.initSection(currentUserId);
        }
    } catch (error) {
        console.log(`No specific JavaScript for ${sectionName} section`);
    }
}

function showLoading(message = 'Loading...') {
    const loading = document.getElementById('loading');
    if (loading) {
        const status = loading.querySelector('.loading-status');
        status.textContent = message;
        loading.classList.remove('hidden');
    }
}

function hideLoading() {
    setTimeout(() => {
        const loading = document.getElementById('loading');
        if (loading) {
            loading.classList.add('hidden');
        }
    }, 500);
}

function getStableUserId() {
    let userId = localStorage.getItem('userId');
    if (!userId) {
        userId = generateStableUserId();
        localStorage.setItem('userId', userId);
    }
    return userId;
}

function generateStableUserId() {
    const components = [
        navigator.userAgent, navigator.language,
        navigator.hardwareConcurrency || 'unknown',
        screen.width + 'x' + screen.height,
        new Date().getTimezoneOffset()
    ];
    let hash = 0;
    const str = components.join('|');
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return 'user_' + Math.abs(hash).toString(36) + '_' + Date.now();
}

// Make copyToClipboard globally available for HTML onclick attributes
window.copyToClipboard = function(elementId) {
    const text = document.getElementById(elementId).textContent;
    navigator.clipboard.writeText(text).then(() => {
        alert('Copied to clipboard!');
    }).catch(() => {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        alert('Copied to clipboard!');
    });
};

// Make copyReferralCode globally available
window.copyReferralCode = function() {
    const userId = localStorage.getItem('userId') || currentUserId;
    const referralCode = `NMX-${userId.substring(0, 8).toUpperCase()}`;
    navigator.clipboard.writeText(referralCode).then(() => {
        alert('Referral code copied to clipboard!');
    });
};