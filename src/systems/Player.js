import * as THREE from 'three';
import { MD2Character } from 'three/examples/jsm/misc/MD2Character.js';
import { gsap } from 'gsap';
import { CONFIG } from '../core/Config';
import { marketManager } from './MarketManager';
import { SKIN_CONFIG, WEAPON_CONFIG, getWeaponById, getSkinById } from './WeaponConfig';

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
        this.currentAnimation = null; // Will be set when character loads
        this.projectiles = []; // Track active projectiles
        this.killCount = 0; // Track soldier kills for coin rewards
        this.tempVec3 = new THREE.Vector3(); // GC fix
        this.health = 2; // Default, will be updated by skin
        this.health = 2; // Default, will be updated by skin
        this.maxHealth = 2;

        // Power-Up States
        this.hasShield = false;
        this.isGhost = false;
        this.shieldMesh = null;

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
            const animNames = animations.map(a => a.name);
            console.log('📦 Available animations:', animNames);

            // Determine correct idle animation name
            if (animNames.includes('stand')) {
                this.idleAnimationName = 'stand';
            } else if (animNames.includes('idle')) {
                this.idleAnimationName = 'idle';
            } else {
                this.idleAnimationName = animNames[0]; // Fallback to first animation
                console.warn(`⚠️ 'stand' animation not found, falling back to '${this.idleAnimationName}'`);
            }

            // Start idle animation
            this.setAnimation(this.idleAnimationName);

            // Mark as loaded immediately so character can update
            this.isLoaded = true;

            // If we are already in menu mode (e.g. initial load), re-apply menu settings to ensure animation/scale are correct
            if (this.isMenuMode) {
                console.log('🔄 Re-applying menu mode after load');
                this.setMenuMode(true);
            }

            // Equip weapon after a short delay (weapon loads asynchronously)
            setTimeout(() => {
                if (this.character.weapons && this.character.weapons.length > 0) {
                    const savedWeaponId = marketManager.getSelectedWeapon();
                    const weaponIndex = marketManager.getWeaponIndex(savedWeaponId);

                    if (weaponIndex >= 0) {
                        this.character.setWeapon(weaponIndex);
                        console.log(`🔫 Weapon equipped: ${savedWeaponId} `);
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
        this.mesh.rotation.y = 0; // Ensure facing forward (+Z)
        this.invulnerable = false;
        this.isJumping = false;
        this.isShooting = false;
        this.isDying = false; // Reset death flag

        // Clear projectiles
        this.projectiles.forEach(proj => this.scene.remove(proj));
        this.projectiles = []; // Fix duplicate remove
        this.killCount = 0; // Reset kill count
        // Reset health based on skin
        const savedSkinId = marketManager.getSelectedSkin();
        const skinData = getSkinById(savedSkinId);
        this.maxHealth = skinData ? skinData.health : 2;
        this.health = this.maxHealth;

        // Reset PowerUps
        this.hasShield = false;
        this.isGhost = false;
        if (this.shieldMesh) this.shieldMesh.visible = false;
        clearTimeout(this.ghostTimer);

        // Restore opacity if ghost mode was active
        this.mesh.traverse(c => {
            if (c.isMesh) {
                if (c.userData.orgOpacity !== undefined) c.material.opacity = c.userData.orgOpacity;
                if (c.userData.orgTransparent !== undefined) c.material.transparent = c.userData.orgTransparent;
            }
        });

        if (this.game && this.game.ui) {
            this.game.ui.updateHealth(this.health, this.maxHealth);
        }

        // Reset animation
        if (this.isLoaded) {
            this.setAnimation(this.idleAnimationName || 'stand');
        }
    }

    revive() {
        console.log('✨ REVIVING PLAYER!');
        // 1. Restore Health
        this.health = 1; // Revival sets health to 1 (Last Chance)
        this.isDying = false;
        this.isShooting = false;
        this.isJumping = false;

        // 2. Clear nearby threats (optional, but good for UX)
        // For now, rely on invulnerability

        // 3. Reset Animation
        this.setAnimation('run');

        // 4. Invulnerability handled by Game.js calling setInvulnerable, 
        //    but good to ensure here too if called standalone.
        //    (Game.js calls it with CONFIG.PLAYER.INVULNERABLE_DURATION)

        // 5. Update UI
        if (this.game && this.game.ui) {
            this.game.ui.updateHealth(this.health, this.maxHealth);
        }
    }

    setMenuMode(active) {
        this.isMenuMode = active;
        if (active) {
            // Kill any active tweens (e.g. from lane switching)
            gsap.killTweensOf(this.mesh.position);
            gsap.killTweensOf(this.mesh.rotation);

            this.mesh.position.set(-0.2, -0.2, 0); // Centered position
            this.mesh.rotation.y = 0; // Face +Z (Forward/Camera in Menu)

            // Only set animation if character is already loaded
            if (this.isLoaded) {
                this.setAnimation(this.idleAnimationName || 'stand');
                if (this.character.mixer) this.character.mixer.timeScale = 1.0; // Normal speed
            }
            // If not loaded yet, the animation will be set in onLoadComplete callback
        } else {
            this.isMenuMode = false;
            this.reset();
        }
    }

    update(deltaTime, speed, vfx, isPlaying) {
        if (!this.isLoaded) return;

        if (this.isMenuMode) {
            // Enforce position (x offset to center character visually)
            this.mesh.position.set(-0.2, -0.2, 0);

            // Subtle idle rotation to make it feel alive
            const time = Date.now() * 0.0005;
            this.mesh.rotation.y = Math.sin(time) * 0.15;

            this.character.update(deltaTime);
            const idleAnim = this.idleAnimationName || 'stand';
            if (this.currentAnimation !== idleAnim) {
                this.setAnimation(idleAnim);
            }
            // Ensure animation plays nicely
            if (this.character.mixer && this.character.mixer.timeScale !== 1.0) {
                this.character.mixer.timeScale = 1.0;
            }
            return;
        }

        // Sync animation speed with game speed
        // Base speed was roughly 5.0. New base is 2.5.
        // We want animation to look natural.
        // If speed is 2.5, timeScale should be ~0.5.
        // If speed is 5.0, timeScale should be ~1.0.
        // If speed is 8.0, timeScale should be ~1.6.
        if (this.character.mixer) {
            // Check if run/stand to adjust speed
            if (this.currentAnimation === 'run') {
                this.character.mixer.timeScale = Math.max(0.5, speed / 5.0);
            } else {
                // For jump, death, stand - keep normal speed
                this.character.mixer.timeScale = 1.0;
            }
        }

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
                if (Math.random() < 0.1 * (speed / 5)) { // Adjust particle rate too
                    const groundPos = this.mesh.position.clone();
                    groundPos.y = 0.1;
                    vfx.emitBurst(groundPos, 0xaaaaaa, 3, 0.05);
                }
            }

        } else {
            // Not playing -> Stand
            const idleAnim = this.idleAnimationName || 'stand';
            if (this.currentAnimation !== idleAnim) {
                this.setAnimation(idleAnim);
            }
        }

        // Update projectiles
        this.updateProjectiles(deltaTime, speed, vfx);
    }

    updateProjectiles(deltaTime, gameSpeed, vfx) {
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const proj = this.projectiles[i];

            // Move projectile forward (in world space, independent of game speed)
            if (proj.velocity) {
                proj.position.add(proj.velocity.clone().multiplyScalar(deltaTime));
            } else {
                proj.position.z += proj.speed * deltaTime;
            }

            // Add trail effect
            if (vfx && Math.random() < 0.5) {
                vfx.emitBurst(proj.position, 0xff3300, 2, 0.1);
            }

            // Check collision with soldier obstacles
            let hitSoldier = false;
            if (this.game && this.game.platform) {
                const platforms = this.game.platform.active;
                for (const platform of platforms) {
                    // Check if platform has an ACTIVE soldier
                    if (platform.userData.hasSoldier && platform.userData.soldier && platform.userData.soldier.visible) {
                        const soldier = platform.userData.soldier;
                        // GC Optimization: Reuse vector
                        soldier.getWorldPosition(this.tempVec3);
                        const soldierWorldPos = this.tempVec3;

                        // CYLINDER COLLISION (Fix for height difference)
                        // Calculate horizontal distance only (XZ)
                        const dx = proj.position.x - soldierWorldPos.x;
                        const dz = proj.position.z - soldierWorldPos.z;
                        const distanceXZ = Math.sqrt(dx * dx + dz * dz);

                        // Check height (Projectile must be within soldier height range -0.5 - 2.5)
                        const dy = proj.position.y - soldierWorldPos.y;
                        const hitHeight = dy > -0.5 && dy < 2.5; // Generous height box (floor to head)

                        // Hit Radius ~1.0
                        if (distanceXZ < 1.0 && hitHeight) {
                            hitSoldier = true;

                            // Apply damage to Shared Data
                            const data = platform.userData.soldierData;
                            data.health -= (proj.damage || 10);

                            // Update Health Bar UI
                            if (platform.userData.healthBar) {
                                const hpPercent = Math.max(0, data.health / data.maxHealth);
                                platform.userData.healthBar.scale.setX(hpPercent);
                            }

                            if (data.health <= 0) {
                                // KILL SOLDIER!
                                // console.log('💥 SOLDIER ELIMINATED!');

                                // Explosion effect
                                if (vfx) {
                                    vfx.emitBurst(soldierWorldPos, 0xff0000, 20, 0.5);
                                }

                                // POOLING: Hide instead of remove
                                soldier.visible = false;
                                platform.userData.hasSoldier = false;

                                // Coin Reward Logic
                                this.killCount++;
                                if (this.killCount % 3 === 0) { // Every 3 kills
                                    this.game.score.addBonus(50);
                                    this.game.progression.addCoin(1);
                                }
                            } else {
                                // Hit effect (sparks)
                                if (vfx) {
                                    vfx.emitBurst(soldierWorldPos, 0xffff00, 5, 0.1);
                                }
                            }

                            // Projectile hit something, destroy it
                            // Break inner loop (platforms)
                            break;
                        }
                    }
                }
            }

            // Check collision with crates (obstacles)
            if (!hitSoldier && this.game && this.game.platform) {
                const platforms = this.game.platform.active;
                for (const platform of platforms) {
                    // Check regular cubes/crates
                    if (platform.userData.cubes) {
                        for (const cube of platform.userData.cubes) {
                            if (cube.visible) {
                                const cubeWorldPos = new THREE.Vector3();
                                cube.getWorldPosition(cubeWorldPos);
                                // Simple distance check (Cube size ~0.8)
                                if (proj.position.distanceTo(cubeWorldPos) < 0.8) {
                                    hitSoldier = true; // Mark as hit to remove projectile
                                    // Visual effect for hitting wall/crate
                                    if (vfx) vfx.emitBurst(proj.position, 0xaaaaaa, 5, 0.1);
                                    break;
                                }
                            }
                        }
                    }
                    if (hitSoldier) break;

                    // Check jumpable cubes if visible
                    if (platform.userData.jumpableCube && platform.userData.jumpableCube.visible) {
                        const cubeWorldPos = new THREE.Vector3();
                        platform.userData.jumpableCube.getWorldPosition(cubeWorldPos);
                        if (proj.position.distanceTo(cubeWorldPos) < 0.8) {
                            hitSoldier = true;
                            if (vfx) vfx.emitBurst(proj.position, 0xaaaaaa, 5, 0.1);
                            break;
                        }
                    }
                    if (hitSoldier) break;
                }
            }

            // Remove projectile if hit or traveled too far
            // Use projected Z or distance from start
            // Since we shoot in any direction, relying on Z < -30 is risky if shooting sideways
            // Better to use distanceTraveled
            if (hitSoldier || proj.distanceTraveled > 60) {
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
        console.log(`🎬 Switching animation: ${name} `);
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

    shoot(vfx, direction = new THREE.Vector3(0, 0, 1)) {
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
            // Adjust weapon pos based on direction slightly to not clip
            weaponPos.add(direction.clone().multiplyScalar(0.5));

            vfx.emitBurst(weaponPos, weaponStats ? weaponStats.color : 0xff6600, 12, 0.2); // Weapon color flash

            // Create fireball projectile
            const projectile = this.createFireball(weaponPos, direction);
            this.scene.add(projectile);
            this.projectiles.push(projectile);
        }

        // Cooldown timer
        setTimeout(() => {
            this.isShooting = false;
        }, 150); // Faster fire rate for tap shooting
    }

    createFireball(position, direction) {
        // Get current weapon stats
        const weaponId = marketManager.getSelectedWeapon();
        const weaponStats = getWeaponById(weaponId) || WEAPON_CONFIG[0];

        // Create glowing fireball
        let geometry;
        if (weaponStats.type === 'laser') {
            geometry = new THREE.CylinderGeometry(0.08, 0.08, 1.5, 8, 1);
            geometry.rotateX(Math.PI / 2); // Rotate to face forward relative to local Z
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

        // Orient to direction
        const lookTarget = position.clone().add(direction);
        fireball.lookAt(lookTarget);

        // Add point light for glow effect
        const light = new THREE.PointLight(weaponStats.color, 2, 3);
        fireball.add(light);

        // Custom properties
        fireball.speed = weaponStats.type === 'laser' ? 35 : 25; // Lasers are faster
        fireball.damage = weaponStats.damage; // Store damage on projectile
        fireball.velocity = direction.clone().multiplyScalar(fireball.speed);
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

    takeDamage(amount) {
        if (this.invulnerable || this.isDying || this.isGhost) return; // Ghost also prevents damage

        // Shield Protection
        if (this.hasShield) {
            console.log('🛡️ Shield blocked damage!');
            this.hasShield = false;
            if (this.shieldMesh) this.shieldMesh.visible = false;

            // Shield break effect
            if (this.game && this.game.vfx) {
                this.game.vfx.emitBurst(this.mesh.position, 0x0088ff, 10, 0.5);
            }
            this.setInvulnerable(1000); // Brief iframe after shield break
            return;
        }

        this.health -= amount;
        console.log(`❤️ Player Health: ${this.health}/${this.maxHealth}`);

        // Update UI
        if (this.game && this.game.ui) {
            this.game.ui.updateHealth(this.health, this.maxHealth);
        }

        // Hit effect
        if (this.game && this.game.vfx) {
            this.game.vfx.emitBurst(this.mesh.position, 0xff0000, 10, 0.2);
        }

        if (this.health <= 0) {
            if (this.game && this.game.collision) {
                this.game.collision.triggerDeath();
            }
        } else {
            // Brief invulnerability
            this.setInvulnerable(1000);
        }
    }

    // --- POWER-UP LOGIC ---

    collectPowerUp(type) {
        console.log(`✨ Collected Power-Up: ${type}`);

        // VFX
        if (this.game && this.game.vfx) {
            const color = type === 'health' ? 0xff0000 :
                type === 'shield' ? 0x0088ff :
                    type === 'ghost' ? 0xffffff : 0xffd700;
            this.game.vfx.emitBurst(this.mesh.position, color, 15, 0.5);
        }

        switch (type) {
            case 'health':
                if (this.health < this.maxHealth) {
                    this.health++;
                    if (this.game && this.game.ui) this.game.ui.updateHealth(this.health, this.maxHealth);
                }
                break;
            case 'shield':
                this.activateShield();
                break;
            case 'ghost':
                this.activateGhostMode();
                break;
            case 'time':
                this.activateTimeSlow();
                break;
        }
    }

    activateShield() {
        if (this.hasShield) return; // Refresh duration or stack? For now just active.
        this.hasShield = true;

        // Create Visual Shield
        if (!this.shieldMesh) {
            // Hemisphere Shield (Daha estetik, karakterin önünde)
            const radius = 1.3;
            const widthSegments = 32;
            const heightSegments = 16;
            // thetaLength = Math.PI / 2 -> Yarım küre
            const geo = new THREE.SphereGeometry(radius, widthSegments, heightSegments, 0, Math.PI * 2, 0, Math.PI / 2);

            // Materyal: Biraz daha şeffaf ve teknolojik
            const mat = new THREE.MeshPhongMaterial({
                color: 0x00ffff,
                emissive: 0x0044aa,
                specular: 0xffffff,
                shininess: 100,
                transparent: true,
                opacity: 0.3,
                wireframe: false, // Solid ama şeffaf
                side: THREE.DoubleSide
            });

            // Wireframe Overlay (daha havalı durması için)
            const wireGeo = new THREE.WireframeGeometry(geo);
            const wireMat = new THREE.LineBasicMaterial({ color: 0x00ffff, transparent: true, opacity: 0.5 });
            const wireMesh = new THREE.LineSegments(wireGeo, wireMat);

            this.shieldMesh = new THREE.Group();
            const mainShield = new THREE.Mesh(geo, mat);

            this.shieldMesh.add(mainShield);
            this.shieldMesh.add(wireMesh);

            // Pozisyonlandırma: Göğüs hizası ve biraz öne
            // Player'ın yüzü +Z yönüne bakıyorsa Z pozitif, -Z ise Z negatif.
            // Genelde modeller +Z'ye bakar.
            this.shieldMesh.position.set(0, 1.1, 0.4);

            // Rotasyon: Yarım Küreyi öne çevir (Y ekseni yukarı bakıyor, X ekseninde 90 derece çevir)
            this.shieldMesh.rotation.x = Math.PI / 2;

            this.mesh.add(this.shieldMesh);
        }
        this.shieldMesh.visible = true;

        // Auto-remove after some time? Plan said "Lasts until hit". Keep it permanent until hit.
    }

    activateGhostMode() {
        if (this.isGhost) {
            // Extend duration logic could go here
            clearTimeout(this.ghostTimer);
        }

        this.isGhost = true;
        console.log('👻 Ghost Mode Active');

        // Visual
        this.mesh.traverse(c => {
            if (c.isMesh) {
                if (!c.userData.orgOpacity) c.userData.orgOpacity = c.material.opacity;
                if (!c.userData.orgTransparent) c.userData.orgTransparent = c.material.transparent;

                c.material.transparent = true;
                c.material.opacity = 0.4;
            }
        });

        // Timer to reset
        this.ghostTimer = setTimeout(() => {
            this.isGhost = false;
            console.log('👻 Ghost Mode Ended');

            // Restore Visuals
            this.mesh.traverse(c => {
                if (c.isMesh) {
                    c.material.opacity = c.userData.orgOpacity !== undefined ? c.userData.orgOpacity : 1.0;
                    c.material.transparent = c.userData.orgTransparent !== undefined ? c.userData.orgTransparent : false;
                }
            });
        }, 8000); // 8 Seconds
    }

    activateTimeSlow() {
        console.log('⏳ Time Slow Active');
        if (this.game) {
            this.game.activateTimeSlow(5000); // 5 Seconds
        }
    }

}
