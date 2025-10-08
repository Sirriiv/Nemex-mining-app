document.addEventListener("DOMContentLoaded", function() {
    
    // =========================================================
    // 0. GET ALL CORE ELEMENTS
    // =========================================================
    
    // Get Form Elements
    const loginForm = document.getElementById('login-form'); 
    const signupForm = document.getElementById('signup-form');
    
    // Get Mining Elements
    const claimButton = document.getElementById('claim-btn');
    const balanceDisplay = document.getElementById('nmp-balance');

    // =========================================================
    // 1. INITIAL VISIBILITY SETUP (CRITICAL FIX)
    // =========================================================
    
    // Initial State: Hide all content sections except the splash screen
    document.getElementById('mining').style.display = 'none'; // CRITICAL FIX: Mining Profile is hidden
    document.getElementById('auth').style.display = 'none';
    document.getElementById('contact').style.display = 'none';
    
    // Initial State: Hide the Navigation bar
    document.querySelector('nav').style.display = 'none';

    
    // =========================================================
    // 2. SPLASH SCREEN TO LOGIN TRANSITION (GOLD 'Sign In' button)
    // =========================================================
    
    // Using the 'primary' class for the Sign In button
    const loginButton = document.querySelector('.primary'); 
    
    if (loginButton) {
        loginButton.addEventListener('click', function() {
            // Hide ALL sections when switching to a new screen
            document.getElementById('about').style.display = 'none';
            document.getElementById('mining').style.display = 'none';
            document.getElementById('contact').style.display = 'none';

            // Show the login form
            document.getElementById('auth').style.display = 'block';
            
            // Show the Navigation Bar
            document.querySelector('nav').style.display = 'block';
        });
    }

    // =========================================================
    // 3. LOGIN FORM VALIDATION (Currently using alerts)
    // =========================================================
    
    if (loginForm) {
        loginForm.addEventListener('submit', function(event) {
            event.preventDefault(); 
            
            const walletId = document.getElementById('wallet_id').value.trim();
            const password = document.getElementById('password').value.trim();
            
            if (walletId === '' || password === '') {
                alert('Error: Please enter both Wallet ID/Username and Password.');
            } else {
                alert('Success! Data submitted for: ' + walletId);
                loginForm.reset(); 
            }
        });
    }

    // =========================================================
    // 3A. SIGN UP FORM VALIDATION (Currently using alerts)
    // =========================================================
    
    if (signupForm) {
        signupForm.addEventListener('submit', function(event) {
            event.preventDefault(); 
            
            const username = document.getElementById('new_username').value.trim();
            const password = document.getElementById('new_password').value.trim();
            const confirm = document.getElementById('confirm_password').value.trim();
            
            if (username === '' || password === '' || confirm === '') {
                alert('Error: All Sign Up fields are required.');
            } else if (password !== confirm) {
                alert('Error: Passwords do not match!');
            } else {
                alert('Success! New user ' + username + ' registered!');
                signupForm.reset(); 
            }
        });
    }

    // =========================================================
    // 4. LOGIN/SIGN UP SWITCHING LOGIC (Form Swapping)
    // =========================================================
    
    const switchToSignupLink = document.querySelector('.switch-to-signup');
    const switchToLoginLink = document.querySelector('.switch-to-login');

    // Logic to switch to Sign Up
    if (switchToSignupLink) {
        switchToSignupLink.addEventListener('click', function(event) {
            event.preventDefault(); 
            loginForm.style.display = 'none';
            signupForm.style.display = 'block';
            alert('Switching to Sign Up Form...');
        });
    }
    
    // Logic to switch back to Login
    if (switchToLoginLink) {
        switchToLoginLink.addEventListener('click', function(event) {
            event.preventDefault(); 
            signupForm.style.display = 'none';
            loginForm.style.display = 'block';
            alert('Switching to Login Form...');
        });
    }

    // =========================================================
    // 5. MINING PROFILE FUNCTIONALITY (Claim Button)
    // =========================================================
    
    if (claimButton && balanceDisplay) {
        claimButton.addEventListener('click', function() {
            // Simulate adding 300 NMP
            let currentBalance = parseInt(balanceDisplay.textContent);
            let newBalance = currentBalance + 300;
            
            balanceDisplay.textContent = newBalance.toString().padStart(2, '0');
            claimButton.textContent = 'Claimed!';
            claimButton.disabled = true;
            
            alert('300 NMP successfully claimed! Mining will restart soon.');
        });
    }


    // =========================================================
    // 6. NAVIGATION: MINING INFO LINK
    // =========================================================

    const miningNavLink = document.querySelector('nav a[href="#mining"]');
    const miningSection = document.getElementById('mining');

    if (miningNavLink) {
        miningNavLink.addEventListener('click', function(event) {
            event.preventDefault(); 

            // Hide ALL other sections
            document.getElementById('about').style.display = 'none';
            document.getElementById('auth').style.display = 'none';
            document.getElementById('contact').style.display = 'none';

            // Show the Mining section
            miningSection.style.display = 'block'; 
        });
    }
});
