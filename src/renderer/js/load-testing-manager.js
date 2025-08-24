// Load Testing Manager with P2P Discovery
class LoadTestingManager {
    constructor() {
        this.peers = [];
        this.isTestRunning = false;
        this.testResults = null;
        this.initialized = false;
        console.log('🔥 LoadTestingManager initializing...');
        this.initialize();
    }

    initialize() {
        this.createLoadTestingUI();
        this.startPeerDiscovery();
        this.initialized = true;
        console.log('✅ LoadTestingManager initialized');
    }

    createLoadTestingUI() {
        const loadTestingSection = `
            <section id="load-testing" class="content-section">
                <div class="section-header">
                    <h2>🔥 Load Testing</h2>
                    <div class="peers-status">
                        <span class="peers-count">Peers: <span id="peersCount">0</span> online</span>
                    </div>
                </div>

                <div class="load-testing-container">
                    <div class="load-test-config">
                        <h3>Test Configuration</h3>
                        <div class="config-grid">
                            <div class="form-group">
                                <label>Target URL:</label>
                                <input type="url" id="loadTestUrl" placeholder="https://api.example.com/test">
                            </div>
                            <div class="form-group">
                                <label>Virtual Users:</label>
                                <input type="number" id="virtualUsers" value="10" min="1" max="1000">
                            </div>
                            <div class="form-group">
                                <label>Duration (seconds):</label>
                                <input type="number" id="testDuration" value="30" min="1" max="300">
                            </div>
                            <div class="form-group">
                                <label>Request Method:</label>
                                <select id="loadTestMethod">
                                    <option value="GET">GET</option>
                                    <option value="POST">POST</option>
                                    <option value="PUT">PUT</option>
                                    <option value="DELETE">DELETE</option>
                                </select>
                            </div>
                        </div>
                        // Add this HTML after the config-grid div in createLoadTestingUI():
                        <div class="peer-discovery-section">
                          <label class="checkbox-label">
                          <input type="checkbox" id="allowPeerDiscovery" checked>
                          <span class="checkbox-text">Allow other peers to discover this instance</span>
                            </label>
                        </div>
                    </div>

                    <div class="load-test-controls">
                        <button class="btn btn-primary" id="startLoadTest" onclick="window.LoadTestingManager.startLoadTest()">
                            Start Load Test
                        </button>
                        <button class="btn btn-danger" id="stopLoadTest" onclick="window.LoadTestingManager.stopLoadTest()" disabled>
                            Stop Test
                        </button>
                    </div>

                    <div class="load-test-status">
                        <div class="status-grid">
                            <div class="status-item">
                                <span class="status-label">Status</span>
                                <span class="status-value" id="testStatus">Ready</span>
                            </div>
                            <div class="status-item">
                                <span class="status-label">Progress</span>
                                <span class="status-value" id="testProgress">0%</span>
                            </div>
                            <div class="status-item">
                                <span class="status-label">Requests/sec</span>
                                <span class="status-value" id="requestsPerSec">0</span>
                            </div>
                            <div class="status-item">
                                <span class="status-label">Avg Response</span>
                                <span class="status-value" id="avgResponse">0ms</span>
                            </div>
                        </div>
                    </div>

                    <div class="peers-list">
                        <h3>Connected Peers</h3>
                        <div id="peersList" class="peers-grid">
                            <!-- Peers will be populated here -->
                        </div>
                    </div>
                </div>
            </section>
        `;

        // Insert into main content area
        const contentArea = document.querySelector('.content-area');
        if (contentArea) {
            contentArea.insertAdjacentHTML('beforeend', loadTestingSection);
        }
    }

    startPeerDiscovery() {
        // Simulate peer discovery (replace with actual P2P implementation)
        setTimeout(() => {
            this.peers = [
                { id: 'peer1', name: 'Peer-192.168.1.100', status: 'online' },
                { id: 'peer2', name: 'Peer-192.168.1.101', status: 'online' }
            ];
            this.updatePeersDisplay();
        }, 2000);
    }

    updatePeersDisplay() {
        const peersCount = document.getElementById('peersCount');
        const peersList = document.getElementById('peersList');

        if (peersCount) {
            peersCount.textContent = this.peers.length;
        }

        if (peersList) {
            peersList.innerHTML = this.peers.map(peer => `
                <div class="peer-item">
                    <span class="peer-status online"></span>
                    <span class="peer-name">${peer.name}</span>
                </div>
            `).join('');
        }
    }

    startLoadTest() {
        const url = document.getElementById('loadTestUrl').value;
        if (!url) {
            alert('Please enter a target URL');
            return;
        }

        this.isTestRunning = true;
        document.getElementById('startLoadTest').disabled = true;
        document.getElementById('stopLoadTest').disabled = false;
        document.getElementById('testStatus').textContent = 'Running';

        // Simulate load test progress
        let progress = 0;
        const interval = setInterval(() => {
            progress += 5;
            document.getElementById('testProgress').textContent = progress + '%';
            document.getElementById('requestsPerSec').textContent = Math.floor(Math.random() * 100) + 50;
            document.getElementById('avgResponse').textContent = Math.floor(Math.random() * 200) + 100 + 'ms';

            if (progress >= 100) {
                clearInterval(interval);
                this.stopLoadTest();
            }
        }, 1000);

        this.testInterval = interval;
    }

    stopLoadTest() {
        this.isTestRunning = false;
        document.getElementById('startLoadTest').disabled = false;
        document.getElementById('stopLoadTest').disabled = true;
        document.getElementById('testStatus').textContent = 'Completed';
        
        if (this.testInterval) {
            clearInterval(this.testInterval);
        }
    }
}

window.LoadTestingManager = new LoadTestingManager();