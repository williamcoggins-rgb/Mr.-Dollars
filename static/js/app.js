/**
 * Mr. Dollars — Main Application v3
 *
 * Orchestrates:
 *  - PixiJS GPU-accelerated ambient particle system (200+ particles)
 *  - Avatar roaming + speech bubble tracking
 *  - Typewriter speech with GSAP-driven avatar reactions
 *  - WebSocket for live updates
 *  - Coordinated avatar choreography on data events
 */

(function () {
    'use strict';

    let avatar = null;
    let dashboard = null;
    let ws = null;
    let reconnectAttempts = 0;
    const MAX_RECONNECT = 10;

    // === PixiJS Ambient Particle System (GPU-accelerated) ===

    class AmbientParticles {
        constructor(canvasEl) {
            if (!canvasEl) return;

            // Create PixiJS app using the existing canvas element
            this.app = new PIXI.Application({
                view: canvasEl,
                resizeTo: window,
                backgroundAlpha: 0,
                antialias: true,
                resolution: Math.min(window.devicePixelRatio || 1, 2),
                autoDensity: true,
            });

            this.particles = [];
            this._createParticles();
            this.app.ticker.add(() => this._update());
        }

        _createParticles() {
            const w = window.innerWidth;
            const h = window.innerHeight;

            // Floating dollar signs (20, up from 6)
            for (let i = 0; i < 20; i++) {
                const text = new PIXI.Text('$', {
                    fontFamily: '"Playfair Display", serif',
                    fontSize: 12 + Math.random() * 24,
                    fill: 0xFFD700,
                    fontWeight: 'bold',
                });
                text.anchor.set(0.5);
                text.alpha = 0.03 + Math.random() * 0.06;
                text.x = Math.random() * w;
                text.y = Math.random() * h;

                this.app.stage.addChild(text);
                this.particles.push({
                    sprite: text,
                    type: 'dollar',
                    speed: 0.12 + Math.random() * 0.3,
                    phase: Math.random() * Math.PI * 2,
                    drift: 0.2 + Math.random() * 0.4,
                    rotSpeed: (Math.random() - 0.5) * 0.003,
                });
            }

            // Gold dust motes (180, up from 30) — GPU-rendered circles
            for (let i = 0; i < 180; i++) {
                const size = 0.5 + Math.random() * 3;
                const gfx = new PIXI.Graphics();
                gfx.beginFill(0xFFD700, 1);
                gfx.drawCircle(0, 0, size);
                gfx.endFill();

                gfx.x = Math.random() * w;
                gfx.y = Math.random() * h;
                gfx.alpha = 0.04 + Math.random() * 0.12;

                this.app.stage.addChild(gfx);
                this.particles.push({
                    sprite: gfx,
                    type: 'dust',
                    baseSize: size,
                    speed: 0.04 + Math.random() * 0.18,
                    phase: Math.random() * Math.PI * 2,
                    drift: 0.15 + Math.random() * 0.6,
                    pulseSpeed: 1.5 + Math.random() * 2,
                });
            }
        }

        _update() {
            const t = performance.now() / 1000;
            const w = window.innerWidth;
            const h = window.innerHeight;

            for (const p of this.particles) {
                const s = p.sprite;
                s.y -= p.speed;
                s.x += Math.sin(t * p.drift + p.phase) * 0.4;

                // Wrap around
                if (s.y < -40) { s.y = h + 40; s.x = Math.random() * w; }
                if (s.x < -40) s.x = w + 40;
                if (s.x > w + 40) s.x = -40;

                if (p.type === 'dollar') {
                    s.rotation = Math.sin(t * 0.3 + p.phase) * 0.15;
                } else {
                    // Gentle pulse
                    const pulse = 1 + Math.sin(t * p.pulseSpeed + p.phase) * 0.3;
                    s.scale.set(pulse);
                }
            }
        }
    }

    // === Speech bubble positioning (tracks avatar every frame) ===

    function positionSpeechBubble() {
        const bubble = document.getElementById('speech-bubble');
        if (!bubble || !avatar) return;

        const pos = avatar.getPosition();
        let bx = pos.left - 260;
        let by = pos.top - 10;

        if (bx < 10) bx = pos.right + 10;
        if (by < 50) by = pos.top + 60;
        if (by > window.innerHeight - 180) by = pos.top - 160;

        bubble.style.left = Math.round(bx) + 'px';
        bubble.style.top = Math.round(by) + 'px';
    }

    function bubbleTracker() {
        positionSpeechBubble();
        requestAnimationFrame(bubbleTracker);
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

    // === Speech bubble show/hide ===

    let speechHideTimer = null;

    function showSpeechBubble() {
        const bubble = document.getElementById('speech-bubble');
        if (bubble) bubble.classList.add('visible');
        if (speechHideTimer) clearTimeout(speechHideTimer);
    }

    function hideSpeechBubble(delay = 5000) {
        if (speechHideTimer) clearTimeout(speechHideTimer);
        speechHideTimer = setTimeout(() => {
            const bubble = document.getElementById('speech-bubble');
            if (bubble) bubble.classList.remove('visible');
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
                setTimeout(type, speed + Math.random() * 15);
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

        const dot = document.getElementById('mood-dot');
        if (dot) dot.className = 'mood-dot ' + mood;
        const label = document.getElementById('mood-label');
        if (label) label.textContent = `Mood: ${mood}`;

        showSpeechBubble();
        hideSpeechBubble(msg.length * 65 + 4000);
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

            avatar.moveToStation('scoreboard');

            setTimeout(() => speak(avatar.mood), 400);
            setTimeout(() => { if (avatar) avatar.sparkle(); }, 1200);

            setTimeout(() => {
                if (avatar) avatar.moveToStation('decisions');
            }, 5000);

            setTimeout(() => {
                if (avatar) avatar.moveToStation('home');
            }, 10000);
        }
    }

    async function generateReport() {
        const btn = document.getElementById('btn-generate');
        if (btn) { btn.textContent = 'Generating...'; btn.disabled = true; }

        if (avatar) avatar.moveToStation('center');
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
        if (avatar) { avatar.moveToStation('center'); avatar.wave(); }

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

        if (avatar) { avatar.moveToStation('tools'); avatar.talk(60); }

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

        // Avatar (GSAP-powered)
        if (typeof DollarAvatar !== 'undefined') {
            avatar = new DollarAvatar('dollar-canvas');
        }

        // PixiJS ambient particles (GPU-accelerated)
        const ambientCanvas = document.getElementById('ambient-canvas');
        if (ambientCanvas && typeof PIXI !== 'undefined') {
            new AmbientParticles(ambientCanvas);
        }

        // Buttons
        document.getElementById('btn-generate')?.addEventListener('click', generateReport);
        document.getElementById('btn-demo')?.addEventListener('click', loadDemo);
        document.getElementById('btn-evaluate-capital')?.addEventListener('click', evaluateProject);

        // WebSocket + Loom
        connectWebSocket();
        checkLoomConnection();

        // Start speech bubble tracker
        bubbleTracker();

        // Entrance choreography
        setTimeout(() => {
            if (avatar) avatar.wave();
            speak('idle');
        }, 600);
    });
})();
