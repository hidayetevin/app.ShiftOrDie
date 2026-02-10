import * as THREE from 'three';
import { CONFIG } from '../core/Config';

export class StyleManager {
    constructor(game) {
        this.game = game;
        this.styles = {
            neon: {
                background: 0x0a0a0a,
                primary: 0x00ffff,
                secondary: 0xff00ff,
                bloom: { strength: 1.5, radius: 0.4, threshold: 0.85 }
            },
            minimal: {
                background: 0xe0e0e0,
                primary: 0x4a90e2,
                secondary: 0xf39c12,
                bloom: { strength: 0, radius: 0, threshold: 1.0 }
            },
            arcade: {
                background: 0x1a1a2e,
                primary: 0xff6b6b,
                secondary: 0xa29bfe,
                bloom: { strength: 0.8, radius: 0.8, threshold: 0.5 }
            }
        };
    }

    applyStyle(styleId) {
        const config = this.styles[styleId];
        if (!config) return;

        // Update Three.js Background
        this.game.scene.background = new THREE.Color(config.background);

        // Update Post-Processing (Bloom)
        if (this.game.bloomPass) {
            this.game.bloomPass.strength = config.bloom.strength;
            this.game.bloomPass.radius = config.bloom.radius;
            this.game.bloomPass.threshold = config.bloom.threshold;
        }

        // Update materials of everything in the scene?
        // In a real game, we'd iterate or use global uniforms.
        // For now, let's update the player and ground.
        // Update player materials (handling Group structure)
        this.game.player.mesh.traverse(child => {
            if (child.isMesh && child.material) {
                // If it's the emissive part (like eyes), update emissive color
                if (child.material.emissive) {
                    child.material.emissive.setHex(config.primary);
                }
                // Update primary color for other parts if needed
                // For now, let's keep the body dark and only glow the accents
                if (child.material.color && child.material.emissiveIntensity > 0) {
                    child.material.color.setHex(config.primary);
                }
            }
        });

        console.log(`Style Applied: ${styleId}`);

        // Save selection
        this.game.progression.data.selected_style = styleId;
        this.game.progression.saveData();
    }
}
