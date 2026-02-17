/**
 * Mr. Dollars — Animated Cartoon Dollar Bill Character v2
 *
 * Professional canvas animation applying the 12 Principles of Animation:
 *  1. Squash & Stretch — on bounces, landing, talking
 *  2. Anticipation     — wind-up before waves, jumps
 *  3. Staging          — clear silhouette, readable poses
 *  4. Straight-ahead / Pose-to-pose — smooth interpolation
 *  5. Follow-through & Overlap — hat/arm lag, hair-like secondary motion
 *  6. Ease in / Ease out — smooth starts/stops on all motion
 *  7. Arcs             — arm/leg paths follow natural arcs
 *  8. Secondary action  — sparkles, hat bounce, arm swing during walk
 *  9. Timing           — variable frame durations for weight/snap
 * 10. Exaggeration     — oversized eyes, big expressions
 * 11. Solid drawing    — consistent volume across poses
 * 12. Appeal           — friendly proportions, big eyes, warm colors
 *
 * 320×400 canvas, scale 0.62 — significantly bigger than v1.
 * Positioned inline in the presenter stage (not fixed overlay).
 */

class DollarAvatar {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        if (!this.canvas) return;
        this.ctx = this.canvas.getContext('2d');

        this.charW = 320;
        this.charH = 400;

        // Core state
        this.mood = 'confident';
        this.t = 0;
        this.mouseX = 0.5;
        this.mouseY = 0.5;

        // Blink
        this.blinkTimer = 0;
        this.blinkDuration = 0;
        this.isBlinking = false;
        this.nextBlink = 120 + Math.random() * 180;

        // Talk
        this.talkPhase = 0;
        this.isTalking = false;
        this.talkTimer = 0;
        this.mouthOpenness = 0;

        // Wave (with anticipation)
        this.wavePhase = 0;
        this.isWaving = false;
        this.waveTimer = 0;
        this.waveAnticipation = 0; // wind-up counter

        // Squash & stretch
        this.squashX = 1;
        this.squashY = 1;
        this.targetSquashX = 1;
        this.targetSquashY = 1;

        // Follow-through: hat lag
        this.hatLagAngle = 0;
        this.hatLagVelocity = 0;

        // Idle breathing
        this.breathPhase = Math.random() * Math.PI * 2;

        // Sparkles
        this.sparkles = [];

