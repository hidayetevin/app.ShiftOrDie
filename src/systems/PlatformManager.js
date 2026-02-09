import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';
import { CONFIG } from '../core/Config';

export class PlatformManager {
    constructor(scene, ruleManager) {
        this.scene = scene;
        this.ruleManager = ruleManager;
        this.pool = [];
        this.active = [];
        this.lastSpawnZ = CONFIG.PLATFORM.SPAWN_DISTANCE;
        this.timeSinceLastSpawn = 0;
        this.soldierModel = null; // Will store cloneable soldier model

        this.loadSoldierModel();
        this.initPool();

        this.enemyProjectiles = [];
        this.game = null;
    }

    setGame(game) {
        this.game = game;
    }

    loadSoldierModel() {
        const loader = new GLTFLoader();
        loader.load('/models/gltf/Soldier.glb', (gltf) => {
            this.soldierModel = gltf.scene;
            this.soldierModel.scale.set(1.2, 1.2, 1.2); // 3x larger
            console.log('✅ Soldier obstacle model loaded');
        }, undefined, (error) => {
            console.error('❌ Error loading Soldier model:', error);
        });
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

        // Create smaller cube for jumpable obstacles (gray crates on safe lanes)
        const jumpableSize = cubeSize; // Same size as regular cubes
        const jumpableGeometry = new THREE.BoxGeometry(jumpableSize, jumpableSize, jumpableSize);

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

            // Jumpable obstacle (gray crate on safe lanes)
            // Will be positioned randomly in center of platform
            const jumpableMat = new THREE.MeshBasicMaterial({
                map: crateTexture,
                color: 0xaaaaaa // Light gray tint for better visibility
            });
            const jumpableCube = new THREE.Mesh(jumpableGeometry, jumpableMat);
            jumpableCube.castShadow = true;
            jumpableCube.receiveShadow = true;
            jumpableCube.position.set(0, jumpableSize / 2, 0);
            jumpableCube.visible = false;
            platformGroup.add(jumpableCube);

            platformGroup.visible = false;
            platformGroup.userData = {
                isDangerous: false,
                lane: 0,
                baseMesh: baseMesh,
                cubes: cubes,
                jumpableCube: jumpableCube,
                soldierObstacle: null, // Will hold cloned Soldier model
                hasJumpableObstacle: false
            };

            this.pool.push(platformGroup);
            this.scene.add(platformGroup);
        }
    }

    update(deltaTime, gameSpeed) {
        this.timeSinceLastSpawn += deltaTime;

        // Move active platforms & handle soldier shooting
        for (let i = this.active.length - 1; i >= 0; i--) {
            const platform = this.active[i];
            platform.position.z -= gameSpeed * deltaTime;

            // Soldier Shooting Logic
            if (platform.userData.soldierObstacle && platform.visible) {
                const soldier = platform.userData.soldierObstacle;
                soldier.userData.lastShotTime += deltaTime;

                // Fire only if within range and cooldown passed
                // Range: Z < 30 (close enough to see) and Z > 5 (not passed player yet)
                if (platform.position.z < 30 && platform.position.z > 2 && soldier.userData.lastShotTime > 1.5) {
                    this.fireEnemyBullet(platform, soldier);
                    soldier.userData.lastShotTime = 0; // Reset timer
                }
            }

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

        // Update Enemy Projectiles
        this.updateEnemyProjectiles(deltaTime);
    }

    fireEnemyBullet(platform, soldier) {
        if (!this.game || !this.game.player) return;

        // Get soldier world position
        const startPos = new THREE.Vector3();
        soldier.getWorldPosition(startPos);
        startPos.y += 1.5; // Shoulder height

        // Shoot straight ahead (towards player at Z=0)
        // Since soldier is at positive Z and player is at 0, direction is -Z
        const direction = new THREE.Vector3(0, 0, -1);

        // Create Bullet Mesh (Red/Orange Sphere)
        const geometry = new THREE.SphereGeometry(0.15, 8, 8);
        const material = new THREE.MeshBasicMaterial({ color: 0xff4400 });
        const bullet = new THREE.Mesh(geometry, material);
        bullet.position.copy(startPos);

        // Store velocity and lifetime
        const speed = 15; // Slower than player bullets so they can be dodged?
        bullet.userData = {
            velocity: direction.multiplyScalar(speed),
            lifetime: 3.0 // Seconds
        };

        this.scene.add(bullet);
        this.enemyProjectiles.push(bullet);
    }

    updateEnemyProjectiles(deltaTime) {
        if (!this.game || !this.game.player) return;

        for (let i = this.enemyProjectiles.length - 1; i >= 0; i--) {
            const bullet = this.enemyProjectiles[i];

            // Move bullet
            bullet.position.add(bullet.userData.velocity.clone().multiplyScalar(deltaTime));
            bullet.userData.lifetime -= deltaTime;

            // Check Collision with Player
            // Use Cylinder collision (XZ distance + Y height check)
            const playerPos = this.game.player.mesh.position;
            const dx = bullet.position.x - playerPos.x;
            const dz = bullet.position.z - playerPos.z;
            const distXZ = Math.sqrt(dx * dx + dz * dz);

            // Bullet Y is around 1.5, Player Y is 0, height ~1.8
            // Check if bullet matches player height range
            const bulletY = bullet.position.y;
            const withinHeight = bulletY > 0 && bulletY < 2.0;

            if (distXZ < 0.6 && withinHeight && !this.game.player.isDying && !this.game.player.invulnerable) {
                console.log('💥 Player Hit by Enemy Bullet!');

                // Damage Player
                this.game.player.takeDamage(1);

                this.scene.remove(bullet);
                this.enemyProjectiles.splice(i, 1);
                continue;
            }

            // Remove if expired
            if (bullet.userData.lifetime <= 0) {
                this.scene.remove(bullet);
                this.enemyProjectiles.splice(i, 1);
            }
        }
    }

    spawnRow() {
        // Spawn one row (3 platforms)
        for (let i = 0; i < CONFIG.LANE.COUNT; i++) {
            if (this.pool.length === 0) {
                console.warn('Pool exhausted!');
                return;
            }
            const platform = this.pool.pop();

            // SET POSITION FIRST (before adding obstacles!)
            platform.position.set(
                CONFIG.LANE.POSITIONS[i],
                0,
                CONFIG.PLATFORM.SPAWN_DISTANCE + 10
            );

            const status = this.ruleManager.getLaneStatus(i);
            const isDangerous = (status === 'hazard');

            platform.userData.isDangerous = isDangerous;
            platform.userData.lane = i;

            // Reset Jumpable Cube Visibility (Important!)
            if (platform.userData.jumpableCube) {
                platform.userData.jumpableCube.visible = false;
            }
            platform.userData.hasJumpableObstacle = false;

            // Show/hide cubes based on danger
            if (platform.userData.cubes) {
                platform.userData.cubes.forEach(cube => {
                    cube.visible = isDangerous;
                });
            }

            // Jumpable obstacles ONLY on SAFE lanes (40% chance)
            platform.userData.hasJumpableObstacle = false;

            // Clean up old soldier obstacle if exists
            if (platform.userData.soldierObstacle) {
                platform.remove(platform.userData.soldierObstacle);
                platform.userData.soldierObstacle = null;
            }

            if (!isDangerous && Math.random() < 0.4) {
                platform.userData.hasJumpableObstacle = true;

                // Randomly choose: 50% soldier, 50% gray cube
                const useSoldier = this.soldierModel && Math.random() < 0.5;

                if (useSoldier) {
                    // Hide gray cube geometry, show soldier visual instead
                    if (platform.userData.jumpableCube && platform.userData.jumpableCube.geometry) {
                        platform.userData.jumpableCube.visible = false;
                    }

                    // Clone soldier properly (SkeletonUtils for animated models)
                    const soldierClone = SkeletonUtils.clone(this.soldierModel);
                    soldierClone.position.set(0, 0, 0); // At platform origin
                    soldierClone.rotation.y = Math.PI; // Face camera

                    platform.add(soldierClone);
                    soldierClone.userData = { health: 11, maxHealth: 11, lastShotTime: 0 }; // Default soldier health and shooting stats

                    // Create Health Bar
                    const barWidth = 1.0;
                    const barHeight = 0.15;
                    const healthBarGroup = new THREE.Group();
                    healthBarGroup.position.set(0, 2.2, 0); // Above soldier head

                    // Background (Black)
                    const bgGeo = new THREE.PlaneGeometry(barWidth, barHeight);
                    const bgMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
                    const bgMesh = new THREE.Mesh(bgGeo, bgMat);

                    // Kill (Red)
                    const fgGeo = new THREE.PlaneGeometry(barWidth - 0.05, barHeight - 0.05);
                    const fgMat = new THREE.MeshBasicMaterial({ color: 0xff0000 });
                    const fgMesh = new THREE.Mesh(fgGeo, fgMat);
                    fgMesh.position.z = 0.01; // Slightly in front
                    // Shift anchor to left for scaling
                    fgMesh.geometry.translate((barWidth - 0.05) / 2, 0, 0);
                    fgMesh.position.x = -(barWidth - 0.05) / 2;

                    healthBarGroup.add(bgMesh);
                    healthBarGroup.add(fgMesh);

                    soldierClone.add(healthBarGroup);
                    soldierClone.userData.healthBar = fgMesh;

                    platform.userData.soldierObstacle = soldierClone;

                    console.log('🎖️ Soldier obstacle spawned at Z:', platform.position.z.toFixed(1));
                } else {
                    // Show gray cube
                    if (platform.userData.jumpableCube && platform.userData.jumpableCube.geometry) {
                        platform.userData.jumpableCube.visible = true;
                        console.log('📦 Cube at Z:', platform.position.z.toFixed(1));
                    }
                }
            } else {
                // No obstacle
                if (platform.userData.jumpableCube && platform.userData.jumpableCube.geometry) {
                    platform.userData.jumpableCube.visible = false;
                }
            }

            // Show/hide base platform
            if (platform.userData.baseMesh) {
                // Hide safe platforms completely - only show obstacles
                platform.userData.baseMesh.visible = false;
            }

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

        // Clear enemy projectiles
        for (const proj of this.enemyProjectiles) {
            this.scene.remove(proj);
        }
        this.enemyProjectiles = [];

        this.timeSinceLastSpawn = 0;
    }

    setVisible(visible) {
        this.active.forEach(platform => {
            platform.visible = visible;
        });

        this.enemyProjectiles.forEach(proj => {
            proj.visible = visible;
        });
    }
}
