import { gameState, GameStates } from '../core/GameState';

export class InputManager {
    constructor(player, game) {
        this.player = player;
        this.game = game;
        this.touchStartX = 0;
        this.touchStartY = 0;
        this.swipeThreshold = 30; // Minimum swipe distance in pixels
        this.init();
    }

    init() {
        // Touch events for mobile
        window.addEventListener('touchstart', (e) => this.handleTouchStart(e), { passive: false });
        window.addEventListener('touchend', (e) => this.handleTouchEnd(e), { passive: false });

        // Mouse events for desktop
        window.addEventListener('mousedown', (e) => this.handleMouseDown(e));
        window.addEventListener('mouseup', (e) => this.handleMouseUp(e));
    }

    handleTouchStart(e) {
        if (gameState.currentState !== GameStates.PLAYING) return;
        if (e.touches.length > 1) return;

        e.preventDefault();
        this.touchStartX = e.touches[0].clientX;
        this.touchStartY = e.touches[0].clientY;
    }

    handleTouchEnd(e) {
        if (gameState.currentState !== GameStates.PLAYING) return;

        e.preventDefault();
        const touchEndX = e.changedTouches[0].clientX;
        const touchEndY = e.changedTouches[0].clientY;

        this.detectSwipe(this.touchStartX, this.touchStartY, touchEndX, touchEndY);
    }

    handleMouseDown(e) {
        if (gameState.currentState !== GameStates.PLAYING) return;

        this.touchStartX = e.clientX;
        this.touchStartY = e.clientY;
    }

    handleMouseUp(e) {
        if (gameState.currentState !== GameStates.PLAYING) return;

        const touchEndX = e.clientX;
        const touchEndY = e.clientY;

        this.detectSwipe(this.touchStartX, this.touchStartY, touchEndX, touchEndY);
    }

    detectSwipe(startX, startY, endX, endY) {
        const deltaX = endX - startX;
        const deltaY = endY - startY;
        const tapThreshold = 10; // Max movement to count as tap

        // Check if this is a tap (minimal movement)
        if (Math.abs(deltaX) < tapThreshold && Math.abs(deltaY) < tapThreshold) {
            // TAP detected -> SHOOT
            this.executeShoot();
            return;
        }

        // Check which direction is dominant (swipe)
        if (Math.abs(deltaX) > Math.abs(deltaY)) {
            // Horizontal swipe (left/right for lane switching)
            if (Math.abs(deltaX) > this.swipeThreshold) {
                if (deltaX > 0) {
                    // Swipe RIGHT -> Move LEFT (reversed for intuitive feel)
                    this.executeSwitch('left');
                } else {
                    // Swipe LEFT -> Move RIGHT (reversed for intuitive feel)
                    this.executeSwitch('right');
                }
            }
        } else {
            // Vertical swipe (up for jump)
            if (Math.abs(deltaY) > this.swipeThreshold) {
                if (deltaY < 0) {
                    // Swipe UP -> Jump
                    this.executeJump();
                }
                // Ignore down swipe
            }
        }
    }

    executeSwitch(direction) {
        const moved = this.player.switchLane(this.game.vfx, direction);

        if (moved) {
            this.game.audio.playSFX('shift');
            this.game.progression.updateTaskProgress('action', 1);

            // Perfect Shift Check
            const activePlatforms = this.game.platform.active;
            for (const platform of activePlatforms) {
                const distance = platform.position.z - this.player.mesh.position.z;
                if (distance > 0 && distance < 2) {
                    this.game.score.addPerfectShiftBonus();
                    this.game.progression.updateTaskProgress('skill', 1);
                    this.game.vfx.emitBurst(this.player.mesh.position, 0xffff00, 15);
                    console.log('PERFECT SHIFT!');
                    break;
                }
            }
        }
    }

    executeJump() {
        this.player.jump(this.game.vfx);
        this.game.audio.playSFX('shift'); // You can add separate jump sound later
    }

    executeShoot() {
        this.player.shoot(this.game.vfx);
        this.game.audio.playSFX('shift'); // Can add separate shoot sound later
        console.log('💥 FIRING!');
    }
}
