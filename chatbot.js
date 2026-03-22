/**
 * Chatbot Widget JavaScript
 * Frontend logic for AgriUrban AI Chatbot
 */

class AgriUrbanChatbot {
  constructor() {
    this.apiBaseUrl = 'http://localhost:5000/api/chat';
    this.sessionId = this.getOrCreateSessionId();
    this.messages = [];
    this.isOpen = false;
    this.isTyping = false;

    // Check for auth token or logged-in user
    this.authToken = localStorage.getItem('authToken') || '';
    const user = localStorage.getItem('user');
    if (!this.authToken && user) {
      // User is logged in via Electron app, create a mock token
      try {
        const userData = JSON.parse(user);
        this.authToken = 'electron-user-' + (userData.id || userData._id || 'demo');
        this.currentUser = userData;
      } catch (e) {
        console.error('Error parsing user data:', e);
      }
    }

    this.init();
  }

  /**
   * Initialize chatbot
   */
  init() {
    this.createChatbotHTML();
    this.attachEventListeners();
    this.loadQuickReplies();

    // Show welcome message
    this.showWelcomeMessage();

    // Load chat history if session exists
    if (this.sessionId) {
      this.loadChatHistory();
    }
  }

  /**
   * Get or create session ID
   */
  getOrCreateSessionId() {
    let sessionId = sessionStorage.getItem('chatSessionId');
    if (!sessionId) {
      sessionId = this.generateUUID();
      sessionStorage.setItem('chatSessionId', sessionId);
    }
    return sessionId;
  }

