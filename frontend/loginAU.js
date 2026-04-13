(function() {
  // API Base URL
  const API_URL = 'http://192.168.218.69:5005/api';

  // Always allow demo users as fallback
  const DEMO_USERS = [
    { email: "farmer@demo.com", password: "demo", role: "farmer" },
    { email: "urban@demo.com", password: "demo", role: "urban" },
    { email: "admin@demo.com", password: "demo", role: "admin" }
  ];

  // Authenticate user using backend API
  async function authenticateUser(email, password) {
    try {
      let user = null;

      // 1. Try Backend API
      console.log('Trying Backend API...');
      try {
        const response = await fetch(`${API_URL}/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password })
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
        console.error('API unreachable:', apiErr);
        // Don't throw here, let it fall through to demo check
      }

      // 2. If still not found, try Demo Credentials (Fallback)
      if (!user) {
        user = DEMO_USERS.find(u => u.email === email && u.password === password);
        if (user) console.warn('Using Demo Credentials');
      }

      // 3. Final Success Check
      if (user) {
        localStorage.setItem('user', JSON.stringify({
          ...user,
          loginTime: new Date().toISOString()
        }));
        return true;
      }

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
          
          if (typeof success === 'string') {
             errorMsg.textContent = success;
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
