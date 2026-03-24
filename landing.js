/* Auto-extracted inline scripts from index.html */

if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/service-worker.js')
          .then(registration => {
            console.log('ServiceWorker registration successful with scope: ', registration.scope);
          }, err => {
            console.log('ServiceWorker registration failed: ', err);
          });
      });
    }

// Navigation functions
    function showLogin() {
      document.getElementById('landing-page').classList.add('hidden');
      document.getElementById('login-section').classList.add('active');
      document.getElementById('dashboard-section').classList.remove('active');
    }

    function gotoLogin() {
      window.location.href = "loginAU.html";
    }

    function showDemo() {
      // Auto-login with demo credentials
      localStorage.setItem('user', JSON.stringify({
        email: "demo@demo.com",
        role: "farmer",
        loginTime: new Date().toISOString()
      }));
      showDashboard();
    }

    function showDashboard() {
      document.getElementById('landing-page').classList.add('hidden');
      document.getElementById('login-section').classList.remove('active');
      document.getElementById('dashboard-section').classList.add('active');

      // Initialize dashboard
      if (typeof initializeDashboard === 'function') {
        initializeDashboard();
      }

    }

    function logout() {
      localStorage.removeItem('user');
      document.getElementById('landing-page').classList.remove('hidden');
      document.getElementById('login-section').classList.remove('active');
      document.getElementById('dashboard-section').classList.remove('active');
    }

    // Check if user is already logged in and handle hash navigation
    document.addEventListener('DOMContentLoaded', function () {
      const user = localStorage.getItem('user');
      if (user) {
        showDashboard();

        // Handle initial hash navigation
        const hash = window.location.hash.substring(1);
        if (hash && hash !== 'dashboard') {
          setTimeout(() => {
            switchSection(hash);
          }, 100);
        }
      } else {
        // Show landing page by default - users click "Get Started" to access login
        showLanding();
      }
    });

    // Function to show landing page
    function showLanding() {
      document.getElementById('landing-page').classList.remove('hidden');
      document.getElementById('login-section').classList.remove('active');
      document.getElementById('dashboard-section').classList.remove('active');
    }

