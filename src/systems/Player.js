import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { gsap } from 'gsap';
import { CONFIG } from '../core/Config';

export class Player {
    constructor(scene) {
        this.scene = scene;
        this.mesh = null;
        this.model = null;
        this.mixer = null;
        this.actions = {};
        this.currentLane = 1;
        this.invulnerable = false;
        this.isLoaded = false;

        this.init();
    }

    init() {
        this.mesh = new THREE.Group();
        this.mesh.position.set(CONFIG.LANE.POSITIONS[this.currentLane], 0, 0);
        this.scene.add(this.mesh);

        const loader = new GLTFLoader();
        loader.load(
            '/models/gltf/Soldier.glb',
            (gltf) => this.onModelLoaded(gltf),
            (progress) => console.log('Loading model:', (progress.loaded / progress.total * 100).toFixed(2) + '%'),
            (error) => {
                console.error('Error loading model:', error);
                this.createFallbackModel();
            }
        );
    }

    onModelLoaded(gltf) {
        this.model = gltf.scene;
        this.mesh.add(this.model);

        // Rotate model to face forward (from Walk example)
        this.model.rotation.y = Math.PI;

        // Apply materials (from Walk example)
        this.model.traverse((object) => {
            if (object.isMesh) {
                object.castShadow = true;
                object.receiveShadow = true;

                if (object.name === 'vanguard_Mesh') {
                    object.material.metalness = 1.0;
                    object.material.roughness = 0.2;
                    object.material.color.set(1, 1, 1);
                    object.material.metalnessMap = object.material.map;
                } else {
                    object.material.metalness = 1;
                    object.material.roughness = 0;
                    object.material.transparent = true;
                    object.material.opacity = 0.8;
                    object.material.color.set(1, 1, 1);
                }
            }
        });

        // Setup animations
        const animations = gltf.animations;
        this.mixer = new THREE.AnimationMixer(this.model);

        console.log('📦 Available animations:', animations.map((a, i) => `${i}: ${a.name}`));

        // Use exact indices from Walk example
        this.actions = {
            Idle: this.mixer.clipAction(animations[0]),
            Walk: this.mixer.clipAction(animations[3]),
            Run: this.mixer.clipAction(animations[1])
        };

        console.log('✅ Loaded actions:', Object.keys(this.actions));

        // Setup animation weights (from Walk example)
        for (const name in this.actions) {
            this.actions[name].enabled = true;
            this.actions[name].setEffectiveTimeScale(1);
            if (name !== 'Idle') {
                this.actions[name].setEffectiveWeight(0);
            } else {
                this.actions[name].setEffectiveWeight(1);
            }
        }

        // Start with Idle
        this.actions.Idle.play();
        this.currentAction = 'Idle';
        this.isLoaded = true;

        console.log('✅ Player model loaded - Starting animation:', this.currentAction);
    }

