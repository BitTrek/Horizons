/**
 * Cart Integration for Mockup Builder
 * Handles adding personalized products to Shopify cart
 */

class MockupCart {
  constructor(mockupBuilder) {
    this.mockupBuilder = mockupBuilder;
    this.isProcessing = false;
    this.setupEventListeners();
  }

  setupEventListeners() {
    // Listen for form submissions
    document.addEventListener('submit', (e) => {
      if (this.isProductForm(e.target)) {
        e.preventDefault();
        this.handleAddToCart(e.target);
      }
    });

    // Backup: Listen for button clicks
    document.addEventListener('click', (e) => {
      const button = e.target.closest('button[name="add"], button[type="submit"], input[type="submit"]');
      if (button && this.isProductForm(button.closest('form'))) {
        e.preventDefault();
        e.stopPropagation();
        this.handleAddToCart(button.closest('form'));
      }
    });
  }

  isProductForm(form) {
    return form && form.action && form.action.includes('/cart/add');
  }

  async handleAddToCart(form) {
    if (this.isProcessing) return;
    
    try {
      this.isProcessing = true;
      this.showLoadingState();

      // Get form data
      const formData = new FormData(form);
      
      // Generate screenshot if design exists
      const screenshot = await this.generateScreenshot();
      if (screenshot) {
        formData.append('properties[Mockup Screenshot]', screenshot);
      }

      // Add design data if exists
      const designData = this.getDesignData();
      if (designData) {
        formData.append('properties[Design Data]', JSON.stringify(designData));
      }

      // Submit to cart
      const response = await this.submitToCart(formData);
      
      // Update cart drawer
      this.updateCartDrawer(response);
      
      this.showSuccessMessage();
      
    } catch (error) {
      console.error('Add to cart failed:', error);
      this.showErrorMessage('Failed to add product to cart. Please try again.');
    } finally {
      this.isProcessing = false;
      this.hideLoadingState();
    }
  }

  async generateScreenshot() {
    if (!this.mockupBuilder || !this.mockupBuilder.state.uploadedImage) {
      return null;
    }

    try {
      const screenshot = this.mockupBuilder.getScreenshot();
      if (!screenshot) return null;

      // Convert to blob
      const response = await fetch(screenshot);
      const blob = await response.blob();
      
      return blob;
    } catch (error) {
      console.error('Screenshot generation failed:', error);
      return null;
    }
  }

  getDesignData() {
    if (!this.mockupBuilder || !this.mockupBuilder.state.uploadedImage) {
      return null;
    }

    const image = this.mockupBuilder.state.uploadedImage;
    return {
      position: { x: image.x(), y: image.y() },
      scale: { x: image.scaleX(), y: image.scaleY() },
      rotation: image.rotation(),
      width: image.width(),
      height: image.height(),
      timestamp: Date.now()
    };
  }

  async submitToCart(formData) {
    const response = await fetch('/cart/add.js', {
      method: 'POST',
      body: formData
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  }

  updateCartDrawer(cartItem) {
    // Try to update cart drawer if it exists
    const cartDrawer = document.querySelector('cart-drawer');
    if (cartDrawer && cartDrawer.renderContents) {
      cartDrawer.renderContents({ key: cartItem.key });
    } else {
      // Fallback: reload page
      window.location.reload();
    }
  }

  showLoadingState() {
    const buttons = document.querySelectorAll('button[name="add"], button[type="submit"], input[type="submit"]');
    buttons.forEach(button => {
      button.disabled = true;
      button.textContent = 'Adding...';
    });
  }

  hideLoadingState() {
    const buttons = document.querySelectorAll('button[name="add"], button[type="submit"], input[type="submit"]');
    buttons.forEach(button => {
      button.disabled = false;
      button.textContent = 'Add to Cart';
    });
  }

  showSuccessMessage() {
    this.showNotification('Product added to cart successfully!', 'success');
  }

  showErrorMessage(message) {
    this.showNotification(message, 'error');
  }

  showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `mockup-notification mockup-notification--${type}`;
    notification.textContent = message;
    
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 12px 20px;
      border-radius: 6px;
      color: white;
      font-weight: 500;
      z-index: 10000;
      animation: slideIn 0.3s ease;
      max-width: 300px;
      word-wrap: break-word;
    `;

    // Set background color based on type
    const colors = {
      success: '#4CAF50',
      error: '#f44336',
      info: '#2196F3'
    };
    notification.style.background = colors[type] || colors.info;

    document.body.appendChild(notification);

    // Auto remove after 3 seconds
    setTimeout(() => {
      notification.style.animation = 'slideOut 0.3s ease';
      setTimeout(() => notification.remove(), 300);
    }, 3000);
  }
}

// Export for use in other modules
window.MockupCart = MockupCart; 