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
        // Double check lane (though physics should handle it, this is safer per analysis)
        if (this.player.currentLane !== platform.userData.lane) return;

        // Check for dangerous obstacles (red stacked crates)
        if (platform.userData.isDangerous) {
            this.triggerDeath();
            return;
        }

        // Check for jumpable obstacles (gray crates on safe lanes)
        if (platform.userData.hasJumpableObstacle && platform.userData.jumpableCube) {
            this.obstacleBox.setFromObject(platform.userData.jumpableCube);

            if (this.playerBox.intersectsBox(this.obstacleBox)) {
                // Check if player is in the air (jumping)
                const playerHeight = this.player.mesh.position.y;
                const jumpThreshold = 0.3; // Minimum height to clear obstacle

                if (playerHeight < jumpThreshold) {
                    // Player hit obstacle while on ground - DEATH
                    console.log('💥 Hit jumpable obstacle without jumping!');
                    this.triggerDeath();
                } else {
                    // Player successfully jumped over obstacle
                    console.log('✅ Cleared jumpable obstacle!');
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
