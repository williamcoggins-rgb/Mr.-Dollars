/**
 * Mr. Dollars — Animated Cartoon Dollar Bill Character v3
 *
 * GSAP-powered animation system for Disney/Marvel-quality motion:
 *  - GSAP timelines for all character animation (idle, wave, talk, bounce, walk, blink)
 *  - Professional easing: elastic, back, bounce, expo
 *  - Anticipation → action → overshoot → settle on every gesture
 *  - Canvas 2D retained for rendering (gradient/shape support)
 *  - Roaming station system for screen-wide movement
 *
 * 320x400 canvas, scale 0.62.
 */

class DollarAvatar {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        if (!this.canvas) return;
        this.ctx = this.canvas.getContext('2d');

        this.charW = 320;
        this.charH = 400;

        this.mood = 'confident';
        this.t = 0;
        this.mouseX = 0.5;
        this.mouseY = 0.5;

        // GSAP-driven animation properties
        this.anim = {
            bobX: 0, bobY: 0, bodyTilt: 0, breathScale: 1,
            squashX: 1, squashY: 1,
            blinkAmount: 1, browRaise: 0,
            mouthOpenness: 0,
            leftArmSwing: 0, rightArmSwing: 0,
            rightArmWaveAngle: 0, isWaving: false,
            leftLegAngle: 0, rightLegAngle: 0,
            hatAngle: 0, hatBounce: 0,
            charScale: 1, walkIntensity: 0,
        };

        this.sparkles = [];

        // Roaming
        this.posX = window.innerWidth - this.charW - 40;
        this.posY = 60;
        this.targetX = this.posX;
        this.targetY = this.posY;
        this.facingLeft = false;
        this.roamTimer = 0;
        this.roamInterval = 300 + Math.random() * 200;
        this.currentStation = 'home';

