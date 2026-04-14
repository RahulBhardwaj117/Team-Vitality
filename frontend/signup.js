(function() {
  // Check if we're in Electron environment
  const isElectron = window.desktopUtils && window.desktopUtils.isElectron;

  // Use database API if available, fallback to demo credentials for web
  let dbAPI = null;

  if (isElectron && window.databaseAPI) {
    dbAPI = window.databaseAPI;
  }

  // API Base URL
  const API_URL = 'http://localhost:5005/api';

  // Signup functionality
  const signupForm = document.getElementById("signup-form");
  if (signupForm) {
    signupForm.addEventListener("submit", async function (e) {
      e.preventDefault();

      const data = {
        fullname: document.getElementById("signup-fullname").value,
        email: document.getElementById("signup-email").value,
        password: document.getElementById("signup-password").value,
        confirmPassword: document.getElementById("signup-confirm").value,
        role: document.getElementById("signup-role").value,
        phone: document.getElementById("signup-phone").value || '',
        crop_type: document.getElementById("signup-crop-type")?.value || '',
        land_area: document.getElementById("signup-land-area")?.value || ''
      };

      // Client-side validation
      if (data.password !== data.confirmPassword) {
        showError('Passwords do not match!');
        return;
      }

      if (data.password.length < 6) {
        showError('Password must be at least 6 characters!');
        return;
      }

      if (!['farmer', 'city_planner', 'urban', 'admin'].includes(data.role)) {
        showError('Please select a valid role!');
        return;
      }

      // Additional validation for farmers
      if (data.role === 'farmer' && (!data.crop_type || !data.land_area)) {
        showError('For farmers, crop type and land area are required!');
        return;
      }

      // Show loading state
      const submitBtn = this.querySelector('button[type="submit"]');
      const originalText = submitBtn.textContent;
      submitBtn.textContent = 'Creating your account...';
      submitBtn.disabled = true;

      try {
        let success = false;
        let errorMessage = '';

        // Try desktop database API first
        if (dbAPI) {
          console.log('Creating account using database API...');
          const userData = {
            email: data.email,
            password: data.password,
            role: data.role,
            name: data.fullname,
            crop_type: data.role === 'farmer' ? data.crop_type : null,
            land_area: data.role === 'farmer' ? data.land_area : null
          };

          try {
            const user = await dbAPI.createUser(userData);
            if (user) {
              // Store user session for automatic login
              localStorage.setItem('user', JSON.stringify({
                ...user,
                crop: data.crop_type,  // Store farming details for dashboard
                landArea: data.land_area,
                loginTime: new Date().toISOString()
              }));
              success = true;
              console.log('Account created successfully');
            } else {
              // If dbAPI returns null/false without throwing, we might want to try API or show error
              console.warn('Database API returned null, trying HTTP API...');
              throw new Error('Database creation failed');
            }
          } catch (error) {
            console.error('Database API error, falling back to HTTP API:', error);
            // Fallback to HTTP API is handled below by checking !success
          }
        }

        // If database API failed or wasn't available, try HTTP API
        if (!success) {
          console.log('Creating account using HTTP API...');
          const apiData = {
            fullname: data.fullname, // server.js expects 'fullname'
            email: data.email,
            password: data.password,
            role: data.role,
            phone: data.phone,
            crop_type: data.role === 'farmer' ? data.crop_type : null,
            land_area: data.role === 'farmer' ? data.land_area : null
          };

          try {
            const response = await fetch(`${API_URL}/auth/signup`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify(apiData)
            });

            const result = await response.json();

            if (response.ok && result.success) {
              // Store user session for automatic login after signup
              // The API returns 'user' object directly, not inside 'data'
              localStorage.setItem('user', JSON.stringify({
                ...result.user,
                token: result.token,
                crop: data.crop_type,  // Store farming details for dashboard
                landArea: data.land_area,
                loginTime: new Date().toISOString()
              }));
              success = true;
              console.log('Account created via API');
            } else {
              errorMessage = result.error || 'Signup failed';
            }
          } catch (error) {
            console.error('API error:', error);
            // Fallback: Create demo user session for testing
            console.warn('API unavailable, creating demo user session');
            localStorage.setItem('user', JSON.stringify({
              email: data.email,
              role: data.role,
              name: data.fullname,
              crop: data.crop_type,
              landArea: data.land_area,
              loginTime: new Date().toISOString()
            }));
            success = true;
          }
        }

        if (success) {
          // Success animation
          this.innerHTML = '<div class="success-message">✅ Account created successfully! <br>Redirecting to dashboard...</div>';
          setTimeout(() => {
            window.location.href = "index.html";
          }, 2000);
        } else {
          showError(errorMessage);
          // Reset form
          submitBtn.textContent = originalText;
          submitBtn.disabled = false;
        }

      } catch (error) {
        console.error('Signup error:', error);
        showError('An unexpected error occurred. Please try again.');
        // Reset form
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
      }
    });
  }

  // Handle role change to show/hide farmer fields
  const roleSelect = document.getElementById('signup-role');
  if (roleSelect) {
    roleSelect.addEventListener('change', function() {
      const role = this.value;
      const farmerFields = document.getElementById('farmer-fields');

      if (role === 'farmer') {
        farmerFields.style.display = 'block';
        // Make farmer fields required
        document.getElementById('signup-crop-type').required = true;
        document.getElementById('signup-land-area').required = true;
      } else {
        farmerFields.style.display = 'none';
        // Make farmer fields optional for other roles
        document.getElementById('signup-crop-type').required = false;
        document.getElementById('signup-land-area').required = false;
      }
    });
  }

  // Error display function
  function showError(message) {
    const errorDiv = document.getElementById('signup-errors');
    if (errorDiv) {
      errorDiv.textContent = message;
      errorDiv.style.display = 'block';
      setTimeout(() => {
        errorDiv.style.display = 'none';
      }, 5000);
    }
  }
})();
