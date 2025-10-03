// Authentication Manager
class AuthManager {
    constructor(googleClientId = null) {
        this.currentUser = null;
        this.googleInitialized = false;
        this.googleClientId = googleClientId;
        this.initializeAuth();
        // Don't bind events in constructor - will be called after partials load
    }

    async initializeAuth() {
        // Check if user is already logged in
        const savedUser = localStorage.getItem('nerdchat_user');
        if (savedUser) {
            this.currentUser = JSON.parse(savedUser);
        }

        // Initialize Google Sign-In only if we have the client ID
        if (this.googleClientId) {
            try {
                await this.initializeGoogleSignIn();
            } catch (error) {
                console.error('Failed to initialize Google Sign-In:', error);
            }
        }
    }

    async initializeGoogleSignIn() {
        if (typeof google === 'undefined') {
            return;
        }

        if (!this.googleClientId) {
            return;
        }

        try {
            google.accounts.id.initialize({
                client_id: this.googleClientId,
                callback: (response) => this.handleGoogleSignIn(response),
                auto_select: false,
                cancel_on_tap_outside: true,
            });

            this.googleInitialized = true;
        } catch (error) {
            console.error('Error initializing Google Sign-In:', error);
        }
    }

    async setGoogleClientId(clientId) {
        this.googleClientId = clientId;
        
        // Wait a bit for Google API to load if needed
        const maxAttempts = 10;
        let attempts = 0;
        
        while (attempts < maxAttempts) {
            if (typeof google !== 'undefined' && clientId) {
                await this.initializeGoogleSignIn();
                break;
            }
            attempts++;
            await new Promise(resolve => setTimeout(resolve, 500));
        }
    }

