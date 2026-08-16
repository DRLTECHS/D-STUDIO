// Admin Dashboard JavaScript

(() => {
  const appConfig = window.__APP_CONFIG__ || {};

  // State
  let isLoggedIn = false;
  let adminPassword = 'admin123';
  let orders = [];
  let webhookLogs = [];
  let campaigns = [];
  let generatedContent = '';

  // DOM Elements
  const loginScreen = document.getElementById('loginScreen');
  const adminDashboard = document.getElementById('adminDashboard');
  const loginForm = document.getElementById('loginForm');
  const loginError = document.getElementById('loginError');
  const adminPasswordInput = document.getElementById('adminPassword');

  // Initialize
  document.addEventListener('DOMContentLoaded', () => {
    restoreSession();
    loadDemoData();
    setupEventListeners();
    updateClock();
    setInterval(updateClock, 1000);
  });

  // Session Management
  function saveSession() {
    const sessionToken = btoa(`admin:${Date.now()}`);
    localStorage.setItem('adminSessionToken', sessionToken);
    localStorage.setItem('adminSessionTime', Date.now());
  }

  function restoreSession() {
    const token = localStorage.getItem('adminSessionToken');
    const time = localStorage.getItem('adminSessionTime');
    
    // Session expires after 24 hours
    if (token && time && Date.now() - parseInt(time) < 86400000) {
      showDashboard();
    } else {
      showLoginScreen();
    }
  }

  // Authentication
  loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const password = adminPasswordInput.value.trim();
    
    if (password === adminPassword) {
      loginError.classList.remove('show');
      adminPasswordInput.value = '';
      saveSession();
      showDashboard();
      showToast('Login successful!', 'success');
    } else {
      loginError.textContent = 'Invalid password';
      loginError.classList.add('show');
      adminPasswordInput.focus();
    }
  });

  function showLoginScreen() {
    isLoggedIn = false;
    loginScreen.classList.add('active');
    adminDashboard.style.display = 'none';
    adminPasswordInput.focus();
  }

  function showDashboard() {
    isLoggedIn = true;
    loginScreen.classList.remove('active');
    adminDashboard.style.display = 'flex';
    loadDashboardData();
  }

  // Logout
  document.getElementById('logoutBtn').addEventListener('click', () => {
    if (confirm('Are you sure you want to logout?')) {
      localStorage.removeItem('adminSessionToken');
      localStorage.removeItem('adminSessionTime');
      showLoginScreen();
      showToast('Logged out successfully', 'success');
    }
  });

  // Tab Navigation
  document.querySelectorAll('.nav-link:not(#logoutBtn)').forEach(btn => {
    btn.addEventListener('click', () => {
      const tabName = btn.dataset.tab;
      
      // Update active nav
      document.querySelectorAll('.nav-link:not(#logoutBtn)').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      
      // Show tab content
      document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
      document.getElementById(tabName + 'Tab').classList.add('active');
      
      // Load tab data
      if (tabName === 'orders') loadOrders();
      else if (tabName === 'webhooks') loadWebhooks();
      else if (tabName === 'dashboard') loadDashboardData();
    });
  });

  // Dashboard
  function loadDashboardData() {
    updateStats();
    updateRecentActivity();
  }

  function updateStats() {
    const total = orders.length;
    const completed = orders.filter(o => o.status === 'completed').length;
    const pending = orders.filter(o => o.status === 'pending').length;
    const revenue = orders
      .filter(o => o.status === 'completed')
      .reduce((sum, o) => sum + (parseFloat(o.amount) || 0), 0)
      .toFixed(2);

    document.getElementById('totalOrders').textContent = total;
    document.getElementById('completedOrders').textContent = completed;
    document.getElementById('pendingOrders').textContent = pending;
    document.getElementById('totalRevenue').textContent = `₱${revenue}`;
  }

  function updateRecentActivity() {
    const activity = document.getElementById('recentActivity');
    const recent = orders.slice(-5).reverse();
    
    if (recent.length === 0) {
      activity.innerHTML = '<p class="loading">No activity yet</p>';
      return;
    }

    activity.innerHTML = recent.map(order => `
      <div class="activity-item">
        <strong>${order.orderId}</strong> - 
        ${order.amount} ${order.currency} - 
        <span class="status-badge status-${order.status}">${order.status.toUpperCase()}</span>
        <div class="webhook-timestamp">${new Date(order.timestamp).toLocaleString()}</div>
      </div>
    `).join('');
  }

  // Orders
  function loadOrders() {
    const table = document.getElementById('ordersTable');
    
    if (orders.length === 0) {
      table.innerHTML = '<p class="loading">No orders found</p>';
      return;
    }

    const rows = orders.map(order => `
      <tr>
        <td>${order.orderId}</td>
        <td>${order.customerName || '-'}</td>
        <td>${order.amount} ${order.currency}</td>
        <td><span class="status-badge status-${order.status}">${order.status.toUpperCase()}</span></td>
        <td>${new Date(order.timestamp).toLocaleDateString()}</td>
      </tr>
    `).join('');

    table.innerHTML = `
      <table class="orders-table">
        <thead>
          <tr>
            <th>Order ID</th>
            <th>Customer</th>
            <th>Amount</th>
            <th>Status</th>
            <th>Date</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    `;
  }

  // Webhooks
  function loadWebhooks() {
    const list = document.getElementById('webhooksList');
    
    if (webhookLogs.length === 0) {
      list.innerHTML = '<p class="loading">No webhook logs</p>';
      return;
    }

    list.innerHTML = webhookLogs.slice(-20).reverse().map(log => `
      <div class="webhook-item">
        <strong>${log.orderId}</strong>
        <span class="webhook-status ${log.success ? 'success' : 'error'}">
          ${log.success ? '✓ Success' : '✗ Error'}
        </span>
        <div class="webhook-timestamp">${new Date(log.timestamp).toLocaleString()}</div>
        ${log.status ? `<div style="color: #8b949e; margin-top: 4px;">Status: ${log.status}</div>` : ''}
      </div>
    `).join('');
  }

  document.getElementById('clearWebhooksBtn')?.addEventListener('click', () => {
    if (confirm('Clear all webhook logs?')) {
      webhookLogs = [];
      loadWebhooks();
      showToast('Webhook logs cleared', 'success');
    }
  });

  // Settings
  document.getElementById('passwordForm').addEventListener('submit', (e) => {
    e.preventDefault();
    
    const current = document.getElementById('currentPassword').value;
    const newPass = document.getElementById('newPassword').value;
    const confirm = document.getElementById('confirmPassword').value;

    if (current !== adminPassword) {
      showSettingMessage('passwordMessage', 'Current password is incorrect', 'error');
      return;
    }

    if (newPass.length < 6) {
      showSettingMessage('passwordMessage', 'Password must be at least 6 characters', 'error');
      return;
    }

    if (newPass !== confirm) {
      showSettingMessage('passwordMessage', 'Passwords do not match', 'error');
      return;
    }

    adminPassword = newPass;
    localStorage.setItem('adminPassword', btoa(newPass));
    document.getElementById('passwordForm').reset();
    showSettingMessage('passwordMessage', 'Password updated successfully!', 'success');
  });

  // API Key Display Toggle
  document.getElementById('toggleApiKeyBtn')?.addEventListener('click', function() {
    const display = document.getElementById('apiKeyDisplay');
    const hidden = display.classList.contains('masked');
    
    if (hidden) {
      display.textContent = appConfig.swiftpayApiKey || '••••••••••••••••';
      display.classList.remove('masked');
      this.textContent = 'Hide';
    } else {
      display.textContent = '••••••••••••••••';
      display.classList.add('masked');
      this.textContent = 'Reveal';
    }
  });

  document.getElementById('toggleApiSecretBtn')?.addEventListener('click', function() {
    const display = document.getElementById('apiSecretDisplay');
    const hidden = display.classList.contains('masked');
    
    if (hidden) {
      display.textContent = appConfig.swiftpayApiSecret || '••••••••••••••••';
      display.classList.remove('masked');
      this.textContent = 'Hide';
    } else {
      display.textContent = '••••••••••••••••';
      display.classList.add('masked');
      this.textContent = 'Reveal';
    }
  });

  function showSettingMessage(elementId, message, type) {
    const el = document.getElementById(elementId);
    el.textContent = message;
    el.className = `form-message ${type}`;
    setTimeout(() => el.className = 'form-message', 4000);
  }

  document.getElementById('clearSessionsBtn')?.addEventListener('click', () => {
    if (confirm('Clear all admin sessions? This will log out all connected admins.')) {
      localStorage.removeItem('adminSessionToken');
      localStorage.removeItem('adminSessionTime');
      showToast('All sessions cleared', 'success');
    }
  });

  document.getElementById('resetDataBtn')?.addEventListener('click', () => {
    if (confirm('Reset demo data? This cannot be undone.')) {
      orders = [];
      webhookLogs = [];
      localStorage.removeItem('adminOrders');
      localStorage.removeItem('adminWebhooks');
      loadDemoData();
      showToast('Demo data reset', 'success');
      loadDashboardData();
    }
  });

  // Copy Webhook URL
  document.getElementById('copyWebhookBtn')?.addEventListener('click', function() {
    const url = document.getElementById('webhookUrl').textContent;
    navigator.clipboard.writeText(url).then(() => {
      showToast('Webhook URL copied to clipboard!', 'success');
    });
  });

  // Demo Data
  function loadDemoData() {
    const stored = localStorage.getItem('adminOrders');
    const storedWebhooks = localStorage.getItem('adminWebhooks');
    
    if (stored) {
      orders = JSON.parse(stored);
    } else {
      orders = [
        { orderId: 'DRL-001', customerName: 'John Doe', amount: 5000, currency: 'PHP', status: 'completed', timestamp: Date.now() - 86400000 },
        { orderId: 'DRL-002', customerName: 'Jane Smith', amount: 3500, currency: 'PHP', status: 'pending', timestamp: Date.now() - 43200000 },
        { orderId: 'DRL-003', customerName: 'Bob Wilson', amount: 7200, currency: 'PHP', status: 'completed', timestamp: Date.now() - 7200000 },
        { orderId: 'DRL-004', customerName: 'Alice Brown', amount: 2100, currency: 'PHP', status: 'completed', timestamp: Date.now() - 3600000 },
      ];
      localStorage.setItem('adminOrders', JSON.stringify(orders));
    }

    if (storedWebhooks) {
      webhookLogs = JSON.parse(storedWebhooks);
    } else {
      webhookLogs = [
        { orderId: 'DRL-001', success: true, status: 'completed', timestamp: Date.now() - 86400000 },
        { orderId: 'DRL-002', success: true, status: 'pending', timestamp: Date.now() - 43200000 },
      ];
      localStorage.setItem('adminWebhooks', JSON.stringify(webhookLogs));
    }

    const storedCampaigns = localStorage.getItem('adminCampaigns');
    if (storedCampaigns) {
      campaigns = JSON.parse(storedCampaigns);
    }
  }

  // Event Listeners Setup
  function setupEventListeners() {
    // Order search and filter
    document.getElementById('orderSearch')?.addEventListener('input', filterOrders);
    document.getElementById('orderStatusFilter')?.addEventListener('change', filterOrders);
    
    // AI Content Generator
    document.getElementById('aiGeneratorForm')?.addEventListener('submit', generateAIContent);
    document.getElementById('generateBtn')?.addEventListener('click', generateAIContent);
    document.getElementById('regenerateBtn')?.addEventListener('click', regenerateContent);
    document.getElementById('copyContentBtn')?.addEventListener('click', copyContent);
    document.getElementById('editContentBtn')?.addEventListener('click', editContent);
    document.getElementById('publishBtn')?.addEventListener('click', publishContent);
    document.getElementById('campaignFilter')?.addEventListener('change', filterCampaigns);
  }

  function filterOrders() {
    const search = document.getElementById('orderSearch')?.value.toLowerCase() || '';
    const status = document.getElementById('orderStatusFilter')?.value || '';
    
    const filtered = orders.filter(order => {
      const matchSearch = order.orderId.toLowerCase().includes(search);
      const matchStatus = !status || order.status === status;
      return matchSearch && matchStatus;
    });

    const table = document.getElementById('ordersTable');
    if (filtered.length === 0) {
      table.innerHTML = '<p class="loading">No orders found</p>';
      return;
    }

    const rows = filtered.map(order => `
      <tr>
        <td>${order.orderId}</td>
        <td>${order.customerName || '-'}</td>
        <td>${order.amount} ${order.currency}</td>
        <td><span class="status-badge status-${order.status}">${order.status.toUpperCase()}</span></td>
        <td>${new Date(order.timestamp).toLocaleDateString()}</td>
      </tr>
    `).join('');

    table.innerHTML = `
      <table class="orders-table">
        <thead>
          <tr>
            <th>Order ID</th>
            <th>Customer</th>
            <th>Amount</th>
            <th>Status</th>
            <th>Date</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    `;
  }

  // AI Content Generator
  async function generateAIContent(e) {
    if (e) e.preventDefault();
    
    const platform = document.getElementById('aiPlatform').value;
    const contentType = document.getElementById('aiContentType').value;
    const productName = document.getElementById('aiProductName').value;
    const keywords = document.getElementById('aiKeywords').value;
    const tone = document.getElementById('aiTone').value;
    const targetAudience = document.getElementById('aiTargetAudience').value;
    const cta = document.getElementById('aiCTA').value;

    if (!platform || !contentType || !productName) {
      showToast('Please fill all required fields', 'error');
      return;
    }

    const btn = document.getElementById('generateBtn');
    const originalText = btn.textContent;
    btn.textContent = '⏳ Generating...';
    btn.disabled = true;

    try {
      // Generate content via API
      const response = await fetch('/api/admin/generate-content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          platform,
          contentType,
          productName,
          keywords,
          tone,
          targetAudience,
          cta
        })
      }).catch(() => null);

      if (!response || !response.ok) {
        throw new Error('Failed to generate content');
      }

      const data = await response.json();
      generatedContent = data.content;
      
      // Show output section
      document.getElementById('aiOutputSection').style.display = 'block';
      document.getElementById('aiGeneratedContent').value = generatedContent;
      
      showToast('✨ Content generated successfully!', 'success');
    } catch (error) {
      // Fallback: Use template-based generation
      generatedContent = generateContentLocally(platform, contentType, productName, keywords, tone, targetAudience, cta);
      document.getElementById('aiOutputSection').style.display = 'block';
      document.getElementById('aiGeneratedContent').value = generatedContent;
      showToast('Content generated locally', 'success');
    } finally {
      btn.textContent = originalText;
      btn.disabled = false;
    }
  }

  function generateContentLocally(platform, contentType, productName, keywords, tone, targetAudience, cta) {
    const templates = {
      product: [
        `🚀 Introducing ${productName}!\n\nTransform your ${targetAudience} experience with our cutting-edge solution. ${keywords}.\n\n✨ Features:\n• Innovative design\n• Secure & Reliable\n• Easy to use\n\n${cta ? `👉 ${cta}` : 'Learn more today!'}`,
        `Meet ${productName} - The ${tone === 'humorous' ? 'seriously awesome' : 'perfect'} solution for ${targetAudience}.\n\n${keywords}\n\nWhy choose us?\n✓ Trusted by thousands\n✓ ${tone === 'professional' ? '24/7 Support' : 'Always here for you'}\n✓ Best value guaranteed\n\n${cta || 'Get started now!'}`,
      ],
      promotion: [
        `⏰ Limited Time Offer! ⏰\n\n${productName} is now available at an unbeatable price!\n\n🎁 Exclusive benefits:\n${keywords}\n\n🔥 Don't miss out! ${cta || 'Grab yours today!'}\n\n*Offer valid until end of month*`,
        `🎉 Special Launch Promo!\n\nGet ${productName} and save BIG!\n\nWhy our customers love us:\n${keywords}\n\n💰 Best deal of the season\n${cta || 'Shop now'} and transform your business!`,
      ],
      announcement: [
        `📢 Big News! 📢\n\n${productName} is here!\n\nWe're excited to announce our newest ${tone === 'inspirational' ? 'game-changing' : 'innovative'} solution.\n\nKey highlights:\n${keywords}\n\nPerfect for: ${targetAudience}\n\n${cta || 'Learn more'}`,
        `🎊 Exciting Update! 🎊\n\nIntroducing ${productName} - designed specifically for ${targetAudience}.\n\nWhat's new:\n${keywords}\n\n${cta || 'Be part of the revolution!'}\n\n#Innovation #NewRelease`,
      ],
      testimonial: [
        `⭐⭐⭐⭐⭐\n\n"${productName} has been a game-changer for us!"\n\n${targetAudience} across the industry are loving these ${keywords}.\n\n✅ Results speak for themselves\n✅ Trusted by leading companies\n\n${cta || 'Join the satisfied customers today!'}`,
        `💬 Real Success Story\n\n"We couldn't imagine running our business without ${productName}"\n\n${keywords}\n\n- Trusted by ${targetAudience}\n- Proven results\n- Industry leader\n\n${cta || 'Start your success story'}`,
      ],
      educational: [
        `📚 Did You Know? 📚\n\nLearn how ${productName} can help your ${targetAudience}:\n\n1️⃣ ${keywords ? keywords.split(',')[0] : 'Enhanced efficiency'}\n2️⃣ Better outcomes\n3️⃣ Maximum productivity\n\n🎓 Master these skills with ${productName}\n\n${cta || 'Get your free guide'}`,
        `🧠 Knowledge is Power\n\nUnlock your potential with ${productName}!\n\nKey insights:\n${keywords}\n\nPerfect for ${targetAudience} who want to:\n✓ Grow faster\n✓ Work smarter\n✓ Achieve more\n\n${cta || 'Start learning today'}`,
      ],
      engagement: [
        `🤔 Quick Question for ${targetAudience}!\n\nWhich matters most to you?\n${keywords}\n\nTell us in the comments! We'd love to hear your thoughts about ${productName}.\n\n👇 Drop your answer below!\n\n${cta || 'Engage with us'}`,
        `💭 Let's Talk!\n\nWhat do you think about ${productName}?\n\nOur community of ${targetAudience} is growing and we want YOUR input.\n\n${keywords}\n\n${cta || 'Join the conversation'} 💬`,
      ]
    };

    const typeTemplates = templates[contentType] || templates.product;
    const content = typeTemplates[Math.floor(Math.random() * typeTemplates.length)];
    
    return content;
  }

  function regenerateContent() {
    const platform = document.getElementById('aiPlatform').value;
    const contentType = document.getElementById('aiContentType').value;
    const productName = document.getElementById('aiProductName').value;
    const keywords = document.getElementById('aiKeywords').value;
    const tone = document.getElementById('aiTone').value;
    const targetAudience = document.getElementById('aiTargetAudience').value;
    const cta = document.getElementById('aiCTA').value;

    if (!productName) {
      showToast('Please enter a product name first', 'error');
      return;
    }

    generatedContent = generateContentLocally(platform, contentType, productName, keywords, tone, targetAudience, cta);
    document.getElementById('aiGeneratedContent').value = generatedContent;
    showToast('✨ New version generated!', 'success');
  }

  function copyContent() {
    const content = document.getElementById('aiGeneratedContent').value;
    navigator.clipboard.writeText(content).then(() => {
      showToast('Content copied to clipboard!', 'success');
    }).catch(() => {
      showToast('Failed to copy', 'error');
    });
  }

  function editContent() {
    const textarea = document.getElementById('aiGeneratedContent');
    textarea.readOnly = !textarea.readOnly;
    const btn = document.getElementById('editContentBtn');
    btn.textContent = textarea.readOnly ? '✏️ Edit' : '✓ Done Editing';
  }

  async function publishContent(e) {
    if (e) e.preventDefault();
    
    const content = document.getElementById('aiGeneratedContent').value;
    const platform = document.getElementById('publishPlatform').value;
    const publishTime = document.getElementById('publishTime').value;
    const addHashtags = document.getElementById('addHashtags').checked;

    if (!content || !platform) {
      showToast('Please generate content and select a platform', 'error');
      return;
    }

    const btn = document.getElementById('publishBtn');
    const originalText = btn.textContent;
    btn.textContent = '📤 Publishing...';
    btn.disabled = true;

    try {
      const response = await fetch('/api/admin/publish-social', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content,
          platform,
          scheduledTime: publishTime || null,
          addHashtags
        })
      }).catch(() => null);

      if (!response || !response.ok) {
        throw new Error('Publish failed');
      }

      const data = await response.json();

      // Add to campaigns
      const campaign = {
        id: `campaign-${Date.now()}`,
        content: content.substring(0, 100) + '...',
        platform,
        status: publishTime ? 'scheduled' : 'published',
        timestamp: new Date(publishTime || Date.now()).toLocaleString(),
        published: new Date().toLocaleString()
      };
      
      campaigns.push(campaign);
      localStorage.setItem('adminCampaigns', JSON.stringify(campaigns));
      
      showToast(`✅ Content ${publishTime ? 'scheduled' : 'published'} to ${platform}!`, 'success');
      loadCampaigns();
      
      // Reset form
      setTimeout(() => {
        document.getElementById('aiGeneratorForm').reset();
        document.getElementById('aiOutputSection').style.display = 'none';
      }, 1500);
    } catch (error) {
      showToast('Publishing started (mock mode)', 'success');
      
      const campaign = {
        id: `campaign-${Date.now()}`,
        content: content.substring(0, 100) + '...',
        platform,
        status: publishTime ? 'scheduled' : 'published',
        timestamp: new Date(publishTime || Date.now()).toLocaleString(),
        published: new Date().toLocaleString()
      };
      
      campaigns.push(campaign);
      localStorage.setItem('adminCampaigns', JSON.stringify(campaigns));
      loadCampaigns();
    } finally {
      btn.textContent = originalText;
      btn.disabled = false;
    }
  }

  function loadCampaigns() {
    const stored = localStorage.getItem('adminCampaigns');
    if (stored) {
      campaigns = JSON.parse(stored);
    }
    displayCampaigns(campaigns);
  }

  function displayCampaigns(campaignList) {
    const list = document.getElementById('campaignsList');
    
    if (campaignList.length === 0) {
      list.innerHTML = '<p class="loading">No campaigns yet. Generate your first content!</p>';
      return;
    }

    list.innerHTML = campaignList.reverse().map(campaign => `
      <div class="campaign-item">
        <div class="campaign-info">
          <p class="campaign-title">${campaign.content}</p>
          <p class="campaign-meta">
            Platform: <strong>${campaign.platform.toUpperCase()}</strong> | 
            Status: <strong>${campaign.status.toUpperCase()}</strong> | 
            ${campaign.timestamp}
          </p>
        </div>
        <div class="campaign-actions">
          <button class="btn-sm" onclick="copyToClipboard('${campaign.content.replace(/'/g, "\\'")}')">📋 Copy</button>
          <button class="btn-sm" onclick="deleteCampaign('${campaign.id}')">🗑️ Delete</button>
        </div>
      </div>
    `).join('');
  }

  function filterCampaigns() {
    const filter = document.getElementById('campaignFilter').value;
    const filtered = campaigns.filter(c => !filter || c.status === filter);
    displayCampaigns(filtered);
  }

  window.copyToClipboard = function(text) {
    navigator.clipboard.writeText(text).then(() => {
      showToast('Copied!', 'success');
    });
  };

  window.deleteCampaign = function(id) {
    if (confirm('Delete this campaign?')) {
      campaigns = campaigns.filter(c => c.id !== id);
      localStorage.setItem('adminCampaigns', JSON.stringify(campaigns));
      loadCampaigns();
      showToast('Campaign deleted', 'success');
    }
  };

  // Clock
  function updateClock() {
    const now = new Date();
    const time = now.toLocaleString('en-PH', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    document.getElementById('currentTime').textContent = time;
  }

  // Toast Notifications
  function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.animation = 'slideOut 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  // Load system info on settings tab
  document.addEventListener('click', (e) => {
    if (e.target.dataset.tab === 'settings') {
      document.getElementById('envDisplay').textContent = appConfig.env || 'development';
      document.getElementById('baseUrlDisplay').textContent = appConfig.baseUrl || window.location.origin;
      document.getElementById('modeDisplay').textContent = appConfig.swiftpayMode ? `SwiftPay Mode: ${appConfig.swiftpayMode}` : 'SwiftPay Mode Configured';
    }
  });

  // ============ MEDIA GENERATION ============

  // State for media generation
  let generatedMedia = [];
  let currentGeneratedImage = null;
  let currentGeneratedVideo = null;

  // Load media library from localStorage
  function loadMediaLibrary() {
    const saved = localStorage.getItem('adminGeneratedMedia');
    generatedMedia = saved ? JSON.parse(saved) : [];
    displayMediaLibrary();
  }

  // Save media to localStorage
  function saveMediaLibrary() {
    localStorage.setItem('adminGeneratedMedia', JSON.stringify(generatedMedia));
  }

  // Display media library
  function displayMediaLibrary(filter = 'all') {
    const library = document.getElementById('mediaLibrary');
    
    let filteredMedia = generatedMedia;
    if (filter === 'images') {
      filteredMedia = generatedMedia.filter(m => m.type === 'image');
    } else if (filter === 'videos') {
      filteredMedia = generatedMedia.filter(m => m.type === 'video');
    }

    if (filteredMedia.length === 0) {
      library.innerHTML = '<p class="loading">No media generated yet. Create your first image or video!</p>';
      return;
    }

    library.innerHTML = filteredMedia.map(media => `
      <div class="media-item" title="${media.model}">
        ${media.type === 'image' ? 
          `<img src="${media.url}" alt="Generated ${media.type}">` : 
          `<video src="${media.url}" muted></video>`}
        <span class="media-item-badge">${media.type === 'image' ? '🖼️' : '🎬'}</span>
        <div class="media-item-overlay">
          <button onclick="downloadMedia('${media.id}')">📥</button>
          <button onclick="deleteMedia('${media.id}')">🗑️</button>
        </div>
      </div>
    `).join('');
  }

  // Image Generation
  document.getElementById('imageGeneratorForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const model = document.getElementById('imageModel').value;
    const imageType = document.getElementById('imageType').value;
    const style = document.getElementById('imageStyle').value;
    const prompt = document.getElementById('imagePrompt').value;
    const size = document.getElementById('imageSize').value;
    const quality = document.getElementById('imageQuality').value;

    if (!model || !imageType || !style || !prompt) {
      showToast('Please fill all required fields', 'error');
      return;
    }

    const btn = document.getElementById('generateImageBtn');
    btn.disabled = true;
    btn.classList.add('loading');
    showToast('🎨 Generating image...', 'info');

    try {
      // Call backend API
      const response = await fetch('/api/admin/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model, imageType, style, prompt, size, quality
        })
      });

      const data = await response.json();

      if (data.ok) {
        // For demo: use generated URL or placeholder
        const imageUrl = data.imageUrl || generatePlaceholderImage(imageType, style);
        
        currentGeneratedImage = {
          url: imageUrl,
          model,
          prompt,
          size,
          quality,
          timestamp: new Date().toLocaleString()
        };

        displayGeneratedImage(imageUrl);
        showToast('✅ Image generated successfully!', 'success');
      } else {
        throw new Error(data.error || 'Generation failed');
      }
    } catch (error) {
      console.error('Image generation error:', error);
      showToast('❌ Image generation failed: ' + error.message, 'error');
      // Still show placeholder for demo
      const placeholderUrl = generatePlaceholderImage(imageType, style);
      currentGeneratedImage = {
        url: placeholderUrl,
        model,
        prompt,
        size,
        quality,
        timestamp: new Date().toLocaleString(),
        isPlaceholder: true
      };
      displayGeneratedImage(placeholderUrl);
    } finally {
      btn.disabled = false;
      btn.classList.remove('loading');
    }
  });

  // Display generated image
  function displayGeneratedImage(imageUrl) {
    const previewSection = document.getElementById('imagePreviewSection');
    const generatedImage = document.getElementById('generatedImage');
    const imageMetadata = document.getElementById('imageMetadata');

    generatedImage.src = imageUrl;
    imageMetadata.textContent = `Model: ${currentGeneratedImage.model} | Size: ${currentGeneratedImage.size} | Quality: ${currentGeneratedImage.quality} | Generated: ${currentGeneratedImage.timestamp}`;
    previewSection.style.display = 'block';

    // Scroll to preview
    previewSection.scrollIntoView({ behavior: 'smooth' });
  }

  // Regenerate Image
  document.getElementById('regenerateImageBtn')?.addEventListener('click', async () => {
    if (!currentGeneratedImage) return;
    
    const prompt = document.getElementById('imagePrompt').value;
    const size = document.getElementById('imageSize').value;
    const style = document.getElementById('imageStyle').value;

    const btn = event.target;
    btn.disabled = true;
    showToast('🔄 Regenerating...', 'info');

    try {
      // Simulate regeneration (in reality would call API)
      await new Promise(resolve => setTimeout(resolve, 2000));
      const newUrl = generatePlaceholderImage(document.getElementById('imageType').value, style);
      
      currentGeneratedImage.url = newUrl;
      displayGeneratedImage(newUrl);
      showToast('✅ Image regenerated!', 'success');
    } catch (error) {
      showToast('❌ Regeneration failed', 'error');
    } finally {
      btn.disabled = false;
    }
  });

  // Download Image
  document.getElementById('downloadImageBtn')?.addEventListener('click', () => {
    if (!currentGeneratedImage) return;
    downloadFile(currentGeneratedImage.url, 'generated-image.png');
    showToast('📥 Downloading image...', 'success');
  });

  // Use Image in Post
  document.getElementById('useImageBtn')?.addEventListener('click', () => {
    if (!currentGeneratedImage) return;
    
    // Save to media library
    const mediaItem = {
      id: 'img-' + Date.now(),
      type: 'image',
      url: currentGeneratedImage.url,
      model: currentGeneratedImage.model,
      timestamp: new Date().toISOString(),
      size: currentGeneratedImage.size
    };

    generatedMedia.unshift(mediaItem);
    saveMediaLibrary();
    displayMediaLibrary();
    
    showToast('✅ Image added to media library!', 'success');
  });

  // Video Generation
  document.getElementById('videoGeneratorForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const model = document.getElementById('videoModel').value;
    const videoType = document.getElementById('videoType').value;
    const duration = document.getElementById('videoLength').value;
    const script = document.getElementById('videoScript').value;
    const style = document.getElementById('videoStyle').value;
    const voice = document.getElementById('videoVoice').value;
    const aspect = document.getElementById('videoAspect').value;
    const includeMusic = document.getElementById('videoIncludeMusic').checked;
    const includeSubtitles = document.getElementById('videoIncludeSubtitles').checked;

    if (!model || !videoType || !duration || !script) {
      showToast('Please fill all required fields', 'error');
      return;
    }

    const btn = document.getElementById('generateVideoBtn');
    btn.disabled = true;
    btn.classList.add('loading');
    showToast('🎬 Generating video (this may take a minute)...', 'info');

    try {
      const response = await fetch('/api/admin/generate-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model, videoType, duration, script, style, voice, aspect, includeMusic, includeSubtitles
        })
      });

      const data = await response.json();

      if (data.ok) {
        const videoUrl = data.videoUrl || generatePlaceholderVideo();
        
        currentGeneratedVideo = {
          url: videoUrl,
          model,
          script,
          duration,
          style,
          voice,
          aspect,
          timestamp: new Date().toLocaleString()
        };

        displayGeneratedVideo(videoUrl);
        showToast('✅ Video generated successfully!', 'success');
      } else {
        throw new Error(data.error || 'Generation failed');
      }
    } catch (error) {
      console.error('Video generation error:', error);
      showToast('❌ Video generation failed: ' + error.message, 'error');
      // Still show placeholder for demo
      const placeholderUrl = generatePlaceholderVideo();
      currentGeneratedVideo = {
        url: placeholderUrl,
        model,
        script,
        duration,
        style,
        voice,
        aspect,
        timestamp: new Date().toLocaleString(),
        isPlaceholder: true
      };
      displayGeneratedVideo(placeholderUrl);
    } finally {
      btn.disabled = false;
      btn.classList.remove('loading');
    }
  });

  // Display generated video
  function displayGeneratedVideo(videoUrl) {
    const previewSection = document.getElementById('videoPreviewSection');
    const generatedVideo = document.getElementById('generatedVideo');
    const videoMetadata = document.getElementById('videoMetadata');

    generatedVideo.src = videoUrl;
    videoMetadata.textContent = `Model: ${currentGeneratedVideo.model} | Duration: ${currentGeneratedVideo.duration}s | Style: ${currentGeneratedVideo.style} | Generated: ${currentGeneratedVideo.timestamp}`;
    previewSection.style.display = 'block';

    // Scroll to preview
    previewSection.scrollIntoView({ behavior: 'smooth' });
  }

  // Regenerate Video
  document.getElementById('regenerateVideoBtn')?.addEventListener('click', async () => {
    if (!currentGeneratedVideo) return;
    
    const btn = event.target;
    btn.disabled = true;
    showToast('🔄 Regenerating video...', 'info');

    try {
      await new Promise(resolve => setTimeout(resolve, 3000));
      const newUrl = generatePlaceholderVideo();
      
      currentGeneratedVideo.url = newUrl;
      displayGeneratedVideo(newUrl);
      showToast('✅ Video regenerated!', 'success');
    } catch (error) {
      showToast('❌ Regeneration failed', 'error');
    } finally {
      btn.disabled = false;
    }
  });

  // Download Video
  document.getElementById('downloadVideoBtn')?.addEventListener('click', () => {
    if (!currentGeneratedVideo) return;
    downloadFile(currentGeneratedVideo.url, 'generated-video.mp4');
    showToast('📥 Downloading video...', 'success');
  });

  // Use Video in Campaign
  document.getElementById('useVideoBtn')?.addEventListener('click', () => {
    if (!currentGeneratedVideo) return;
    
    const mediaItem = {
      id: 'vid-' + Date.now(),
      type: 'video',
      url: currentGeneratedVideo.url,
      model: currentGeneratedVideo.model,
      timestamp: new Date().toISOString(),
      duration: currentGeneratedVideo.duration
    };

    generatedMedia.unshift(mediaItem);
    saveMediaLibrary();
    displayMediaLibrary();
    
    showToast('✅ Video added to media library!', 'success');
  });

  // Media Library Tab Filtering
  document.querySelectorAll('.library-tab-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      document.querySelectorAll('.library-tab-btn').forEach(b => b.classList.remove('active'));
      e.target.classList.add('active');
      displayMediaLibrary(e.target.dataset.filter);
    });
  });

  // Global media functions
  window.downloadMedia = function(id) {
    const media = generatedMedia.find(m => m.id === id);
    if (media) {
      downloadFile(media.url, `${media.type}-${id}.${media.type === 'image' ? 'png' : 'mp4'}`);
      showToast('📥 Downloading...', 'success');
    }
  };

  window.deleteMedia = function(id) {
    if (confirm('Delete this media?')) {
      generatedMedia = generatedMedia.filter(m => m.id !== id);
      saveMediaLibrary();
      displayMediaLibrary();
      showToast('🗑️ Media deleted', 'success');
    }
  };

  // Helper: Generate placeholder image
  function generatePlaceholderImage(type, style) {
    // In production, replace with actual API URL
    // For demo, use a placeholder service
    const colors = ['0066cc', 'ff6600', '00cc66', 'ff0066', 'ffcc00'];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];
    return `https://via.placeholder.com/1024x1024/${randomColor}/ffffff?text=${type}+${style}`;
  }

  // Helper: Generate placeholder video
  function generatePlaceholderVideo() {
    // In production, replace with actual generated video
    // For demo, return a test pattern video
    return 'data:video/mp4;base64,AAAAIGZ0eXBpc29tAAACAGlzb21pc28yaXZ0YWJjdDEAAAAjdmlkZW9Db250YWluZXI=';
  }

  // Helper: Download file
  function downloadFile(url, filename) {
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  // Initialize media library on page load
  loadMediaLibrary();

})();
