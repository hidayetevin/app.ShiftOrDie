import { WEAPON_CONFIG, SKIN_CONFIG } from './WeaponConfig';

class MarketManager {
    constructor() {
        this.storageKey = 'shiftordie_market_v1';
        this.state = this.loadState();
    }

    loadState() {
        const stored = localStorage.getItem(this.storageKey);
        if (stored) {
            try {
                return JSON.parse(stored);
            } catch (e) {
                console.error('Failed to parse market state', e);
            }
        }
        return {
            selectedSkin: 'ratamahatta',
            selectedWeapon: 'w_glauncher',
            unlockedSkins: ['ratamahatta', 'ctf_b', 'ctf_r', 'dead', 'gearwhore'], // All unlocked for Phase 1
            unlockedWeapons: WEAPON_CONFIG.map(w => w.id) // All unlocked for Phase 1
        };
    }

    saveState() {
        localStorage.setItem(this.storageKey, JSON.stringify(this.state));
    }

    getSelectedSkin() {
        return this.state.selectedSkin;
    }

    getSelectedWeapon() {
        return this.state.selectedWeapon;
    }

    selectSkin(skinId) {
        if (this.state.unlockedSkins.includes(skinId)) {
            this.state.selectedSkin = skinId;
            this.saveState();
            return true;
        }
        return false;
    }

    selectWeapon(weaponId) {
        if (this.state.unlockedWeapons.includes(weaponId)) {
            this.state.selectedWeapon = weaponId;
            this.saveState();
            return true;
        }
        return false;
    }

    // Helper to get index for MD2Character
    getSkinIndex(skinId) {
        return SKIN_CONFIG.findIndex(s => s.id === skinId);
    }

    getWeaponIndex(weaponId) {
        return WEAPON_CONFIG.findIndex(w => w.id === weaponId);
    }
}

export const marketManager = new MarketManager();
