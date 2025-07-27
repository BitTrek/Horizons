/**
 * Mockup Builder - Product Personalization Tool
 * Clean, modular implementation with lessons learned from previous attempts
 */

class MockupBuilder {
  constructor() {
    this.canvas = null;
    this.fabricCanvas = null;
    this.uploadedDesign = null;
    this.productImage = null;
    this.isInitialized = false;
    
    // Configuration
    this.config = {
      maxFileSize: 5 * 1024 * 1024, // 5MB
      allowedTypes: ['image/jpeg', 'image/png', 'image/svg+xml'],
      minDimensions: { width: 100, height: 100 }
    };
    
    this.init();
  }

  init() {
    console.log('🎨 Initializing Mockup Builder...');
    
    // Check if we're on a personalized product page
    if (!this.shouldInitialize()) {
      console.log('🚫 Mockup Builder not needed on this page');
      return;
    }

    // Initialize components
    this.initProductImage();
    this.initCanvas();
    this.bindEvents();
    
    this.isInitialized = true;
    console.log('✅ Mockup Builder initialized successfully');
  }

  shouldInitialize() {
    // Check if we have the required elements
    const canvas = document.getElementById('design-canvas');
    const productImage = document.getElementById('product-background-image');
    const uploadInput = document.getElementById('design-upload');
    
    return canvas && productImage && uploadInput;
  }

  initProductImage() {
    this.productImage = document.getElementById('product-background-image');
    if (!this.productImage) {
      console.error('❌ Product image element not found');
      return;
    }

    // Set up variant change detection
    this.setupVariantDetection();
    console.log('✅ Product image initialized');
  }

  initCanvas() {
    const canvasElement = document.getElementById('design-canvas');
    if (!canvasElement) {
      console.error('❌ Canvas element not found');
      return;
    }

    // Initialize Fabric.js canvas
    this.fabricCanvas = new fabric.Canvas('design-canvas', {
      selection: true,
      preserveObjectStacking: true
    });

    // Configure canvas settings
    this.fabricCanvas.setDimensions({
      width: canvasElement.width,
      height: canvasElement.height
    });

    // Configure object properties
    fabric.Object.prototype.setControlsVisibility({
      mt: false, // middle top
      mb: false, // middle bottom
      ml: false, // middle left
      mr: false  // middle right
    });

    fabric.Object.prototype.cornerSize = 12;
    fabric.Object.prototype.cornerStyle = 'circle';
    fabric.Object.prototype.cornerColor = '#007bff';
    fabric.Object.prototype.borderColor = '#007bff';
    fabric.Object.prototype.borderScaleFactor = 2;

    console.log('✅ Canvas initialized');
  }

  setupVariantDetection() {
    // Listen for variant changes
    document.addEventListener('variant:update', () => {
      this.updateProductImage();
    });

    // Listen for radio button changes
    document.addEventListener('change', (e) => {
      if (e.target.type === 'radio' && e.target.hasAttribute('data-variant-id')) {
        setTimeout(() => this.updateProductImage(), 100);
      }
    });

    // Listen for color swatch changes
    document.addEventListener('click', (e) => {
      if (e.target.closest('[data-color-swatch]') || e.target.closest('[data-variant-option]')) {
        setTimeout(() => this.updateProductImage(), 100);
      }
    });

    // MutationObserver for hidden variant input
    const variantInput = document.querySelector('input[name="id"]');
    if (variantInput) {
      const observer = new MutationObserver(() => {
        this.updateProductImage();
      });
      
      observer.observe(variantInput, { attributes: true });
    }
  }

