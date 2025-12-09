(function() {
  // Check if we're in Electron environment
  const isElectron = window.desktopUtils && window.desktopUtils.isElectron;

  // Use database API if available, fallback to demo credentials for web
  let dbAPI = null;
  let DEMO_USERS = [];

  // Demo credentials are available in the console for development
  console.log('Demo Credentials:');
  console.log('Demo: demo@demo.com / demo');

  // Always allow demo users as fallback
  DEMO_USERS = [
    { email: "farmer@demo.com", password: "demo", role: "farmer" },
    { email: "urban@demo.com", password: "demo", role: "urban" },
    { email: "admin@demo.com", password: "demo", role: "admin" }
  ];

  if (isElectron && window.databaseAPI) {
    dbAPI = window.databaseAPI;
  }

  // API Base URL
  const API_URL = 'http://localhost:5000/api';

  // Authenticate user using backend API
  async function authenticateUser(email, password) {
    try {
      let user = null;

      // 1. Try Local Database (if available)
      if (dbAPI) {
        try {
          user = await dbAPI.authenticateUser(email, password);
          if (user) {
            console.log('Logged in via Local Database');
          }
        } catch (err) {
          console.warn('Local Database auth failed:', err);
        }
      }

      // 2. If not found in Local DB, try Backend API (ONLY IF LOCAL)
      const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      
      if (!user && isLocal) {
        console.log('User not found in local DB, trying Backend API...');
        try {
          const response = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
            signal: AbortSignal.timeout(3000) // Fast timeout for local
          });

          const data = await response.json();
          if (response.ok && data.success) {
            // The API returns 'user' object directly, not inside 'data'
            user = { ...data.user, token: data.token };
            console.log('Logged in via Backend API');
          } else {
            console.error('API Login failed:', data.error);
          }
        } catch (apiErr) {
          console.warn('API unreachable, falling back to demo:', apiErr);
          // Do NOT throw here, so we can fall through to Demo Users
        }
      } else if (!user) {
        console.log('Non-local environment or API skipped. Checking demo credentials...');
      }

      // 3. If still not found, try Demo Credentials (Fallback)
      if (!user) {
        user = DEMO_USERS.find(u => u.email === email && u.password === password);
        if (user) console.warn('Using Demo Credentials');
      }

      // 4. Final Success Check
      if (user) {
        localStorage.setItem('user', JSON.stringify({
          ...user,
          loginTime: new Date().toISOString()
        }));
        return true;
      }

      // If we reached here, and we tried API but it failed, we might want to return that error
      // But for now, if no user found, it's invalid credentials OR server issue.
      // Let's check if we had a server error.
      
      return false;

    } catch (error) {
      console.error('Authentication error:', error);
      return "Error connecting to server. Please ensure the backend is running.";
    }
  }

  // Handle login
  const loginForm = document.getElementById("login-form");
  if (loginForm) {
    loginForm.addEventListener("submit", async function (e) {
      e.preventDefault();

      const email = document.getElementById("login-email").value;
      const password = document.getElementById("login-password").value;

      // Show loading state
      const submitBtn = this.querySelector('button[type="submit"]');
      const originalContent = submitBtn.innerHTML;
      submitBtn.innerHTML = '<span>Signing in...</span><i class="ph-spinner ph-spin"></i>';
      submitBtn.disabled = true;

      try {
        const success = await authenticateUser(email, password);

        if (success === true) {
          // Success animation
          submitBtn.innerHTML = '<span>Success!</span><i class="ph-check"></i>';
          submitBtn.style.background = 'var(--success-gradient)';

          setTimeout(() => {
            window.location.href = "index.html";
          }, 1000);
        } else {
          // Error message
          const errorMsg = document.createElement('div');
          errorMsg.className = 'error-message';
          
          // Check if it was a connection error (success is false, but could be specific error string if we changed authenticateUser return type)
          // For now, let's just use a generic message or the one passed back if we refactor authenticateUser
          if (typeof success === 'string') {
             errorMsg.textContent = success; // Display specific error like "Server unreachable"
          } else {
             errorMsg.textContent = 'Invalid credentials. Please try again.';
          }

          // Remove existing error if any
          const existingError = this.querySelector('.error-message');
          if (existingError) existingError.remove();

          this.appendChild(errorMsg);

          // Reset form
          submitBtn.innerHTML = originalContent;
          submitBtn.disabled = false;

          setTimeout(() => {
            errorMsg.remove();
          }, 5000);
        }
      } catch (error) {
        console.error('Login error:', error);
        // Reset form
        submitBtn.innerHTML = originalContent;
        submitBtn.disabled = false;
      }
    });
  }

  // Auto-fill demo credentials
  window.fillDemoCredentials = function(role) {
    const emailInput = document.getElementById('login-email');
    const passInput = document.getElementById('login-password');
    let email = 'farmer@demo.com';

    if (role === 'urban') email = 'urban@demo.com';
    if (role === 'admin') email = 'admin@demo.com';
    
    if (emailInput && passInput) {
      emailInput.value = email;
      passInput.value = 'demo';

      // Visual feedback
      const demoBox = document.querySelector('.demo-content');
      if (demoBox) {
        demoBox.style.transform = 'scale(0.95)';
        setTimeout(() => {
          demoBox.style.transform = 'scale(1)';
        }, 100);
      }
    }
  };
})();