        this._setupCanvas();
        this._bindEvents();
        this._animate();
    }

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
    }

    // === Main Loop ===

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
        // Blink
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
                this.nextBlink = 100 + Math.random() * 200;
            }
        }

        // Talk — variable mouth with consonant/vowel simulation
        if (this.isTalking) {
            this.talkPhase += 0.28;
            this.talkTimer--;
            // Mix two sine waves for more natural phoneme-like movement
            this.mouthOpenness = 0.2
                + Math.abs(Math.sin(this.talkPhase)) * 0.45
                + Math.abs(Math.sin(this.talkPhase * 1.7 + 0.5)) * 0.3;
            if (this.talkTimer <= 0) {
                this.isTalking = false;
                this.mouthOpenness = 0;
            }
        } else {
            // Gentle mouth close ease
            this.mouthOpenness += (0 - this.mouthOpenness) * 0.15;
        }

        // Wave with anticipation
        if (this.isWaving) {
            if (this.waveAnticipation < 6) {
                // Wind-up phase — arm goes slightly down first
                this.waveAnticipation++;
                this.wavePhase = -0.3 * (this.waveAnticipation / 6);
            } else {
                this.wavePhase += 0.14;
            }
            this.waveTimer--;
            if (this.waveTimer <= 0) {
                this.isWaving = false;
                this.wavePhase = 0;
                this.waveAnticipation = 0;
            }
        }

        // Squash/stretch — spring physics
        this.squashX += (this.targetSquashX - this.squashX) * 0.12;
        this.squashY += (this.targetSquashY - this.squashY) * 0.12;
        this.targetSquashX += (1 - this.targetSquashX) * 0.06;
        this.targetSquashY += (1 - this.targetSquashY) * 0.06;

        // Follow-through: hat lag (spring)
        const bodyTilt = Math.sin(this.t * 1.7) * 0.03;
        const hatTarget = -bodyTilt * 1.8;
        const hatSpring = 0.06;
        const hatDamping = 0.82;
        this.hatLagVelocity += (hatTarget - this.hatLagAngle) * hatSpring;
        this.hatLagVelocity *= hatDamping;
        this.hatLagAngle += this.hatLagVelocity;

        // Breathing
        this.breathPhase += 0.025;

        // Sparkle decay
        this.sparkles = this.sparkles.filter(s => {
            s.life -= 0.018;
            s.y -= s.vy;
            s.x += s.vx;
            s.vy *= 0.97;
            s.vx *= 0.99;
            s.rotation += s.rotSpeed;
            return s.life > 0;
        });
    }

    _draw() {
        const ctx = this.ctx;
        const cx = this.w / 2;
        const cy = this.h / 2 + 30;
        const s = this.scale;

        ctx.clearRect(0, 0, this.w, this.h);

        ctx.save();
        ctx.translate(cx, cy);

        // Idle bob (arc motion — principle 7)
        const bobY = Math.sin(this.t * 1.8) * 6 * s;
        const bobX = Math.sin(this.t * 1.1) * 2 * s;
        const tilt = Math.sin(this.t * 1.7) * 0.03;

        // Breathing scale
        const breathScale = 1 + Math.sin(this.breathPhase) * 0.008;

        ctx.translate(bobX, bobY);
        ctx.rotate(tilt);
        ctx.scale(this.squashX * breathScale, this.squashY * (2 - breathScale));

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

    // === Body Parts ===

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
        const walkPhase = this.t * 2.5;
        const legSwing = this.mood === 'celebrating' ? 12 : 4;
        const leftAngle = Math.sin(walkPhase) * legSwing * (Math.PI / 180);
        const rightAngle = Math.sin(walkPhase + Math.PI) * legSwing * (Math.PI / 180);

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

            // Shoe with highlight
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

        // Secondary motion: arm swing follows body bob
        const swing = Math.sin(this.t * 2.5 + 1) * 12 * (Math.PI / 180);
        ctx.rotate(swing - 0.3);

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

        if (this.isWaving && this.waveAnticipation >= 6) {
            const wave = Math.sin((this.wavePhase - (-0.3)) * 3.5) * 25 * (Math.PI / 180);
            ctx.rotate(-1.3 + wave);

            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.quadraticCurveTo(18 * s, -30 * s, 24 * s, -62 * s);
            ctx.strokeStyle = '#1B5E20';
            ctx.lineWidth = 9 * s;
            ctx.lineCap = 'round';
            ctx.stroke();

            this._drawGlove(ctx, 24 * s, -62 * s, s, true);
        } else if (this.isWaving) {
            // Anticipation: arm pulls back slightly
            const pull = this.wavePhase;
            ctx.rotate(pull + 0.3);

            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.quadraticCurveTo(18 * s, 35 * s, 28 * s, 62 * s);
            ctx.strokeStyle = '#1B5E20';
            ctx.lineWidth = 9 * s;
            ctx.lineCap = 'round';
            ctx.stroke();

            this._drawGlove(ctx, 28 * s, 62 * s, s, true);
        } else {
            const swing = Math.sin(this.t * 2.5) * 12 * (Math.PI / 180);
            ctx.rotate(-swing + 0.3);

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

        // Glove
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
        const grad = ctx.createLinearGradient(-bw/2, -bh/2, bw/2, bh/2);
        grad.addColorStop(0, colors.light);
        grad.addColorStop(0.5, colors.main);
        grad.addColorStop(1, colors.dark);

        this._roundRect(ctx, -bw/2, -bh/2, bw, bh, r);
        ctx.fillStyle = grad;
        ctx.fill();

        // Outer border
        ctx.strokeStyle = colors.border;
        ctx.lineWidth = 3.5 * s;
        ctx.stroke();

        // Inner border
        this._roundRect(ctx, -bw/2 + 10*s, -bh/2 + 10*s, bw - 20*s, bh - 20*s, r - 5*s);
        ctx.strokeStyle = colors.border;
        ctx.lineWidth = 1.5 * s;
        ctx.stroke();

        // Corner flourishes
        const inset = 16 * s;
        [[-1,-1],[1,-1],[-1,1],[1,1]].forEach(([dx, dy]) => {
            this._drawCornerFlourish(ctx, dx * (bw/2 - inset), dy * (bh/2 - inset), s, colors.accent);
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
        ctx.fillText('MR. DOLLARS', 0, -bh/2 + 26 * s);

        // Bottom text
        ctx.font = `${7.5 * s}px 'Inter', sans-serif`;
        ctx.fillStyle = colors.accent;
        ctx.fillText('FINANCIAL INTELLIGENCE', 0, bh/2 - 18 * s);

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

        let eyeOpen = 1.0;
        if (this.isBlinking) {
            const mid = 6;
            eyeOpen = this.blinkDuration < mid
                ? 1.0 - (this.blinkDuration / mid)
                : (this.blinkDuration - mid) / (12 - mid);
            eyeOpen = Math.max(0.05, eyeOpen);
        }

        // Eyebrow
        ctx.beginPath();
        ctx.moveTo(-16 * s, -24 * s - browRaise);
        ctx.quadraticCurveTo(0, -30 * s - browRaise - (this.mood === 'alert' ? 5 * s : 0),
                            16 * s, -24 * s - browRaise);
        ctx.strokeStyle = '#1a3a1a';
        ctx.lineWidth = 3.5 * s;
        ctx.lineCap = 'round';
        ctx.stroke();

        // Eye white
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

        // Half-lid (cautious)
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

        // Follow-through: hat lags behind body rotation
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

    // === Effects ===

    _drawSparkles(ctx) {
        for (const sp of this.sparkles) {
            ctx.save();
            ctx.translate(sp.x, sp.y);
            ctx.rotate(sp.rotation);
            ctx.globalAlpha = sp.life * sp.life; // quadratic fade for smoother feel

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

    // === Utility ===

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

    // === Public API ===

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

    talk(duration = 120) {
        this.isTalking = true;
        this.talkTimer = duration;
        this.talkPhase = 0;
    }

    wave() {
        this.isWaving = true;
        this.waveTimer = 100;
        this.wavePhase = 0;
        this.waveAnticipation = 0;
    }

    sparkle() {
        const cx = this.w / 2;
        const cy = this.h / 2;
        const colors = ['#FFD700', '#FFEC8B', '#FFF8DC', '#FFD700', '#A8E6A3'];

        for (let i = 0; i < 24; i++) {
            const angle = Math.random() * Math.PI * 2;
            const dist = 50 + Math.random() * 100;
            this.sparkles.push({
                x: cx + Math.cos(angle) * dist * 0.3,
                y: cy + Math.sin(angle) * dist * 0.3 - 30,
                vx: Math.cos(angle) * (1 + Math.random() * 2.5),
                vy: Math.sin(angle) * (1 + Math.random() * 2) + 0.5,
                size: 5 + Math.random() * 12,
                life: 1.0,
                rotation: Math.random() * Math.PI,
                rotSpeed: (Math.random() - 0.5) * 0.15,
                color: colors[Math.floor(Math.random() * colors.length)],
            });
        }

        // Squash & stretch bounce
        this.targetSquashX = 1.18;
        this.targetSquashY = 0.85;
        setTimeout(() => {
            this.targetSquashX = 0.9;
            this.targetSquashY = 1.12;
        }, 120);
    }

    bounce() {
        this.targetSquashY = 0.8;
        this.targetSquashX = 1.15;
        setTimeout(() => {
            this.targetSquashY = 1.15;
            this.targetSquashX = 0.88;
        }, 100);
    }
}

window.DollarAvatar = DollarAvatar;