  updateProductImage() {
    if (!this.productImage) return;

    // Get current variant
    const variantInput = document.querySelector('input[name="id"]');
    if (!variantInput) return;

    const variantId = variantInput.value;
    const productData = window.productData || {};

    // Find the selected variant
    const selectedVariant = productData.variants?.find(v => v.id.toString() === variantId.toString());
    
    if (selectedVariant && selectedVariant.featured_image) {
      let imageUrl = selectedVariant.featured_image.src || selectedVariant.featured_image;
      
      // Fix protocol-relative URLs
      if (imageUrl && imageUrl.startsWith('//')) {
        imageUrl = 'https:' + imageUrl;
      }

      if (imageUrl) {
        console.log('🔄 Updating product image:', imageUrl);
        this.productImage.src = imageUrl;
      }
    }
  }

  bindEvents() {
    // File upload
    const uploadInput = document.getElementById('design-upload');
    if (uploadInput) {
      uploadInput.addEventListener('change', (e) => {
        this.handleFileUpload(e.target.files[0]);
      });
    }

    // Remove design button
    const removeButton = document.getElementById('remove-design');
    if (removeButton) {
      removeButton.addEventListener('click', () => {
        this.removeDesign();
      });
    }

    // Center design button
    const centerButton = document.getElementById('center-design');
    if (centerButton) {
      centerButton.addEventListener('click', () => {
        this.centerDesign();
      });
    }

    // Add to cart integration
    this.setupAddToCartIntegration();
  }

  handleFileUpload(file) {
    if (!file) return;

    console.log('📁 File selected:', file.name, file.size, file.type);

    // Validate file
    if (!this.validateFile(file)) {
      return;
    }

    // Load image
    const reader = new FileReader();
    reader.onload = (e) => {
      this.loadDesignImage(e.target.result, file.name);
    };
    reader.readAsDataURL(file);
  }

  validateFile(file) {
    // Check file size
    if (file.size > this.config.maxFileSize) {
      this.showError(`File too large. Maximum size is ${this.config.maxFileSize / 1024 / 1024}MB`);
      return false;
    }

    // Check file type
    if (!this.config.allowedTypes.includes(file.type)) {
      this.showError('Invalid file type. Please upload JPG, PNG, or SVG files.');
      return false;
    }

    return true;
  }

  loadDesignImage(dataUrl, fileName) {
    fabric.Image.fromURL(dataUrl, (img) => {
      // Remove existing design
      this.removeDesign();

      // Scale image to fit canvas
      const canvasWidth = this.fabricCanvas.getWidth();
      const canvasHeight = this.fabricCanvas.getHeight();
      
      const scaleX = (canvasWidth * 0.6) / img.width;
      const scaleY = (canvasHeight * 0.6) / img.height;
      const scale = Math.min(scaleX, scaleY);

      img.scale(scale);
      img.set({
        left: (canvasWidth - img.getScaledWidth()) / 2,
        top: (canvasHeight - img.getScaledHeight()) / 2,
        hasBorders: true,
        hasControls: true,
        hasRotatingPoint: true
      });

      // Add to canvas
      this.fabricCanvas.add(img);
      this.uploadedDesign = img;
      this.fabricCanvas.setActiveObject(img);
      this.fabricCanvas.renderAll();

      // Show controls
      this.showDesignControls();
      this.hideUploadControls();

      console.log('✅ Design loaded successfully');
    }, { crossOrigin: 'anonymous' });
  }

  removeDesign() {
    if (this.uploadedDesign) {
      this.fabricCanvas.remove(this.uploadedDesign);
      this.uploadedDesign = null;
      this.fabricCanvas.renderAll();
      
      this.hideDesignControls();
      this.showUploadControls();
      
      console.log('🗑️ Design removed');
    }
  }

  centerDesign() {
    if (this.uploadedDesign) {
      const canvasWidth = this.fabricCanvas.getWidth();
      const canvasHeight = this.fabricCanvas.getHeight();
      
      this.uploadedDesign.set({
        left: (canvasWidth - this.uploadedDesign.getScaledWidth()) / 2,
        top: (canvasHeight - this.uploadedDesign.getScaledHeight()) / 2
      });
      
      this.fabricCanvas.renderAll();
      console.log('🎯 Design centered');
    }
  }

