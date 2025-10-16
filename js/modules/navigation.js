// Navigation Management
let isLoading = false;

function initializeNavigation() {
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', function() {
            if (isLoading) return;
            
            const target = this.getAttribute('data-section');
            
            // Don't reload home section since it's already loaded
            if (target === 'home') {
                document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
                document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
                document.getElementById('home').classList.add('active');
                this.classList.add('active');
                return;
            }
            
            const loading = document.getElementById('loading');
            
            // Disable navigation during loading
            isLoading = true;
            document.querySelectorAll('.nav-item').forEach(nav => {
                nav.style.pointerEvents = 'none';
            });
            
            loading.classList.remove('hidden');
            
            setTimeout(() => {
                loadSection(target);
                
                document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
                this.classList.add('active');
                
                setTimeout(() => {
                    loading.classList.add('hidden');
                    // Re-enable navigation
                    isLoading = false;
                    document.querySelectorAll('.nav-item').forEach(nav => {
                        nav.style.pointerEvents = 'auto';
                    });
                }, 300);
            }, 1500);
        });
    });
}

async function loadSection(sectionName) {
    try {
        // For home section, just show it (already loaded)
        if (sectionName === 'home') {
            document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
            document.getElementById('home').classList.add('active');
            return;
        }
        
        const response = await fetch(`sections/${sectionName}.html`);
        if (!response.ok) throw new Error('Failed to load section');
        
        const html = await response.text();
        
        // Hide all sections and clear content area
        document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
        document.getElementById('content-area').innerHTML = html;
        document.getElementById('content-area').firstElementChild.classList.add('active');
        
    } catch (error) {
        console.error('Error loading section:', error);
        document.getElementById('content-area').innerHTML = `
            <div class="section active">
                <h2>${sectionName.charAt(0).toUpperCase() + sectionName.slice(1)}</h2>
                <p>Failed to load ${sectionName} section. Please try again.</p>
            </div>
        `;
    }
}