    createFallbackModel() {
        console.warn('⚠️ Using fallback geometry');
        const matBody = new THREE.MeshStandardMaterial({
            color: 0x444444,
            metalness: 1.0,
            roughness: 0.1,
            emissive: 0x00ffff,
            emissiveIntensity: 0.1
        });

        const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.25, 0.5, 4, 8), matBody);
        torso.position.y = 1.0;
        torso.castShadow = true;
        this.mesh.add(torso);

        this.isLoaded = true;
    }

    update(deltaTime, speed, vfx, isPlaying) {
        if (!this.isLoaded) return;

        // Update animation mixer
        if (this.mixer) {
            this.mixer.update(deltaTime);

            // In gameplay, always animate (this is an endless runner)
            if (isPlaying) {
                const targetAction = speed > 10 ? 'Run' : 'Walk';
                if (this.currentAction !== targetAction) {
                    console.log(`🏃 Animation switch: ${this.currentAction} → ${targetAction} (speed: ${speed.toFixed(1)})`);
                    this.fadeToAction(targetAction, 0.3);
                }

                // Running effects
                if (this.currentAction === 'Run' && vfx) {
                    // Speed trail particles
                    if (Math.random() < 0.3) {
                        const trailPos = this.mesh.position.clone();
                        trailPos.y += 0.5;
                        vfx.emitBurst(trailPos, 0x00ffff, 2, 0.15);
                    }

                    // Ground impact particles (on footsteps)
                    const animTime = this.actions.Run.time;
                    const stepInterval = 0.4;
                    if (Math.abs(animTime % stepInterval) < 0.05) {
                        const groundPos = this.mesh.position.clone();
                        groundPos.y = 0.1;
                        vfx.emitBurst(groundPos, 0xaaaaaa, 5, 0.08);
                    }

                    // Lean forward when running
                    this.mesh.rotation.x = -0.1;
                } else if (this.currentAction === 'Walk' && vfx) {
                    // Subtle footstep effects when walking
                    const animTime = this.actions.Walk.time;
                    const stepInterval = 0.5;
                    if (Math.abs(animTime % stepInterval) < 0.05) {
                        const groundPos = this.mesh.position.clone();
                        groundPos.y = 0.1;
                        vfx.emitBurst(groundPos, 0x666666, 3, 0.05);
                    }

                    // Reset rotation
                    this.mesh.rotation.x *= 0.9;
                }
            } else {
                // Not playing - show idle
                if (this.currentAction !== 'Idle') {
                    this.fadeToAction('Idle', 0.5);
                }
                this.mesh.rotation.x *= 0.9;
            }
        }
    }

    fadeToAction(name, duration = 0.3) {
        if (!this.actions[name]) {
            console.error(`❌ Action ${name} not found!`);
            return;
        }

        const current = this.actions[name];
        const old = this.actions[this.currentAction];

        if (current === old) return;

        console.log(`🎬 Fading: ${this.currentAction} → ${name}`);

        // Use the Walk example's exact transition method
        current.reset();
        current.enabled = true;
        current.setEffectiveWeight(1);
        current.time = 0;

        old.stopFading();
        current.stopFading();

        // Smooth fade transition
        old.fadeOut(duration);
        current.fadeIn(duration);
        current.play();

        this.currentAction = name;
    }

    switchLane(vfx, direction = 'right') {
        let newLane = this.currentLane;

        if (direction === 'left') {
            newLane = Math.max(0, this.currentLane - 1);
        } else if (direction === 'right') {
            newLane = Math.min(CONFIG.LANE.COUNT - 1, this.currentLane + 1);
        }

        // Check if actually moved
        if (newLane === this.currentLane) {
            return false; // No movement (already at edge)
        }

        this.currentLane = newLane;

        gsap.to(this.mesh.position, {
            x: CONFIG.LANE.POSITIONS[this.currentLane],
            duration: CONFIG.PLAYER.SWITCH_DURATION,
            ease: 'power2.out'
        });

        if (vfx) vfx.emitBurst(this.mesh.position, 0x00ffff, 5);

        return true; // Movement successful
    }

    setInvulnerable(duration) {
        this.invulnerable = true;

        if (this.model) {
            this.model.traverse(child => {
                if (child.material) {
                    child.material.opacity = CONFIG.PLAYER.RESPAWN_OPACITY;
                }
            });
        }

        setTimeout(() => {
            this.invulnerable = false;
            if (this.model) {
                this.model.traverse(child => {
                    if (child.material) {
                        child.material.opacity = 1.0;
                    }
                });
            }
        }, duration);
    }

    reset() {
        this.currentLane = 1;
        this.mesh.position.set(CONFIG.LANE.POSITIONS[this.currentLane], 0, 0);

        if (this.model) {
            this.model.traverse(child => {
                if (child.material) {
                    child.material.opacity = 1.0;
                }
            });
        }

        this.invulnerable = false;

        // Reset to idle animation
        if (this.actions.Idle) {
            this.fadeToAction('Idle', 0.2);
        }
    }
}