  showDesignControls() {
    const controls = document.querySelector('.design-controls');
    if (controls) {
      controls.style.display = 'flex';
    }
  }

  hideDesignControls() {
    const controls = document.querySelector('.design-controls');
    if (controls) {
      controls.style.display = 'none';
    }
  }

  showUploadControls() {
    const controls = document.querySelector('.upload-controls');
    if (controls) {
      controls.style.display = 'block';
    }
  }

  hideUploadControls() {
    const controls = document.querySelector('.upload-controls');
    if (controls) {
      controls.style.display = 'none';
    }
  }

  setupAddToCartIntegration() {
    // Listen for form submissions
    document.addEventListener('submit', (e) => {
      if (e.target.action && e.target.action.includes('/cart/add')) {
        e.preventDefault();
        this.handleAddToCart(e.target);
      }
    });

    // Listen for button clicks
    document.addEventListener('click', (e) => {
      const button = e.target.closest('button[name="add"], button[type="submit"]');
      if (button) {
        const form = button.closest('form');
        if (form && form.action && form.action.includes('/cart/add')) {
          e.preventDefault();
          this.handleAddToCart(form);
        }
      }
    });
  }

  handleAddToCart(form) {
    console.log('🛒 Processing add to cart...');

    // Add design data to form
    if (this.uploadedDesign) {
      // Create screenshot
      this.createScreenshot().then(screenshotUrl => {
        if (screenshotUrl) {
          this.addFormField(form, 'properties[Mockup Screenshot URL]', screenshotUrl);
        }
        
        // Add design file if available
        const uploadInput = document.getElementById('design-upload');
        if (uploadInput && uploadInput.files[0]) {
          this.addFormField(form, 'properties[Design File]', uploadInput.files[0]);
        }
        
        // Submit form
        this.submitForm(form);
      });
    } else {
      // No design, submit normally
      this.submitForm(form);
    }
  }

  createScreenshot() {
    return new Promise((resolve) => {
      if (!this.uploadedDesign) {
        resolve(null);
        return;
      }

      // Temporarily hide controls
      const objects = this.fabricCanvas.getObjects();
      const originalStates = objects.map(obj => ({
        hasControls: obj.hasControls,
        hasBorders: obj.hasBorders
      }));

      objects.forEach(obj => {
        obj.set({ hasControls: false, hasBorders: false });
      });

      this.fabricCanvas.renderAll();

      // Create screenshot
      setTimeout(() => {
        const dataUrl = this.fabricCanvas.toDataURL({
          format: 'png',
          quality: 0.9
        });

        // Restore controls
        objects.forEach((obj, index) => {
          if (originalStates[index]) {
            obj.set({
              hasControls: originalStates[index].hasControls,
              hasBorders: originalStates[index].hasBorders
            });
          }
        });

        this.fabricCanvas.renderAll();
        resolve(dataUrl);
      }, 100);
    });
  }

  addFormField(form, name, value) {
    let input = form.querySelector(`input[name="${name}"]`);
    if (!input) {
      input = document.createElement('input');
      input.type = 'hidden';
      input.name = name;
      form.appendChild(input);
    }
    input.value = value;
  }

  submitForm(form) {
    const formData = new FormData(form);
    
    fetch('/cart/add.js', {
      method: 'POST',
      body: formData
    })
    .then(response => response.json())
    .then(data => {
      console.log('✅ Added to cart:', data);
      
      // Update cart drawer if available
      const cartDrawer = document.querySelector('cart-drawer');
      if (cartDrawer) {
        cartDrawer.renderContents({ key: data.key });
      } else {
        window.location.reload();
      }
    })
    .catch(error => {
      console.error('❌ Add to cart error:', error);
      window.location.reload();
    });
  }

  showError(message) {
    console.error('❌ Error:', message);
    // You can implement a proper error display here
    alert(message);
  }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  new MockupBuilder();
}); 