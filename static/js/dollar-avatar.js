/**
 * Mr. Dollars — 3D Animated Dollar Avatar
 *
 * WebGL-based CGI dollar character using Three.js.
 * The avatar reacts to report data: mood, animations, and particle effects
 * change based on business health metrics.
 *
 * Moods: "confident", "cautious", "alert", "celebrating"
 */

class DollarAvatar {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        if (!this.container) return;

        this.mood = 'confident';
        this.targetRotation = 0;
        this.bobPhase = 0;
        this.glowIntensity = 1.0;
        this.particles = [];
        this.sparkles = [];

        this._initScene();
        this._buildDollarSign();
        this._buildParticleSystem();
        this._buildGlowRing();
        this._animate();
    }

    _initScene() {
        const w = this.container.clientWidth;
        const h = this.container.clientHeight;

        // Scene
        this.scene = new THREE.Scene();

        // Camera
        this.camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 100);
        this.camera.position.set(0, 0, 6);

        // Renderer
        this.renderer = new THREE.WebGLRenderer({
            antialias: true,
            alpha: true,
        });
        this.renderer.setSize(w, h);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.setClearColor(0x000000, 0);
        this.container.appendChild(this.renderer.domElement);

        // Lighting
        const ambient = new THREE.AmbientLight(0xffffff, 0.4);
        this.scene.add(ambient);

        const keyLight = new THREE.DirectionalLight(0xFFD700, 1.2);
        keyLight.position.set(3, 4, 5);
        this.scene.add(keyLight);

        const fillLight = new THREE.DirectionalLight(0x2E8B57, 0.5);
        fillLight.position.set(-3, 1, 3);
        this.scene.add(fillLight);

        const rimLight = new THREE.PointLight(0xFFEC8B, 0.8, 15);
        rimLight.position.set(0, -2, 4);
        this.scene.add(rimLight);
        this.rimLight = rimLight;

        // Mouse interaction
        this._mouseX = 0;
        this._mouseY = 0;
        this.container.addEventListener('mousemove', (e) => {
            const rect = this.container.getBoundingClientRect();
            this._mouseX = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
            this._mouseY = -((e.clientY - rect.top) / rect.height - 0.5) * 2;
        });

        // Resize handler
        window.addEventListener('resize', () => {
            const nw = this.container.clientWidth;
            const nh = this.container.clientHeight;
            this.camera.aspect = nw / nh;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(nw, nh);
        });
    }

    _buildDollarSign() {
        this.dollarGroup = new THREE.Group();

        // Dollar sign body - extruded from a path
        const dollarShape = new THREE.Shape();

        // S-curve of dollar sign
        dollarShape.moveTo(0.5, -1.2);
        dollarShape.bezierCurveTo(0.5, -1.5, -0.6, -1.5, -0.6, -1.0);
        dollarShape.bezierCurveTo(-0.6, -0.5, 0.6, -0.3, 0.6, 0.2);
        dollarShape.bezierCurveTo(0.6, 0.8, -0.6, 0.9, -0.6, 0.5);

        const extrudeSettings = {
            steps: 1,
            depth: 0.35,
            bevelEnabled: true,
            bevelThickness: 0.08,
            bevelSize: 0.06,
            bevelSegments: 4,
        };

        const sGeom = new THREE.ExtrudeGeometry(dollarShape, extrudeSettings);

        // Gold metallic material
        const goldMat = new THREE.MeshStandardMaterial({
            color: 0xFFD700,
            metalness: 0.85,
            roughness: 0.15,
            emissive: 0xB8860B,
            emissiveIntensity: 0.15,
        });

        const sMesh = new THREE.Mesh(sGeom, goldMat);
        sMesh.position.set(0, 0.35, -0.175);
        this.dollarGroup.add(sMesh);

        // Vertical lines through the S
        const lineGeom = new THREE.CylinderGeometry(0.06, 0.06, 3.2, 12);
        const line1 = new THREE.Mesh(lineGeom, goldMat);
        line1.position.set(-0.1, -0.1, 0);
        this.dollarGroup.add(line1);

        const line2 = new THREE.Mesh(lineGeom, goldMat);
        line2.position.set(0.1, -0.1, 0);
        this.dollarGroup.add(line2);

        // Eyes (when in "character" mode)
        const eyeGeom = new THREE.SphereGeometry(0.1, 16, 16);
        const eyeMat = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            emissive: 0xffffff,
            emissiveIntensity: 0.3,
        });
        const pupilGeom = new THREE.SphereGeometry(0.05, 12, 12);
        const pupilMat = new THREE.MeshStandardMaterial({
            color: 0x1a1a2e,
            metalness: 0.0,
            roughness: 0.8,
        });

        this.leftEye = new THREE.Group();
        const leftEyeBall = new THREE.Mesh(eyeGeom, eyeMat);
        this.leftPupil = new THREE.Mesh(pupilGeom, pupilMat);
        this.leftPupil.position.z = 0.07;
        this.leftEye.add(leftEyeBall);
        this.leftEye.add(this.leftPupil);
        this.leftEye.position.set(-0.3, 0.55, 0.25);
        this.dollarGroup.add(this.leftEye);

        this.rightEye = new THREE.Group();
        const rightEyeBall = new THREE.Mesh(eyeGeom, eyeMat);
        this.rightPupil = new THREE.Mesh(pupilGeom, pupilMat);
        this.rightPupil.position.z = 0.07;
        this.rightEye.add(rightEyeBall);
        this.rightEye.add(this.rightPupil);
        this.rightEye.position.set(0.3, 0.55, 0.25);
        this.dollarGroup.add(this.rightEye);

        this.scene.add(this.dollarGroup);
        this.goldMat = goldMat;
    }

    _buildParticleSystem() {
        // Floating dollar particles around the avatar
        const particleCount = 60;
        const positions = new Float32Array(particleCount * 3);
        const sizes = new Float32Array(particleCount);

        for (let i = 0; i < particleCount; i++) {
            const angle = Math.random() * Math.PI * 2;
            const radius = 1.5 + Math.random() * 2.5;
            positions[i * 3] = Math.cos(angle) * radius;
            positions[i * 3 + 1] = (Math.random() - 0.5) * 4;
            positions[i * 3 + 2] = Math.sin(angle) * radius * 0.3;
            sizes[i] = 0.02 + Math.random() * 0.06;

            this.particles.push({
                angle: angle,
                radius: radius,
                speed: 0.2 + Math.random() * 0.5,
                ySpeed: 0.1 + Math.random() * 0.3,
                baseY: positions[i * 3 + 1],
            });
        }

        const pGeom = new THREE.BufferGeometry();
        pGeom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        pGeom.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

        const pMat = new THREE.PointsMaterial({
            color: 0xFFD700,
            size: 0.06,
            transparent: true,
            opacity: 0.6,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
        });

        this.particleSystem = new THREE.Points(pGeom, pMat);
        this.scene.add(this.particleSystem);
    }

    _buildGlowRing() {
        // Glowing ring around the dollar sign
        const ringGeom = new THREE.TorusGeometry(2.0, 0.03, 8, 64);
        const ringMat = new THREE.MeshBasicMaterial({
            color: 0xFFD700,
            transparent: true,
            opacity: 0.25,
            blending: THREE.AdditiveBlending,
        });

        this.glowRing = new THREE.Mesh(ringGeom, ringMat);
        this.glowRing.rotation.x = Math.PI * 0.5;
        this.scene.add(this.glowRing);

        // Second inner ring
        const ring2Geom = new THREE.TorusGeometry(1.5, 0.02, 8, 48);
        const ring2Mat = new THREE.MeshBasicMaterial({
            color: 0x2E8B57,
            transparent: true,
            opacity: 0.15,
            blending: THREE.AdditiveBlending,
        });

        this.innerRing = new THREE.Mesh(ring2Geom, ring2Mat);
        this.innerRing.rotation.x = Math.PI * 0.5;
        this.scene.add(this.innerRing);
    }

    _animate() {
        const clock = new THREE.Clock();

        const tick = () => {
            requestAnimationFrame(tick);
            const elapsed = clock.getElapsedTime();
            const delta = clock.getDelta();

            // Bob animation
            this.bobPhase += 0.02;
            const bobAmount = this._getMoodBobAmount();
            this.dollarGroup.position.y = Math.sin(this.bobPhase) * bobAmount;

            // Rotation — subtle tracking of mouse
            const targetRotY = this._mouseX * 0.4;
            const targetRotX = this._mouseY * 0.2;
            this.dollarGroup.rotation.y += (targetRotY - this.dollarGroup.rotation.y) * 0.05;
            this.dollarGroup.rotation.x += (targetRotX - this.dollarGroup.rotation.x) * 0.05;

            // Mood-based scale pulse
            const pulseSpeed = this._getMoodPulseSpeed();
            const pulseAmp = this._getMoodPulseAmp();
            const scale = 1.0 + Math.sin(elapsed * pulseSpeed) * pulseAmp;
            this.dollarGroup.scale.set(scale, scale, scale);

            // Eye tracking (pupils follow mouse)
            if (this.leftPupil && this.rightPupil) {
                this.leftPupil.position.x = this._mouseX * 0.03;
                this.leftPupil.position.y = this._mouseY * 0.03;
                this.rightPupil.position.x = this._mouseX * 0.03;
                this.rightPupil.position.y = this._mouseY * 0.03;
            }

            // Material emissive based on mood
            this._updateMoodVisuals(elapsed);

            // Particles orbit
            const positions = this.particleSystem.geometry.attributes.position.array;
            for (let i = 0; i < this.particles.length; i++) {
                const p = this.particles[i];
                p.angle += p.speed * 0.01;
                positions[i * 3] = Math.cos(p.angle) * p.radius;
                positions[i * 3 + 1] = p.baseY + Math.sin(elapsed * p.ySpeed + i) * 0.5;
                positions[i * 3 + 2] = Math.sin(p.angle) * p.radius * 0.3;
            }
            this.particleSystem.geometry.attributes.position.needsUpdate = true;
            this.particleSystem.rotation.y += 0.001;

            // Rings rotate
            this.glowRing.rotation.z = elapsed * 0.15;
            this.innerRing.rotation.z = -elapsed * 0.2;

            // Glow ring pulse
            this.glowRing.material.opacity = 0.15 + Math.sin(elapsed * 1.5) * 0.1;
            this.innerRing.material.opacity = 0.1 + Math.sin(elapsed * 2.0) * 0.05;

            this.renderer.render(this.scene, this.camera);
        };

        tick();
    }

    _getMoodBobAmount() {
        switch (this.mood) {
            case 'celebrating': return 0.15;
            case 'confident':   return 0.08;
            case 'cautious':    return 0.04;
            case 'alert':       return 0.02;
            default:            return 0.06;
        }
    }

    _getMoodPulseSpeed() {
        switch (this.mood) {
            case 'celebrating': return 4.0;
            case 'confident':   return 2.0;
            case 'cautious':    return 1.0;
            case 'alert':       return 6.0;
            default:            return 2.0;
        }
    }

    _getMoodPulseAmp() {
        switch (this.mood) {
            case 'celebrating': return 0.06;
            case 'confident':   return 0.02;
            case 'cautious':    return 0.01;
            case 'alert':       return 0.04;
            default:            return 0.02;
        }
    }

    _updateMoodVisuals(elapsed) {
        const moodColors = {
            confident:   { color: 0xFFD700, emissive: 0xB8860B, intensity: 0.15 },
            celebrating: { color: 0xFFEC8B, emissive: 0xFFD700, intensity: 0.4 },
            cautious:    { color: 0xDAA520, emissive: 0x8B6914, intensity: 0.1 },
            alert:       { color: 0xFF8C00, emissive: 0xFF4500, intensity: 0.3 + Math.sin(elapsed * 8) * 0.2 },
        };

        const mc = moodColors[this.mood] || moodColors.confident;
        this.goldMat.color.setHex(mc.color);
        this.goldMat.emissive.setHex(mc.emissive);
        this.goldMat.emissiveIntensity = mc.intensity;

        // Particle color matches mood
        const particleColors = {
            confident:   0xFFD700,
            celebrating: 0xFFEC8B,
            cautious:    0xDAA520,
            alert:       0xFF6347,
        };
        this.particleSystem.material.color.setHex(
            particleColors[this.mood] || 0xFFD700
        );
    }

    /**
     * Set avatar mood based on report data.
     */
    setMood(mood) {
        if (['confident', 'cautious', 'alert', 'celebrating'].includes(mood)) {
            this.mood = mood;
        }
    }

    /**
     * Determine mood from report metrics.
     */
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

    /**
     * Trigger a sparkle burst effect (e.g., on report refresh).
     */
    sparkle() {
        // Increase particle opacity briefly
        this.particleSystem.material.opacity = 1.0;
        this.glowRing.material.opacity = 0.5;
        setTimeout(() => {
            this.particleSystem.material.opacity = 0.6;
        }, 800);
    }
}

// Export for use in main app
window.DollarAvatar = DollarAvatar;
