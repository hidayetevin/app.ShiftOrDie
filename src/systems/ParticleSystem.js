import * as THREE from 'three';

export class ParticleSystem {
    constructor(scene) {
        this.scene = scene;
        this.particles = [];
        this.pool = [];
        this.initPool();
    }

    initPool() {
        const geometry = new THREE.SphereGeometry(0.1, 6, 6); // Reduced segments slightly
        // 300 particles for better bursts
        for (let i = 0; i < 300; i++) {
            const material = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, depthWrite: false });
            const mesh = new THREE.Mesh(geometry, material);
            mesh.visible = false;
            mesh.frustumCulled = false; // Optimization: Always render if active (saves calculation)
            this.scene.add(mesh);
            this.pool.push(mesh);
        }
    }

    emitBurst(position, color = 0x00ffff, count = 10, size = 0.1) {
        // Limit burst size on mobile
        const actualCount = Math.min(count, 15);

        for (let i = 0; i < actualCount; i++) {
            const particle = this.pool.pop();
            if (!particle) break;

            particle.position.copy(position);
            particle.material.color.setHex(color);
            particle.material.opacity = 1;
            particle.visible = true;
            particle.scale.setScalar(size);

            const velocity = new THREE.Vector3(
                (Math.random() - 0.5) * 5,
                (Math.random() - 0.5) * 5,
                (Math.random() - 0.5) * 5
            );

            this.particles.push({
                mesh: particle,
                velocity: velocity,
                life: 1.0,
                decay: 0.05 + Math.random() * 0.05 // Faster decay for performance
            });
        }
    }

    update(deltaTime) {
        // Iterate backwards
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];

            // OPTIMIZED: Zero Allocation Movement
            p.mesh.position.addScaledVector(p.velocity, deltaTime);

            // Drag
            p.velocity.multiplyScalar(0.92);

            p.life -= p.decay;
            p.mesh.material.opacity = p.life;
            p.mesh.scale.setScalar(p.life * 0.2);

            if (p.life <= 0) {
                p.mesh.visible = false;
                this.pool.push(p.mesh);
                this.particles.splice(i, 1);
            }
        }
    }
}
