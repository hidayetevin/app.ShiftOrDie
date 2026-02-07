import * as THREE from 'three';
import { gsap } from 'gsap';
import { CONFIG } from '../core/Config';

export class Player {
    constructor(scene) {
        this.scene = scene;
        this.mesh = null;
        this.currentLane = 1; // Center lane
        this.invulnerable = false;

        this.init();
    }

    init() {
        this.mesh = new THREE.Group();

        // Body
        const bodyGeo = new THREE.BoxGeometry(0.6, 1.0, 0.4);
        const bodyMat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.1, metalness: 0.8 });
        const body = new THREE.Mesh(bodyGeo, bodyMat);
        body.position.y = 0.5;
        body.castShadow = true;
        this.mesh.add(body);

        // Head
        const headGeo = new THREE.BoxGeometry(0.5, 0.5, 0.5);
        const headMat = new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.2, metalness: 0.9 });
        const head = new THREE.Mesh(headGeo, headMat);
        head.position.y = 1.35;
        this.mesh.add(head);

        // Glowing Eyes
        const eyeGeo = new THREE.BoxGeometry(0.4, 0.05, 0.1);
        const eyeMat = new THREE.MeshStandardMaterial({
            color: 0x00ffff,
            emissive: 0x00ffff,
            emissiveIntensity: 2,
            transparent: true,
            opacity: 1.0
        });
        const eye = new THREE.Mesh(eyeGeo, eyeMat);
        eye.position.set(0, 1.4, 0.25);
        this.mesh.add(eye);
        this.eyeMat = eyeMat; // Store for invulnerability feedback

        this.mesh.position.set(CONFIG.LANE.POSITIONS[this.currentLane], 0, 0);
        this.scene.add(this.mesh);
    }

    switchLane(vfx) {
        this.currentLane = (this.currentLane + 1) % CONFIG.LANE.COUNT;

        gsap.to(this.mesh.position, {
            x: CONFIG.LANE.POSITIONS[this.currentLane],
            duration: CONFIG.PLAYER.SWITCH_DURATION,
            ease: 'power2.out'
        });

        if (vfx) vfx.emitBurst(this.mesh.position, 0x00ffff, 5);

        return this.currentLane;
    }

    setInvulnerable(duration) {
        this.invulnerable = true;
        this.mesh.traverse(child => {
            if (child.material) child.material.opacity = CONFIG.PLAYER.RESPAWN_OPACITY;
        });

        setTimeout(() => {
            this.invulnerable = false;
            this.mesh.traverse(child => {
                if (child.material) child.material.opacity = 1.0;
            });
        }, duration);
    }

    reset() {
        this.currentLane = 1;
        this.mesh.position.set(CONFIG.LANE.POSITIONS[this.currentLane], 0, 0);
        this.mesh.traverse(child => {
            if (child.material) child.material.opacity = 1.0;
        });
        this.invulnerable = false;
    }
}
