import { gameState, GameStates } from '../core/GameState';

export class AdManager {
    constructor(game) {
        this.game = game;
        this.usedContinueThisRun = false;
    }

    showRewarded(onSuccess, onFail) {
        console.log('AdManager: Showing Rewarded Ad...');
        gameState.transition(GameStates.REWARDED_AD);

        // Mock ad behavior (2 second delay)
        setTimeout(() => {
            const success = true; // Hardcoded success for mock
            if (success) {
                console.log('AdManager: Ad Success!');
                onSuccess();
            } else {
                console.log('AdManager: Ad Failed/Skipped');
                onFail();
            }
        }, 2000);
    }

    handleContinue() {
        if (this.usedContinueThisRun) return;

        this.showRewarded(
            () => {
                this.usedContinueThisRun = true;
                this.game.continueGame();
            },
            () => {
                gameState.transition(GameStates.GAMEOVER);
            }
        );
    }

    reset() {
        this.usedContinueThisRun = false;
    }
}
