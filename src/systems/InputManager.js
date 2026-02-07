import { gameState, GameStates } from '../core/GameState';

export class InputManager {
    constructor(player, game) {
        this.player = player;
        this.game = game;
        this.init();
    }

    init() {
        // Use window for global capture, or specific element
        window.addEventListener('touchstart', (e) => this.handleTouch(e), { passive: false });
        window.addEventListener('mousedown', (e) => this.handleClick(e));
    }

    handleTouch(e) {
        if (gameState.currentState !== GameStates.PLAYING) return;

        // Block multi-touch
        if (e.touches.length > 1) return;

        e.preventDefault(); // Prevent scroll/zoom
        this.executeSwitch();
    }

    handleClick(e) {
        // Support mouse for desktop dev
        if (gameState.currentState !== GameStates.PLAYING) return;
        this.executeSwitch();
    }

    executeSwitch() {
        this.player.switchLane(this.game.vfx);
        this.game.audio.playSFX('shift');
        this.game.progression.updateTaskProgress('action', 1);

        // Perfect Shift Check
        const activePlatforms = this.game.platform.active;
        for (const platform of activePlatforms) {
            const distance = platform.position.z - this.player.mesh.position.z;
            if (distance > 0 && distance < 2) { // Within 2 units in front
                this.game.score.addPerfectShiftBonus();
                this.game.progression.updateTaskProgress('skill', 1);
                this.game.vfx.emitBurst(this.player.mesh.position, 0xffff00, 15);
                console.log('PERFECT SHIFT!');
                break;
            }
        }
    }
}
