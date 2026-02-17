/**
 * Mr. Dollars — Cartoon Dollar Bill Character
 *
 * Full cartoon character rendered on HTML5 Canvas 2D.
 * A dollar bill with big expressive eyes, cartoon arms with white gloves,
 * legs with shoes, and animated expressions. Inspired by classic cartoon
 * mascot style (Miss Minutes aesthetic, but as a dollar bill).
 *
 * Features:
 * - Smooth idle bobbing and swaying
 * - Eye tracking (follows mouse)
 * - Blinking animation
 * - Mouth shapes for moods and talking
 * - Arm waving and gestures
 * - Leg walk/tap animation
 * - Sparkle/shine effects
 * - Mood-reactive expressions and colors
 */

class DollarAvatar {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        if (!this.container) return;

        this.canvas = document.createElement('canvas');
        this.ctx = this.canvas.getContext('2d');
        this.container.appendChild(this.canvas);

        // State
        this.mood = 'confident';
        this.t = 0;
        this.mouseX = 0.5;
        this.mouseY = 0.5;

        // Animation state
        this.blinkTimer = 0;
        this.blinkDuration = 0;
        this.isBlinking = false;
        this.nextBlink = 120 + Math.random() * 180;

        this.talkPhase = 0;
        this.isTalking = false;
        this.talkTimer = 0;

        this.wavePhase = 0;
        this.isWaving = false;
        this.waveTimer = 0;

        this.sparkles = [];
        this.floatingDollars = [];

        // Squash/stretch for bounce
        this.squashX = 1;
        this.squashY = 1;
        this.targetSquashX = 1;
        this.targetSquashY = 1;

        // Expression overrides
        this.eyebrowRaise = 0;
        this.mouthOpenness = 0;

