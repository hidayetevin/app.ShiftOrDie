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

        // Check for jumpable obstacles (gray crates or soldiers on safe lanes)
        if (platform.userData.hasJumpableObstacle) {
            // SOLDIER = INSTANT DEATH (cannot be jumped)
            if (platform.userData.soldierObstacle) {
                this.obstacleBox.setFromObject(platform.userData.soldierObstacle);

                const pMin = this.playerBox.min;
                const pMax = this.playerBox.max;
                const oMin = this.obstacleBox.min;
                const oMax = this.obstacleBox.max;

                const overlapX = Math.max(0, Math.min(pMax.x, oMax.x) - Math.max(pMin.x, oMin.x));
                const overlapZ = Math.max(0, Math.min(pMax.z, oMax.z) - Math.max(pMin.z, oMin.z));
                const collisionDepth = 0.3;

                if (overlapX > collisionDepth && overlapZ > collisionDepth) {
                    console.warn('💀 SOLDIER KILLS PLAYER! Must shoot to survive!');
                    this.triggerDeath();
                }
                return; // Skip gray cube logic
            }

            // GRAY CUBE = JUMPABLE
            const obstacleTarget = platform.userData.jumpableCube;
            if (!obstacleTarget) return;

            this.obstacleBox.setFromObject(obstacleTarget);

            const pMin = this.playerBox.min;
            const pMax = this.playerBox.max;
            const oMin = this.obstacleBox.min;
            const oMax = this.obstacleBox.max;

            const overlapX = Math.max(0, Math.min(pMax.x, oMax.x) - Math.max(pMin.x, oMin.x));
            const overlapZ = Math.max(0, Math.min(pMax.z, oMax.z) - Math.max(pMin.z, oMin.z));
            const collisionDepth = 0.3;

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
                        console.warn('💀 DEATH BY CUBE!');
                        this.triggerDeath();
                    }
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
