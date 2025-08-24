class ResizeManager {
    constructor() {
        this.isResizing = false;
        this.activeHandle = null;
        this.startPos = 0;
        this.startSize = 0;
        this.initialize();
    }

    initialize() {
        this.createResizeHandles();
        this.setupEventListeners();
    }

    createResizeHandles() {
        // Horizontal resize between request and response
        const requestBuilder = document.querySelector('.request-builder');
        if (requestBuilder) {
            const handle = document.createElement('div');
            handle.className = 'resize-handle horizontal-resize';
            handle.dataset.direction = 'horizontal';
            requestBuilder.parentNode.insertBefore(handle, requestBuilder.nextSibling);
        }

        // Vertical resize for sidebar
        const sidebar = document.getElementById('requestsSidebar');
        if (sidebar) {
            const handle = document.createElement('div');
            handle.className = 'resize-handle vertical-resize';
            handle.dataset.direction = 'vertical';
            sidebar.appendChild(handle);
        }
    }

    setupEventListeners() {
        document.addEventListener('mousedown', this.handleMouseDown.bind(this));
        document.addEventListener('mousemove', this.handleMouseMove.bind(this));
        document.addEventListener('mouseup', this.handleMouseUp.bind(this));
    }

    handleMouseDown(e) {
        if (e.target.classList.contains('resize-handle')) {
            this.isResizing = true;
            this.activeHandle = e.target;
            this.startPos = e.target.dataset.direction === 'horizontal' ? e.clientY : e.clientX;
            
            if (e.target.dataset.direction === 'horizontal') {
                const requestBuilder = document.querySelector('.request-builder');
                this.startSize = requestBuilder.offsetHeight;
                document.body.style.cursor = 'row-resize';
            } else {
                const sidebar = document.getElementById('requestsSidebar');
                this.startSize = sidebar.offsetWidth;
                document.body.style.cursor = 'col-resize';
            }
            
            e.preventDefault();
        }
    }

handleMouseMove(e) {
    if (!this.isResizing || !this.activeHandle) return;

    if (this.activeHandle.dataset.direction === 'horizontal') {
        const delta = e.clientY - this.startPos;
        const newHeight = this.startSize + delta;
        
        if (newHeight > 200 && newHeight < 700) {
            const requestBuilder = document.querySelector('.request-builder');
            const responseSection = document.querySelector('.response-section');
            
            // Grow request section
            requestBuilder.style.maxHeight = newHeight + 'px';
            requestBuilder.style.minHeight = newHeight + 'px';
            
            // Shrink response section from top, not bottom
            const remainingHeight = Math.max(200, window.innerHeight - newHeight - 200);
            responseSection.style.height = remainingHeight + 'px';
            responseSection.style.maxHeight = remainingHeight + 'px';
        }
    } else {
        const delta = e.clientX - this.startPos;
        const newWidth = this.startSize + delta;
        
        if (newWidth > 250 && newWidth < 500) {
            const sidebar = document.getElementById('requestsSidebar');
            sidebar.style.width = newWidth + 'px';
        }
    }
}

    handleMouseUp() {
        if (this.isResizing) {
            this.isResizing = false;
            this.activeHandle = null;
            document.body.style.cursor = 'default';
        }
    }
}

window.ResizeManager = new ResizeManager();