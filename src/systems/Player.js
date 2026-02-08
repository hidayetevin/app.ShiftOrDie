import * as THREE from 'three';
import { MD2Character } from 'three/examples/jsm/misc/MD2Character.js';
import { gsap } from 'gsap';
import { CONFIG } from '../core/Config';

export class Player {
    constructor(scene) {
        this.scene = scene;
        this.mesh = null;
        this.character = null;
        this.currentLane = 1;
        this.invulnerable = false;
        this.isLoaded = false;
        this.isJumping = false;
        this.game = null;
        this.currentAnimation = 'stand';

        this.init();
    }

    setGame(game) {
        this.game = game;
    }

    init() {
        // Create a container group for the character
        this.mesh = new THREE.Group();
        this.mesh.position.set(CONFIG.LANE.POSITIONS[this.currentLane], 0, 0);
        this.scene.add(this.mesh);

        // MD2 Character Configuration
        const config = {
            baseUrl: 'models/md2/ratamahatta/',
            body: 'ratamahatta.md2',
            skins: ['ratamahatta.png'], // User must place image in models/md2/ratamahatta/skins/
            weapons: [] // Weapons disabled to simplify setup
        };

        this.character = new MD2Character();
        this.character.scale = 0.05; // Slightly larger scale

        this.character.onLoadComplete = () => {
            console.log('✅ MD2 Character Loaded');

            // Setup the character mesh
            this.character.root.rotation.y = 0; // Face away from camera
            this.mesh.add(this.character.root);

            // Set initial skin
            this.character.setSkin(0);

            // Log available animations
            const animations = this.character.meshBody.geometry.animations;
            console.log('📦 Available animations:', animations.map(a => a.name));

            // Start idle animation
            this.setAnimation('stand');

            this.isLoaded = true;
        };

        // Start loading
        this.character.loadParts(config);
    }

    update(deltaTime, speed, vfx, isPlaying) {
        if (!this.isLoaded) return;

        // Update MD2 internal mixer
        this.character.update(deltaTime);

        // Animation Logic
        if (isPlaying) {
            let targetAnimation = 'run';

            // If jumping, override run
            if (this.isJumping) {
                targetAnimation = 'jump';
            } else if (speed < 0.1) {
                targetAnimation = 'stand';
            }

            // Sync animation speed with game speed (optional, for smoother run)
            // MD2Character doesn't support dynamic speed easily without accessing mixer directly
            // but we can setPlaybackRate if needed. For now, keep it simple.

            if (this.currentAnimation !== targetAnimation) {
                this.setAnimation(targetAnimation);
            }

            // VFX Handling
            if (this.currentAnimation === 'run' && vfx) {
                // Ground particles
                if (Math.random() < 0.1) {
                    const groundPos = this.mesh.position.clone();
                    groundPos.y = 0.1;
                    vfx.emitBurst(groundPos, 0xaaaaaa, 3, 0.05);
                }
            }

        } else {
            // Not playing -> Stand
            if (this.currentAnimation !== 'stand') {
                this.setAnimation('stand');
            }
        }
    }

    setAnimation(name) {
        if (this.currentAnimation === name) return;

        // Map generic names to MD2 specific names if needed
        // MD2 standard: stand, run, jump, attack, pain, death, flip, salute, etc.
        console.log(`🎬 Switching animation: ${name}`);
        this.character.setAnimation(name);
        this.currentAnimation = name;
    }

    switchLane(vfx, direction = 'right') {
        let newLane = this.currentLane;

        if (direction === 'left') {
            newLane = Math.max(0, this.currentLane - 1);
        } else if (direction === 'right') {
            newLane = Math.min(CONFIG.LANE.COUNT - 1, this.currentLane + 1);
        }

        if (newLane === this.currentLane) return false;

        this.currentLane = newLane;
        const duration = CONFIG.PLAYER.SWITCH_DURATION;

        // Diagonal rotation for MD2
        const diagonalRotation = direction === 'left' ? -0.5 : 0.5;

        gsap.to(this.mesh.position, {
            x: CONFIG.LANE.POSITIONS[this.currentLane],
            duration: duration,
            ease: 'power2.out'
        });

        // Tilt effect
        gsap.timeline()
            .to(this.mesh.rotation, {
                y: diagonalRotation,
                duration: duration * 0.5,
                ease: 'power2.out'
            })
            .to(this.mesh.rotation, {
                y: 0,
                duration: duration * 0.5,
                ease: 'power2.in'
            });

        if (vfx) vfx.emitBurst(this.mesh.position, 0x00ffff, 5);
        return true;
    }

    jump(vfx) {
        if (this.isJumping) return;

        this.isJumping = true;
        const jumpHeight = 1.5;
        const jumpDuration = 0.6; // Slightly longer for MD2 jump anim

        // Play jump animation
        this.setAnimation('jump');

        const jumpTimeline = gsap.timeline();

        jumpTimeline.to(this.mesh.position, {
            y: jumpHeight,
            duration: jumpDuration / 2,
            ease: 'power2.out'
        });

        jumpTimeline.to(this.mesh.position, {
            y: 0,
            duration: jumpDuration / 2,
            ease: 'power2.in',
            onComplete: () => {
                this.isJumping = false;
                this.setAnimation('run'); // Return to run
            }
        });

        if (vfx) vfx.emitBurst(this.mesh.position, 0x00ff00, 8);
    }

    setInvulnerable(duration) {
        this.invulnerable = true;
        // MD2 material handling
        if (this.character && this.character.meshBody) {
            this.character.meshBody.material.opacity = 0.5;
            this.character.meshBody.material.transparent = true;
        }

        setTimeout(() => {
            this.invulnerable = false;
            if (this.character && this.character.meshBody) {
                this.character.meshBody.material.opacity = 1.0;
                this.character.meshBody.material.transparent = false;
            }
        }, duration);
    }

    reset() {
        this.currentLane = 1;
        this.mesh.position.set(CONFIG.LANE.POSITIONS[this.currentLane], 0, 0);
        this.invulnerable = false;
        this.setAnimation('stand');
    }
}
