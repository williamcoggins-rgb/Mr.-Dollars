/**
 * Mr. Dollars — Main Application
 *
 * Initializes the roaming cartoon avatar, dashboard, and WebSocket.
 * Speech bubble follows the avatar as it moves around the screen.
 */

(function () {
    'use strict';

    let avatar = null;
    let dashboard = null;
    let ws = null;
    let reconnectAttempts = 0;
    const MAX_RECONNECT = 10;

    const speechBubble = () => document.getElementById('speech-bubble');
    const speechText   = () => document.getElementById('speech-text');
    const moodLabel    = () => document.getElementById('mood-label');

    // --- Speech messages by mood ---
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

    // --- Speech bubble positioning (follows avatar) ---
    let speechHideTimer = null;

    function positionSpeechBubble() {
        const bubble = speechBubble();
        if (!bubble || !avatar) return;

        const pos = avatar.getPosition();
        // Place bubble above and to the left of the avatar
        let bx = pos.left - 200;
        let by = pos.top - 20;

        // Keep on screen
        if (bx < 10) bx = pos.right + 10;
        if (by < 10) by = pos.top + 40;

        bubble.style.left = Math.round(bx) + 'px';
        bubble.style.top = Math.round(by) + 'px';
    }

    function showSpeechBubble() {
        const bubble = speechBubble();
        if (bubble) bubble.classList.add('visible');
        if (speechHideTimer) clearTimeout(speechHideTimer);
    }

    function hideSpeechBubble(delay = 4000) {
        if (speechHideTimer) clearTimeout(speechHideTimer);
        speechHideTimer = setTimeout(() => {
            const bubble = speechBubble();
            if (bubble) bubble.classList.remove('visible');
        }, delay);
    }

    // Update bubble position every frame
    function bubbleTracker() {
        positionSpeechBubble();
        requestAnimationFrame(bubbleTracker);
    }

    // --- Typewriter + talk ---
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
                setTimeout(() => { if (cursor.parentNode) cursor.remove(); }, 2000);
            }
        }
        type();
    }

    function speak(mood) {
        const el = speechText();
        const ml = moodLabel();
        if (!el) return;

        const messages = speechMessages[mood] || speechMessages.idle;
        const msg = messages[Math.floor(Math.random() * messages.length)];
        typeText(el, msg);

        if (avatar && avatar.talk) {
            avatar.talk(Math.floor(msg.length * 1.5));
        }

        if (ml) ml.textContent = `Mood: ${mood}`;

        showSpeechBubble();
        hideSpeechBubble(msg.length * 60 + 3000);
    }

    // --- WebSocket ---
    function connectWebSocket() {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}/ws`;

        try { ws = new WebSocket(wsUrl); } catch (e) {
            scheduleReconnect(); return;
        }

        ws.onopen = () => {
            reconnectAttempts = 0;
            updateConnectionStatus(true);
        };

        ws.onmessage = (event) => {
            try { handleMessage(JSON.parse(event.data)); } catch (e) {}
        };

        ws.onclose = () => {
            updateConnectionStatus(false);
            scheduleReconnect();
        };

        ws.onerror = () => {};
    }

    function scheduleReconnect() {
        if (reconnectAttempts >= MAX_RECONNECT) return;
        reconnectAttempts++;
        setTimeout(connectWebSocket, Math.min(2000 * Math.pow(2, reconnectAttempts - 1), 30000));
    }

    function updateConnectionStatus(connected) {
        const dot = document.getElementById('connection-dot');
        if (dot) dot.className = connected ? 'status-dot' : 'status-dot disconnected';
        const label = document.getElementById('connection-label');
        if (label) label.textContent = connected ? 'Live' : 'Offline';
    }

    function handleMessage(data) {
        if (data.type === 'report') {
            onReport(data.payload);
        } else if (data.type === 'loom_status') {
            dashboard.renderLoomStatus(data.payload);
        }
    }

    // --- Report handling ---
    function onReport(report) {
        dashboard.updateFromReport(report);
        if (avatar) {
            avatar.setMoodFromReport(report);
            avatar.sparkle();

            // Move to scoreboard to present the numbers
            avatar.moveToStation('scoreboard');
            speak(avatar.mood);

            // After a delay, move to decisions
            setTimeout(() => {
                if (avatar) avatar.moveToStation('decisions');
            }, 5000);
        }
    }

    async function generateReport() {
        const btn = document.getElementById('btn-generate');
        if (btn) { btn.textContent = 'Generating...'; btn.disabled = true; }

        if (avatar) avatar.moveToStation('center');

        try {
            const response = await fetch('/api/report/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
            });
            const data = await response.json();
            if (data.report) onReport(data.report);
        } catch (e) {
            speak('alert');
        } finally {
            if (btn) { btn.textContent = 'Generate Report'; btn.disabled = false; }
        }
    }

    async function loadDemo() {
        if (avatar) {
            avatar.moveToStation('center');
            avatar.wave();
        }

        try {
            const response = await fetch('/api/report/demo');
            const data = await response.json();
            if (data.report) onReport(data.report);
        } catch (e) {}
    }

    async function checkLoomConnection() {
        try {
            const response = await fetch('/api/timeloom/status');
            const data = await response.json();
            dashboard.renderLoomStatus(data);
        } catch (e) {
            dashboard.renderLoomStatus({ status: 'disconnected' });
        }
    }

    async function evaluateProject() {
        const input = document.getElementById('cashflows-input');
        if (!input || !input.value.trim()) return;

        if (avatar) avatar.moveToStation('tools');

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
                    <div class="glass-card metric-card" style="margin-top:12px">
                        <div class="label">NPV (base rate)</div>
                        <div class="value ${npvColor}">$${data.npv_base.toFixed(2)}</div>
                        <div class="delta">
                            Range: $${data.npv_lo.toFixed(2)} to $${data.npv_hi.toFixed(2)} |
                            IRR: ${data.irr !== null ? (data.irr * 100).toFixed(1) + '%' : 'N/A'} |
                            ${data.robust_positive ? 'Robust' : data.fragile_positive ? 'Fragile' : 'Negative'}
                        </div>
                    </div>`;
            }
        } catch (e) {}
    }

    // --- Init ---
    document.addEventListener('DOMContentLoaded', () => {
        dashboard = new Dashboard();

        if (typeof DollarAvatar !== 'undefined') {
            avatar = new DollarAvatar('dollar-canvas');
        }

        document.getElementById('btn-generate')?.addEventListener('click', generateReport);
        document.getElementById('btn-demo')?.addEventListener('click', loadDemo);
        document.getElementById('btn-evaluate-capital')?.addEventListener('click', evaluateProject);

        connectWebSocket();
        checkLoomConnection();

        // Start speech bubble tracker
        bubbleTracker();

        // Initial greeting
        setTimeout(() => {
            if (avatar) avatar.wave();
            speak('idle');
        }, 500);
    });
})();
