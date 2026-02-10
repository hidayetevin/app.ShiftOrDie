import { CONFIG } from '../core/Config';

export class ScoreManager {
    constructor() {
        this.currentScore = 0;
        this.highScore = this.loadHighScore();
        this.comboCount = 0;
        this.multiplier = 1;
        this.timeSurvived = 0;

        this.isNewRecord = false;
    }

    loadHighScore() {
        const saved = localStorage.getItem(CONFIG.STORAGE_KEYS.HIGHSCORE);
        return saved ? parseInt(saved, 10) : 0;
    }

    update(deltaTime) {
        this.timeSurvived += deltaTime;

        // Base Score calculation
        this.currentScore = Math.floor(this.timeSurvived * CONFIG.SCORING.BASE_PER_SECOND);

        // Add bonuses separately to currentScore if needed, 
        // but analysis says: Final Score = (Base Score + Bonuses) * Multiplier
        // We'll manage bonuses in a separate variable to apply formula at end or during update.
    }

    addBonus(amount) {
        this.currentScore += amount;
    }

    addPerfectShiftBonus() {
        this.currentScore += CONFIG.SCORING.PERFECT_SHIFT_BONUS;
        this.comboCount++;
        this.updateMultiplier();

        // Return event for UI feedback
        return {
            bonus: CONFIG.SCORING.PERFECT_SHIFT_BONUS,
            multiplier: this.multiplier
        };
    }

    updateMultiplier() {
        if (this.comboCount >= CONFIG.SCORING.COMBO.LEVEL2) {
            this.multiplier = 3;
        } else if (this.comboCount >= CONFIG.SCORING.COMBO.LEVEL1) {
            this.multiplier = 2;
        } else {
            this.multiplier = 1;
        }
    }

    resetCombo() {
        this.comboCount = 0;
        this.multiplier = 1;
    }

    getFinalScore() {
        // The formula in analysis is a bit ambiguous about whether 100/sec is pre or post multiplier.
        // "Final Score = (Base Score + All Bonuses) × Current Multiplier"
        return (this.currentScore) * this.multiplier;
    }

    handleGameOver() {
        const finalScore = this.getFinalScore();
        if (finalScore > this.highScore) {
            this.highScore = finalScore;
            localStorage.setItem(CONFIG.STORAGE_KEYS.HIGHSCORE, this.highScore.toString());
            this.isNewRecord = true;
        } else {
            this.isNewRecord = false;
        }
        return finalScore;
    }

    reset() {
        this.currentScore = 0;
        this.comboCount = 0;
        this.multiplier = 1;
        this.timeSurvived = 0;
        this.isNewRecord = false;
    }
}
