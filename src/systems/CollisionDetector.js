import * as THREE from 'three';
import { gameState, GameStates } from '../core/GameState';

export class CollisionDetector {
    constructor(player, platformManager, game) {
        this.player = player;
        this.platformManager = platformManager;
        this.game = game;
        this.playerBox = new THREE.Box3();
        this.platformBox = new THREE.Box3();
        this.obstacleBox = new THREE.Box3();
        this.isDead = false; // Prevent multiple death triggers
    }

    update() {
        if (gameState.currentState !== GameStates.PLAYING) return;
        if (this.player.invulnerable) return;

        // Manual Hitbox:
        // Create a fixed-size box at player position instead of relying on mesh scale
        const center = this.player.mesh.position.clone();
        center.y += 1.0; // Raise center to mid-body
        const size = new THREE.Vector3(0.3, 2.0, 0.3); // Width, Height, Depth - Balanced
        this.playerBox.setFromCenterAndSize(center, size);

        const activePlatforms = this.platformManager.active;
        for (const platform of activePlatforms) {
            // Only check nearby platforms
            const distance = Math.abs(platform.position.z - this.player.mesh.position.z);
            if (distance > 3) continue;

            this.platformBox.setFromObject(platform);

            if (this.playerBox.intersectsBox(this.platformBox)) {
                this.handleCollision(platform);
            }
        }
    }

    handleCollision(platform) {
        // Double check lane
        if (this.player.currentLane !== platform.userData.lane) return;

        // Check for dangerous obstacles (red stacked crates)
        if (platform.userData.isDangerous) {
            // NEW LOGIC: Only die if hitting an actual visible cube, not just the lane
            const cubes = platform.userData.cubes;
            let hitCube = false;

            if (cubes) {
                for (const cube of cubes) {
                    if (cube.visible) {
                        this.obstacleBox.setFromObject(cube);
                        // Shrink obstacle box slightly for forgiving gameplay
                        const shrink = 0.1;
                        this.obstacleBox.min.addScalar(shrink);
                        this.obstacleBox.max.subScalar(shrink);

                        if (this.playerBox.intersectsBox(this.obstacleBox)) {
                            hitCube = true;
                            break;
                        }
                    }
                }
            }

            if (hitCube && !this.player.isGhost) {
                this.triggerDeath();
            }
            // If lane is dangerous but we didn't hit a cube (e.g. in a gap), we are SAFE.
            // Also safe if isGhost is true (Ghost Mode)
            return;
        }

        // Check for jumpable obstacles (gray crates or soldiers on safe lanes)
        if (platform.userData.hasJumpableObstacle) {
            if (this.player.isGhost) return; // Ghost walks through everything

            // SOLDIER = INSTANT DEATH (cannot be jumped)
            if (platform.userData.soldierObstacle) {
                this.obstacleBox.setFromObject(platform.userData.soldierObstacle);
                // Shrink soldier box too
                this.obstacleBox.min.addScalar(0.2);
                this.obstacleBox.max.subScalar(0.2);

                if (this.playerBox.intersectsBox(this.obstacleBox)) {
                    console.warn('⚠️ SOLDIER COLLISION!');
                    // Collision with soldier body does usually hurt more?
                    // Let's make it 3 damage for hitting the soldier body directly
                    this.player.takeDamage(3);

                    // Also destroy the soldier to prevent sticking/multihit
                    platform.remove(platform.userData.soldierObstacle);
                    platform.userData.soldierObstacle = null;
                }
                return; // Skip gray cube logic
            }

            // GRAY CUBE = JUMPABLE
            const obstacleTarget = platform.userData.jumpableCube;
            if (!obstacleTarget) return;

            this.obstacleBox.setFromObject(obstacleTarget);
            // Shrink jumpable box slightly
            this.obstacleBox.min.x += 0.1; this.obstacleBox.max.x -= 0.1;
            this.obstacleBox.min.z += 0.1; this.obstacleBox.max.z -= 0.1;

            if (this.playerBox.intersectsBox(this.obstacleBox)) {

                // Detailed overlap check for jump landing
                const pMin = this.playerBox.min;
                // ... rest of logic uses pMin/pMax so we don't need intersection check again if we trust intersectsBox
                // But original logic calculated overlaps manually. Let's keep manual calculation for height logic.

                const pMax = this.playerBox.max;
                const oMin = this.obstacleBox.min;
                const oMax = this.obstacleBox.max;

                const overlapX = Math.max(0, Math.min(pMax.x, oMax.x) - Math.max(pMin.x, oMin.x));
                const overlapZ = Math.max(0, Math.min(pMax.z, oMax.z) - Math.max(pMin.z, oMin.z));
                const collisionDepth = 0.1; // Reduced tolerance

                if (overlapX > collisionDepth && overlapZ > collisionDepth) {
                    const cubeTopY = oMax.y;
                    const playerBottomY = pMin.y;
                    const landingTolerance = 0.2;

                    if (playerBottomY >= cubeTopY - landingTolerance) {
                        console.log('✅ Landed on CUBE! Safe.');
                    } else {
                        const playerHeight = this.player.mesh.position.y;
                        const jumpThreshold = 0.9;

                        if (playerHeight > jumpThreshold) {
                            console.log('✅ Cleared CUBE!');
                        } else {
                            console.warn('💀 HIT CUBE!');
                            this.player.takeDamage(1);
                        }
                    }
                }
            }
        }
        // Check Power-Up Collision
        if (platform.userData.hasPowerUp && platform.userData.powerUp.visible) {
            const pu = platform.userData.powerUp;
            this.obstacleBox.setFromObject(pu);

            // Adjust box size manualy if needed, or trust setFromObject
            // PowerUps are at y=1.0, size ~0.5. Box should be roughly correct.

            if (this.playerBox.intersectsBox(this.obstacleBox)) {
                console.log('✨ Power-Up Collision!');
                const type = pu.userData.activeType;

                if (type) {
                    this.player.collectPowerUp(type);

                    // Hide Power-Up
                    pu.visible = false;
                    platform.userData.hasPowerUp = false;
                }
            }
        }
    }

    triggerDeath() {
        if (this.isDead) return; // Already dead, prevent duplicate
        this.isDead = true;

        console.log('Player DIED!');

        // Freeze game movement
        gameState.transition(GameStates.DYING);

        // Play death animation
        this.player.playDeathAnimation();

        // After animation, show game over
        setTimeout(() => {
            gameState.transition(GameStates.GAMEOVER);
        }, 500); // 1 second for death animation
    }
}
