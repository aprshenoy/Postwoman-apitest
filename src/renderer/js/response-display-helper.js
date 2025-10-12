// PosterBoy Response Display Manager
class ResponseDisplayManager {
    constructor() {
        this.responseSection = null;
        this.init();
    }

    init() {
        this.responseSection = document.querySelector('.response-section');
    }

    displayResponse(response) {
        if (!this.responseSection) this.init();
        if (!this.responseSection) return;

        this.responseSection.classList.add('has-response');

        const statusClass = response.status >= 200 && response.status < 300 ? 'success' : 'error';
        const responseHTML = `
            <div class="response-header">
                <h3>Response</h3>
                <div class="status-badge status-${statusClass}">
                    ${response.status} ${response.statusText || ''}
                </div>
            </div>
            <div class="response-tabs">
                <button class="response-tab-btn active" data-tab="body">Body</button>
                <button class="response-tab-btn" data-tab="headers">Headers</button>
                <button class="response-tab-btn" data-tab="raw">Raw</button>
            </div>
            <div class="response-content">
                <div class="response-tab-pane active" data-tab="body">
                    <pre class="response-body">${this.formatJSON(response.data)}</pre>
                </div>
                <div class="response-tab-pane" data-tab="headers">
                    <div class="headers-list">${this.formatHeaders(response.headers)}</div>
                </div>
                <div class="response-tab-pane" data-tab="raw">
                    <pre class="response-body">${response.rawData || 'No raw data'}</pre>
                </div>
            </div>
        `;

        this.responseSection.innerHTML = responseHTML;
        this.setupTabSwitching();
    }

    clearResponse() {
        if (!this.responseSection) this.init();
        if (!this.responseSection) return;
        this.responseSection.classList.remove('has-response');
        this.responseSection.innerHTML = '';
    }

    formatJSON(data) {
        try {
            return JSON.stringify(data, null, 2);
        } catch (e) {
            return String(data || '');
        }
    }

    formatHeaders(headers) {
        if (!headers) return '<p>No headers</p>';
        return Object.entries(headers).map(([k, v]) => `
            <div class="header-item">
                <span class="header-key">${k}:</span>
                <span class="header-value">${v}</span>
            </div>
        `).join('');
    }

    setupTabSwitching() {
        const tabButtons = this.responseSection.querySelectorAll('.response-tab-btn');
        const tabPanes = this.responseSection.querySelectorAll('.response-tab-pane');
        tabButtons.forEach(button => {
            button.addEventListener('click', () => {
                const targetTab = button.dataset.tab;
                tabButtons.forEach(btn => btn.classList.remove('active'));
                tabPanes.forEach(pane => pane.classList.remove('active'));
                button.classList.add('active');
                const targetPane = this.responseSection.querySelector(`[data-tab="${targetTab}"]`);
                if (targetPane) targetPane.classList.add('active');
            });
        });
    }
}

window.ResponseDisplayManager = new ResponseDisplayManager();