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

        // Load texture (from the cube HTML example)
        const textureLoader = new THREE.TextureLoader();
        const crateTexture = textureLoader.load('/textures/crate.gif', (texture) => {
            texture.colorSpace = THREE.SRGBColorSpace;
            console.log('✅ Crate texture loaded');
        });

        // Create cube geometry for obstacles
        const cubeSize = 0.8;
        const cubeGeometry = new THREE.BoxGeometry(cubeSize, cubeSize, cubeSize);

        for (let i = 0; i < CONFIG.PLATFORM.POOL_SIZE; i++) {
            const platformGroup = new THREE.Group();

            // Base platform (invisible or minimal)
            const baseMaterial = new THREE.MeshStandardMaterial({
                color: 0x00ff00,
                transparent: true,
                opacity: 0.3
            });
            const baseMesh = new THREE.Mesh(geometry, baseMaterial);
            baseMesh.receiveShadow = true;
            baseMesh.visible = false;
            platformGroup.add(baseMesh);

            // Obstacle cubes (using textured material like HTML example)
            const cubes = [];
            const numPositions = 4; // 4 positions along the platform
            const spacing = CONFIG.PLATFORM.LENGTH / (numPositions + 1);

            for (let j = 0; j < numPositions; j++) {
                // Random stack height (1, 2, or 3 cubes high)
                const stackHeight = Math.floor(Math.random() * 3) + 1;

                for (let k = 0; k < stackHeight; k++) {
                    const cubeMat = new THREE.MeshBasicMaterial({ map: crateTexture });
                    const cube = new THREE.Mesh(cubeGeometry, cubeMat);
                    cube.castShadow = true;
                    cube.receiveShadow = true;

                    // Position: horizontal (j), vertical stack (k)
                    cube.position.x = 0;
                    cube.position.y = (cubeSize / 2) + (k * cubeSize);
                    cube.position.z = -CONFIG.PLATFORM.LENGTH / 2 + spacing * (j + 1);

                    // Static cubes - no rotation
                    cube.rotation.set(0, 0, 0);

                    cubes.push(cube);
                    platformGroup.add(cube);
                }
            }

            platformGroup.visible = false;
            platformGroup.userData = {
                isDangerous: false,
                lane: 0,
                baseMesh: baseMesh,
                cubes: cubes
            };

            this.pool.push(platformGroup);
            this.scene.add(platformGroup);
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
            const isDangerous = (status === 'hazard');

            platform.userData.isDangerous = isDangerous;
            platform.userData.lane = i;

            // Show/hide cubes based on danger
            if (platform.userData.cubes) {
                platform.userData.cubes.forEach(cube => {
                    cube.visible = isDangerous;
                });
            }

            // Show/hide base platform
            if (platform.userData.baseMesh) {
                platform.userData.baseMesh.visible = !isDangerous;
                platform.userData.baseMesh.material.color.setHex(isDangerous ? 0xff0000 : 0x00ff00);
            }

            platform.position.set(
                CONFIG.LANE.POSITIONS[i],
                0,
                CONFIG.PLATFORM.SPAWN_DISTANCE + 10
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
