/**
 * Mr. Dollars — Main Application v2
 *
 * Orchestrates:
 *  - Ambient particle system (floating gold dust + dollar signs)
 *  - Avatar presenter stage interactions
 *  - Speech card with typewriter effect
 *  - WebSocket for live updates
 *  - Coordinated avatar reactions to data events
 */

(function () {
    'use strict';

    let avatar = null;
    let dashboard = null;
    let ws = null;
    let reconnectAttempts = 0;
    const MAX_RECONNECT = 10;

    // === Ambient Particle System ===

    class AmbientParticles {
        constructor(canvasId) {
            this.canvas = document.getElementById(canvasId);
            if (!this.canvas) return;
            this.ctx = this.canvas.getContext('2d');
            this.particles = [];
            this.resize();
            window.addEventListener('resize', () => this.resize());
            this._spawn();
            this._animate();
        }

        resize() {
            this.w = window.innerWidth;
            this.h = window.innerHeight;
            const dpr = Math.min(window.devicePixelRatio || 1, 2);
            this.canvas.width = this.w * dpr;
            this.canvas.height = this.h * dpr;
            this.canvas.style.width = this.w + 'px';
            this.canvas.style.height = this.h + 'px';
            this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        }

        _spawn() {
            // Floating dollar signs
            for (let i = 0; i < 6; i++) {
                this.particles.push({
                    type: 'dollar',
                    x: Math.random() * this.w,
                    y: Math.random() * this.h,
                    size: 10 + Math.random() * 16,
                    speed: 0.15 + Math.random() * 0.25,
                    opacity: 0.04 + Math.random() * 0.06,
                    phase: Math.random() * Math.PI * 2,
                    drift: Math.random() * 0.3,
                });
            }

            // Gold dust motes
            for (let i = 0; i < 30; i++) {
                this.particles.push({
                    type: 'dust',
                    x: Math.random() * this.w,
                    y: Math.random() * this.h,
                    size: 1 + Math.random() * 2.5,
                    speed: 0.05 + Math.random() * 0.15,
                    opacity: 0.08 + Math.random() * 0.15,
                    phase: Math.random() * Math.PI * 2,
                    drift: 0.2 + Math.random() * 0.5,
                });
            }
        }

        _animate() {
            const tick = () => {
                requestAnimationFrame(tick);
                this._draw();
            };
            tick();
        }

        _draw() {
            const ctx = this.ctx;
            ctx.clearRect(0, 0, this.w, this.h);
            const t = performance.now() / 1000;

            for (const p of this.particles) {
                p.y -= p.speed;
                p.x += Math.sin(t * p.drift + p.phase) * 0.3;

                if (p.y < -30) { p.y = this.h + 30; p.x = Math.random() * this.w; }
                if (p.x < -30) p.x = this.w + 30;
                if (p.x > this.w + 30) p.x = -30;

                ctx.save();
                ctx.globalAlpha = p.opacity;
                ctx.translate(p.x, p.y);

                if (p.type === 'dollar') {
                    ctx.rotate(Math.sin(t * 0.3 + p.phase) * 0.15);
                    ctx.font = `${p.size}px 'Playfair Display', serif`;
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillStyle = '#FFD700';
                    ctx.fillText('$', 0, 0);
                } else {
                    // Gold dust mote
                    const pulse = 1 + Math.sin(t * 2 + p.phase) * 0.3;
                    ctx.beginPath();
                    ctx.arc(0, 0, p.size * pulse, 0, Math.PI * 2);
                    ctx.fillStyle = '#FFD700';
                    ctx.fill();
                }

                ctx.restore();
            }
        }
    }

    // === Speech messages ===

    const speechMessages = {
        idle: [
            "Ready to analyze your numbers.",
            "Waiting for Time Loom data...",
            "Standing by for your report.",
            "The vault is secure. Your data awaits.",
        ],
        confident: [
            "Numbers are looking strong.",
            "Cash flow is healthy. Stay disciplined.",
            "Margins holding. Keep the momentum.",
            "Solid fundamentals across the board.",
        ],
        cautious: [
            "Some metrics need attention.",
            "Watch the trends before expanding.",
            "Review the decisions below carefully.",
            "Caution advised. Let the data guide you.",
        ],
        alert: [
            "Cash protection mode recommended.",
            "Action required on multiple fronts.",
            "Review obligations immediately.",
            "Red flags in the numbers. Act now.",
        ],
        celebrating: [
            "Outstanding period! Every KPI is green.",
            "Excellent execution. Keep it up.",
            "This is what operational discipline looks like.",
            "Premium performance. You've earned it.",
        ],
    };

    // === Speech card (in-stage, not floating) ===

    let speechHideTimer = null;

    function showSpeechCard() {
        const card = document.getElementById('speech-card');
        if (card) card.classList.add('visible');
        if (speechHideTimer) clearTimeout(speechHideTimer);
    }

    function hideSpeechCard(delay = 5000) {
        if (speechHideTimer) clearTimeout(speechHideTimer);
        speechHideTimer = setTimeout(() => {
            const card = document.getElementById('speech-card');
            if (card) card.classList.remove('visible');
        }, delay);
    }

    function typeText(element, text, speed = 28) {
        element.innerHTML = '';
        let i = 0;
        const cursor = document.createElement('span');
        cursor.className = 'typing-cursor';

        function type() {
            if (i < text.length) {
                element.textContent = text.substring(0, i + 1);
                element.appendChild(cursor);
                i++;
                setTimeout(type, speed + Math.random() * 15); // slight timing variation
            } else {
                setTimeout(() => { if (cursor.parentNode) cursor.remove(); }, 2500);
            }
        }
        type();
    }

    function speak(mood) {
        const el = document.getElementById('speech-text');
        if (!el) return;

        const messages = speechMessages[mood] || speechMessages.idle;
        const msg = messages[Math.floor(Math.random() * messages.length)];
        typeText(el, msg);

        if (avatar && avatar.talk) {
            avatar.talk(Math.floor(msg.length * 1.8));
        }

        // Update mood indicator
        const dot = document.getElementById('mood-dot');
        if (dot) { dot.className = 'mood-dot ' + mood; }
        const label = document.getElementById('mood-label');
        if (label) { label.textContent = `Mood: ${mood}`; }

        showSpeechCard();
        hideSpeechCard(msg.length * 65 + 4000);
    }

    // === WebSocket ===

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

    // === Report handling with avatar choreography ===

    function onReport(report) {
        dashboard.updateFromReport(report);

        if (avatar) {
            avatar.setMoodFromReport(report);
            avatar.bounce();

            // Speak after a beat
            setTimeout(() => speak(avatar.mood), 400);

            // Sparkle after speech starts
            setTimeout(() => { if (avatar) avatar.sparkle(); }, 1200);
        }
    }

    async function generateReport() {
        const btn = document.getElementById('btn-generate');
        if (btn) { btn.textContent = 'Generating...'; btn.disabled = true; }

        speak('idle');
        if (avatar) avatar.talk(120);

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
        if (avatar) { avatar.wave(); }

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

        if (avatar) avatar.talk(60);

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
                    <div class="glass-card metric-card reveal-item" style="animation-delay:0s">
                        <div class="label">NPV (base rate)</div>
                        <div class="value ${npvColor}">$${data.npv_base.toFixed(2)}</div>
                        <div class="delta">
                            Range: $${data.npv_lo.toFixed(2)} to $${data.npv_hi.toFixed(2)} |
                            IRR: ${data.irr !== null ? (data.irr * 100).toFixed(1) + '%' : 'N/A'} |
                            ${data.robust_positive ? 'Robust' : data.fragile_positive ? 'Fragile' : 'Negative'}
                        </div>
                    </div>`;

                if (avatar) {
                    if (data.npv_base > 0) avatar.sparkle();
                    speak(data.npv_base > 0 ? 'confident' : 'cautious');
                }
            }
        } catch (e) {}
    }

    // === Init ===

    document.addEventListener('DOMContentLoaded', () => {
        dashboard = new Dashboard();

        // Avatar
        if (typeof DollarAvatar !== 'undefined') {
            avatar = new DollarAvatar('dollar-canvas');
        }

        // Ambient particles
        new AmbientParticles('ambient-canvas');

        // Buttons
        document.getElementById('btn-generate')?.addEventListener('click', generateReport);
        document.getElementById('btn-demo')?.addEventListener('click', loadDemo);
        document.getElementById('btn-evaluate-capital')?.addEventListener('click', evaluateProject);

        // WebSocket + Loom
        connectWebSocket();
        checkLoomConnection();

        // Entrance choreography
        setTimeout(() => {
            if (avatar) avatar.wave();
            speak('idle');
        }, 600);
    });
})();
