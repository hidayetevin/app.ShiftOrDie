import * as THREE from 'three';

export class ParticleSystem {
    constructor(scene) {
        this.scene = scene;
        this.particles = [];
        this.pool = [];
        this.initPool();
    }

    initPool() {
        const geometry = new THREE.SphereGeometry(0.1, 8, 8);
        for (let i = 0; i < 100; i++) {
            const material = new THREE.MeshBasicMaterial({ color: 0x00ffff, transparent: true });
            const mesh = new THREE.Mesh(geometry, material);
            mesh.visible = false;
            this.scene.add(mesh);
            this.pool.push(mesh);
        }
    }

    emitBurst(position, color = 0x00ffff, count = 10) {
        for (let i = 0; i < count; i++) {
            const particle = this.pool.pop();
            if (!particle) break;

            particle.position.copy(position);
            particle.material.color.setHex(color);
            particle.material.opacity = 1;
            particle.visible = true;

            const velocity = new THREE.Vector3(
                (Math.random() - 0.5) * 5,
                (Math.random() - 0.5) * 5,
                (Math.random() - 0.5) * 5
            );

            this.particles.push({
                mesh: particle,
                velocity: velocity,
                life: 1.0,
                decay: 0.02 + Math.random() * 0.05
            });
        }
    }

    update(deltaTime) {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.mesh.position.add(p.velocity.clone().multiplyScalar(deltaTime));
            p.life -= p.decay;
            p.mesh.material.opacity = p.life;
            p.mesh.scale.setScalar(p.life);

            if (p.life <= 0) {
                p.mesh.visible = false;
                this.pool.push(p.mesh);
                this.particles.splice(i, 1);
            }
        }
    }
}
