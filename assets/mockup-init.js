/**
 * Mockup Builder Initialization
 * Main entry point for the mockup builder system
 */

(function() {
  'use strict';

  // Configuration
  const CONFIG = {
    selectors: {
      container: '#mockup-builder',
      uploadInput: '#upload-input',
      productForm: 'form[action*="/cart/add"]',
      addToCartButton: 'button[name="add"], button[type="submit"], input[type="submit"]'
    },
    options: {
      width: 700,
      height: 700,
      maxUploadSize: 5 * 1024 * 1024, // 5MB
      allowedTypes: ['image/jpeg', 'image/png', 'image/webp']
    }
  };

  // Global instances
  let mockupBuilder = null;
  let mockupCart = null;

  // Initialize when DOM is ready
  function init() {
    console.log('=== MOCKUP BUILDER INITIALIZATION ===');
    console.log('Initializing Mockup Builder...');
    console.log('Template:', document.body.getAttribute('data-template'));
    console.log('Body classes:', document.body.className);
    console.log('Product data:', window.productData);
    console.log('Mockup builder container:', document.getElementById('mockup-builder'));
    
    // Check if we're on a product page with personalization
    if (!isPersonalizationPage()) {
      console.log('Not a personalization page, skipping initialization');
      return;
    }

    // Load required assets
    loadAssets()
      .then(() => {
        // Create mockup builder
        mockupBuilder = new MockupBuilder(CONFIG.selectors.container, CONFIG.options);
        
        // Create cart integration
        mockupCart = new MockupCart(mockupBuilder);
        
        // Setup UI enhancements
        setupUI();
        
        console.log('Mockup Builder initialized successfully');
      })
      .catch(error => {
        console.error('Failed to initialize Mockup Builder:', error);
        showErrorMessage('Failed to load mockup builder. Please refresh the page.');
      });
  }

  // Check if current page supports personalization
  function isPersonalizationPage() {
    // Always return true - mockup builder works on any page
    return true;
  }

  // Load required CSS and JS assets
  function loadAssets() {
    const promises = [];
    
    // Get asset URLs from window object (set by Liquid template)
    const assetUrls = window.mockupAssetUrls || {};
    
    console.log('Asset URLs from Liquid:', assetUrls);
    
    // Load CSS if not already loaded
    if (!document.querySelector('link[href*="mockup-builder.css"]')) {
      const cssUrl = assetUrls.css || '/assets/mockup-builder.css';
      console.log('Loading CSS from:', cssUrl);
      promises.push(loadCSS(cssUrl));
    }
    
    // Load JS modules if not already loaded
    if (!window.MockupBuilder) {
      const builderUrl = assetUrls.builder || '/assets/mockup-builder.js';
      console.log('Loading Builder JS from:', builderUrl);
      promises.push(loadJS(builderUrl));
    }
    
    if (!window.MockupCart) {
      const cartUrl = assetUrls.cart || '/assets/mockup-cart.js';
      console.log('Loading Cart JS from:', cartUrl);
      promises.push(loadJS(cartUrl));
    }
    
    return Promise.all(promises);
  }

  // Load CSS file
  function loadCSS(href) {
    return new Promise((resolve, reject) => {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = href;
      link.onload = resolve;
      link.onerror = reject;
      document.head.appendChild(link);
    });
  }

  // Load JS file
  function loadJS(src) {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = src;
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  // Setup UI enhancements
  function setupUI() {
    // Add loading states
    addLoadingStates();
    
    // Add file validation feedback
    addFileValidation();
    
    // Add keyboard shortcuts
    addKeyboardShortcuts();
    
    // Add touch gestures
    addTouchGestures();
  }

  // Add loading states to buttons
  function addLoadingStates() {
    const buttons = document.querySelectorAll(CONFIG.selectors.addToCartButton);
    buttons.forEach(button => {
      button.addEventListener('click', function() {
        if (this.form && this.form.action.includes('/cart/add')) {
          this.disabled = true;
          this.textContent = 'Adding...';
          
          // Re-enable after a timeout (fallback)
          setTimeout(() => {
            this.disabled = false;
            this.textContent = 'Add to Cart';
          }, 10000);
        }
      });
    });
  }

  // Add file validation feedback
  function addFileValidation() {
    const uploadInput = document.getElementById(CONFIG.selectors.uploadInput);
    if (!uploadInput) return;

    uploadInput.addEventListener('change', function(e) {
      const file = e.target.files[0];
      if (!file) return;

      const info = document.createElement('div');
      info.className = 'mockup-builder__file-info';
      
      const isValid = validateFile(file);
      if (isValid) {
        info.classList.add('mockup-builder__file-info--valid');
        info.textContent = `✓ ${file.name} (${formatFileSize(file.size)})`;
      } else {
        info.classList.add('mockup-builder__file-info--invalid');
        info.textContent = `✗ Invalid file. Please upload JPEG, PNG, or WebP under 5MB.`;
      }

      // Remove existing info
      const existingInfo = uploadInput.parentNode.querySelector('.mockup-builder__file-info');
      if (existingInfo) {
        existingInfo.remove();
      }

      uploadInput.parentNode.appendChild(info);
    });
  }

  // Validate uploaded file
  function validateFile(file) {
    const validTypes = CONFIG.options.allowedTypes;
    const maxSize = CONFIG.options.maxUploadSize;
    
    return validTypes.includes(file.type) && file.size <= maxSize;
  }

  // Format file size for display
  function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // Add keyboard shortcuts
  function addKeyboardShortcuts() {
    document.addEventListener('keydown', function(e) {
      // Ctrl/Cmd + Enter to add to cart
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        const addToCartButton = document.querySelector(CONFIG.selectors.addToCartButton);
        if (addToCartButton) {
          e.preventDefault();
          addToCartButton.click();
        }
      }
      
      // Escape to clear selection
      if (e.key === 'Escape') {
        if (mockupBuilder && mockupBuilder.stage) {
          mockupBuilder.stage.find('Transformer').forEach(t => t.nodes([]));
          mockupBuilder.stage.draw();
        }
      }
    });
  }

  // Add touch gestures for mobile
  function addTouchGestures() {
    if (!mockupBuilder || !mockupBuilder.stage) return;

    let startDistance = 0;
    let startScale = 1;

    mockupBuilder.stage.on('touchstart', function(e) {
      if (e.evt.touches.length === 2) {
        const touch1 = e.evt.touches[0];
        const touch2 = e.evt.touches[1];
        startDistance = Math.sqrt(
          Math.pow(touch2.clientX - touch1.clientX, 2) +
          Math.pow(touch2.clientY - touch1.clientY, 2)
        );
        
        const selectedNode = mockupBuilder.stage.findOne('Transformer').nodes()[0];
        if (selectedNode) {
          startScale = selectedNode.scaleX();
        }
      }
    });

    mockupBuilder.stage.on('touchmove', function(e) {
      if (e.evt.touches.length === 2) {
        const touch1 = e.evt.touches[0];
        const touch2 = e.evt.touches[1];
        const currentDistance = Math.sqrt(
          Math.pow(touch2.clientX - touch1.clientX, 2) +
          Math.pow(touch2.clientY - touch1.clientY, 2)
        );
        
        const scale = currentDistance / startDistance;
        const selectedNode = mockupBuilder.stage.findOne('Transformer').nodes()[0];
        if (selectedNode) {
          selectedNode.scaleX(startScale * scale);
          selectedNode.scaleY(startScale * scale);
          mockupBuilder.stage.draw();
        }
      }
    });
  }

  // Show error message
  function showErrorMessage(message) {
    const notification = document.createElement('div');
    notification.className = 'mockup-notification mockup-notification--error';
    notification.textContent = message;
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #f44336;
      color: white;
      padding: 12px 20px;
      border-radius: 6px;
      z-index: 10000;
      animation: slideIn 0.3s ease;
    `;

    document.body.appendChild(notification);

    setTimeout(() => {
      notification.remove();
    }, 5000);
  }

  // Public API
  window.MockupBuilderAPI = {
    getInstance: () => mockupBuilder,
    getCart: () => mockupCart,
    destroy: () => {
      if (mockupBuilder) {
        mockupBuilder.destroy();
        mockupBuilder = null;
      }
      mockupCart = null;
    }
  };

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})(); 