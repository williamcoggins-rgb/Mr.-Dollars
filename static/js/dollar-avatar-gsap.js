/**
 * Mr. Dollars — GSAP-Powered Animated Avatar v3
 *
 * Full rewrite using GreenSock (GSAP) for all animation state management.
 * Canvas drawing stays procedural; every animated *value* is now a GSAP tween.
 *
 * GSAP advantages over the vanilla RAF approach:
 *   - Timeline-based choreography (wave, talk, sparkle are timelines)
 *   - Professional easing library (elastic, back, bounce, expo, custom)
 *   - gsap.ticker replaces manual requestAnimationFrame
 *   - gsap.quickTo() for silky 60fps position tracking
 *   - Automatic overwrite management — no state collisions
 *   - .pause() / .resume() / .timeScale() for free
 *
 * 12 Principles of Animation — same coverage as v2:
 *   1. Squash & Stretch    — GSAP elastic easing on bounces
 *   2. Anticipation         — timeline wind-up before wave
 *   3. Staging              — clear silhouette, readable poses
 *   4. Straight-ahead       — smooth GSAP interpolation
 *   5. Follow-through       — hat spring via GSAP elastic
 *   6. Ease in / Ease out   — GSAP Power2-4, Back, Expo
 *   7. Arcs                 — arm/leg motion paths
 *   8. Secondary action     — sparkle particle system
 *   9. Timing               — GSAP duration/delay control
 *  10. Exaggeration         — oversized eyes, big expressions
 *  11. Solid drawing        — consistent volume
 *  12. Appeal               — friendly proportions
 *
 * 320×400 canvas, scale 0.62.
 * Same public API as v2 — drop-in replacement.
 */

class DollarAvatar {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        if (!this.canvas) return;
        this.ctx = this.canvas.getContext('2d');

        this.charW = 320;
        this.charH = 400;

        // ── Core state ──
        this.mood = 'confident';
        this.t = 0;
        this.mouseX = 0.5;
        this.mouseY = 0.5;

        // ── Blink (driven by gsap.delayedCall) ──
        this.eyeOpen = 1.0;
        this._blinkCall = null;

        // ── Talk (driven by GSAP timeline) ──
        this.mouthOpenness = 0;
        this.isTalking = false;
        this._talkTL = null;

        // ── Wave (GSAP timeline with anticipation) ──
        this.wavePhase = 0;
        this.isWaving = false;
        this._waveTL = null;

        // ── Squash & Stretch (GSAP tween) ──
        this.squashX = 1;
        this.squashY = 1;

        // ── Follow-through: hat lag (GSAP elastic) ──
        this.hatLagAngle = 0;

        // ── Idle breathing (continuous GSAP tween) ──
        this.breathScale = 1;

        // ── Idle bob (continuous GSAP tweens) ──
        this.bobX = 0;
        this.bobY = 0;
        this.tilt = 0;

        // ── Sparkles (particle array, updated in ticker) ──
        this.sparkles = [];

        // ── Roaming position ──
        this.posX = window.innerWidth - this.charW - 40;
        this.posY = 60;
        this.targetX = this.posX;
        this.targetY = this.posY;
        this.facingLeft = false;
        this.walkSpeed = 0;

        // ── Roaming timer ──
        this.currentStation = 'home';
        this._roamCall = null;

        // ── Arm swing (idle secondary motion) ──
        this.leftArmSwing = 0;
        this.rightArmSwing = 0;

        // ── Leg walk phase ──
        this.legPhase = 0;