    bindAuthEvents() {
        // Form switch events
        document.getElementById('show-signup')?.addEventListener('click', (e) => {
            e.preventDefault();
            this.showSignUp();
        });

        document.getElementById('show-signin')?.addEventListener('click', (e) => {
            e.preventDefault();
            this.showSignIn();
        });

        // Form submissions
        document.getElementById('signinForm')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleEmailSignIn(e);
        });

        document.getElementById('signupForm')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleEmailSignUp(e);
        });

        // Google sign-in buttons
        document.getElementById('google-signin-btn')?.addEventListener('click', () => {
            this.initiateGoogleSignIn();
        });

        document.getElementById('google-signup-btn')?.addEventListener('click', () => {
            this.initiateGoogleSignIn();
        });
    }

    showSignUp() {
        document.getElementById('signin-form').style.display = 'none';
        document.getElementById('signup-form').style.display = 'block';
        this.clearMessages();
    }

    showSignIn() {
        document.getElementById('signup-form').style.display = 'none';
        document.getElementById('signin-form').style.display = 'block';
        this.clearMessages();
    }

    clearMessages() {
        const errorElements = document.querySelectorAll('.auth-error, .auth-success');
        errorElements.forEach(el => {
            el.style.display = 'none';
            el.textContent = '';
        });
    }

    showError(message, formType = 'signin') {
        const errorEl = document.getElementById(formType === 'signin' ? 'auth-error' : 'signup-error');
        errorEl.textContent = message;
        errorEl.style.display = 'block';
    }

    showSuccess(message, formType = 'signin') {
        const successEl = document.getElementById(formType === 'signin' ? 'auth-success' : 'signup-success');
        successEl.textContent = message;
        successEl.style.display = 'block';
    }

    async handleEmailSignIn(event) {
        const email = document.getElementById('signin-email').value;
        const password = document.getElementById('signin-password').value;
        const btn = document.getElementById('signin-btn');

        this.clearMessages();
        btn.disabled = true;
        btn.innerHTML = '<span>Signing In...</span>';

        try {
            // Call actual authentication API
            const data = await this.callAuthAPI(email, password, 'signin');
            
            this.setCurrentUser(data.user);
            this.showSuccess('Successfully signed in! Redirecting...', 'signin');
            
            setTimeout(() => {
                this.redirectToApp();
            }, 1500);

        } catch (error) {
            if (error.verification_required) {
                this.showError(error.message, 'signin');
                this.showResendVerificationOption(email);
            } else {
                this.showError(error.message, 'signin');
            }
        } finally {
            btn.disabled = false;
            btn.innerHTML = '<span>Sign In</span>';
        }
    }

    async handleEmailSignUp(event) {
        const name = document.getElementById('signup-name').value;
        const email = document.getElementById('signup-email').value;
        const password = document.getElementById('signup-password').value;
        const confirmPassword = document.getElementById('signup-confirm').value;
        const btn = document.getElementById('signup-btn');

        this.clearMessages();

        if (password !== confirmPassword) {
            this.showError('Passwords do not match', 'signup');
            return;
        }

        if (password.length < 6) {
            this.showError('Password must be at least 6 characters', 'signup');
            return;
        }

        btn.disabled = true;
        btn.innerHTML = '<span>Creating Account...</span>';

        try {
            // Call actual authentication API
            const data = await this.callAuthAPI(email, password, 'signup', name);
            
            if (data.verification_required) {
                this.showSuccess(data.message || 'Account created! Please check your email to verify your account.', 'signup');
                // Show resend verification option
                this.showResendVerificationOption(email);
            } else {
                this.setCurrentUser(data.user);
                this.showSuccess('Account created successfully! Redirecting...', 'signup');
                setTimeout(() => {
                    this.redirectToApp();
                }, 1500);
            }

        } catch (error) {
            this.showError(error.message, 'signup');
        } finally {
            btn.disabled = false;
            btn.innerHTML = '<span>Create Account</span>';
        }
    }

    showResendVerificationOption(email) {
        const signupForm = document.getElementById('signup-form');
        const resendContainer = document.createElement('div');
        resendContainer.className = 'resend-verification';
        resendContainer.style.marginTop = '15px';
        resendContainer.style.textAlign = 'center';
        
        resendContainer.innerHTML = `
            <p style="margin: 10px 0; font-size: 14px; color: #666;">
                Didn't receive the email? 
                <a href="#" id="resend-verification-link" style="color: #667eea; text-decoration: underline; cursor: pointer;">
                    Resend verification email
                </a>
            </p>
        `;
        
        // Remove existing resend container if it exists
        const existing = signupForm.querySelector('.resend-verification');
        if (existing) {
            existing.remove();
        }
        
        signupForm.appendChild(resendContainer);
        
        // Add click handler for resend link
        document.getElementById('resend-verification-link').addEventListener('click', (e) => {
            e.preventDefault();
            this.resendVerificationEmail(email);
        });
    }

    async resendVerificationEmail(email) {
        try {
            const response = await fetch('/auth/resend-verification', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email })
            });

            const data = await response.json();

            if (data.success) {
                this.showSuccess('Verification email has been resent. Please check your inbox.', 'signup');
            } else {
                this.showError(data.error || 'Failed to resend verification email', 'signup');
            }
        } catch (error) {
            console.error('Resend verification error:', error);
            this.showError('Network error. Please try again.', 'signup');
        }
    }

    initiateGoogleSignIn() {
        if (!this.googleInitialized || !this.googleClientId) {
            this.showError('Google Sign-In is not available. Please use email sign-in.');
            return;
        }

        if (typeof google === 'undefined') {
            this.showError('Google Sign-In API not loaded. Please refresh the page and try again.');
            return;
        }

        try {
            google.accounts.id.prompt();
        } catch (error) {
            console.error('Google Sign-In prompt error:', error);
            this.showError('Failed to open Google Sign-In. Please try again or use email sign-in.');
        }
    }

    async handleGoogleSignIn(response) {
        try {
            // Send Google credential to backend for verification
            const apiResponse = await fetch('/auth/google', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ credential: response.credential }),
                credentials: 'include'
            });

            const data = await apiResponse.json();
            
            if (!apiResponse.ok) {
                throw new Error(data.error || 'Google Sign-In failed');
            }

            this.setCurrentUser(data.user);
            this.showSuccess('Successfully signed in with Google! Redirecting...');
            
            setTimeout(() => {
                this.redirectToApp();
            }, 1500);

        } catch (error) {
            console.error('Google Sign-In error:', error);
            this.showError('Failed to sign in with Google. Please try again.');
        }
    }

    async callAuthAPI(email, password, type, name = null) {
        const endpoint = type === 'signin' ? '/auth/signin' : '/auth/signup';
        const body = type === 'signin' ? 
            { email, password } : 
            { email, password, name };

        const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
            credentials: 'include' // Important for session cookies
        });

        const data = await response.json();
        
        if (!response.ok) {
            const error = new Error(data.error || 'Authentication failed');
            if (data.verification_required) {
                error.verification_required = true;
            }
            throw error;
        }
        
        return data;
    }

    setCurrentUser(user) {
        this.currentUser = user;
        localStorage.setItem('nerdchat_user', JSON.stringify(user));
    }

    getCurrentUser() {
        return this.currentUser;
    }

    async signOut() {
        try {
            // Call backend sign-out endpoint
            await fetch('/auth/signout', {
                method: 'POST',
                credentials: 'include'
            });
        } catch (error) {
            console.error('Sign-out error:', error);
        } finally {
            // Clear local state regardless of API call result
            this.currentUser = null;
            localStorage.removeItem('nerdchat_user');
            
            // Sign out from Google if applicable
            if (this.googleInitialized && typeof google !== 'undefined') {
                google.accounts.id.disableAutoSelect();
            }
            
            // Redirect to auth page
            this.redirectToAuth();
        }
    }

    isAuthenticated() {
        return this.currentUser !== null;
    }

    redirectToAuth() {
        try {
            const authPage = document.getElementById('auth-page');
            const landingPage = document.getElementById('landing-page');
            const chatPage = document.getElementById('chat-page');
            const profilePage = document.getElementById('profile-page');
            const drawer = document.getElementById('mobile-drawer');
            const overlay = document.getElementById('drawer-overlay');

            // Hide app pages safely if present
            [landingPage, chatPage, profilePage].forEach(el => {
                if (el) {
                    el.style.display = 'none';
                    el.classList && el.classList.remove('show', 'fade-out');
                }
            });

            // Close any open drawer/overlay
            if (drawer) drawer.classList.remove('show');
            if (overlay) overlay.classList.remove('show');

            if (authPage) {
                authPage.style.display = 'flex';
                setTimeout(() => authPage.classList.add('show'), 50);
            } else {
                // as a safe fallback, reload to render auth
                window.location.reload();
            }
        } catch (e) {
            // last-resort fallback
            window.location.reload();
        }
    }

    redirectToApp() {
        const authPage = document.getElementById('auth-page');
        const landingPage = document.getElementById('landing-page');
        
        authPage.classList.add('fade-out');
        
        setTimeout(() => {
            authPage.style.display = 'none';
            authPage.classList.remove('show', 'fade-out');
            
            landingPage.style.display = 'block';
            setTimeout(() => {
                landingPage.classList.add('show');
                
                // Trigger app initialization after landing page is shown
                if (window.initializeAppAfterAuth) {
                    window.initializeAppAfterAuth(this.currentUser);
                }
            }, 50);
        }, 500);
    }
}