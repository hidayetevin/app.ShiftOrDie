import * as THREE from 'three';
import { MD2Character } from 'three/examples/jsm/misc/MD2Character.js';
import { gsap } from 'gsap';
import { CONFIG } from '../core/Config';
import { marketManager } from './MarketManager';
import { SKIN_CONFIG, WEAPON_CONFIG, getWeaponById } from './WeaponConfig';

export class Player {
    constructor(scene) {
        this.scene = scene;
        this.mesh = null;
        this.character = null;
        this.currentLane = 1;
        this.invulnerable = false;
        this.isLoaded = false;
        this.isJumping = false;
        this.isShooting = false;
        this.isDying = false; // Flag to lock death animation
        this.game = null;
        this.currentAnimation = 'stand';
        this.projectiles = []; // Track active projectiles

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
        // Dynamic config from WeaponConfig and SkinConfig
        const skinTextures = SKIN_CONFIG.map(s => s.texture);
        const weaponAssets = WEAPON_CONFIG.map(w => [w.model + '.md2', w.model + '.png']); // [model, texture]

        const config = {
            baseUrl: 'models/md2/ratamahatta/',
            body: 'ratamahatta.md2', // Base model is always ratamahatta for now
            skins: skinTextures,
            weapons: weaponAssets
        };

        this.character = new MD2Character();
        this.character.scale = 0.05; // Slightly larger scale

        this.character.onLoadComplete = () => {
            console.log('✅ MD2 Character Loaded');

            // Setup the character mesh
            this.character.root.rotation.y = 0; // Face away from camera
            this.mesh.add(this.character.root);

            // Set initial skin from MarketManager
            const savedSkinId = marketManager.getSelectedSkin();
            const skinIndex = marketManager.getSkinIndex(savedSkinId);
            if (skinIndex >= 0) {
                this.character.setSkin(skinIndex);
            } else {
                this.character.setSkin(0); // Fallback
            }

            // Log available animations
            const animations = this.character.meshBody.geometry.animations;
            console.log('📦 Available animations:', animations.map(a => a.name));

            // Start idle animation
            this.setAnimation('stand');

            // Mark as loaded immediately so character can update
            this.isLoaded = true;

            // Equip weapon after a short delay (weapon loads asynchronously)
            setTimeout(() => {
                if (this.character.weapons && this.character.weapons.length > 0) {
                    const savedWeaponId = marketManager.getSelectedWeapon();
                    const weaponIndex = marketManager.getWeaponIndex(savedWeaponId);

                    if (weaponIndex >= 0) {
                        this.character.setWeapon(weaponIndex);
                        console.log(`🔫 Weapon equipped: ${savedWeaponId}`);
                    } else {
                        this.character.setWeapon(0);
                    }
                } else {
                    console.warn('⚠️ No weapons loaded yet');
                }
            }, 200);
        };

        // Start loading
        this.character.loadParts(config);
    }

    reset() {
        this.currentLane = 1;
        this.mesh.position.set(CONFIG.LANE.POSITIONS[1], 0, 0);
        this.invulnerable = false;
        this.isJumping = false;
        this.isShooting = false;
        this.isDying = false; // Reset death flag

        // Clear projectiles
        this.projectiles.forEach(proj => this.scene.remove(proj));
        this.projectiles = [];

        // Reset animation
        if (this.isLoaded) {
            this.setAnimation('stand');
        }
    }

