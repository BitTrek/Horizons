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

    // Create stage with background
    this.stage = new Konva.Stage({
      container: containerId,
      width: this.options.width,
      height: this.options.height
    });

    // Add background rectangle
    const background = new Konva.Rect({
      x: 0,
      y: 0,
      width: this.options.width,
      height: this.options.height,
      fill: '#f8f9fa',
      stroke: '#dee2e6',
      strokeWidth: 1
    });

    // Create layers
    this.productLayer = new Konva.Layer();
    this.designLayer = new Konva.Layer();
    
    // Add background to product layer
    this.productLayer.add(background);
    
    this.stage.add(this.productLayer);
    this.stage.add(this.designLayer);

    // Store canvas reference
    this.state.setState({ canvas: this.stage });
  }

  async loadProductImage() {
    try {
      console.log('=== LOAD PRODUCT IMAGE ===');
      
      // Don't load if already loaded
      if (this.state.productImage) {
        console.log('Product image already loaded, skipping');
        return;
      }

      let productImageUrl = this.getProductImageUrl();
      console.log('Product image URL:', productImageUrl);
      
      if (!productImageUrl) {
        throw new Error('No product image URL available');
      }

      // Fix protocol-relative URLs
      if (productImageUrl.startsWith('//')) {
        productImageUrl = 'https:' + productImageUrl;
        console.log('Fixed protocol-relative URL:', productImageUrl);
      }

      console.log('Loading image from:', productImageUrl);
      const image = await this.loadImage(productImageUrl);
      console.log('Image loaded successfully:', image);
      
      // Create Konva image
      const konvaImage = new Konva.Image({
        image: image,
        x: 0,
        y: 0
      });

      // Scale to fit canvas (leave some padding)
      const padding = 20;
      const maxWidth = this.options.width - padding * 2;
      const maxHeight = this.options.height - padding * 2;
      const scale = Math.min(
        maxWidth / image.width,
        maxHeight / image.height
      );
      
      console.log('Image dimensions:', image.width, 'x', image.height);
      console.log('Canvas dimensions:', this.options.width, 'x', this.options.height);
      console.log('Scale factor:', scale);
      
      konvaImage.scale({ x: scale, y: scale });
      
      // Center the image
      const scaledWidth = image.width * scale;
      const scaledHeight = image.height * scale;
      konvaImage.x((this.options.width - scaledWidth) / 2);
      konvaImage.y((this.options.height - scaledHeight) / 2);
      
      console.log('Image positioned at:', konvaImage.x(), konvaImage.y());

      // Add to product layer
      this.productLayer.add(konvaImage);
      this.productLayer.draw();
      console.log('Image added to product layer');

      this.state.setState({ productImage: konvaImage });
      console.log('Product image state updated');
      
    } catch (error) {
      console.error('Failed to load product image:', error);
      throw error;
    }
  }

  getProductImageUrl() {
    console.log('=== GET PRODUCT IMAGE URL ===');
    console.log('window.productData:', window.productData);
    
    // Try multiple methods to get product image URL
    const methods = [
      // First, try to get the currently selected variant image
      () => {
        const selectedVariant = window.productData?.selected_or_first_available_variant;
        console.log('Method 0 - selected variant:', selectedVariant);
        if (selectedVariant?.featured_image) {
          console.log('Method 0 - selected variant featured_image:', selectedVariant.featured_image);
          return selectedVariant.featured_image;
        }
        return null;
      },
      // Try to get the currently visible product image from the DOM
      () => {
        const selector = '.product__media img[src*="cdn.shopify.com"]';
        const element = document.querySelector(selector);
        console.log('Method 1 - visible product image:', element?.src);
        return element?.src;
      },
      () => {
        const selector = '.product__media-gallery img[src*="cdn.shopify.com"]';
        const element = document.querySelector(selector);
        console.log('Method 2 - gallery product image:', element?.src);
        return element?.src;
      },
      // Try featured image from product data
      () => {
        console.log('Method 3 - featured_image:', window.productData?.featured_image);
        return window.productData?.featured_image;
      },
      // Try first image from images array
      () => {
        console.log('Method 4 - images[0]:', window.productData?.images?.[0]);
        return window.productData?.images?.[0];
      },
      // Try any image with product in alt text
      () => {
        const selector = 'img[alt*="product"][src*="cdn.shopify.com"]';
        const element = document.querySelector(selector);
        console.log('Method 5 - product alt image:', element?.src);
        return element?.src;
      },
      // Try any image with hoodie in alt text
      () => {
        const selector = 'img[alt*="hoodie"][src*="cdn.shopify.com"]';
        const element = document.querySelector(selector);
        console.log('Method 6 - hoodie alt image:', element?.src);
        return element?.src;
      },
      // Fallback to any Shopify CDN image
      () => {
        const selector = 'img[src*="cdn.shopify.com"]';
        const element = document.querySelector(selector);
        console.log('Method 7 - any Shopify image:', element?.src);
        return element?.src;
      }
    ];

    for (let i = 0; i < methods.length; i++) {
      try {
        const url = methods[i]();
        if (url) {
          console.log(`Found product image URL (method ${i}):`, url);
          return url;
        }
      } catch (e) {
        console.log(`Method ${i} failed:`, e);
        continue;
      }
    }

    console.log('No product image URL found');
    return null;
  }

  async loadImage(url, retries = 3) {
    console.log('=== LOAD IMAGE ===');
    console.log('URL:', url);
    console.log('Retries:', retries);
    
    for (let i = 0; i < retries; i++) {
      try {
        console.log(`Attempt ${i + 1}/${retries}`);
        const response = await fetch(url);
        console.log('Response status:', response.status);
        console.log('Response ok:', response.ok);
        
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        
        const blob = await response.blob();
        console.log('Blob size:', blob.size);
        console.log('Blob type:', blob.type);
        
        return new Promise((resolve, reject) => {
          const img = new Image();
          img.onload = () => {
            console.log('Image loaded successfully');
            console.log('Image natural dimensions:', img.naturalWidth, 'x', img.naturalHeight);
            resolve(img);
          };
          img.onerror = (error) => {
            console.error('Image load error:', error);
            reject(error);
          };
          img.src = URL.createObjectURL(blob);
        });
      } catch (error) {
        console.error(`Attempt ${i + 1} failed:`, error);
        if (i === retries - 1) throw error;
        console.log(`Waiting ${1000 * (i + 1)}ms before retry...`);
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
          // Use a longer debounce to prevent rapid updates
          this.debounce(() => this.updateProductImage(), 300)();
        }
      });
    });
  }

  isVariantChangeEvent(event) {
    // Check for variant change events
    const isVariantEvent = (
      event.type === 'variant:update' ||
      (event.target.type === 'radio' && event.target.hasAttribute('data-variant-id')) ||
      (event.target.tagName === 'LABEL' || event.target.closest('label'))
    );
    
    // Also check for color swatch clicks
    const isColorSwatch = (
      event.target.closest('[data-color-swatch]') ||
      event.target.closest('[data-variant-option]') ||
      event.target.closest('.product-form__input--color')
    );
    
    // Check for any click on product media
    const isProductMedia = (
      event.target.closest('.product__media') ||
      event.target.closest('.product__media-gallery')
    );
    
    console.log('Variant change check:', {
      isVariantEvent,
      isColorSwatch,
      isProductMedia,
      target: event.target
    });
    
    return isVariantEvent || isColorSwatch || isProductMedia;
  }

  async updateProductImage() {
    try {
      // Get new product image URL first
      const newImageUrl = this.getProductImageUrl();
      if (!newImageUrl) {
        console.warn('No new product image URL available');
        return;
      }

      // Load new image before removing old one to prevent flickering
      let newImageUrlFixed = newImageUrl;
      if (newImageUrlFixed.startsWith('//')) {
        newImageUrlFixed = 'https:' + newImageUrlFixed;
      }

      const image = await this.loadImage(newImageUrlFixed);
      
      // Create new Konva image
      const newKonvaImage = new Konva.Image({
        image: image,
        x: 0,
        y: 0
      });

      // Scale to fit canvas (leave some padding)
      const padding = 20;
      const maxWidth = this.options.width - padding * 2;
      const maxHeight = this.options.height - padding * 2;
      const scale = Math.min(
        maxWidth / image.width,
        maxHeight / image.height
      );
      
      newKonvaImage.scale({ x: scale, y: scale });
      
      // Center the image
      const scaledWidth = image.width * scale;
      const scaledHeight = image.height * scale;
      newKonvaImage.x((this.options.width - scaledWidth) / 2);
      newKonvaImage.y((this.options.height - scaledHeight) / 2);

      // Remove old product image only after new one is ready
      if (this.state.productImage) {
        this.state.productImage.destroy();
      }

      // Add new image to product layer
      this.productLayer.add(newKonvaImage);
      this.productLayer.draw();

      this.state.setState({ productImage: newKonvaImage });
      
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
    if (!this.stage || !this.productLayer || !this.designLayer) return;

    // Handle both ID and CSS selector
    const containerId = this.containerId.replace('#', '');
    const container = document.getElementById(containerId);
    
    if (!container) {
      console.warn('Container not found for resize:', containerId);
      return;
    }
    
    const rect = container.getBoundingClientRect();
    
    // Only resize if dimensions actually changed
    if (this.stage.width() !== rect.width || this.stage.height() !== rect.height) {
      this.stage.width(rect.width);
      this.stage.height(rect.height);
      
      // Update background rectangle size
      const background = this.productLayer.findOne('Rect');
      if (background) {
        background.width(rect.width);
        background.height(rect.height);
      }
      
      this.stage.draw();
    }
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