        this._updateStations();
        this._setupCanvas();
        this._bindEvents();
        this._buildIdleTimeline();
        this._buildBlinkTimeline();
        this._buildWalkTimeline();
        this._animate();
        this._playEntrance();
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
        this._applyPosition();
    }

    _applyPosition() {
        this.posX = Math.max(-40, Math.min(window.innerWidth - this.charW + 40, this.posX));
        this.posY = Math.max(40, Math.min(window.innerHeight - this.charH + 40, this.posY));
        this.canvas.style.left = Math.round(this.posX) + 'px';
        this.canvas.style.top = Math.round(this.posY) + 'px';
    }

    _updateStations() {
        const vw = window.innerWidth, vh = window.innerHeight;
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
        this.canvas.addEventListener('click', () => { this.wave(); this.sparkle(); });
        window.addEventListener('resize', () => this._updateStations());
    }

    // ========== GSAP TIMELINES ==========

    _buildIdleTimeline() {
        this.idleTl = gsap.timeline({ repeat: -1, yoyo: true });
        this.idleTl.to(this.anim, { bobY: -7, duration: 1.8, ease: 'sine.inOut' }, 0);
        this.idleTl.to(this.anim, { bobX: 3, duration: 2.6, ease: 'sine.inOut' }, 0);
        this.idleTl.to(this.anim, { bodyTilt: 0.03, duration: 2.2, ease: 'sine.inOut' }, 0);
        this.idleTl.to(this.anim, { breathScale: 1.012, duration: 1.6, ease: 'sine.inOut' }, 0);
        this.idleTl.to(this.anim, { leftArmSwing: 0.18, duration: 2.0, ease: 'sine.inOut' }, 0.3);
        this.idleTl.to(this.anim, { rightArmSwing: -0.18, duration: 2.0, ease: 'sine.inOut' }, 0.5);
        this.idleTl.to(this.anim, { hatAngle: -0.05, duration: 2.8, ease: 'sine.inOut' }, 0.2);
    }

    _buildBlinkTimeline() { this._scheduleBlink(); }

    _scheduleBlink() {
        const delay = 2.0 + Math.random() * 4.0;
        this.blinkTl = gsap.timeline({ delay, onComplete: () => this._scheduleBlink() });
        this.blinkTl.to(this.anim, { blinkAmount: 0.05, duration: 0.06, ease: 'power2.in' });
        this.blinkTl.to(this.anim, { blinkAmount: 1, duration: 0.1, ease: 'back.out(2)' });
        if (Math.random() < 0.2) {
            this.blinkTl.to(this.anim, { blinkAmount: 0.05, duration: 0.05, ease: 'power2.in' }, '+=0.08');
            this.blinkTl.to(this.anim, { blinkAmount: 1, duration: 0.1, ease: 'back.out(2)' });
        }
    }

    _buildWalkTimeline() {
        this.walkTl = gsap.timeline({ repeat: -1 });
        this.walkTl.to(this.anim, { leftLegAngle: 0.35, rightLegAngle: -0.35, duration: 0.28, ease: 'sine.inOut' });
        this.walkTl.to(this.anim, { leftLegAngle: -0.35, rightLegAngle: 0.35, duration: 0.28, ease: 'sine.inOut' });
    }

    _playEntrance() {
        this.anim.charScale = 0;
        const tl = gsap.timeline();
        tl.to(this.anim, { charScale: 1, duration: 0.8, ease: 'elastic.out(1, 0.5)' });
        tl.to(this.anim, { squashY: 0.82, squashX: 1.15, duration: 0.1, ease: 'power2.in' }, 0.55);
        tl.to(this.anim, { squashY: 1.08, squashX: 0.94, duration: 0.15, ease: 'power2.out' });
        tl.to(this.anim, { squashY: 1, squashX: 1, duration: 0.4, ease: 'elastic.out(1, 0.6)' });
        tl.to(this.anim, { hatBounce: -12, duration: 0.1, ease: 'power2.in' }, 0.55);
        tl.to(this.anim, { hatBounce: 0, duration: 0.6, ease: 'elastic.out(1, 0.3)' });
    }

    // ========== MAIN LOOP ==========

    _animate() {
        const tick = () => {
            requestAnimationFrame(tick);
            this.t += 1 / 60;
            this._updateRoaming();
            this._draw();
        };
        tick();
    }

    _updateRoaming() {
        this.sparkles = this.sparkles.filter(s => {
            s.life -= 0.018; s.y -= s.vy; s.x += s.vx;
            s.vy *= 0.97; s.vx *= 0.99; s.rotation += s.rotSpeed;
            return s.life > 0;
        });

        this.roamTimer++;
        if (this.roamTimer > this.roamInterval && this.anim.mouthOpenness < 0.1) {
            this._pickNextStation();
            this.roamTimer = 0;
            this.roamInterval = 250 + Math.random() * 350;
        }

        const dx = this.targetX - this.posX;
        const dy = this.targetY - this.posY;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist > 3) {
            this.posX += dx * 0.04;
            this.posY += dy * 0.04;
            const ti = Math.min(dist * 0.025, 1);
            gsap.to(this.anim, { walkIntensity: ti, duration: 0.3, overwrite: 'auto' });
            this.facingLeft = dx < -5;
            this._applyPosition();
        } else if (this.anim.walkIntensity > 0.01) {
            gsap.to(this.anim, { walkIntensity: 0, duration: 0.6, ease: 'power2.out', overwrite: 'auto' });
        }

        const targetBrow = this.mood === 'alert' ? 7 : this.mood === 'celebrating' ? 5 : 0;
        if (Math.abs(this.anim.browRaise - targetBrow) > 0.5) {
            gsap.to(this.anim, { browRaise: targetBrow, duration: 0.5, ease: 'power2.out', overwrite: 'auto' });
        }
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

    // ========== CANVAS 2D DRAW ==========

    _draw() {
        const ctx = this.ctx, cx = this.w / 2, cy = this.h / 2 + 30, s = this.scale, a = this.anim;
        ctx.clearRect(0, 0, this.w, this.h);
        if (a.charScale < 0.01) return;

        ctx.save();
        ctx.translate(cx, cy);
        ctx.translate(a.bobX * s, a.bobY * s);
        ctx.rotate(a.bodyTilt);
        if (this.facingLeft) ctx.scale(-1, 1);
        ctx.scale(a.squashX * a.breathScale * a.charScale, a.squashY * (2 - a.breathScale) * a.charScale);

        this._drawShadow(ctx, s);
        this._drawLegs(ctx, s);
        this._drawLeftArm(ctx, s);
        this._drawBody(ctx, s);
        this._drawFace(ctx, s);
        this._drawRightArm(ctx, s);
        this._drawHat(ctx, s);
        ctx.restore();
        this._drawSparkles(ctx);
    }

    _drawShadow(ctx, s) {
        ctx.save();
        ctx.translate(0, 115 * s);
        ctx.scale(1, 0.25);
        ctx.beginPath();
        ctx.ellipse(0, 0, 80 * s, 50 * s, 0, 0, Math.PI * 2);
        const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 80 * s);
        g.addColorStop(0, 'rgba(0,0,0,0.18)');
        g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g;
        ctx.fill();
        ctx.restore();
    }

    _drawLegs(ctx, s) {
        const a = this.anim;
        const intensity = Math.max(0.15, a.walkIntensity);
        const moodMult = this.mood === 'celebrating' ? 1.5 : 1;

        [-1, 1].forEach((side, i) => {
            const angle = (i === 0 ? a.leftLegAngle : a.rightLegAngle) * intensity * moodMult;
            ctx.save();
            ctx.translate(side * 28 * s, 78 * s);
            ctx.rotate(angle);

            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(side * 3 * s, 40 * s);
            ctx.strokeStyle = '#1B5E20';
            ctx.lineWidth = 10 * s;
            ctx.lineCap = 'round';
            ctx.stroke();

            ctx.beginPath();
            ctx.ellipse(side * 3 * s, 44 * s, 17 * s, 10 * s, side * 0.2, 0, Math.PI * 2);
            const sg = ctx.createLinearGradient(side * 3 * s - 17 * s, 34 * s, side * 3 * s + 17 * s, 54 * s);
            sg.addColorStop(0, '#5C3300');
            sg.addColorStop(1, '#3A1F00');
            ctx.fillStyle = sg;
            ctx.fill();
            ctx.strokeStyle = '#2E1800';
            ctx.lineWidth = 1.5 * s;
            ctx.stroke();

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
        ctx.rotate(this.anim.leftArmSwing - 0.3);
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
        const a = this.anim;
        ctx.save();
        ctx.translate(72 * s, -10 * s);

        if (a.isWaving) {
            ctx.rotate(-1.3 + a.rightArmWaveAngle);
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.quadraticCurveTo(18 * s, -30 * s, 24 * s, -62 * s);
            ctx.strokeStyle = '#1B5E20';
            ctx.lineWidth = 9 * s;
            ctx.lineCap = 'round';
            ctx.stroke();
            this._drawGlove(ctx, 24 * s, -62 * s, s, true);
        } else {
            ctx.rotate(-a.rightArmSwing + 0.3);
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
        ctx.beginPath();
        ctx.arc(0, 0, 15 * s, 0, Math.PI * 2);
        const g = ctx.createRadialGradient(-3 * s, -3 * s, 0, 0, 0, 15 * s);
        g.addColorStop(0, '#FFFFFF');
        g.addColorStop(1, '#E8E8E8');
        ctx.fillStyle = g;
        ctx.fill();
        ctx.strokeStyle = '#C0C0C0';
        ctx.lineWidth = 1.5 * s;
        ctx.stroke();

        const dir = isRight ? 1 : -1;
        ctx.beginPath();
        ctx.ellipse(dir * 12 * s, -5 * s, 7 * s, 6 * s, dir * 0.5, 0, Math.PI * 2);
        ctx.fillStyle = '#FFFFFF';
        ctx.fill();
        ctx.strokeStyle = '#C0C0C0';
        ctx.lineWidth = 1 * s;
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(-4 * s, -4 * s); ctx.lineTo(-4 * s, 6 * s);
        ctx.moveTo(2 * s, -5 * s);  ctx.lineTo(2 * s, 6 * s);
        ctx.strokeStyle = '#D0D0D0';
        ctx.lineWidth = 0.8 * s;
        ctx.stroke();
        ctx.restore();
    }

    _drawBody(ctx, s) {
        const bw = 135 * s, bh = 158 * s, r = 18 * s;
        ctx.save();
        ctx.translate(0, -15 * s);
        const c = this._getMoodBodyColors();

        const g = ctx.createLinearGradient(-bw / 2, -bh / 2, bw / 2, bh / 2);
        g.addColorStop(0, c.light);
        g.addColorStop(0.5, c.main);
        g.addColorStop(1, c.dark);
        this._roundRect(ctx, -bw / 2, -bh / 2, bw, bh, r);
        ctx.fillStyle = g;
        ctx.fill();
        ctx.strokeStyle = c.border;
        ctx.lineWidth = 3.5 * s;
        ctx.stroke();

        this._roundRect(ctx, -bw / 2 + 10 * s, -bh / 2 + 10 * s, bw - 20 * s, bh - 20 * s, r - 5 * s);
        ctx.strokeStyle = c.border;
        ctx.lineWidth = 1.5 * s;
        ctx.stroke();

        const inset = 16 * s;
        [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([dx, dy]) => {
            this._drawCornerFlourish(ctx, dx * (bw / 2 - inset), dy * (bh / 2 - inset), s, c.accent);
        });

        ctx.save();
        ctx.globalAlpha = 0.06;
        ctx.font = `bold ${120 * s}px serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = c.dark;
        ctx.fillText('$', 0, 8 * s);
        ctx.restore();

        ctx.font = `bold ${9 * s}px 'Inter', sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillStyle = c.accent;
        ctx.fillText('MR. DOLLARS', 0, -bh / 2 + 26 * s);

        ctx.font = `${7.5 * s}px 'Inter', sans-serif`;
        ctx.fillStyle = c.accent;
        ctx.fillText('FINANCIAL INTELLIGENCE', 0, bh / 2 - 18 * s);
        ctx.restore();
    }

    _drawCornerFlourish(ctx, x, y, s, color) {
        ctx.save();
        ctx.translate(x, y);
        ctx.beginPath();
        ctx.arc(0, 0, 7 * s, 0, Math.PI * 2);
        ctx.strokeStyle = color;
        ctx.lineWidth = 1 * s;
        ctx.stroke();
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
        const lx = (this.mouseX - 0.5) * 14 * s;
        const ly = (this.mouseY - 0.5) * 10 * s;
        this._drawEye(ctx, -26 * s, -12 * s, s, lx, ly, false);
        this._drawEye(ctx, 26 * s, -12 * s, s, lx, ly, true);
        this._drawMouth(ctx, 0, 28 * s, s);

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

    _drawEye(ctx, ex, ey, s, lookX, lookY, isRight) {
        const a = this.anim;
        ctx.save();
        ctx.translate(ex, ey);

        ctx.beginPath();
        ctx.moveTo(-16 * s, -24 * s - a.browRaise * s);
        ctx.quadraticCurveTo(0, -30 * s - a.browRaise * s - (this.mood === 'alert' ? 5 * s : 0),
            16 * s, -24 * s - a.browRaise * s);
        ctx.strokeStyle = '#1a3a1a';
        ctx.lineWidth = 3.5 * s;
        ctx.lineCap = 'round';
        ctx.stroke();

        ctx.save();
        ctx.scale(1, a.blinkAmount);
        ctx.beginPath();
        ctx.ellipse(0, 0, 21 * s, 26 * s, 0, 0, Math.PI * 2);
        ctx.fillStyle = '#FFFFFF';
        ctx.fill();
        ctx.strokeStyle = '#1a3a1a';
        ctx.lineWidth = 2.5 * s;
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(lookX * 0.5, lookY * 0.4, 13 * s, 0, Math.PI * 2);
        const ig = ctx.createRadialGradient(lookX * 0.5, lookY * 0.4, 2 * s, lookX * 0.5, lookY * 0.4, 13 * s);
        ig.addColorStop(0, '#43A047');
        ig.addColorStop(0.7, '#2E7D32');
        ig.addColorStop(1, '#1B5E20');
        ctx.fillStyle = ig;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(lookX * 0.6, lookY * 0.5, 7 * s, 0, Math.PI * 2);
        ctx.fillStyle = '#0a0a0a';
        ctx.fill();

        ctx.beginPath();
        ctx.arc(lookX * 0.3 + 5 * s, lookY * 0.2 - 6 * s, 5 * s, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.92)';
        ctx.fill();

        ctx.beginPath();
        ctx.arc(lookX * 0.3 - 3 * s, lookY * 0.2 + 4 * s, 2.5 * s, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
        ctx.fill();
        ctx.restore();

        if (this.mood === 'cautious') {
            ctx.beginPath();
            ctx.ellipse(0, -6 * s, 23 * s, 16 * s, 0, Math.PI, Math.PI * 2);
            ctx.fillStyle = this._getMoodBodyColors().main;
            ctx.fill();
        }
        ctx.restore();
    }

    _drawMouth(ctx, mx, my, s) {
        const open = this.anim.mouthOpenness;
        ctx.save();
        ctx.translate(mx, my);

        switch (this.mood) {
            case 'celebrating': {
                ctx.beginPath();
                ctx.moveTo(-28 * s, -5 * s);
                ctx.quadraticCurveTo(0, 22 * s + open * 16 * s, 28 * s, -5 * s);
                if (open > 0.25) {
                    ctx.quadraticCurveTo(0, 6 * s, -28 * s, -5 * s);
                    ctx.fillStyle = '#7B0000'; ctx.fill();
                    ctx.beginPath();
                    ctx.ellipse(0, 6 * s + open * 6 * s, 10 * s, 6 * s, 0, 0, Math.PI);
                    ctx.fillStyle = '#FF6B6B'; ctx.fill();
                }
                ctx.beginPath();
                ctx.moveTo(-28 * s, -5 * s);
                ctx.quadraticCurveTo(0, 22 * s + open * 16 * s, 28 * s, -5 * s);
                ctx.strokeStyle = '#1a3a1a'; ctx.lineWidth = 3 * s; ctx.lineCap = 'round'; ctx.stroke();
                break;
            }
            case 'confident': {
                ctx.beginPath();
                ctx.moveTo(-22 * s, 0);
                ctx.quadraticCurveTo(0, 16 * s + open * 14 * s, 22 * s, 0);
                if (open > 0.25) {
                    ctx.quadraticCurveTo(0, 5 * s, -22 * s, 0);
                    ctx.fillStyle = '#7B0000'; ctx.fill();
                }
                ctx.beginPath();
                ctx.moveTo(-22 * s, 0);
                ctx.quadraticCurveTo(0, 16 * s + open * 14 * s, 22 * s, 0);
                ctx.strokeStyle = '#1a3a1a'; ctx.lineWidth = 3 * s; ctx.lineCap = 'round'; ctx.stroke();
                break;
            }
            case 'cautious': {
                ctx.beginPath();
                ctx.moveTo(-18 * s, 2 * s);
                ctx.quadraticCurveTo(0, -4 * s + open * 12 * s, 18 * s, 2 * s);
                if (open > 0.25) {
                    ctx.quadraticCurveTo(0, 6 * s, -18 * s, 2 * s);
                    ctx.fillStyle = '#7B0000'; ctx.fill();
                }
                ctx.beginPath();
                ctx.moveTo(-18 * s, 2 * s);
                ctx.quadraticCurveTo(0, -4 * s + open * 12 * s, 18 * s, 2 * s);
                ctx.strokeStyle = '#1a3a1a'; ctx.lineWidth = 3 * s; ctx.lineCap = 'round'; ctx.stroke();
                break;
            }
            case 'alert': {
                const sz = 9 + open * 9;
                ctx.beginPath();
                ctx.ellipse(0, 2 * s, sz * s, (sz + 5) * s, 0, 0, Math.PI * 2);
                ctx.fillStyle = '#4a0000'; ctx.fill();
                ctx.strokeStyle = '#1a3a1a'; ctx.lineWidth = 3 * s; ctx.stroke();
                break;
            }
        }
        ctx.restore();
    }

    _drawHat(ctx, s) {
        const a = this.anim;
        ctx.save();
        ctx.translate(0, -15 * s);
        ctx.rotate(a.hatAngle);
        ctx.translate(0, a.hatBounce * s);

        const hatY = -78 * s;

        ctx.beginPath();
        ctx.ellipse(0, hatY + 2 * s, 54 * s, 12 * s, 0, 0, Math.PI * 2);
        const bg = ctx.createLinearGradient(-54 * s, hatY, 54 * s, hatY + 4 * s);
        bg.addColorStop(0, '#22223B'); bg.addColorStop(1, '#141428');
        ctx.fillStyle = bg; ctx.fill();
        ctx.strokeStyle = '#FFD700'; ctx.lineWidth = 2 * s; ctx.stroke();

        this._roundRect(ctx, -34 * s, hatY - 46 * s, 68 * s, 48 * s, 8 * s);
        const hg = ctx.createLinearGradient(-34 * s, hatY - 46 * s, 34 * s, hatY + 2 * s);
        hg.addColorStop(0, '#2A2A4A'); hg.addColorStop(1, '#1a1a30');
        ctx.fillStyle = hg; ctx.fill();
        ctx.strokeStyle = '#333355'; ctx.lineWidth = 1.5 * s; ctx.stroke();

        ctx.beginPath();
        ctx.ellipse(-8 * s, hatY - 30 * s, 14 * s, 18 * s, -0.2, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255,255,255,0.03)'; ctx.fill();

        const bandG = ctx.createLinearGradient(-34 * s, hatY - 8 * s, 34 * s, hatY);
        bandG.addColorStop(0, '#C8902E'); bandG.addColorStop(0.5, '#FFD700'); bandG.addColorStop(1, '#C8902E');
        ctx.fillStyle = bandG;
        ctx.fillRect(-34 * s, hatY - 8 * s, 68 * s, 10 * s);

        ctx.font = `bold ${12 * s}px serif`;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillStyle = '#1a1a2e';
        ctx.fillText('$', 0, hatY - 3 * s);
        ctx.restore();
    }

    _drawSparkles(ctx) {
        for (const sp of this.sparkles) {
            ctx.save();
            ctx.translate(sp.x, sp.y);
            ctx.rotate(sp.rotation);
            ctx.globalAlpha = sp.life * sp.life;
            const sz = sp.size * (0.3 + sp.life * 0.7);
            ctx.beginPath();
            for (let i = 0; i < 4; i++) {
                const a = (i / 4) * Math.PI * 2;
                const px = Math.cos(a) * sz, py = Math.sin(a) * sz;
                if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
                const m = a + Math.PI / 4;
                ctx.lineTo(Math.cos(m) * sz * 0.3, Math.sin(m) * sz * 0.3);
            }
            ctx.closePath();
            ctx.fillStyle = sp.color;
            ctx.fill();
            ctx.restore();
        }
    }

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
            case 'confident':   return { light: '#5CB85C', main: '#3D8B3D', dark: '#2E6B2E', border: '#1B5E20', accent: '#1B5E20' };
            case 'celebrating': return { light: '#81C784', main: '#4CAF50', dark: '#388E3C', border: '#FFD700', accent: '#FFD700' };
            case 'cautious':    return { light: '#A5D6A7', main: '#66996B', dark: '#4A7A4F', border: '#5D7A3E', accent: '#4A6A2E' };
            case 'alert':       return { light: '#E57373', main: '#C06040', dark: '#8B3A2A', border: '#B71C1C', accent: '#FFD700' };
            default:            return { light: '#5CB85C', main: '#3D8B3D', dark: '#2E6B2E', border: '#1B5E20', accent: '#1B5E20' };
        }
    }

    // ========== PUBLIC API ==========

    setMood(mood) {
        if (['confident', 'cautious', 'alert', 'celebrating'].includes(mood)) this.mood = mood;
    }

    setMoodFromReport(report) {
        if (!report || !report.scoreboard) return;
        const s = report.scoreboard;
        const decisions = report.decisions || [];
        const hasReject = decisions.some(d => d.verdict === 'REJECT');
        const hasCash = decisions.some(d => d.key === 'cash_protection_mode');
        if (hasCash) this.setMood('alert');
        else if (hasReject) this.setMood('cautious');
        else if (s.net_margin > 0.3 && s.utilization > 0.7 && s.rebook_rate > 0.45) this.setMood('celebrating');
        else this.setMood('confident');
    }

    moveTo(x, y) { this.targetX = x; this.targetY = y; this.roamTimer = 0; }

    moveToStation(name) {
        this._updateStations();
        const st = this.stations[name];
        if (st) { this.currentStation = name; this.targetX = st.x; this.targetY = st.y; this.roamTimer = 0; }
    }

    getPosition() {
        return { x: this.posX + this.charW / 2, y: this.posY, left: this.posX, top: this.posY, right: this.posX + this.charW, bottom: this.posY + this.charH };
    }

    /** Talk — GSAP phoneme-driven mouth with anticipation + elastic settle */
    talk(duration = 120) {
        const sec = duration / 60;
        if (this.talkTl) this.talkTl.kill();
        this.talkTl = gsap.timeline();
        this.talkTl.to(this.anim, { mouthOpenness: 0.15, duration: 0.08, ease: 'power2.in' });
        const n = Math.max(4, Math.floor(sec * 4));
        for (let i = 0; i < n; i++) {
            const vowel = i % 2 === 0;
            this.talkTl.to(this.anim, {
                mouthOpenness: vowel ? 0.5 + Math.random() * 0.45 : 0.05 + Math.random() * 0.2,
                duration: 0.08 + Math.random() * 0.12,
                ease: vowel ? 'power2.out' : 'power3.in',
            });
        }
        this.talkTl.to(this.anim, { mouthOpenness: 0, duration: 0.3, ease: 'elastic.out(1, 0.5)' });
    }

    /** Wave — anticipation → spring up → waggle → elastic settle */
    wave() {
        if (this.waveTl) this.waveTl.kill();
        this.waveTl = gsap.timeline({
            onStart: () => { this.anim.isWaving = true; },
            onComplete: () => { this.anim.isWaving = false; this.anim.rightArmWaveAngle = 0; },
        });
        // Anticipation dip
        this.waveTl.to(this.anim, { rightArmWaveAngle: -0.2, duration: 0.15, ease: 'power2.in' });
        // Arm up with overshoot
        this.waveTl.to(this.anim, { rightArmWaveAngle: 0.4, duration: 0.2, ease: 'back.out(3)' });
        // 3 waggles
        for (let i = 0; i < 3; i++) {
            this.waveTl.to(this.anim, { rightArmWaveAngle: -0.3, duration: 0.18, ease: 'sine.inOut' });
            this.waveTl.to(this.anim, { rightArmWaveAngle: 0.4, duration: 0.18, ease: 'sine.inOut' });
        }
        // Elastic settle
        this.waveTl.to(this.anim, { rightArmWaveAngle: 0, duration: 0.5, ease: 'elastic.out(1, 0.4)' });
        // Hat follow-through
        this.waveTl.to(this.anim, { hatBounce: -6, duration: 0.12, ease: 'power2.in' }, 0.15);
        this.waveTl.to(this.anim, { hatBounce: 0, duration: 0.8, ease: 'elastic.out(1, 0.3)' }, 0.27);
        // Body tilt
        this.waveTl.to(this.anim, { bodyTilt: -0.06, duration: 0.2, ease: 'power2.out' }, 0.15);
        this.waveTl.to(this.anim, { bodyTilt: 0, duration: 0.6, ease: 'elastic.out(1, 0.5)' }, 0.35);
    }

    /** Sparkle — burst of particles + GSAP squash/stretch */
    sparkle() {
        const cx = this.w / 2, cy = this.h / 2;
        const colors = ['#FFD700', '#FFEC8B', '#FFF8DC', '#FFD700', '#A8E6A3'];
        for (let i = 0; i < 24; i++) {
            const ang = Math.random() * Math.PI * 2;
            this.sparkles.push({
                x: cx + Math.cos(ang) * 20, y: cy + Math.sin(ang) * 20 - 30,
                vx: Math.cos(ang) * (1.5 + Math.random() * 3),
                vy: Math.sin(ang) * (1 + Math.random() * 2.5) + 0.5,
                size: 5 + Math.random() * 12, life: 1.0,
                rotation: Math.random() * Math.PI,
                rotSpeed: (Math.random() - 0.5) * 0.15,
                color: colors[Math.floor(Math.random() * colors.length)],
            });
        }
        if (this.sparkleTl) this.sparkleTl.kill();
        this.sparkleTl = gsap.timeline();
        this.sparkleTl.to(this.anim, { squashX: 1.18, squashY: 0.85, duration: 0.1, ease: 'power3.in' });
        this.sparkleTl.to(this.anim, { squashX: 0.92, squashY: 1.1, duration: 0.15, ease: 'power2.out' });
        this.sparkleTl.to(this.anim, { squashX: 1, squashY: 1, duration: 0.6, ease: 'elastic.out(1, 0.4)' });
    }

    /** Bounce — impact with squash/stretch + hat follow-through */
    bounce() {
        if (this.bounceTl) this.bounceTl.kill();
        this.bounceTl = gsap.timeline();
        this.bounceTl.to(this.anim, { squashY: 0.82, squashX: 1.12, bobY: 4, duration: 0.12, ease: 'power2.in' });
        this.bounceTl.to(this.anim, { squashY: 1.15, squashX: 0.88, bobY: -12, duration: 0.18, ease: 'power3.out' });
        this.bounceTl.to(this.anim, { squashY: 1, squashX: 1, bobY: 0, duration: 0.8, ease: 'elastic.out(1, 0.35)' });
        this.bounceTl.to(this.anim, { hatBounce: -10, duration: 0.12, ease: 'power2.in' }, 0.12);
        this.bounceTl.to(this.anim, { hatBounce: 4, duration: 0.15, ease: 'power2.out' }, 0.24);
        this.bounceTl.to(this.anim, { hatBounce: 0, duration: 0.7, ease: 'elastic.out(1, 0.3)' }, 0.39);
    }
}

window.DollarAvatar = DollarAvatar;