    update(deltaTime, speed, vfx, isPlaying) {
        if (!this.isLoaded) return;

        // Update MD2 internal mixer
        this.character.update(deltaTime);

        // If dying, don't override animation
        if (this.isDying) {
            this.updateProjectiles(deltaTime, speed, vfx);
            return;
        }

        // Animation Logic
        if (isPlaying) {
            let targetAnimation = 'run';

            // If jumping, override run
            if (this.isJumping) {
                targetAnimation = 'jump';
            }

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

        // Update projectiles
        this.updateProjectiles(deltaTime, speed, vfx);
    }

    updateProjectiles(deltaTime, gameSpeed, vfx) {
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const proj = this.projectiles[i];

            // Move projectile forward (in world space, independent of game speed)
            proj.position.z += proj.speed * deltaTime;

            // Add trail effect
            if (vfx && Math.random() < 0.5) {
                vfx.emitBurst(proj.position, 0xff3300, 2, 0.1);
            }

            // Check collision with soldier obstacles
            let hitSoldier = false;
            if (this.game && this.game.platform) {
                const platforms = this.game.platform.active;
                for (const platform of platforms) {
                    if (platform.userData.soldierObstacle) {
                        const soldier = platform.userData.soldierObstacle;
                        const soldierWorldPos = new THREE.Vector3();
                        soldier.getWorldPosition(soldierWorldPos);

                        // Simple distance check
                        const distance = proj.position.distanceTo(soldierWorldPos);
                        if (distance < 1.5) { // Hit radius
                            // Apply damage
                            if (soldier.userData && soldier.userData.health !== undefined) {
                                soldier.userData.health -= (proj.damage || 1);
                            } else {
                                // Fallback if no health defined
                                soldier.userData = { health: 0 };
                            }

                            if (soldier.userData.health <= 0) {
                                // KILL SOLDIER!
                                console.log('💥 SOLDIER ELIMINATED!');

                                // Explosion effect
                                if (vfx) {
                                    vfx.emitBurst(soldierWorldPos, 0xff0000, 30, 0.3);
                                }

                                // Remove soldier from platform
                                platform.remove(soldier);
                                platform.userData.soldierObstacle = null;
                                platform.userData.hasJumpableObstacle = false;

                                // Add score/coins for kill? (Implemented in GameLoop usually, or emit event)
                            } else {
                                console.log(`💥 Soldier Hit! HP: ${soldier.userData.health}`);
                                // Hit effect (smaller)
                                if (vfx) {
                                    vfx.emitBurst(soldierWorldPos, 0xffaa00, 10, 0.1);
                                }
                            }

                            hitSoldier = true; // Projectile hits something
                            break;
                        }
                    }
                }
            }

            // Remove projectile if hit or traveled too far
            if (hitSoldier || proj.distanceTraveled > 50 || proj.position.z < -30) {
                this.scene.remove(proj);
                this.projectiles.splice(i, 1);
            } else {
                proj.distanceTraveled += proj.speed * deltaTime;
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

        if (this.game) {
            this.game.speedMultiplier = 2.0; // Increased forward thrust for longer jumps
        }

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
                if (this.game) {
                    this.game.speedMultiplier = 1.0; // Reset speed
                }
                this.setAnimation('run'); // Return to run
            }
        });

        if (vfx) vfx.emitBurst(this.mesh.position, 0x00ff00, 8);
    }

    shoot(vfx) {
        // Cooldown check
        if (this.isShooting) return;

        this.isShooting = true;

        // Don't change animation - keep running while shooting

        // Muzzle flash effect
        const weaponId = marketManager.getSelectedWeapon();
        const weaponStats = getWeaponById(weaponId);

        if (vfx && this.character.meshWeapon) {
            const weaponPos = this.mesh.position.clone();
            weaponPos.y += 1.2; // Height of weapon
            weaponPos.z += 0.5; // In front of player
            vfx.emitBurst(weaponPos, weaponStats ? weaponStats.color : 0xff6600, 12, 0.2); // Weapon color flash

            // Create fireball projectile
            const projectile = this.createFireball(weaponPos);
            this.scene.add(projectile);
            this.projectiles.push(projectile);
        }

        // Cooldown timer
        setTimeout(() => {
            this.isShooting = false;
        }, 300); // Short cooldown
    }

    createFireball(position) {
        // Get current weapon stats
        const weaponId = marketManager.getSelectedWeapon();
        const weaponStats = getWeaponById(weaponId) || WEAPON_CONFIG[0];

        // Create glowing fireball
        let geometry;
        if (weaponStats.type === 'laser') {
            geometry = new THREE.CylinderGeometry(0.08, 0.08, 1.5, 8, 1);
            geometry.rotateX(Math.PI / 2); // Rotate to face forward
        } else {
            geometry = new THREE.SphereGeometry(0.15, 16, 16);
        }

        const material = new THREE.MeshStandardMaterial({
            color: weaponStats.color,
            emissive: weaponStats.color,
            emissiveIntensity: 2.0,
            roughness: 0.3,
            metalness: 0.1
        });

        const fireball = new THREE.Mesh(geometry, material);
        fireball.position.copy(position);

        // Add point light for glow effect
        const light = new THREE.PointLight(weaponStats.color, 2, 3);
        fireball.add(light);

        // Custom properties
        fireball.speed = weaponStats.type === 'laser' ? 35 : 25; // Lasers are faster
        fireball.damage = weaponStats.damage; // Store damage on projectile
        fireball.distanceTraveled = 0;

        return fireball;
    }

    playDeathAnimation() {
        if (!this.isLoaded) return;

        console.log('💀 Playing death animation...');

        // Lock death animation
        this.isDying = true;

        // Stop any ongoing movement
        this.isJumping = false;
        this.isShooting = false;

        // Play death animation
        this.setAnimation('death');

        // Optional: Add dramatic effect
        if (this.game && this.game.vfx) {
            this.game.vfx.emitBurst(this.mesh.position, 0xff0000, 40, 0.3);
        }
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
