/**
 * Mr. Dollars — Main Application
 *
 * Initializes the cartoon avatar, dashboard, and WebSocket connection.
 * Coordinates data flow between backend and UI components.
 */

(function () {
    'use strict';

    let avatar = null;
    let dashboard = null;
    let ws = null;
    let reconnectTimer = null;
    let reconnectAttempts = 0;
    const MAX_RECONNECT = 10;

    // Speech bubble typewriter effect
    const speechMessages = {
        idle: [
            "Ready to analyze your numbers.",
            "Waiting for Time Loom data...",
            "Standing by for your report.",
        ],
        confident: [
            "Numbers are looking strong.",
            "Cash flow is healthy. Stay disciplined.",
            "Margins holding. Keep the momentum.",
        ],
        cautious: [
            "Some metrics need attention.",
            "Watch the trends before expanding.",
            "Review the decisions below carefully.",
        ],
        alert: [
            "Cash protection mode recommended.",
            "Action required on multiple fronts.",
            "Review obligations immediately.",
        ],
        celebrating: [
            "Outstanding period! Every KPI is green.",
            "Excellent execution. Keep it up.",
            "This is what operational discipline looks like.",
        ],
    };

    function typeText(element, text, speed = 30) {
        element.innerHTML = '';
        let i = 0;
        const cursor = document.createElement('span');
        cursor.className = 'typing-cursor';

        function type() {
            if (i < text.length) {
                element.textContent = text.substring(0, i + 1);
                element.appendChild(cursor);
                i++;
                setTimeout(type, speed);
            } else {
                // Remove cursor after delay
                setTimeout(() => {
                    if (cursor.parentNode) cursor.remove();
                }, 2000);
            }
        }
        type();
    }

    function speak(mood) {
        const speechEl = document.getElementById('avatar-speech');
        const moodEl = document.getElementById('avatar-mood');
        if (!speechEl) return;

        const messages = speechMessages[mood] || speechMessages.idle;
        const msg = messages[Math.floor(Math.random() * messages.length)];
        typeText(speechEl, msg);

        // Trigger avatar talking animation while text types
        if (avatar && avatar.talk) {
            avatar.talk(Math.floor(msg.length * 1.5));
        }

        if (moodEl) {
            moodEl.textContent = `Mood: ${mood}`;
        }
    }

    // WebSocket connection
    function connectWebSocket() {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}/ws`;

        try {
            ws = new WebSocket(wsUrl);
        } catch (e) {
            console.warn('WebSocket connection failed:', e);
            scheduleReconnect();
            return;
        }

        ws.onopen = () => {
            console.log('Connected to Mr. Dollars backend');
            reconnectAttempts = 0;
            updateConnectionStatus(true);
        };

        ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                handleMessage(data);
            } catch (e) {
                console.error('Failed to parse message:', e);
            }
        };

        ws.onclose = () => {
            console.log('WebSocket disconnected');
            updateConnectionStatus(false);
            scheduleReconnect();
        };

        ws.onerror = (err) => {
            console.error('WebSocket error:', err);
        };
    }

    function scheduleReconnect() {
        if (reconnectAttempts >= MAX_RECONNECT) return;
        reconnectAttempts++;
        const delay = Math.min(2000 * Math.pow(2, reconnectAttempts - 1), 30000);
        reconnectTimer = setTimeout(connectWebSocket, delay);
    }

    function updateConnectionStatus(connected) {
        const dot = document.getElementById('connection-dot');
        if (dot) {
            dot.className = connected ? 'status-dot' : 'status-dot disconnected';
        }
        const label = document.getElementById('connection-label');
        if (label) {
            label.textContent = connected ? 'Live' : 'Disconnected';
        }
    }

    function handleMessage(data) {
        if (data.type === 'report') {
            // Full report update
            dashboard.updateFromReport(data.payload);
            if (avatar) {
                avatar.setMoodFromReport(data.payload);
                avatar.sparkle();
                speak(avatar.mood);
            }
        } else if (data.type === 'loom_status') {
            dashboard.renderLoomStatus(data.payload);
        } else if (data.type === 'error') {
            console.error('Server error:', data.message);
        }
    }

    // Manual report generation
    async function generateReport() {
        const btn = document.getElementById('btn-generate');
        if (btn) {
            btn.textContent = 'Generating...';
            btn.disabled = true;
        }

        try {
            const response = await fetch('/api/report/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
            });
            const data = await response.json();

            if (data.report) {
                dashboard.updateFromReport(data.report);
                if (avatar) {
                    avatar.setMoodFromReport(data.report);
                    avatar.sparkle();
                    speak(avatar.mood);
                }
            }
        } catch (e) {
            console.error('Report generation failed:', e);
            speak('alert');
        } finally {
            if (btn) {
                btn.textContent = 'Generate Report';
                btn.disabled = false;
            }
        }
    }

    // Demo mode (load sample data)
    async function loadDemo() {
        try {
            const response = await fetch('/api/report/demo');
            const data = await response.json();

            if (data.report) {
                dashboard.updateFromReport(data.report);
                if (avatar) {
                    avatar.setMoodFromReport(data.report);
                    avatar.sparkle();
                    speak(avatar.mood);
                }
            }
        } catch (e) {
            console.error('Demo load failed:', e);
        }
    }

    // Check Time Loom connection
    async function checkLoomConnection() {
        try {
            const response = await fetch('/api/timeloom/status');
            const data = await response.json();
            dashboard.renderLoomStatus(data);
        } catch (e) {
            dashboard.renderLoomStatus({ status: 'disconnected', error: String(e) });
        }
    }

    // Capital project evaluation
    async function evaluateProject() {
        const input = document.getElementById('cashflows-input');
        if (!input || !input.value.trim()) return;

        try {
            const cashflows = input.value.split(',').map(v => parseFloat(v.trim()));
            const response = await fetch('/api/capital/evaluate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ cashflows }),
            });
            const data = await response.json();

            const resultEl = document.getElementById('capital-result');
            if (resultEl && data) {
                const npvColor = data.npv_base > 0 ? 'good' : 'bad';
                resultEl.innerHTML = `
                    <div class="metric-card" style="margin-top:12px;">
                        <div class="metric-label">NPV (base rate)</div>
                        <div class="metric-value ${npvColor}">$${data.npv_base.toFixed(2)}</div>
                        <div class="metric-delta">
                            NPV range: $${data.npv_lo.toFixed(2)} to $${data.npv_hi.toFixed(2)}
                        </div>
                        <div class="metric-delta" style="margin-top:4px;">
                            IRR: ${data.irr !== null ? (data.irr * 100).toFixed(1) + '%' : 'N/A'} |
                            ${data.robust_positive ? 'Robust positive' : data.fragile_positive ? 'Fragile positive' : 'Negative'}
                        </div>
                    </div>`;
            }
        } catch (e) {
            console.error('Capital evaluation failed:', e);
        }
    }

    // Initialize on DOM ready
    document.addEventListener('DOMContentLoaded', () => {
        // Initialize dashboard
        dashboard = new Dashboard();

        // Initialize cartoon avatar
        if (typeof DollarAvatar !== 'undefined') {
            avatar = new DollarAvatar('dollar-canvas');
        }

        // Wire up buttons
        const btnGenerate = document.getElementById('btn-generate');
        if (btnGenerate) btnGenerate.addEventListener('click', generateReport);

        const btnDemo = document.getElementById('btn-demo');
        if (btnDemo) btnDemo.addEventListener('click', loadDemo);

        const btnCapital = document.getElementById('btn-evaluate-capital');
        if (btnCapital) btnCapital.addEventListener('click', evaluateProject);

        // Connect WebSocket
        connectWebSocket();

        // Check Time Loom status
        checkLoomConnection();

        // Initial speech
        speak('idle');
    });
})();
