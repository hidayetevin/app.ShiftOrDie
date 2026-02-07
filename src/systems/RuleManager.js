import * as THREE from 'three';
import { CONFIG } from '../core/Config';

export class RuleManager {
    constructor() {
        this.rules = [
            { id: 'RED_KILLS', type: 'color', hazard: 0xff0000, safe: 0x00ff00, label: 'Red Kills' },
            { id: 'GREEN_SAFE', type: 'color', hazard: 0xff0000, safe: 0x00ff00, label: 'Green Safe' },
            { id: 'MIDDLE_ONLY', type: 'color', hazard: 0xff0000, safe: 0x00ff00, label: 'Middle Only' },
            { id: 'SIDES_ONLY', type: 'color', hazard: 0xff0000, safe: 0x00ff00, label: 'Sides Only' }
        ];

        this.currentRule = this.rules[1]; // Start with Green Safe
        this.lastChangeTime = Date.now();
        this.nextChangeInterval = 5000;
    }

    update(timeSurvived) {
        const now = Date.now();
        if (now - this.lastChangeTime > this.nextChangeInterval) {
            this.changeRule(timeSurvived);
        }
    }

    changeRule(timeSurvived) {
        // Find interval from difficulty config
        const difficulty = CONFIG.DIFFICULTY.RULE_CHANGE.find(c => timeSurvived >= c.time) || CONFIG.DIFFICULTY.RULE_CHANGE[0];
        this.nextChangeInterval = difficulty.interval * 1000;

        // Randomly select new rule (different from current)
        const otherRules = this.rules.filter(r => r.id !== this.currentRule.id);
        this.currentRule = otherRules[Math.floor(Math.random() * otherRules.length)];

        this.lastChangeTime = Date.now();
        console.log(`Rule changed to: ${this.currentRule.id}`);
    }

    getLaneStatus(laneIndex) {
        switch (this.currentRule.id) {
            case 'RED_KILLS':
                return laneIndex === 0 ? 'hazard' : 'safe';
            case 'GREEN_SAFE':
                return laneIndex === 1 ? 'safe' : 'hazard';
            case 'MIDDLE_ONLY':
                return laneIndex === 1 ? 'safe' : 'hazard';
            case 'SIDES_ONLY':
                return laneIndex === 1 ? 'hazard' : 'safe';
            default:
                return 'safe';
        }
    }
}