  /**
   * Generate UUID for session
   */
  generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  /**
   * Create chatbot HTML structure
   */
  createChatbotHTML() {
    const chatbotHTML = `
      <div class="chatbot-container" id="chatbot-container">
        <!-- Toggle Button -->
        <button class="chatbot-toggle" id="chatbot-toggle" aria-label="Toggle Chatbot">
          <i class="ph ph-chats-circle"></i>
          <span class="chatbot-badge" id="chatbot-badge" style="display: none;">0</span>
        </button>

        <!-- Chatbot Window -->
        <div class="chatbot-window" id="chatbot-window">
          <!-- Header -->
          <div class="chatbot-header">
            <div class="chatbot-header-content">
              <div class="chatbot-avatar">🌾</div>
              <div class="chatbot-header-text">
                <h3>AgriUrban AI</h3>
                <p class="chatbot-status">
                  <span class="status-dot"></span>
                  <span>Online</span>
                </p>
              </div>
            </div>
            <button class="chatbot-close" id="chatbot-close" aria-label="Close Chatbot">
              <i class="ph ph-x"></i>
            </button>
          </div>

          <!-- Messages Area -->
          <div class="chatbot-messages" id="chatbot-messages">
            <!-- Messages will be inserted here -->
          </div>

          <!-- Quick Replies -->
          <div class="chatbot-quick-replies" id="chatbot-quick-replies">
            <!-- Quick reply buttons will be inserted here -->
          </div>

          <!-- Input Area -->
          <div class="chatbot-input-area">
            <textarea 
              class="chatbot-input" 
              id="chatbot-input" 
              placeholder="Ask about weather, irrigation, crops..."
              rows="1"
              maxlength="500"
            ></textarea>
            <button class="chatbot-send-btn" id="chatbot-send-btn" aria-label="Send Message">
              <i class="ph ph-paper-plane-tilt"></i>
            </button>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', chatbotHTML);
  }

  /**
   * Attach event listeners
   */
  attachEventListeners() {
    // Toggle button
    document.getElementById('chatbot-toggle').addEventListener('click', () => {
      this.toggleChatbot();
    });

    // Close button
    document.getElementById('chatbot-close').addEventListener('click', () => {
      this.closeChatbot();
    });

    // Send button
    document.getElementById('chatbot-send-btn').addEventListener('click', () => {
      this.sendMessage();
    });

    // Input field - Enter to send, Shift+Enter for new line
    const input = document.getElementById('chatbot-input');
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.sendMessage();
      }
    });

    // Auto-resize textarea
    input.addEventListener('input', () => {
      this.autoResizeTextarea(input);
    });
  }

  /**
   * Auto-resize textarea
   */
  autoResizeTextarea(textarea) {
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
  }

  /**
   * Toggle chatbot open/close
   */
  toggleChatbot() {
    this.isOpen = !this.isOpen;
    const window = document.getElementById('chatbot-window');
    const toggle = document.getElementById('chatbot-toggle');

    if (this.isOpen) {
      window.classList.add('active');
      toggle.classList.add('active');
      document.getElementById('chatbot-input').focus();
      this.clearBadge();
    } else {
      window.classList.remove('active');
      toggle.classList.remove('active');
    }
  }

  /**
   * Close chatbot
   */
  closeChatbot() {
    this.isOpen = false;
    document.getElementById('chatbot-window').classList.remove('active');
    document.getElementById('chatbot-toggle').classList.remove('active');
  }

  /**
   * Show welcome message
   */
  showWelcomeMessage() {
    const messagesContainer = document.getElementById('chatbot-messages');
    const userName = this.currentUser ? (this.currentUser.name || 'there') : 'there';
    const welcomeHTML = `
      <div class="chatbot-welcome">
        <div class="chatbot-welcome-icon">👋</div>
        <h4>Welcome${this.currentUser ? `, ${userName}` : ''}!</h4>
        <p>I'm here to help you with weather forecasts, irrigation advice, crop guidance, and more. How can I assist you today?</p>
      </div>
    `;
    messagesContainer.innerHTML = welcomeHTML;
  }

  /**
   * Add message to chat
   */
  addMessage(message, sender, timestamp = new Date()) {
    const messagesContainer = document.getElementById('chatbot-messages');

    // Remove welcome message if present
    const welcome = messagesContainer.querySelector('.chatbot-welcome');
    if (welcome) {
      welcome.remove();
    }

    const messageHTML = `
      <div class="chat-message ${sender}">
        <div class="message-avatar">
          ${sender === 'bot' ? '🌾' : '👤'}
        </div>
        <div class="message-content">
          <div class="message-bubble">${this.formatMessage(message)}</div>
          <div class="message-time">${this.formatTime(timestamp)}</div>
        </div>
      </div>
    `;

    messagesContainer.insertAdjacentHTML('beforeend', messageHTML);
    this.scrollToBottom();
  }

  /**
   * Format message text (handle line breaks, links, etc.)
   */
  formatMessage(message) {
    // Convert line breaks to <br>
    let formatted = message.replace(/\n/g, '<br>');

    // Convert URLs to links
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    formatted = formatted.replace(urlRegex, '<a href="$1" target="_blank">$1</a>');

    return formatted;
  }

  /**
   * Format timestamp
   */
  formatTime(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;

    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  }

  /**
   * Show typing indicator
   */
  showTypingIndicator() {
    if (this.isTyping) return;

    this.isTyping = true;
    const messagesContainer = document.getElementById('chatbot-messages');

    const typingHTML = `
      <div class="chat-message bot typing-indicator" id="typing-indicator">
        <div class="message-avatar">🌾</div>
        <div class="message-content">
          <div class="message-bubble">
            <div class="typing-dot"></div>
            <div class="typing-dot"></div>
            <div class="typing-dot"></div>
          </div>
        </div>
      </div>
    `;

    messagesContainer.insertAdjacentHTML('beforeend', typingHTML);
    this.scrollToBottom();
  }

  /**
   * Hide typing indicator
   */
  hideTypingIndicator() {
    this.isTyping = false;
    const indicator = document.getElementById('typing-indicator');
    if (indicator) {
      indicator.remove();
    }
  }

  /**
   * Scroll to bottom of messages
   */
  scrollToBottom() {
    const messagesContainer = document.getElementById('chatbot-messages');
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }

  /**
   * Send message
   */
  async sendMessage() {
    const input = document.getElementById('chatbot-input');
    const message = input.value.trim();

    if (!message) return;

    // Add user message to UI
    this.addMessage(message, 'user');

    // Clear input
    input.value = '';
    input.style.height = 'auto';

    // Disable send button
    const sendBtn = document.getElementById('chatbot-send-btn');
    sendBtn.disabled = true;

    // Show typing indicator
    this.showTypingIndicator();

    try {
      // Gemini API Integration
      const GEMINI_API_KEY = 'AIzaSyA5BuCNj1fgJNnwryjjLUKxjIluCzSrbnc';

      // List of models to try in order of preference
      const models = [
        'gemini-2.5-flash',      // User requested
        'gemini-2.0-flash-exp',  // Likely alternative
        'gemini-1.5-flash',      // Standard
        'gemini-1.5-flash-latest',
        'gemini-pro'             // Fallback
      ];

      // Context for the AI
      const systemContext = `You are AgriUrban AI, an intelligent agricultural assistant. 
      You help farmers and urban planners with weather forecasts, irrigation advice, crop guidance, and pest control. 
      Current context: The user is asking about "${message}". 
      Provide helpful, concise, and accurate advice. Format your response nicely.`;

      let response;
      let data;
      let success = false;
      let lastError = null;

      // Try models sequentially until one works
      for (const model of models) {
        try {
          console.log(`Attempting to connect to Gemini model: ${model}`);
          const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

          response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              contents: [{
                parts: [{
                  text: `${systemContext}\n\nUser Question: ${message}\nAnswer:`
                }]
              }]
            })
          });

          data = await response.json();

          if (response.ok) {
            console.log(`Successfully connected to ${model}`);
            success = true;
            break; // Exit loop on success
          } else {
            console.warn(`Model ${model} failed:`, data.error?.message);
            lastError = data.error?.message || response.statusText;
          }
        } catch (e) {
          console.warn(`Model ${model} network error:`, e);
          lastError = e.message;
        }
      }

      if (!success) {
        throw new Error(`All AI models failed. Last error: ${lastError}`);
      }

      // Hide typing indicator
      this.hideTypingIndicator();

      // Extract text from Gemini response
      let botResponse = "I'm sorry, I couldn't generate a response.";
      if (data.candidates && data.candidates.length > 0 &&
        data.candidates[0].content &&
        data.candidates[0].content.parts &&
        data.candidates[0].content.parts.length > 0) {
        botResponse = data.candidates[0].content.parts[0].text;
      }

      // Add bot response to UI
      this.addMessage(botResponse, 'bot');

    } catch (error) {
      console.error('Send message error:', error);
      this.hideTypingIndicator();
      this.showError(`Connection Failed: ${error.message}`);
    } finally {
      sendBtn.disabled = false;
    }
  }

  /**
   * Load chat history
   */
  async loadChatHistory() {
    if (!this.authToken || !this.sessionId) return;

    try {
      const response = await fetch(`${this.apiBaseUrl}/history/${this.sessionId}`, {
        headers: {
          'Authorization': `Bearer ${this.authToken}`
        }
      });

      const data = await response.json();

      if (response.ok && data.data && data.data.length > 0) {
        // Clear welcome message
        const messagesContainer = document.getElementById('chatbot-messages');
        messagesContainer.innerHTML = '';

        // Add messages
        data.data.forEach(msg => {
          this.addMessage(msg.message, msg.sender, msg.timestamp);
        });
      }

    } catch (error) {
      console.error('Load history error:', error);
    }
  }

  /**
   * Load quick reply suggestions
   */
  async loadQuickReplies() {
    const quickRepliesContainer = document.getElementById('chatbot-quick-replies');

    // Default quick replies
    const defaultReplies = [
      { id: 1, text: "Weather forecast", icon: "☀️" },
      { id: 2, text: "Irrigation advice", icon: "💧" },
      { id: 3, text: "Fertilizer tips", icon: "🌱" },
      { id: 4, text: "Pest control", icon: "🐛" },
      { id: 5, text: "Crop guidance", icon: "🌾" }
    ];

    let replies = defaultReplies;

    // Try to fetch personalized suggestions if authenticated
    if (this.authToken) {
      try {
        const response = await fetch(`${this.apiBaseUrl}/suggestions`, {
          headers: {
            'Authorization': `Bearer ${this.authToken}`
          }
        });

        const data = await response.json();
        if (response.ok && data.data) {
          replies = data.data;
        }
      } catch (error) {
        console.error('Load suggestions error:', error);
      }
    }

    // Render quick replies
    quickRepliesContainer.innerHTML = replies.map(reply => `
      <button class="quick-reply-btn" data-text="${reply.text}">
        <span>${reply.icon || '💬'}</span>
        <span>${reply.text}</span>
      </button>
    `).join('');

    // Attach click handlers
    quickRepliesContainer.querySelectorAll('.quick-reply-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const text = btn.getAttribute('data-text');
        document.getElementById('chatbot-input').value = text;
        this.sendMessage();
      });
    });
  }

  /**
   * Show error message
   */
  showError(message) {
    const messagesContainer = document.getElementById('chatbot-messages');
    const errorHTML = `
      <div class="chatbot-error">
        <i class="ph ph-warning-circle"></i>
        <span>${message}</span>
      </div>
    `;
    messagesContainer.insertAdjacentHTML('beforeend', errorHTML);
    this.scrollToBottom();

    // Remove error after 5 seconds
    setTimeout(() => {
      const error = messagesContainer.querySelector('.chatbot-error');
      if (error) error.remove();
    }, 5000);
  }

  /**
   * Show notification badge
   */
  showBadge(count = 1) {
    const badge = document.getElementById('chatbot-badge');
    if (badge) {
      badge.textContent = count;
      badge.style.display = 'flex';
    }
  }

  /**
   * Clear notification badge
   */
  clearBadge() {
    const badge = document.getElementById('chatbot-badge');
    if (badge) {
      badge.style.display = 'none';
      badge.textContent = '0';
    }
  }

  /**
   * Receive proactive alert
   */
  receiveAlert(alertMessage) {
    // Add alert message
    this.addMessage(alertMessage, 'bot');

    // Show badge if chatbot is closed
    if (!this.isOpen) {
      const currentBadge = parseInt(document.getElementById('chatbot-badge').textContent || '0');
      this.showBadge(currentBadge + 1);
    }

    // Show browser notification if permitted
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('AgriUrban AI Alert', {
        body: alertMessage,
        icon: '🌾',
        badge: '⚠️'
      });
    }
  }

  /**
   * Update auth token
   */
  setAuthToken(token) {
    this.authToken = token;
    localStorage.setItem('authToken', token);
  }

  /**
   * Start new session
   */
  startNewSession() {
    this.sessionId = this.generateUUID();
    sessionStorage.setItem('chatSessionId', this.sessionId);
    this.showWelcomeMessage();
  }
}

// Initialize chatbot when DOM is ready
let agriUrbanChatbot;

document.addEventListener('DOMContentLoaded', () => {
  // Wait a bit for auth to be set
  setTimeout(() => {
    agriUrbanChatbot = new AgriUrbanChatbot();

    // Make it globally accessible
    window.agriUrbanChatbot = agriUrbanChatbot;

    // Request notification permission
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, 1000);
});

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = AgriUrbanChatbot;
}
