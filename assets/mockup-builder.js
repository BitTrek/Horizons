/**
 * Modern Mockup Builder for Shopify Horizons Theme
 * Built with ES6 modules, proper state management, and robust error handling
 */

// State management
class MockupState {
  constructor() {
    this.canvas = null;
    this.productImage = null;
    this.uploadedImage = null;
    this.isLoading = false;
    this.error = null;
    this.listeners = new Set();
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  notify() {
    this.listeners.forEach(listener => listener(this));
  }

  setState(updates) {
    Object.assign(this, updates);
    this.notify();
  }
}

// Main Mockup Builder Class
class MockupBuilder {
  constructor(containerId, options = {}) {
    this.containerId = containerId;
    this.options = {
      width: 700,
      height: 700,
      maxUploadSize: 5 * 1024 * 1024, // 5MB
      allowedTypes: ['image/jpeg', 'image/png', 'image/webp'],
      ...options
    };
    
    this.state = new MockupState();
    this.stage = null;
    this.productLayer = null;
    this.designLayer = null;
    this.isInitialized = false;
    
    this.init();
  }

  async init() {
    try {
      this.state.setState({ isLoading: true, error: null });
      
      // Load Konva.js dynamically
      await this.loadKonva();
      
      // Initialize canvas
      this.initializeCanvas();
      
      // Load initial product image
      await this.loadProductImage();
      
      // Setup event listeners
      this.setupEventListeners();
      
      this.isInitialized = true;
      this.state.setState({ isLoading: false });
      
      console.log('Mockup Builder initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Mockup Builder:', error);
      this.state.setState({ 
        isLoading: false, 
        error: 'Failed to initialize mockup builder' 
      });
    }
  }

  async loadKonva() {
    if (window.Konva) return;
    
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://unpkg.com/konva@9/konva.min.js';
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  initializeCanvas() {
    // Handle both ID and CSS selector
    const containerId = this.containerId.replace('#', '');
    const container = document.getElementById(containerId);
    if (!container) {
      throw new Error(`Container with id "${containerId}" not found`);
    }

    // Create stage
    this.stage = new Konva.Stage({
      container: containerId,
      width: this.options.width,
      height: this.options.height
    });

    // Create layers
    this.productLayer = new Konva.Layer();
    this.designLayer = new Konva.Layer();
    
    this.stage.add(this.productLayer);
    this.stage.add(this.designLayer);

    // Store canvas reference
    this.state.setState({ canvas: this.stage });
  }

  async loadProductImage() {
    try {
      const productImageUrl = this.getProductImageUrl();
      if (!productImageUrl) {
        throw new Error('No product image URL available');
      }

      const image = await this.loadImage(productImageUrl);
      
      // Create Konva image
      const konvaImage = new Konva.Image({
        image: image,
        x: 0,
        y: 0
      });

      // Scale to fit canvas
      const scale = Math.min(
        this.options.width / image.width,
        this.options.height / image.height
      );
      
      konvaImage.scale({ x: scale, y: scale });
      
      // Center the image
      const scaledWidth = image.width * scale;
      const scaledHeight = image.height * scale;
      konvaImage.x((this.options.width - scaledWidth) / 2);
      konvaImage.y((this.options.height - scaledHeight) / 2);

      // Add to product layer
      this.productLayer.add(konvaImage);
      this.productLayer.draw();

      this.state.setState({ productImage: konvaImage });
      
    } catch (error) {
      console.error('Failed to load product image:', error);
      throw error;
    }
  }

  getProductImageUrl() {
    // Try multiple methods to get product image URL
    const methods = [
      () => window.productData?.featured_image?.src,
      () => document.querySelector('[data-product-image]')?.src,
      () => document.querySelector('.product__media img')?.src,
      () => document.querySelector('img[alt*="product"]')?.src
    ];

    for (const method of methods) {
      try {
        const url = method();
        if (url) return url;
      } catch (e) {
        continue;
      }
    }

    return null;
  }

  async loadImage(url, retries = 3) {
    for (let i = 0; i < retries; i++) {
      try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        
        const blob = await response.blob();
        return new Promise((resolve, reject) => {
          const img = new Image();
          img.onload = () => resolve(img);
          img.onerror = reject;
          img.src = URL.createObjectURL(blob);
        });
      } catch (error) {
        if (i === retries - 1) throw error;
        await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
      }
    }
  }

