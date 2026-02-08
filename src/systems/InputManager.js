import * as THREE from 'three';
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
        // UI Check: Don't capture touch if interacting with UI buttons
        if (e.target.tagName === 'BUTTON' || e.target.closest('button')) {
            return;
        }

        if (gameState.currentState !== GameStates.PLAYING) return;
        if (e.touches.length > 1) return;

        e.preventDefault();
        this.touchStartX = e.touches[0].clientX;
        this.touchStartY = e.touches[0].clientY;
    }

    handleTouchEnd(e) {
        // UI Check
        if (e.target.tagName === 'BUTTON' || e.target.closest('button')) {
            return;
        }

        if (gameState.currentState !== GameStates.PLAYING) return;

        e.preventDefault();
        const touchEndX = e.changedTouches[0].clientX;
        const touchEndY = e.changedTouches[0].clientY;

        this.detectSwipe(this.touchStartX, this.touchStartY, touchEndX, touchEndY);
    }

    handleMouseDown(e) {
        // UI Check
        if (e.target.tagName === 'BUTTON' || e.target.closest('button')) {
            return;
        }

        if (gameState.currentState !== GameStates.PLAYING) return;

        this.touchStartX = e.clientX;
        this.touchStartY = e.clientY;
    }

    handleMouseUp(e) {
        // UI Check
        if (e.target.tagName === 'BUTTON' || e.target.closest('button')) {
            return;
        }

        if (gameState.currentState !== GameStates.PLAYING) return;

        const touchEndX = e.clientX;
        const touchEndY = e.clientY;

        this.detectSwipe(this.touchStartX, this.touchStartY, touchEndX, touchEndY);
    }

    detectSwipe(startX, startY, endX, endY) {
        const deltaX = endX - startX;
        const deltaY = endY - startY;
        const tapThreshold = 20; // Max movement to count as tap (increased for usability)

        // Check if this is a tap (minimal movement)
        if (Math.abs(deltaX) < tapThreshold && Math.abs(deltaY) < tapThreshold) {
            // TAP detected -> SHOOT
            this.executeShoot(endX, endY);
            return;
        }

        // Check which direction is dominant (swipe)
        if (Math.abs(deltaX) > Math.abs(deltaY)) {
            // Horizontal swipe (left/right for lane switching)
            if (Math.abs(deltaX) > this.swipeThreshold) {
                // Determine direction based on sign
                // Normal Swipe Logic: Left is Left, Right is Right
                // Previous logic had reversed controls? "Swipe RIGHT -> Move LEFT". 
                // Let's stick to user preference or standard.
                // Standard: Swipe Left -> Left.
                // Reverting previous "reversed" logic if it was confusing, or keeping consistent.
                // Let's verify: In line 75 it said "Swipe RIGHT -> Move LEFT".
                // I will keep the existing logic structure but check the signs.
                if (deltaX > 0) {
                    this.executeSwitch('left'); // Swipe Right (delta > 0) -> Left? Maybe user wanted inverted.
                    // Wait, usually Swipe Right (positive delta) means move Right.
                    // If code says "Swipe RIGHT -> Move LEFT", it is inverted.
                    // I will preserve the existing logic to avoid breaking movement habit.
                } else {
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

    executeShoot(screenX, screenY) {
        if (!this.game.camera) return;

        // Convert screen coordinates to normalized device coordinates (-1 to +1)
        const mouse = new THREE.Vector2();
        mouse.x = (screenX / window.innerWidth) * 2 - 1;
        mouse.y = -(screenY / window.innerHeight) * 2 + 1; // Invert Y

        // Raycast
        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(mouse, this.game.camera);

        // Intersect with a virtual ground plane at player height
        // Player Y is roughly 0.
        const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
        const targetPoint = new THREE.Vector3();
        const intersect = raycaster.ray.intersectPlane(plane, targetPoint);

        if (intersect) {
            const playerPos = this.game.player.mesh.position.clone();

            // Prevent shooting backwards (towards camera, negative Z relative to player)
            // Or shooting too high up/sky (though intersectPlane handles sky if plane not hit)
            // Since camera is at Z=-5 looking at +Z, "Backwards" means Z < playerPos.z

            if (targetPoint.z < playerPos.z + 1.0) { // +1.0 buffer to avoid shooting own feet
                // Shooting backwards or too close -> Don't shoot
                return;
            }

            const direction = new THREE.Vector3().subVectors(targetPoint, playerPos).normalize();

            // Call shoot with direction
            this.player.shoot(this.game.vfx, direction);
            this.game.audio.playSFX('shift');
            console.log('💥 FIRING towards:', direction);
        }
        // Else: Clicked on sky or invalid area -> Do nothing (Don't shoot)
    }
}
