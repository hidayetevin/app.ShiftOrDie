import * as THREE from 'three';
import { CONFIG } from '../core/Config';

export class PlatformManager {
    constructor(scene, ruleManager) {
        this.scene = scene;
        this.ruleManager = ruleManager;
        this.pool = [];
        this.active = [];
        this.lastSpawnZ = CONFIG.PLATFORM.SPAWN_DISTANCE;
        this.timeSinceLastSpawn = 0;

        this.initPool();
    }

    initPool() {
        const geometry = new THREE.BoxGeometry(
            CONFIG.LANE.WIDTH,
            CONFIG.PLATFORM.HEIGHT,
            CONFIG.PLATFORM.LENGTH
        );

        for (let i = 0; i < CONFIG.PLATFORM.POOL_SIZE; i++) {
            const material = new THREE.MeshStandardMaterial({ color: 0x00ff00 });
            const mesh = new THREE.Mesh(geometry, material);
            mesh.receiveShadow = true;
            mesh.castShadow = true;
            mesh.visible = false;
            mesh.userData = { isDangerous: false, lane: 0 };

            this.pool.push(mesh);
            this.scene.add(mesh);
        }
    }

    update(deltaTime, gameSpeed) {
        this.timeSinceLastSpawn += deltaTime;

        // Move active platforms
        for (let i = this.active.length - 1; i >= 0; i--) {
            const platform = this.active[i];
            platform.position.z -= gameSpeed * deltaTime;

            // Recycle platforms behind camera
            if (platform.position.z < CONFIG.PLATFORM.DESPAWN_DISTANCE) {
                this.recycle(platform, i);
            }
        }

        // Spawn new rows
        if (this.timeSinceLastSpawn >= CONFIG.PLATFORM.SPAWN_INTERVAL) {
            this.spawnRow();
            this.timeSinceLastSpawn = 0;
        }
    }

    spawnRow() {
        // Spawn one row (3 platforms)
        for (let i = 0; i < CONFIG.LANE.COUNT; i++) {
            const platform = this.pool.pop();
            if (!platform) continue;

            const status = this.ruleManager.getLaneStatus(i);
            platform.material.color.setHex(status === 'hazard' ? 0xff0000 : 0x00ff00);
            platform.userData.isDangerous = (status === 'hazard');
            platform.userData.lane = i;

            platform.position.set(
                CONFIG.LANE.POSITIONS[i],
                0,
                CONFIG.PLATFORM.SPAWN_DISTANCE + 10 // Spawn ahead
            );

            platform.visible = true;
            this.active.push(platform);
        }
    }

    recycle(platform, index) {
        platform.visible = false;
        this.pool.push(platform);
        this.active.splice(index, 1);
    }

    reset() {
        for (let i = this.active.length - 1; i >= 0; i--) {
            this.recycle(this.active[i], i);
        }
        this.timeSinceLastSpawn = 0;
    }
}