  setupEventListeners() {
    // Handle variant changes
    this.handleVariantChanges();
    
    // Handle file uploads
    this.handleFileUploads();
    
    // Handle window resize
    window.addEventListener('resize', this.debounce(() => {
      this.handleResize();
    }, 250));
  }

  handleVariantChanges() {
    const events = ['variant:update', 'change', 'click'];
    
    events.forEach(eventType => {
      document.addEventListener(eventType, (e) => {
        if (this.isVariantChangeEvent(e)) {
          this.debounce(() => this.updateProductImage(), 100)();
        }
      });
    });
  }

  isVariantChangeEvent(event) {
    return (
      event.type === 'variant:update' ||
      (event.target.type === 'radio' && event.target.hasAttribute('data-variant-id')) ||
      (event.target.tagName === 'LABEL' || event.target.closest('label'))
    );
  }

  async updateProductImage() {
    try {
      // Remove old product image
      if (this.state.productImage) {
        this.state.productImage.destroy();
        this.state.setState({ productImage: null });
      }

      // Load new product image
      await this.loadProductImage();
      
    } catch (error) {
      console.error('Failed to update product image:', error);
    }
  }

  handleFileUploads() {
    const uploadInput = document.getElementById('upload-input');
    if (!uploadInput) return;

    uploadInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        this.handleFileUpload(file);
      }
    });
  }

  async handleFileUpload(file) {
    try {
      // Validate file
      if (!this.validateFile(file)) {
        throw new Error('Invalid file type or size');
      }

      // Load image
      const image = await this.loadImageFromFile(file);
      
      // Add to canvas
      this.addDesignToCanvas(image);
      
    } catch (error) {
      console.error('File upload failed:', error);
      this.showError(error.message);
    }
  }

  validateFile(file) {
    if (!this.options.allowedTypes.includes(file.type)) {
      throw new Error('Invalid file type. Please upload JPEG, PNG, or WebP images.');
    }

    if (file.size > this.options.maxUploadSize) {
      throw new Error('File too large. Maximum size is 5MB.');
    }

    return true;
  }

  loadImageFromFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = e.target.result;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  addDesignToCanvas(image) {
    // Remove existing design
    if (this.state.uploadedImage) {
      this.state.uploadedImage.destroy();
    }

    // Create Konva image
    const konvaImage = new Konva.Image({
      image: image,
      draggable: true,
      x: 50,
      y: 50
    });

    // Add controls
    this.addImageControls(konvaImage);

    // Add to design layer
    this.designLayer.add(konvaImage);
    this.designLayer.draw();

    this.state.setState({ uploadedImage: konvaImage });
  }

  addImageControls(image) {
    // Add resize handles
    image.on('mouseenter', () => {
      document.body.style.cursor = 'pointer';
    });

    image.on('mouseleave', () => {
      document.body.style.cursor = 'default';
    });

    // Add transform controls
    const transformer = new Konva.Transformer({
      nodes: [image],
      keepRatio: false,
      boundBoxFunc: (oldBox, newBox) => {
        // Limit minimum size
        if (newBox.width < 50 || newBox.height < 50) {
          return oldBox;
        }
        return newBox;
      }
    });

    this.designLayer.add(transformer);
  }

  handleResize() {
    if (!this.stage) return;

    const container = document.getElementById(this.containerId);
    const rect = container.getBoundingClientRect();
    
    this.stage.width(rect.width);
    this.stage.height(rect.height);
    this.stage.draw();
  }

  debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  showError(message) {
    // Create error notification
    const notification = document.createElement('div');
    notification.className = 'mockup-error';
    notification.textContent = message;
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #ff4444;
      color: white;
      padding: 10px 20px;
      border-radius: 4px;
      z-index: 10000;
      animation: slideIn 0.3s ease;
    `;

    document.body.appendChild(notification);

    setTimeout(() => {
      notification.remove();
    }, 5000);
  }

  // Public API methods
  getScreenshot() {
    if (!this.stage) return null;
    
    // Hide controls temporarily
    const transformers = this.designLayer.find('Transformer');
    transformers.forEach(t => t.hide());
    
    const dataURL = this.stage.toDataURL();
    
    // Show controls again
    transformers.forEach(t => t.show());
    this.designLayer.draw();
    
    return dataURL;
  }

  destroy() {
    if (this.stage) {
      this.stage.destroy();
    }
    this.isInitialized = false;
  }
}

// Export for use in other modules
window.MockupBuilder = MockupBuilder; 