        this._initFloatingDollars();
        this._resize();
        this._bindEvents();
        this._animate();
    }

    _resize() {
        const rect = this.container.getBoundingClientRect();
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        this.w = rect.width;
        this.h = rect.height;
        this.canvas.width = this.w * dpr;
        this.canvas.height = this.h * dpr;
        this.canvas.style.width = this.w + 'px';
        this.canvas.style.height = this.h + 'px';
        this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

        // Character dimensions scale to canvas
        this.scale = Math.min(this.w, this.h) / 500;
    }

    _bindEvents() {
        this.container.addEventListener('mousemove', (e) => {
            const rect = this.container.getBoundingClientRect();
            this.mouseX = (e.clientX - rect.left) / rect.width;
            this.mouseY = (e.clientY - rect.top) / rect.height;
        });

        this.container.addEventListener('click', () => {
            this.wave();
            this.sparkle();
        });

        window.addEventListener('resize', () => this._resize());
    }

    _initFloatingDollars() {
        for (let i = 0; i < 8; i++) {
            this.floatingDollars.push({
                x: Math.random(),
                y: Math.random(),
                size: 8 + Math.random() * 14,
                speed: 0.2 + Math.random() * 0.4,
                opacity: 0.1 + Math.random() * 0.15,
                phase: Math.random() * Math.PI * 2,
            });
        }
    }

    // --- Main draw loop ---

    _animate() {
        const tick = () => {
            requestAnimationFrame(tick);
            this.t += 1 / 60;
            this._update();
            this._draw();
        };
        tick();
    }

    _update() {
        // Blink logic
        this.blinkTimer++;
        if (!this.isBlinking && this.blinkTimer > this.nextBlink) {
            this.isBlinking = true;
            this.blinkDuration = 0;
        }
        if (this.isBlinking) {
            this.blinkDuration++;
            if (this.blinkDuration > 12) {
                this.isBlinking = false;
                this.blinkTimer = 0;
                this.nextBlink = 120 + Math.random() * 240;
            }
        }

        // Talk animation
        if (this.isTalking) {
            this.talkPhase += 0.3;
            this.talkTimer--;
            this.mouthOpenness = 0.3 + Math.abs(Math.sin(this.talkPhase)) * 0.7;
            if (this.talkTimer <= 0) {
                this.isTalking = false;
                this.mouthOpenness = 0;
            }
        }

        // Wave animation
        if (this.isWaving) {
            this.wavePhase += 0.12;
            this.waveTimer--;
            if (this.waveTimer <= 0) {
                this.isWaving = false;
                this.wavePhase = 0;
            }
        }

        // Squash/stretch smoothing
        this.squashX += (this.targetSquashX - this.squashX) * 0.15;
        this.squashY += (this.targetSquashY - this.squashY) * 0.15;
        this.targetSquashX += (1 - this.targetSquashX) * 0.08;
        this.targetSquashY += (1 - this.targetSquashY) * 0.08;

        // Sparkle decay
        this.sparkles = this.sparkles.filter(s => {
            s.life -= 0.02;
            s.y -= s.vy;
            s.x += s.vx;
            s.vy *= 0.98;
            return s.life > 0;
        });
    }

    _draw() {
        const ctx = this.ctx;
        const cx = this.w / 2;
        const cy = this.h / 2 + 10;
        const s = this.scale;

        ctx.clearRect(0, 0, this.w, this.h);

        // Background floating dollar signs
        this._drawFloatingDollars(ctx);

        ctx.save();
        ctx.translate(cx, cy);

        // Idle bob
        const bobY = Math.sin(this.t * 2.0) * 8 * s;
        const bobX = Math.sin(this.t * 1.3) * 3 * s;
        const tilt = Math.sin(this.t * 1.7) * 0.03;
        ctx.translate(bobX, bobY);
        ctx.rotate(tilt);

        // Squash/stretch
        ctx.scale(this.squashX, this.squashY);

        // Draw character parts (back to front)
        this._drawShadow(ctx, s);
        this._drawLegs(ctx, s);
        this._drawLeftArm(ctx, s);
        this._drawBody(ctx, s);
        this._drawFace(ctx, s);
        this._drawRightArm(ctx, s);
        this._drawHat(ctx, s);

        ctx.restore();

        // Sparkles (drawn in world space)
        this._drawSparkles(ctx);
    }

    // --- Body parts ---

    _drawShadow(ctx, s) {
        ctx.save();
        ctx.translate(0, 105 * s);
        ctx.scale(1, 0.3);
        ctx.beginPath();
        ctx.ellipse(0, 0, 70 * s, 40 * s, 0, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
        ctx.fill();
        ctx.restore();
    }

    _drawLegs(ctx, s) {
        const walkPhase = this.t * 3;
        const legSwing = this.mood === 'celebrating' ? 15 : 5;
        const leftLegAngle = Math.sin(walkPhase) * legSwing * (Math.PI / 180);
        const rightLegAngle = Math.sin(walkPhase + Math.PI) * legSwing * (Math.PI / 180);

        // Left leg
        ctx.save();
        ctx.translate(-25 * s, 70 * s);
        ctx.rotate(leftLegAngle);

        // Leg
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(-4 * s, 35 * s);
        ctx.strokeStyle = '#1B5E20';
        ctx.lineWidth = 8 * s;
        ctx.lineCap = 'round';
        ctx.stroke();

        // Shoe
        ctx.beginPath();
        ctx.ellipse(-4 * s, 38 * s, 14 * s, 8 * s, 0.2, 0, Math.PI * 2);
        ctx.fillStyle = '#4A2800';
        ctx.fill();
        ctx.strokeStyle = '#2E1800';
        ctx.lineWidth = 1.5 * s;
        ctx.stroke();

        ctx.restore();

        // Right leg
        ctx.save();
        ctx.translate(25 * s, 70 * s);
        ctx.rotate(rightLegAngle);

        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(4 * s, 35 * s);
        ctx.strokeStyle = '#1B5E20';
        ctx.lineWidth = 8 * s;
        ctx.lineCap = 'round';
        ctx.stroke();

        ctx.beginPath();
        ctx.ellipse(4 * s, 38 * s, 14 * s, 8 * s, -0.2, 0, Math.PI * 2);
        ctx.fillStyle = '#4A2800';
        ctx.fill();
        ctx.strokeStyle = '#2E1800';
        ctx.lineWidth = 1.5 * s;
        ctx.stroke();

        ctx.restore();
    }

    _drawLeftArm(ctx, s) {
        ctx.save();
        ctx.translate(-65 * s, -10 * s);

        const swing = Math.sin(this.t * 2.5 + 1) * 15 * (Math.PI / 180);
        ctx.rotate(swing - 0.3);

        // Arm
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.quadraticCurveTo(-15 * s, 30 * s, -25 * s, 55 * s);
        ctx.strokeStyle = '#1B5E20';
        ctx.lineWidth = 7 * s;
        ctx.lineCap = 'round';
        ctx.stroke();

        // White glove
        this._drawGlove(ctx, -25 * s, 55 * s, s, false);

        ctx.restore();
    }

    _drawRightArm(ctx, s) {
        ctx.save();
        ctx.translate(65 * s, -10 * s);

        if (this.isWaving) {
            // Waving gesture
            const wave = Math.sin(this.wavePhase * 4) * 30 * (Math.PI / 180);
            ctx.rotate(-1.2 + wave);

            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.quadraticCurveTo(15 * s, -25 * s, 20 * s, -55 * s);
            ctx.strokeStyle = '#1B5E20';
            ctx.lineWidth = 7 * s;
            ctx.lineCap = 'round';
            ctx.stroke();

            this._drawGlove(ctx, 20 * s, -55 * s, s, true);
        } else {
            const swing = Math.sin(this.t * 2.5) * 15 * (Math.PI / 180);
            ctx.rotate(-swing + 0.3);

            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.quadraticCurveTo(15 * s, 30 * s, 25 * s, 55 * s);
            ctx.strokeStyle = '#1B5E20';
            ctx.lineWidth = 7 * s;
            ctx.lineCap = 'round';
            ctx.stroke();

            this._drawGlove(ctx, 25 * s, 55 * s, s, true);
        }

        ctx.restore();
    }

    _drawGlove(ctx, x, y, s, isRight) {
        // White cartoon glove
        ctx.save();
        ctx.translate(x, y);

        // Main glove
        ctx.beginPath();
        ctx.arc(0, 0, 12 * s, 0, Math.PI * 2);
        ctx.fillStyle = '#FFFFFF';
        ctx.fill();
        ctx.strokeStyle = '#CCCCCC';
        ctx.lineWidth = 1.5 * s;
        ctx.stroke();

        // Thumb
        const thumbDir = isRight ? 1 : -1;
        ctx.beginPath();
        ctx.ellipse(thumbDir * 10 * s, -4 * s, 6 * s, 5 * s, thumbDir * 0.5, 0, Math.PI * 2);
        ctx.fillStyle = '#FFFFFF';
        ctx.fill();
        ctx.strokeStyle = '#CCCCCC';
        ctx.lineWidth = 1 * s;
        ctx.stroke();

        // Finger lines
        ctx.beginPath();
        ctx.moveTo(-3 * s, -3 * s);
        ctx.lineTo(-3 * s, 5 * s);
        ctx.moveTo(2 * s, -4 * s);
        ctx.lineTo(2 * s, 5 * s);
        ctx.strokeStyle = '#DDDDDD';
        ctx.lineWidth = 0.8 * s;
        ctx.stroke();

        ctx.restore();
    }

    _drawBody(ctx, s) {
        // Dollar bill body — rounded rectangle
        const bw = 120 * s;
        const bh = 140 * s;
        const r = 16 * s;

        ctx.save();
        ctx.translate(0, -15 * s);

        // Main bill gradient
        const grad = ctx.createLinearGradient(-bw/2, -bh/2, bw/2, bh/2);
        const moodColors = this._getMoodBodyColors();
        grad.addColorStop(0, moodColors.light);
        grad.addColorStop(0.5, moodColors.main);
        grad.addColorStop(1, moodColors.dark);

        // Bill shape
        this._roundRect(ctx, -bw/2, -bh/2, bw, bh, r);
        ctx.fillStyle = grad;
        ctx.fill();

        // Bill border (double line like real money)
        ctx.strokeStyle = moodColors.border;
        ctx.lineWidth = 3 * s;
        ctx.stroke();

        // Inner border
        this._roundRect(ctx, -bw/2 + 8*s, -bh/2 + 8*s, bw - 16*s, bh - 16*s, r - 4*s);
        ctx.strokeStyle = moodColors.border;
        ctx.lineWidth = 1.5 * s;
        ctx.stroke();

        // Decorative corner flourishes
        this._drawCornerFlourish(ctx, -bw/2 + 14*s, -bh/2 + 14*s, s, moodColors.accent);
        this._drawCornerFlourish(ctx, bw/2 - 14*s, -bh/2 + 14*s, s, moodColors.accent);
        this._drawCornerFlourish(ctx, -bw/2 + 14*s, bh/2 - 14*s, s, moodColors.accent);
        this._drawCornerFlourish(ctx, bw/2 - 14*s, bh/2 - 14*s, s, moodColors.accent);

        // Big $ watermark behind face
        ctx.save();
        ctx.globalAlpha = 0.08;
        ctx.font = `bold ${100 * s}px serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = moodColors.dark;
        ctx.fillText('$', 0, 5 * s);
        ctx.restore();

        // "MR. DOLLARS" text at top of bill
        ctx.font = `bold ${8 * s}px 'Inter', sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillStyle = moodColors.accent;
        ctx.letterSpacing = `${2 * s}px`;
        ctx.fillText('MR. DOLLARS', 0, -bh/2 + 22 * s);

        // Small denomination at bottom
        ctx.font = `${7 * s}px 'Inter', sans-serif`;
        ctx.fillStyle = moodColors.accent;
        ctx.fillText('FINANCIAL INTELLIGENCE', 0, bh/2 - 16 * s);

        ctx.restore();
    }

    _drawCornerFlourish(ctx, x, y, s, color) {
        ctx.save();
        ctx.translate(x, y);
        ctx.beginPath();
        ctx.arc(0, 0, 6 * s, 0, Math.PI * 2);
        ctx.strokeStyle = color;
        ctx.lineWidth = 1 * s;
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(0, 0, 3 * s, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.globalAlpha = 0.4;
        ctx.fill();
        ctx.restore();
    }

    _drawFace(ctx, s) {
        ctx.save();
        ctx.translate(0, -20 * s);

        // Eyebrow raise for moods
        const browRaise = this.mood === 'alert' ? 6 * s :
                          this.mood === 'celebrating' ? 4 * s : 0;

        // Eye tracking
        const lookX = (this.mouseX - 0.5) * 12 * s;
        const lookY = (this.mouseY - 0.5) * 8 * s;

        // --- Left Eye ---
        this._drawEye(ctx, -22 * s, -10 * s, s, lookX, lookY, browRaise, false);

        // --- Right Eye ---
        this._drawEye(ctx, 22 * s, -10 * s, s, lookX, lookY, browRaise, true);

        // --- Mouth ---
        this._drawMouth(ctx, 0, 25 * s, s);

        // --- Cheek blush (when celebrating) ---
        if (this.mood === 'celebrating') {
            ctx.beginPath();
            ctx.ellipse(-35 * s, 12 * s, 10 * s, 6 * s, 0, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(255, 120, 120, 0.25)';
            ctx.fill();
            ctx.beginPath();
            ctx.ellipse(35 * s, 12 * s, 10 * s, 6 * s, 0, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(255, 120, 120, 0.25)';
            ctx.fill();
        }

        ctx.restore();
    }

    _drawEye(ctx, ex, ey, s, lookX, lookY, browRaise, isRight) {
        ctx.save();
        ctx.translate(ex, ey);

        // Blink calculation
        let eyeOpenness = 1.0;
        if (this.isBlinking) {
            const mid = 6;
            eyeOpenness = this.blinkDuration < mid
                ? 1.0 - (this.blinkDuration / mid)
                : (this.blinkDuration - mid) / (12 - mid);
            eyeOpenness = Math.max(0.05, eyeOpenness);
        }

        // Eyebrow
        const browX = isRight ? 1 : -1;
        ctx.beginPath();
        ctx.moveTo(-14 * s, -20 * s - browRaise);
        ctx.quadraticCurveTo(0, -26 * s - browRaise - (this.mood === 'alert' ? 4 * s : 0),
                            14 * s, -20 * s - browRaise);
        ctx.strokeStyle = '#1a3a1a';
        ctx.lineWidth = 3 * s;
        ctx.lineCap = 'round';
        ctx.stroke();

        // Eye white (large cartoon eye)
        ctx.save();
        ctx.scale(1, eyeOpenness);
        ctx.beginPath();
        ctx.ellipse(0, 0, 18 * s, 22 * s, 0, 0, Math.PI * 2);
        ctx.fillStyle = '#FFFFFF';
        ctx.fill();
        ctx.strokeStyle = '#1a3a1a';
        ctx.lineWidth = 2.5 * s;
        ctx.stroke();

        // Iris
        ctx.beginPath();
        ctx.arc(lookX * 0.6, lookY * 0.5, 11 * s, 0, Math.PI * 2);
        ctx.fillStyle = '#2E7D32';
        ctx.fill();

        // Pupil
        ctx.beginPath();
        ctx.arc(lookX * 0.7, lookY * 0.6, 6 * s, 0, Math.PI * 2);
        ctx.fillStyle = '#0a0a0a';
        ctx.fill();

        // Eye shine (large)
        ctx.beginPath();
        ctx.arc(lookX * 0.4 + 4 * s, lookY * 0.3 - 5 * s, 4 * s, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.fill();

        // Eye shine (small)
        ctx.beginPath();
        ctx.arc(lookX * 0.4 - 2 * s, lookY * 0.3 + 3 * s, 2 * s, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.fill();

        ctx.restore(); // un-scale for blink

        // Eyelid (when alert, half-lidded skeptical look)
        if (this.mood === 'cautious') {
            ctx.beginPath();
            ctx.ellipse(0, -5 * s, 20 * s, 14 * s, 0, Math.PI, Math.PI * 2);
            const bodyColors = this._getMoodBodyColors();
            ctx.fillStyle = bodyColors.main;
            ctx.fill();
        }

        ctx.restore();
    }

    _drawMouth(ctx, mx, my, s) {
        ctx.save();
        ctx.translate(mx, my);

        const open = this.isTalking ? this.mouthOpenness : 0;

        switch (this.mood) {
            case 'celebrating': {
                // Big happy smile
                ctx.beginPath();
                ctx.moveTo(-25 * s, -5 * s);
                ctx.quadraticCurveTo(0, 20 * s + open * 15 * s, 25 * s, -5 * s);
                if (open > 0.3) {
                    // Open mouth
                    ctx.quadraticCurveTo(0, 5 * s, -25 * s, -5 * s);
                    ctx.fillStyle = '#8B0000';
                    ctx.fill();
                    // Tongue
                    ctx.beginPath();
                    ctx.ellipse(0, 5 * s + open * 5 * s, 8 * s, 5 * s, 0, 0, Math.PI);
                    ctx.fillStyle = '#FF6B6B';
                    ctx.fill();
                }
                ctx.beginPath();
                ctx.moveTo(-25 * s, -5 * s);
                ctx.quadraticCurveTo(0, 20 * s + open * 15 * s, 25 * s, -5 * s);
                ctx.strokeStyle = '#1a3a1a';
                ctx.lineWidth = 3 * s;
                ctx.lineCap = 'round';
                ctx.stroke();
                break;
            }
            case 'confident': {
                // Friendly smile
                ctx.beginPath();
                ctx.moveTo(-20 * s, 0);
                ctx.quadraticCurveTo(0, 14 * s + open * 12 * s, 20 * s, 0);
                if (open > 0.3) {
                    ctx.quadraticCurveTo(0, 4 * s, -20 * s, 0);
                    ctx.fillStyle = '#8B0000';
                    ctx.fill();
                }
                ctx.beginPath();
                ctx.moveTo(-20 * s, 0);
                ctx.quadraticCurveTo(0, 14 * s + open * 12 * s, 20 * s, 0);
                ctx.strokeStyle = '#1a3a1a';
                ctx.lineWidth = 2.5 * s;
                ctx.lineCap = 'round';
                ctx.stroke();
                break;
            }
            case 'cautious': {
                // Slight frown / flat
                ctx.beginPath();
                ctx.moveTo(-16 * s, 2 * s);
                ctx.quadraticCurveTo(0, -4 * s + open * 10 * s, 16 * s, 2 * s);
                if (open > 0.3) {
                    ctx.quadraticCurveTo(0, 6 * s, -16 * s, 2 * s);
                    ctx.fillStyle = '#8B0000';
                    ctx.fill();
                }
                ctx.beginPath();
                ctx.moveTo(-16 * s, 2 * s);
                ctx.quadraticCurveTo(0, -4 * s + open * 10 * s, 16 * s, 2 * s);
                ctx.strokeStyle = '#1a3a1a';
                ctx.lineWidth = 2.5 * s;
                ctx.lineCap = 'round';
                ctx.stroke();
                break;
            }
            case 'alert': {
                // O-mouth / worried
                const oSize = 8 + open * 8;
                ctx.beginPath();
                ctx.ellipse(0, 2 * s, oSize * s, (oSize + 4) * s, 0, 0, Math.PI * 2);
                ctx.fillStyle = '#5a0000';
                ctx.fill();
                ctx.strokeStyle = '#1a3a1a';
                ctx.lineWidth = 2.5 * s;
                ctx.stroke();
                break;
            }
        }

        ctx.restore();
    }

    _drawHat(ctx, s) {
        // Top hat / bowler on the dollar bill
        ctx.save();
        ctx.translate(0, -15 * s);

        const hatY = -70 * s;

        // Hat brim
        ctx.beginPath();
        ctx.ellipse(0, hatY + 2 * s, 48 * s, 10 * s, 0, 0, Math.PI * 2);
        ctx.fillStyle = '#1a1a2e';
        ctx.fill();
        ctx.strokeStyle = '#FFD700';
        ctx.lineWidth = 2 * s;
        ctx.stroke();

        // Hat body
        this._roundRect(ctx, -30 * s, hatY - 40 * s, 60 * s, 42 * s, 6 * s);
        ctx.fillStyle = '#1a1a2e';
        ctx.fill();
        ctx.strokeStyle = '#333355';
        ctx.lineWidth = 1.5 * s;
        ctx.stroke();

        // Gold band
        ctx.fillStyle = '#FFD700';
        ctx.fillRect(-30 * s, hatY - 6 * s, 60 * s, 8 * s);

        // $ on hat band
        ctx.font = `bold ${10 * s}px serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#1a1a2e';
        ctx.fillText('$', 0, hatY - 2 * s);

        ctx.restore();
    }

    // --- Effects ---

    _drawFloatingDollars(ctx) {
        ctx.save();
        for (const fd of this.floatingDollars) {
            fd.y -= fd.speed * 0.001;
            if (fd.y < -0.1) fd.y = 1.1;

            const x = fd.x * this.w + Math.sin(this.t * fd.speed + fd.phase) * 20;
            const y = fd.y * this.h;

            ctx.globalAlpha = fd.opacity;
            ctx.font = `${fd.size}px serif`;
            ctx.textAlign = 'center';
            ctx.fillStyle = '#FFD700';
            ctx.fillText('$', x, y);
        }
        ctx.restore();
    }

    _drawSparkles(ctx) {
        for (const sp of this.sparkles) {
            ctx.save();
            ctx.translate(sp.x, sp.y);
            ctx.rotate(sp.rotation + this.t * 3);
            ctx.globalAlpha = sp.life;

            const size = sp.size * sp.life;
            ctx.beginPath();
            // 4-point star
            for (let i = 0; i < 4; i++) {
                const angle = (i / 4) * Math.PI * 2;
                const px = Math.cos(angle) * size;
                const py = Math.sin(angle) * size;
                if (i === 0) ctx.moveTo(px, py);
                else ctx.lineTo(px, py);
                const midAngle = angle + Math.PI / 4;
                ctx.lineTo(Math.cos(midAngle) * size * 0.3, Math.sin(midAngle) * size * 0.3);
            }
            ctx.closePath();
            ctx.fillStyle = sp.color;
            ctx.fill();

            ctx.restore();
        }
    }

    // --- Utility ---

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
                return {
                    light: '#5CB85C', main: '#3D8B3D', dark: '#2E6B2E',
                    border: '#1B5E20', accent: '#1B5E20'
                };
            case 'celebrating':
                return {
                    light: '#81C784', main: '#4CAF50', dark: '#388E3C',
                    border: '#FFD700', accent: '#FFD700'
                };
            case 'cautious':
                return {
                    light: '#A5D6A7', main: '#66996B', dark: '#4A7A4F',
                    border: '#5D7A3E', accent: '#4A6A2E'
                };
            case 'alert':
                return {
                    light: '#E57373', main: '#C06040', dark: '#8B3A2A',
                    border: '#B71C1C', accent: '#FFD700'
                };
            default:
                return {
                    light: '#5CB85C', main: '#3D8B3D', dark: '#2E6B2E',
                    border: '#1B5E20', accent: '#1B5E20'
                };
        }
    }

    // --- Public API ---

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

        if (hasCashProtection) {
            this.setMood('alert');
        } else if (hasReject) {
            this.setMood('cautious');
        } else if (s.net_margin > 0.3 && s.utilization > 0.7 && s.rebook_rate > 0.45) {
            this.setMood('celebrating');
        } else {
            this.setMood('confident');
        }
    }

    talk(duration = 120) {
        this.isTalking = true;
        this.talkTimer = duration;
        this.talkPhase = 0;
    }

    wave() {
        this.isWaving = true;
        this.waveTimer = 90;
        this.wavePhase = 0;
    }

    sparkle() {
        const cx = this.w / 2;
        const cy = this.h / 2;
        const colors = ['#FFD700', '#FFEC8B', '#FFF8DC', '#FFD700', '#98FB98'];

        for (let i = 0; i < 20; i++) {
            const angle = Math.random() * Math.PI * 2;
            const dist = 40 + Math.random() * 80;
            this.sparkles.push({
                x: cx + Math.cos(angle) * dist,
                y: cy + Math.sin(angle) * dist - 20,
                vx: (Math.random() - 0.5) * 3,
                vy: Math.random() * 2 + 1,
                size: 4 + Math.random() * 10,
                life: 1.0,
                rotation: Math.random() * Math.PI,
                color: colors[Math.floor(Math.random() * colors.length)],
            });
        }

        // Bounce squash effect
        this.targetSquashX = 1.15;
        this.targetSquashY = 0.88;
        setTimeout(() => {
            this.targetSquashX = 0.92;
            this.targetSquashY = 1.1;
        }, 100);
    }
}

window.DollarAvatar = DollarAvatar;