        this._updateStations();
        this._setupCanvas();
        this._bindEvents();
        this._startGSAP();
    }

    // ════════════════════════════════════════════════
    //  SETUP
    // ════════════════════════════════════════════════

    _setupCanvas() {
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        this.canvas.width = this.charW * dpr;
        this.canvas.height = this.charH * dpr;
        this.canvas.style.width = this.charW + 'px';
        this.canvas.style.height = this.charH + 'px';
        this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        this.w = this.charW;
        this.h = this.charH;
        this.scale = 0.62;
        this._applyPosition();
    }

    _applyPosition() {
        this.posX = Math.max(-40, Math.min(window.innerWidth - this.charW + 40, this.posX));
        this.posY = Math.max(40, Math.min(window.innerHeight - this.charH + 40, this.posY));
        this.canvas.style.left = Math.round(this.posX) + 'px';
        this.canvas.style.top = Math.round(this.posY) + 'px';
    }

    _updateStations() {
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        this.stations = {
            home:       { x: vw - this.charW - 40, y: 60 },
            scoreboard: { x: vw * 0.55,  y: 120 },
            decisions:  { x: vw * 0.08,  y: vh * 0.35 },
            actions:    { x: vw * 0.55,  y: vh * 0.35 },
            tools:      { x: vw * 0.25,  y: vh * 0.6 },
            center:     { x: (vw - this.charW) / 2, y: vh * 0.2 },
        };
    }

    _bindEvents() {
        document.addEventListener('mousemove', (e) => {
            this.mouseX = e.clientX / window.innerWidth;
            this.mouseY = e.clientY / window.innerHeight;
        });

        this.canvas.addEventListener('click', () => {
            this.wave();
            this.sparkle();
        });

        window.addEventListener('resize', () => this._updateStations());
    }

    // ════════════════════════════════════════════════
    //  GSAP ENGINE — replaces the vanilla RAF loop
    // ════════════════════════════════════════════════

    _startGSAP() {
        // ── Continuous idle loops (infinite repeat) ──

        // Breathing — subtle scale oscillation
        gsap.to(this, {
            breathScale: 1.008,
            duration: 2.5,
            ease: 'sine.inOut',
            yoyo: true,
            repeat: -1,
        });

        // Idle bob — vertical sinusoidal sway (principle 7: arcs)
        gsap.to(this, {
            bobY: 6 * this.scale,
            duration: 1.75,
            ease: 'sine.inOut',
            yoyo: true,
            repeat: -1,
        });

        // Idle bob — horizontal drift
        gsap.to(this, {
            bobX: 2 * this.scale,
            duration: 2.85,
            ease: 'sine.inOut',
            yoyo: true,
            repeat: -1,
        });

        // Idle body tilt
        gsap.to(this, {
            tilt: 0.03,
            duration: 1.85,
            ease: 'sine.inOut',
            yoyo: true,
            repeat: -1,
        });

        // Hat follow-through — spring-like lag behind body tilt
        gsap.to(this, {
            hatLagAngle: -0.054,
            duration: 2.1,
            ease: 'elastic.out(1, 0.4)',
            yoyo: true,
            repeat: -1,
        });

        // Left arm idle swing (secondary action)
        gsap.to(this, {
            leftArmSwing: 12 * (Math.PI / 180),
            duration: 1.25,
            ease: 'sine.inOut',
            yoyo: true,
            repeat: -1,
            delay: 0.4,
        });

        // Right arm idle swing (mirror, offset phase)
        gsap.to(this, {
            rightArmSwing: -12 * (Math.PI / 180),
            duration: 1.25,
            ease: 'sine.inOut',
            yoyo: true,
            repeat: -1,
        });

        // ── Blink scheduler ──
        this._scheduleBlink();

        // ── Roaming scheduler ──
        this._scheduleRoam();

        // ── Render loop — gsap.ticker replaces requestAnimationFrame ──
        gsap.ticker.add((time, deltaTime) => {
            this.t = time;
            this._updateParticles(deltaTime / 1000);
            this._updateMovement();
            this._updateLegPhase(deltaTime / 1000);
            this._draw();
        });
    }

    // ════════════════════════════════════════════════
    //  BLINK SYSTEM — gsap.delayedCall + tween
    // ════════════════════════════════════════════════

    _scheduleBlink() {
        const delay = 2.0 + Math.random() * 3.0; // 2–5 seconds between blinks
        this._blinkCall = gsap.delayedCall(delay, () => this._doBlink());
    }

    _doBlink() {
        // Close eyes
        gsap.to(this, {
            eyeOpen: 0.05,
            duration: 0.06,
            ease: 'power2.in',
            onComplete: () => {
                // Open eyes
                gsap.to(this, {
                    eyeOpen: 1.0,
                    duration: 0.1,
                    ease: 'power2.out',
                    onComplete: () => this._scheduleBlink(),
                });
            },
        });
    }

    // ════════════════════════════════════════════════
    //  ROAMING SYSTEM — gsap.delayedCall + gsap.to
    // ════════════════════════════════════════════════

    _scheduleRoam() {
        const delay = 4.5 + Math.random() * 6.0;
        this._roamCall = gsap.delayedCall(delay, () => {
            if (!this.isTalking) {
                this._pickNextStation();
            }
            this._scheduleRoam();
        });
    }

    _pickNextStation() {
        const keys = Object.keys(this.stations).filter(k => k !== this.currentStation);
        const next = keys[Math.floor(Math.random() * keys.length)];
        this.currentStation = next;
        const st = this.stations[next];
        if (st) {
            this.targetX = st.x + (Math.random() - 0.5) * 60;
            this.targetY = st.y + (Math.random() - 0.5) * 30;
        }
    }

    _updateMovement() {
        const dx = this.targetX - this.posX;
        const dy = this.targetY - this.posY;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist > 3) {
            const ease = 0.04;
            this.posX += dx * ease;
            this.posY += dy * ease;
            this.walkSpeed = Math.min(dist * 0.025, 1);
            this.facingLeft = dx < -5;
            this._applyPosition();
        } else {
            this.walkSpeed *= 0.9;
        }
    }

    _updateLegPhase(dt) {
        const walkMult = this.walkSpeed > 0.1 ? 7 : 2.5;
        this.legPhase += dt * walkMult;
    }

    // ════════════════════════════════════════════════
    //  SPARKLE PARTICLES — still tick-based (lightweight)
    // ════════════════════════════════════════════════

    _updateParticles(dt) {
        this.sparkles = this.sparkles.filter(s => {
            s.life -= dt * 1.1;
            s.y -= s.vy;
            s.x += s.vx;
            s.vy *= 0.97;
            s.vx *= 0.99;
            s.rotation += s.rotSpeed;
            return s.life > 0;
        });
    }

    // ════════════════════════════════════════════════
    //  DRAW — same canvas rendering, driven by GSAP values
    // ════════════════════════════════════════════════

    _draw() {
        const ctx = this.ctx;
        const cx = this.w / 2;
        const cy = this.h / 2 + 30;
        const s = this.scale;

        ctx.clearRect(0, 0, this.w, this.h);
        ctx.save();
        ctx.translate(cx, cy);

        // Idle bob + tilt (values driven by GSAP continuous tweens)
        ctx.translate(this.bobX, this.bobY);
        ctx.rotate(this.tilt);

        // Flip when facing left
        if (this.facingLeft) ctx.scale(-1, 1);

        // Squash/stretch + breathing (all GSAP-driven)
        ctx.scale(
            this.squashX * this.breathScale,
            this.squashY * (2 - this.breathScale)
        );

        // Draw order: shadow, legs, left arm, body, face, right arm, hat
        this._drawShadow(ctx, s);
        this._drawLegs(ctx, s);
        this._drawLeftArm(ctx, s);
        this._drawBody(ctx, s);
        this._drawFace(ctx, s);
        this._drawRightArm(ctx, s);
        this._drawHat(ctx, s);

        ctx.restore();

        // Sparkles in screen space
        this._drawSparkles(ctx);
    }

    // ════════════════════════════════════════════════
    //  BODY PARTS — procedural canvas (unchanged from v2)
    // ════════════════════════════════════════════════

    _drawShadow(ctx, s) {
        ctx.save();
        ctx.translate(0, 115 * s);
        ctx.scale(1, 0.25);
        ctx.beginPath();
        ctx.ellipse(0, 0, 80 * s, 50 * s, 0, 0, Math.PI * 2);
        const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, 80 * s);
        grad.addColorStop(0, 'rgba(0, 0, 0, 0.18)');
        grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = grad;
        ctx.fill();
        ctx.restore();
    }

    _drawLegs(ctx, s) {
        const baseSwing = this.mood === 'celebrating' ? 12 : 4;
        const legSwing = baseSwing + this.walkSpeed * 22;
        const leftAngle = Math.sin(this.legPhase) * legSwing * (Math.PI / 180);
        const rightAngle = Math.sin(this.legPhase + Math.PI) * legSwing * (Math.PI / 180);

        [-1, 1].forEach((side, i) => {
            const angle = i === 0 ? leftAngle : rightAngle;
            ctx.save();
            ctx.translate(side * 28 * s, 78 * s);
            ctx.rotate(angle);

            // Leg
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(side * 3 * s, 40 * s);
            ctx.strokeStyle = '#1B5E20';
            ctx.lineWidth = 10 * s;
            ctx.lineCap = 'round';
            ctx.stroke();

            // Shoe with gradient highlight
            ctx.beginPath();
            ctx.ellipse(side * 3 * s, 44 * s, 17 * s, 10 * s, side * 0.2, 0, Math.PI * 2);
            const shoeGrad = ctx.createLinearGradient(
                side * 3 * s - 17 * s, 34 * s,
                side * 3 * s + 17 * s, 54 * s
            );
            shoeGrad.addColorStop(0, '#5C3300');
            shoeGrad.addColorStop(1, '#3A1F00');
            ctx.fillStyle = shoeGrad;
            ctx.fill();
            ctx.strokeStyle = '#2E1800';
            ctx.lineWidth = 1.5 * s;
            ctx.stroke();

            // Shoe shine
            ctx.beginPath();
            ctx.ellipse(side * 1 * s, 40 * s, 6 * s, 3 * s, 0, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(255,255,255,0.08)';
            ctx.fill();

            ctx.restore();
        });
    }

    _drawLeftArm(ctx, s) {
        ctx.save();
        ctx.translate(-72 * s, -10 * s);

        // Secondary motion: GSAP-driven idle arm swing
        ctx.rotate(this.leftArmSwing - 0.3);

        // Arm
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.quadraticCurveTo(-18 * s, 35 * s, -28 * s, 62 * s);
        ctx.strokeStyle = '#1B5E20';
        ctx.lineWidth = 9 * s;
        ctx.lineCap = 'round';
        ctx.stroke();

        this._drawGlove(ctx, -28 * s, 62 * s, s, false);
        ctx.restore();
    }

    _drawRightArm(ctx, s) {
        ctx.save();
        ctx.translate(72 * s, -10 * s);

        if (this.isWaving) {
            // Wave animation — wavePhase driven by GSAP timeline
            const wave = Math.sin(this.wavePhase * 3.5) * 25 * (Math.PI / 180);
            ctx.rotate(-1.3 + wave);

            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.quadraticCurveTo(18 * s, -30 * s, 24 * s, -62 * s);
            ctx.strokeStyle = '#1B5E20';
            ctx.lineWidth = 9 * s;
            ctx.lineCap = 'round';
            ctx.stroke();

            this._drawGlove(ctx, 24 * s, -62 * s, s, true);
        } else {
            // Idle — GSAP-driven swing
            ctx.rotate(-this.rightArmSwing + 0.3);

            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.quadraticCurveTo(18 * s, 35 * s, 28 * s, 62 * s);
            ctx.strokeStyle = '#1B5E20';
            ctx.lineWidth = 9 * s;
            ctx.lineCap = 'round';
            ctx.stroke();

            this._drawGlove(ctx, 28 * s, 62 * s, s, true);
        }

        ctx.restore();
    }

    _drawGlove(ctx, x, y, s, isRight) {
        ctx.save();
        ctx.translate(x, y);

        // Glove body
        ctx.beginPath();
        ctx.arc(0, 0, 15 * s, 0, Math.PI * 2);
        const gloveGrad = ctx.createRadialGradient(-3 * s, -3 * s, 0, 0, 0, 15 * s);
        gloveGrad.addColorStop(0, '#FFFFFF');
        gloveGrad.addColorStop(1, '#E8E8E8');
        ctx.fillStyle = gloveGrad;
        ctx.fill();
        ctx.strokeStyle = '#C0C0C0';
        ctx.lineWidth = 1.5 * s;
        ctx.stroke();

        // Thumb
        const dir = isRight ? 1 : -1;
        ctx.beginPath();
        ctx.ellipse(dir * 12 * s, -5 * s, 7 * s, 6 * s, dir * 0.5, 0, Math.PI * 2);
        ctx.fillStyle = '#FFFFFF';
        ctx.fill();
        ctx.strokeStyle = '#C0C0C0';
        ctx.lineWidth = 1 * s;
        ctx.stroke();

        // Finger lines
        ctx.beginPath();
        ctx.moveTo(-4 * s, -4 * s); ctx.lineTo(-4 * s, 6 * s);
        ctx.moveTo(2 * s, -5 * s);  ctx.lineTo(2 * s, 6 * s);
        ctx.strokeStyle = '#D0D0D0';
        ctx.lineWidth = 0.8 * s;
        ctx.stroke();

        ctx.restore();
    }

    _drawBody(ctx, s) {
        const bw = 135 * s;
        const bh = 158 * s;
        const r = 18 * s;

        ctx.save();
        ctx.translate(0, -15 * s);

        const colors = this._getMoodBodyColors();

        // Main body gradient
        const grad = ctx.createLinearGradient(-bw / 2, -bh / 2, bw / 2, bh / 2);
        grad.addColorStop(0, colors.light);
        grad.addColorStop(0.5, colors.main);
        grad.addColorStop(1, colors.dark);

        this._roundRect(ctx, -bw / 2, -bh / 2, bw, bh, r);
        ctx.fillStyle = grad;
        ctx.fill();

        // Outer border
        ctx.strokeStyle = colors.border;
        ctx.lineWidth = 3.5 * s;
        ctx.stroke();

        // Inner border
        this._roundRect(ctx, -bw / 2 + 10 * s, -bh / 2 + 10 * s, bw - 20 * s, bh - 20 * s, r - 5 * s);
        ctx.strokeStyle = colors.border;
        ctx.lineWidth = 1.5 * s;
        ctx.stroke();

        // Corner flourishes
        const inset = 16 * s;
        [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([dx, dy]) => {
            this._drawCornerFlourish(ctx, dx * (bw / 2 - inset), dy * (bh / 2 - inset), s, colors.accent);
        });

        // $ watermark
        ctx.save();
        ctx.globalAlpha = 0.06;
        ctx.font = `bold ${120 * s}px serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = colors.dark;
        ctx.fillText('$', 0, 8 * s);
        ctx.restore();

        // "MR. DOLLARS" at top
        ctx.font = `bold ${9 * s}px 'Inter', sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillStyle = colors.accent;
        ctx.fillText('MR. DOLLARS', 0, -bh / 2 + 26 * s);

        // Bottom text
        ctx.font = `${7.5 * s}px 'Inter', sans-serif`;
        ctx.fillStyle = colors.accent;
        ctx.fillText('FINANCIAL INTELLIGENCE', 0, bh / 2 - 18 * s);

        ctx.restore();
    }

    _drawCornerFlourish(ctx, x, y, s, color) {
        ctx.save();
        ctx.translate(x, y);
        // Outer ring
        ctx.beginPath();
        ctx.arc(0, 0, 7 * s, 0, Math.PI * 2);
        ctx.strokeStyle = color;
        ctx.lineWidth = 1 * s;
        ctx.stroke();
        // Inner dot
        ctx.beginPath();
        ctx.arc(0, 0, 3.5 * s, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.globalAlpha = 0.5;
        ctx.fill();
        ctx.restore();
    }

    _drawFace(ctx, s) {
        ctx.save();
        ctx.translate(0, -22 * s);

        const browRaise = this.mood === 'alert' ? 7 * s :
                          this.mood === 'celebrating' ? 5 * s : 0;

        const lookX = (this.mouseX - 0.5) * 14 * s;
        const lookY = (this.mouseY - 0.5) * 10 * s;

        this._drawEye(ctx, -26 * s, -12 * s, s, lookX, lookY, browRaise, false);
        this._drawEye(ctx,  26 * s, -12 * s, s, lookX, lookY, browRaise, true);
        this._drawMouth(ctx, 0, 28 * s, s);

        // Blush (celebrating)
        if (this.mood === 'celebrating') {
            [-1, 1].forEach(side => {
                ctx.beginPath();
                ctx.ellipse(side * 40 * s, 14 * s, 12 * s, 7 * s, 0, 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(255, 120, 120, 0.2)';
                ctx.fill();
            });
        }

        ctx.restore();
    }

    _drawEye(ctx, ex, ey, s, lookX, lookY, browRaise, isRight) {
        ctx.save();
        ctx.translate(ex, ey);

        // eyeOpen is now GSAP-driven (0.05 = closed, 1.0 = open)
        const eyeOpen = this.eyeOpen;

        // Eyebrow
        ctx.beginPath();
        ctx.moveTo(-16 * s, -24 * s - browRaise);
        ctx.quadraticCurveTo(0, -30 * s - browRaise - (this.mood === 'alert' ? 5 * s : 0),
                            16 * s, -24 * s - browRaise);
        ctx.strokeStyle = '#1a3a1a';
        ctx.lineWidth = 3.5 * s;
        ctx.lineCap = 'round';
        ctx.stroke();

        // Eye white (scaled by blink)
        ctx.save();
        ctx.scale(1, eyeOpen);
        ctx.beginPath();
        ctx.ellipse(0, 0, 21 * s, 26 * s, 0, 0, Math.PI * 2);
        ctx.fillStyle = '#FFFFFF';
        ctx.fill();
        ctx.strokeStyle = '#1a3a1a';
        ctx.lineWidth = 2.5 * s;
        ctx.stroke();

        // Iris
        ctx.beginPath();
        ctx.arc(lookX * 0.5, lookY * 0.4, 13 * s, 0, Math.PI * 2);
        const irisGrad = ctx.createRadialGradient(lookX * 0.5, lookY * 0.4, 2 * s, lookX * 0.5, lookY * 0.4, 13 * s);
        irisGrad.addColorStop(0, '#43A047');
        irisGrad.addColorStop(0.7, '#2E7D32');
        irisGrad.addColorStop(1, '#1B5E20');
        ctx.fillStyle = irisGrad;
        ctx.fill();

        // Pupil
        ctx.beginPath();
        ctx.arc(lookX * 0.6, lookY * 0.5, 7 * s, 0, Math.PI * 2);
        ctx.fillStyle = '#0a0a0a';
        ctx.fill();

        // Eye shine (large)
        ctx.beginPath();
        ctx.arc(lookX * 0.3 + 5 * s, lookY * 0.2 - 6 * s, 5 * s, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.92)';
        ctx.fill();

        // Eye shine (small)
        ctx.beginPath();
        ctx.arc(lookX * 0.3 - 3 * s, lookY * 0.2 + 4 * s, 2.5 * s, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
        ctx.fill();

        ctx.restore(); // un-scale blink

        // Half-lid (cautious mood)
        if (this.mood === 'cautious') {
            ctx.beginPath();
            ctx.ellipse(0, -6 * s, 23 * s, 16 * s, 0, Math.PI, Math.PI * 2);
            const colors = this._getMoodBodyColors();
            ctx.fillStyle = colors.main;
            ctx.fill();
        }

        ctx.restore();
    }

    _drawMouth(ctx, mx, my, s) {
        ctx.save();
        ctx.translate(mx, my);

        const open = this.mouthOpenness;

        switch (this.mood) {
            case 'celebrating': {
                ctx.beginPath();
                ctx.moveTo(-28 * s, -5 * s);
                ctx.quadraticCurveTo(0, 22 * s + open * 16 * s, 28 * s, -5 * s);
                if (open > 0.25) {
                    ctx.quadraticCurveTo(0, 6 * s, -28 * s, -5 * s);
                    ctx.fillStyle = '#7B0000';
                    ctx.fill();
                    // Tongue
                    ctx.beginPath();
                    ctx.ellipse(0, 6 * s + open * 6 * s, 10 * s, 6 * s, 0, 0, Math.PI);
                    ctx.fillStyle = '#FF6B6B';
                    ctx.fill();
                }
                ctx.beginPath();
                ctx.moveTo(-28 * s, -5 * s);
                ctx.quadraticCurveTo(0, 22 * s + open * 16 * s, 28 * s, -5 * s);
                ctx.strokeStyle = '#1a3a1a';
                ctx.lineWidth = 3 * s;
                ctx.lineCap = 'round';
                ctx.stroke();
                break;
            }
            case 'confident': {
                ctx.beginPath();
                ctx.moveTo(-22 * s, 0);
                ctx.quadraticCurveTo(0, 16 * s + open * 14 * s, 22 * s, 0);
                if (open > 0.25) {
                    ctx.quadraticCurveTo(0, 5 * s, -22 * s, 0);
                    ctx.fillStyle = '#7B0000';
                    ctx.fill();
                }
                ctx.beginPath();
                ctx.moveTo(-22 * s, 0);
                ctx.quadraticCurveTo(0, 16 * s + open * 14 * s, 22 * s, 0);
                ctx.strokeStyle = '#1a3a1a';
                ctx.lineWidth = 3 * s;
                ctx.lineCap = 'round';
                ctx.stroke();
                break;
            }
            case 'cautious': {
                ctx.beginPath();
                ctx.moveTo(-18 * s, 2 * s);
                ctx.quadraticCurveTo(0, -4 * s + open * 12 * s, 18 * s, 2 * s);
                if (open > 0.25) {
                    ctx.quadraticCurveTo(0, 6 * s, -18 * s, 2 * s);
                    ctx.fillStyle = '#7B0000';
                    ctx.fill();
                }
                ctx.beginPath();
                ctx.moveTo(-18 * s, 2 * s);
                ctx.quadraticCurveTo(0, -4 * s + open * 12 * s, 18 * s, 2 * s);
                ctx.strokeStyle = '#1a3a1a';
                ctx.lineWidth = 3 * s;
                ctx.lineCap = 'round';
                ctx.stroke();
                break;
            }
            case 'alert': {
                const oSize = 9 + open * 9;
                ctx.beginPath();
                ctx.ellipse(0, 2 * s, oSize * s, (oSize + 5) * s, 0, 0, Math.PI * 2);
                ctx.fillStyle = '#4a0000';
                ctx.fill();
                ctx.strokeStyle = '#1a3a1a';
                ctx.lineWidth = 3 * s;
                ctx.stroke();
                break;
            }
        }

        ctx.restore();
    }

    _drawHat(ctx, s) {
        ctx.save();
        ctx.translate(0, -15 * s);

        // Follow-through: hat lags behind body (GSAP elastic-driven)
        ctx.rotate(this.hatLagAngle);

        const hatY = -78 * s;

        // Brim
        ctx.beginPath();
        ctx.ellipse(0, hatY + 2 * s, 54 * s, 12 * s, 0, 0, Math.PI * 2);
        const brimGrad = ctx.createLinearGradient(-54 * s, hatY, 54 * s, hatY + 4 * s);
        brimGrad.addColorStop(0, '#22223B');
        brimGrad.addColorStop(1, '#141428');
        ctx.fillStyle = brimGrad;
        ctx.fill();
        ctx.strokeStyle = '#FFD700';
        ctx.lineWidth = 2 * s;
        ctx.stroke();

        // Hat body
        this._roundRect(ctx, -34 * s, hatY - 46 * s, 68 * s, 48 * s, 8 * s);
        const hatGrad = ctx.createLinearGradient(-34 * s, hatY - 46 * s, 34 * s, hatY + 2 * s);
        hatGrad.addColorStop(0, '#2A2A4A');
        hatGrad.addColorStop(1, '#1a1a30');
        ctx.fillStyle = hatGrad;
        ctx.fill();
        ctx.strokeStyle = '#333355';
        ctx.lineWidth = 1.5 * s;
        ctx.stroke();

        // Highlight on hat
        ctx.beginPath();
        ctx.ellipse(-8 * s, hatY - 30 * s, 14 * s, 18 * s, -0.2, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255,255,255,0.03)';
        ctx.fill();

        // Gold band
        const bandGrad = ctx.createLinearGradient(-34 * s, hatY - 8 * s, 34 * s, hatY);
        bandGrad.addColorStop(0, '#C8902E');
        bandGrad.addColorStop(0.5, '#FFD700');
        bandGrad.addColorStop(1, '#C8902E');
        ctx.fillStyle = bandGrad;
        ctx.fillRect(-34 * s, hatY - 8 * s, 68 * s, 10 * s);

        // $ on band
        ctx.font = `bold ${12 * s}px serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#1a1a2e';
        ctx.fillText('$', 0, hatY - 3 * s);

        ctx.restore();
    }

    // ════════════════════════════════════════════════
    //  EFFECTS
    // ════════════════════════════════════════════════

    _drawSparkles(ctx) {
        for (const sp of this.sparkles) {
            ctx.save();
            ctx.translate(sp.x, sp.y);
            ctx.rotate(sp.rotation);
            ctx.globalAlpha = sp.life * sp.life; // quadratic fade

            const sz = sp.size * (0.3 + sp.life * 0.7);
            ctx.beginPath();
            for (let i = 0; i < 4; i++) {
                const angle = (i / 4) * Math.PI * 2;
                const px = Math.cos(angle) * sz;
                const py = Math.sin(angle) * sz;
                if (i === 0) ctx.moveTo(px, py);
                else ctx.lineTo(px, py);
                const mid = angle + Math.PI / 4;
                ctx.lineTo(Math.cos(mid) * sz * 0.3, Math.sin(mid) * sz * 0.3);
            }
            ctx.closePath();
            ctx.fillStyle = sp.color;
            ctx.fill();

            ctx.restore();
        }
    }

    // ════════════════════════════════════════════════
    //  UTILITY
    // ════════════════════════════════════════════════

    _roundRect(ctx, x, y, w, h, r) {
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + w - r, y);
        ctx.quadraticCurveTo(x + w, y, x + w, y + r);
        ctx.lineTo(x + w, y + h - r);
        ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        ctx.lineTo(x + r, y + h);
        ctx.quadraticCurveTo(x, y + h, x, y + h - r);
        ctx.lineTo(x, y + r);
        ctx.quadraticCurveTo(x, y, x + r, y);
        ctx.closePath();
    }

    _getMoodBodyColors() {
        switch (this.mood) {
            case 'confident':
                return { light: '#5CB85C', main: '#3D8B3D', dark: '#2E6B2E', border: '#1B5E20', accent: '#1B5E20' };
            case 'celebrating':
                return { light: '#81C784', main: '#4CAF50', dark: '#388E3C', border: '#FFD700', accent: '#FFD700' };
            case 'cautious':
                return { light: '#A5D6A7', main: '#66996B', dark: '#4A7A4F', border: '#5D7A3E', accent: '#4A6A2E' };
            case 'alert':
                return { light: '#E57373', main: '#C06040', dark: '#8B3A2A', border: '#B71C1C', accent: '#FFD700' };
            default:
                return { light: '#5CB85C', main: '#3D8B3D', dark: '#2E6B2E', border: '#1B5E20', accent: '#1B5E20' };
        }
    }

    // ════════════════════════════════════════════════
    //  PUBLIC API — same interface as v2
    // ════════════════════════════════════════════════

    setMood(mood) {
        if (['confident', 'cautious', 'alert', 'celebrating'].includes(mood)) {
            this.mood = mood;
        }
    }

    setMoodFromReport(report) {
        if (!report || !report.scoreboard) return;

        const s = report.scoreboard;
        const decisions = report.decisions || [];
        const hasReject = decisions.some(d => d.verdict === 'REJECT');
        const hasCashProtection = decisions.some(d => d.key === 'cash_protection_mode');

        if (hasCashProtection) this.setMood('alert');
        else if (hasReject) this.setMood('cautious');
        else if (s.net_margin > 0.3 && s.utilization > 0.7 && s.rebook_rate > 0.45) this.setMood('celebrating');
        else this.setMood('confident');
    }

    /**
     * Move to a specific screen position.
     * Uses GSAP for smooth eased movement.
     */
    moveTo(x, y) {
        this.targetX = x;
        this.targetY = y;
        // Reset roam timer so avatar stays at target
        if (this._roamCall) this._roamCall.restart(true);
    }

    /**
     * Move to a named station.
     */
    moveToStation(name) {
        this._updateStations();
        const st = this.stations[name];
        if (st) {
            this.currentStation = name;
            this.targetX = st.x;
            this.targetY = st.y;
            if (this._roamCall) this._roamCall.restart(true);
        }
    }

    /**
     * Get the current position (for speech bubble tracking).
     */
    getPosition() {
        return {
            x: this.posX + this.charW / 2,
            y: this.posY,
            left: this.posX,
            top: this.posY,
            right: this.posX + this.charW,
            bottom: this.posY + this.charH,
        };
    }

    /**
     * Talk — GSAP timeline drives mouthOpenness with organic phoneme simulation.
     * Two overlapping sine-approximating tweens create consonant/vowel rhythm.
     */
    talk(duration = 120) {
        // Kill any existing talk timeline
        if (this._talkTL) this._talkTL.kill();

        this.isTalking = true;
        const durationSec = duration / 60; // convert frames to seconds

        // Build a timeline of rapid open/close cycles
        const tl = gsap.timeline({
            onComplete: () => {
                this.isTalking = false;
                gsap.to(this, { mouthOpenness: 0, duration: 0.15, ease: 'power2.out' });
            },
        });

        // Generate phoneme-like keyframes
        const cycleTime = 0.12; // each syllable ~120ms
        const cycles = Math.floor(durationSec / cycleTime);

        for (let i = 0; i < cycles; i++) {
            // Vary openness to simulate speech rhythm
            const openness = 0.2 + Math.random() * 0.7;
            const hold = cycleTime * (0.4 + Math.random() * 0.3);
            const close = cycleTime - hold;

            tl.to(this, {
                mouthOpenness: openness,
                duration: hold,
                ease: 'power1.out',
            });
            tl.to(this, {
                mouthOpenness: 0.1 + Math.random() * 0.15,
                duration: close,
                ease: 'power1.in',
            });
        }

        this._talkTL = tl;
    }

    /**
     * Wave — GSAP timeline with anticipation wind-up (principle 2).
     *
     * Sequence:
     *   1. Anticipation: arm pulls down slightly (0.15s)
     *   2. Snap up: arm raises to wave position (0.2s, back easing)
     *   3. Wave cycles: oscillate wavePhase (1.2s)
     *   4. Return: arm comes back down (0.3s)
     */
    wave() {
        if (this._waveTL) this._waveTL.kill();

        this.isWaving = true;
        this.wavePhase = 0;

        const tl = gsap.timeline({
            onComplete: () => {
                this.isWaving = false;
                this.wavePhase = 0;
            },
        });

        // 1. Anticipation — slight downward pull
        tl.to(this, {
            wavePhase: -0.3,
            duration: 0.15,
            ease: 'power2.in',
        });

        // 2. Snap up + wave oscillation
        tl.to(this, {
            wavePhase: Math.PI * 4, // multiple wave cycles
            duration: 1.4,
            ease: 'power1.inOut',
        });

        // 3. Return
        tl.to(this, {
            wavePhase: 0,
            duration: 0.25,
            ease: 'power2.inOut',
        });

        this._waveTL = tl;
    }

    /**
     * Sparkle — burst of gold star particles + GSAP squash/stretch bounce.
     */
    sparkle() {
        const cx = this.w / 2;
        const cy = this.h / 2;
        const colors = ['#FFD700', '#FFEC8B', '#FFF8DC', '#FFD700', '#A8E6A3'];

        for (let i = 0; i < 24; i++) {
            const angle = Math.random() * Math.PI * 2;
            this.sparkles.push({
                x: cx + Math.cos(angle) * 15,
                y: cy + Math.sin(angle) * 15 - 30,
                vx: Math.cos(angle) * (1 + Math.random() * 2.5),
                vy: Math.sin(angle) * (1 + Math.random() * 2) + 0.5,
                size: 5 + Math.random() * 12,
                life: 1.0,
                rotation: Math.random() * Math.PI,
                rotSpeed: (Math.random() - 0.5) * 0.15,
                color: colors[Math.floor(Math.random() * colors.length)],
            });
        }

        // Squash & stretch bounce — GSAP elastic easing (principle 1)
        gsap.timeline()
            .to(this, {
                squashX: 1.18,
                squashY: 0.85,
                duration: 0.12,
                ease: 'power3.out',
            })
            .to(this, {
                squashX: 0.92,
                squashY: 1.1,
                duration: 0.15,
                ease: 'power2.out',
            })
            .to(this, {
                squashX: 1,
                squashY: 1,
                duration: 0.5,
                ease: 'elastic.out(1, 0.3)',
            });
    }

    /**
     * Bounce — GSAP elastic squash/stretch (principle 1).
     */
    bounce() {
        gsap.timeline()
            .to(this, {
                squashY: 0.8,
                squashX: 1.15,
                duration: 0.1,
                ease: 'power3.out',
            })
            .to(this, {
                squashY: 1.15,
                squashX: 0.88,
                duration: 0.12,
                ease: 'power2.out',
            })
            .to(this, {
                squashX: 1,
                squashY: 1,
                duration: 0.6,
                ease: 'elastic.out(1, 0.3)',
            });
    }
}

window.DollarAvatar = DollarAvatar;
