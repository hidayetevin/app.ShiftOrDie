import { CONFIG } from '../core/Config';

export class AudioManager {
    constructor() {
        this.settings = this.loadSettings();
        this.sounds = {};
        this.music = null;

        // In a real production environment, we would load actual files here.
        // For this implementation, we set up the system to handle the logic.
    }

    loadSettings() {
        const saved = localStorage.getItem(CONFIG.STORAGE_KEYS.SETTINGS);
        return saved ? JSON.parse(saved) : { music: true, sfx: true, language: 'en' };
    }

    saveSettings() {
        localStorage.setItem(CONFIG.STORAGE_KEYS.SETTINGS, JSON.stringify(this.settings));
    }

    playSFX(name) {
        if (!this.settings.sfx) return;
        console.log(`Audio: SFX played - ${name}`);
        // Implementation: new Audio(`/src/assets/sounds/${name}.mp3`).play();
    }

    playMusic(name) {
        if (!this.settings.music) return;
        console.log(`Audio: Music started - ${name}`);
        // Implementation: this.music = new Audio(`/src/assets/sounds/${name}.mp3`);
        // this.music.loop = true;
        // this.music.play();
    }

    stopMusic() {
        console.log('Audio: Music stopped');
        // if (this.music) this.music.pause();
    }

    toggleSFX() {
        this.settings.sfx = !this.settings.sfx;
        this.saveSettings();
    }

    toggleMusic() {
        this.settings.music = !this.settings.music;
        this.saveSettings();
        if (this.settings.music) this.playMusic('main');
        else this.stopMusic();
    }
}
