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
    }

    update() {
        if (gameState.currentState !== GameStates.PLAYING) return;
        if (this.player.invulnerable) return;

        this.playerBox.setFromObject(this.player.mesh);

        // Manual Hitbox Tuning:
        // The MD2 model might have a large bounding box (especially with animations).
        // We shrink it significantly to represent the "core" of the body.
        this.playerBox.expandByScalar(-1.5);

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
            this.triggerDeath();
            return;
        }

        // Check for jumpable obstacles (gray crates on safe lanes)
        if (platform.userData.hasJumpableObstacle && platform.userData.jumpableCube) {
            this.obstacleBox.setFromObject(platform.userData.jumpableCube);

            // Custom intersection check: Require significant overlap
            const pMin = this.playerBox.min;
            const pMax = this.playerBox.max;
            const oMin = this.obstacleBox.min;
            const oMax = this.obstacleBox.max;

            // Calculate overlap on X and Z axes
            const overlapX = Math.max(0, Math.min(pMax.x, oMax.x) - Math.max(pMin.x, oMin.x));
            const overlapZ = Math.max(0, Math.min(pMax.z, oMax.z) - Math.max(pMin.z, oMin.z));

            // Collision Threshold: Objects must overlap by at least 0.3 units
            const collisionDepth = 0.3;

            if (overlapX > collisionDepth && overlapZ > collisionDepth) {
                // NEW: Check if player landed ON TOP of the obstacle
                const cubeTopY = oMax.y;
                const playerBottomY = pMin.y;
                const landingTolerance = 0.2; // How close to top counts as "landed"

                if (playerBottomY >= cubeTopY - landingTolerance) {
                    // Player is on top of the obstacle - SAFE!
                    console.log(`✅ Landed on obstacle! Safe to stand. PlayerBottom: ${playerBottomY.toFixed(2)}, CubeTop: ${cubeTopY.toFixed(2)}`);
                    // Don't kill - player can walk on it
                } else {
                    // Player hit from side - check if jumping over
                    const playerHeight = this.player.mesh.position.y;
                    const jumpThreshold = 0.9; // High threshold for clean jumps

                    if (playerHeight > jumpThreshold) {
                        // Player successfully jumped over obstacle
                        console.log(`✅ Cleared jumpable obstacle! PlayerY: ${playerHeight.toFixed(2)} > Threshold: ${jumpThreshold}`);
                    } else {
                        // Player hit obstacle from side while on ground - DEATH
                        console.warn(`💀 DEATH BY OBSTACLE: PlayerY: ${playerHeight.toFixed(2)} <= Threshold: ${jumpThreshold}`);
                        console.log('JumpState:', this.player.isJumping);
                        this.triggerDeath();
                    }
                }
            }
        }
    }

    triggerDeath() {
        console.log('Player DIED!');
        this.game.vfx.emitBurst(this.player.mesh.position, 0xff0000, 20);
        gameState.transition(GameStates.GAMEOVER);
    }
}
