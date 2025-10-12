// PosterBoy UI Layout Helper
// Add this to your JavaScript to enable layout improvements

class UILayoutManager {
  constructor() {
    this.init();
  }

  init() {
    this.setupLayoutToggle();
    this.setupResizableResponse();
    this.setupAutoCollapse();
  }

  // Add toggle button to collapse request builder after sending
  setupLayoutToggle() {
    const requestBuilder = document.querySelector('.request-builder');
    if (!requestBuilder) return;

    // Create toggle button
    const toggleBtn = document.createElement('button');
    toggleBtn.className = 'collapse-toggle';
    toggleBtn.innerHTML = '▼ Collapse';
    toggleBtn.style.display = 'none'; // Hidden by default
    
    requestBuilder.style.position = 'relative';
    requestBuilder.appendChild(toggleBtn);

    // Toggle collapse
    toggleBtn.addEventListener('click', () => {
      requestBuilder.classList.toggle('collapsed');
      toggleBtn.innerHTML = requestBuilder.classList.contains('collapsed') 
        ? '▶ Expand' 
        : '▼ Collapse';
    });

    // Show toggle after first request
    this.toggleButton = toggleBtn;
  }

  // Auto-collapse request builder after sending request
  setupAutoCollapse() {
    const sendButton = document.querySelector('.send-button');
    if (!sendButton) return;

    sendButton.addEventListener('click', () => {
      // Show toggle button after first request
      if (this.toggleButton) {
        this.toggleButton.style.display = 'block';
      }

      // Optional: Auto-collapse after 1 second
      setTimeout(() => {
        const requestBuilder = document.querySelector('.request-builder');
        if (requestBuilder && window.innerHeight < 900) {
          requestBuilder.classList.add('collapsed');
          if (this.toggleButton) {
            this.toggleButton.innerHTML = '▶ Expand';
          }
        }
      }, 1000);
    });
  }

  // Make response section resizable
  setupResizableResponse() {
    const workspace = document.querySelector('.workspace-container');
    const requestBuilder = document.querySelector('.request-builder');
    const responseSection = document.querySelector('.response-section');
    
    if (!workspace || !requestBuilder || !responseSection) return;

    // Create resize handle
    const resizeHandle = document.createElement('div');
    resizeHandle.className = 'resize-handle';
    resizeHandle.title = 'Drag to resize';
    
    // Insert handle between request and response
    requestBuilder.insertAdjacentElement('afterend', resizeHandle);

    let isResizing = false;
    let startY = 0;
    let startHeight = 0;

    resizeHandle.addEventListener('mousedown', (e) => {
      isResizing = true;
      startY = e.clientY;
      startHeight = requestBuilder.offsetHeight;
      
      document.body.style.cursor = 'row-resize';
      document.body.style.userSelect = 'none';
    });

    document.addEventListener('mousemove', (e) => {
      if (!isResizing) return;

      const delta = e.clientY - startY;
      const newHeight = startHeight + delta;
      const minHeight = 200;
      const maxHeight = window.innerHeight * 0.7;

      if (newHeight >= minHeight && newHeight <= maxHeight) {
        requestBuilder.style.maxHeight = `${newHeight}px`;
        requestBuilder.style.height = `${newHeight}px`;
      }
    });

    document.addEventListener('mouseup', () => {
      if (isResizing) {
        isResizing = false;
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      }
    });
  }

  // Toggle between vertical and horizontal split
  toggleSplitView() {
    const workspace = document.querySelector('.workspace-container');
    if (workspace) {
      workspace.classList.toggle('split-view');
      
      // Save preference
      const isSplit = workspace.classList.contains('split-view');
      localStorage.setItem('posterboy_split_view', isSplit);
    }
  }

  // Load saved layout preference
  loadLayoutPreference() {
    const isSplit = localStorage.getItem('posterboy_split_view') === 'true';
    const workspace = document.querySelector('.workspace-container');
    
    if (workspace && isSplit) {
      workspace.classList.add('split-view');
    }
  }
}

// Initialize when DOM is ready
if (typeof window !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      window.UILayoutManager = new UILayoutManager();
    });
  } else {
    window.UILayoutManager = new UILayoutManager();
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = UILayoutManager;
}