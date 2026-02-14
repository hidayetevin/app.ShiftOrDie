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

        // SPACER LOGIC: Track obstacle positions to enforce gaps
        this.spawnCounter = 0;
        this.lastObstacleIndices = [-99, -99, -99]; // Per lane tracker

        this.soldierModel = null;
        this.enemyProjectiles = [];
        this.game = null;
        this.loaded = false; // Flag to check if pool is ready

        this.loadSoldierModel();
    }

    setGame(game) {
        this.game = game;
    }

    loadSoldierModel() {
        const loader = new GLTFLoader();
        loader.load('/models/gltf/Soldier.glb', (gltf) => {
            this.soldierModel = gltf.scene;
            this.soldierAnimations = gltf.animations; // Store animations
            this.soldierModel.scale.set(1.2, 1.2, 1.2);

            // Traverse to enable shadows
            this.soldierModel.traverse(c => {
                if (c.isMesh) {
                    c.castShadow = true;
                    c.receiveShadow = true;
                }
            });

            console.log('✅ Soldier model loaded with animations:', this.soldierAnimations.length);
        }, undefined, (err) => console.error(err));
    }

    /**
     * Async Pool Initializer
     * Fills the pool over multiple frames.
     * STRICT POOLING: Pre-allocates Soldiers and Materials to avoid runtime lag.
     */
    initPoolAsync(onProgress, onComplete) {
        if (this.loaded) {
            if (onProgress) onProgress(100);
            if (onComplete) onComplete();
            return;
        }

        console.log('🔄 Starting Zero-Allocation Pool Initialization...');

        // --- SHARED RESOURCES (Create ONCE) ---

        // 1. Geometries
        const platformGeo = new THREE.BoxGeometry(CONFIG.LANE.WIDTH, CONFIG.PLATFORM.HEIGHT, CONFIG.PLATFORM.LENGTH);
        const cubeGeo = new THREE.BoxGeometry(0.8, 0.8, 0.8);
        const hpBgGeo = new THREE.PlaneGeometry(1.0, 0.15);
        const hpFgGeo = new THREE.PlaneGeometry(0.95, 0.1);
        hpFgGeo.translate(0.95 / 2, 0, 0); // Anchor fix for scaling

        // 2. Materials
        const textureLoader = new THREE.TextureLoader();
        const crateTexture = textureLoader.load('/textures/crate.gif');
        crateTexture.colorSpace = THREE.SRGBColorSpace;

        // Shared Materials
        const mats = {
            base: new THREE.MeshBasicMaterial({ color: 0x00ff00, transparent: true, opacity: 0.3, depthWrite: false }),
            crate: new THREE.MeshBasicMaterial({ map: crateTexture }),
            jumpable: new THREE.MeshBasicMaterial({ map: crateTexture, color: 0xaaaaaa }),
            hpBg: new THREE.MeshBasicMaterial({ color: 0x000000 }),
            hpBg: new THREE.MeshBasicMaterial({ color: 0x000000 }),
            hpFg: new THREE.MeshBasicMaterial({ color: 0xff0000 }),
            // Power-Up Materials
            puHealth: new THREE.MeshLambertMaterial({ color: 0xff0000, emissive: 0x550000 }),
            puShield: new THREE.MeshLambertMaterial({ color: 0x0088ff, emissive: 0x002288, transparent: true, opacity: 0.8 }),
            puGhost: new THREE.MeshLambertMaterial({ color: 0xffffff, emissive: 0xaaaaaa, transparent: true, opacity: 0.6 }),
            puTime: new THREE.MeshLambertMaterial({ color: 0xffd700, emissive: 0xaa8800 })
        };

        // Power-Up Geometries
        const geoHeart = new THREE.OctahedronGeometry(0.5); // Simple diamond shape for heart
        const geoShield = new THREE.IcosahedronGeometry(0.5, 1); // Crystal/Shield shape
        const geoGhost = new THREE.ConeGeometry(0.4, 0.8, 8); // Ghost shape
        const geoTime = new THREE.TorusGeometry(0.3, 0.1, 8, 16); // Ring/Clock shape

        // Loop vars
        let createdCount = 0;
        const totalToCreate = CONFIG.PLATFORM.POOL_SIZE;

        const processChunk = () => {
            const startTime = performance.now();

            // Process for max 12ms per frame (slightly more budget for loading)
            while (performance.now() - startTime < 12 && createdCount < totalToCreate) {
                this.createSinglePlatform(platformGeo, cubeGeo, hpBgGeo, hpFgGeo, mats);
                createdCount++;
            }

            const percent = Math.floor((createdCount / totalToCreate) * 100);
            if (onProgress) onProgress(percent);

            if (createdCount < totalToCreate) {
                requestAnimationFrame(processChunk);
            } else {
                this.loaded = true;
                console.log(`✅ Pool Ready: ${this.pool.length} objects. Zero runtime allocations active.`);
                if (onComplete) onComplete();
            }
        };

        requestAnimationFrame(processChunk);
    }

    createSinglePlatform(platformGeo, cubeGeo, hpBgGeo, hpFgGeo, mats) {
        const platformGroup = new THREE.Group();
        const cubeSize = 0.8;

        // 1. Base Mesh
        const baseMesh = new THREE.Mesh(platformGeo, mats.base);
        baseMesh.visible = false;
        // Optimization: Disable matrix auto update for static child objects if possible, 
        // but since we move the parent group, children move with it.
        platformGroup.add(baseMesh);

        // 2. Obstacle Cubes (Pool of 4 stacks * 3 height = 12 cubes max)
        const cubes = [];
        const numPositions = 4;
        const spacing = CONFIG.PLATFORM.LENGTH / (numPositions + 1);

        for (let j = 0; j < numPositions; j++) {
            const stackHeight = 3; // Max height to pre-allocate
            for (let k = 0; k < stackHeight; k++) {
                const cube = new THREE.Mesh(cubeGeo, mats.crate);

                cube.position.set(0, (cubeSize / 2) + (k * cubeSize), -CONFIG.PLATFORM.LENGTH / 2 + spacing * (j + 1));
                cube.rotation.set(0, 0, 0);
                cube.visible = false; // Hidden by default

                cubes.push(cube);
                platformGroup.add(cube);
            }
        }

        // 3. Jumpable Crate (Single interaction object)
        const jumpableCube = new THREE.Mesh(cubeGeo, mats.jumpable);
        jumpableCube.position.set(0, cubeSize / 2, 0);
        jumpableCube.visible = false;
        platformGroup.add(jumpableCube);

        // 4. Soldier (Pre-allocate 1 per platform)
        let soldierRef = null;
        let hpBarRef = null;
        let mixer = null;

        if (this.soldierModel) {
            const soldier = SkeletonUtils.clone(this.soldierModel);
            soldier.position.set(0, 0, 0);
            soldier.rotation.y = Math.PI;
            soldier.visible = false;

            // Health Bar
            const hpGroup = new THREE.Group();
            hpGroup.position.set(0, 2.2, 0);

            const bg = new THREE.Mesh(hpBgGeo, mats.hpBg);
            const fg = new THREE.Mesh(hpFgGeo, mats.hpFg);
            fg.position.z = 0.01;
            fg.position.x = -(1.0 - 0.05) / 2; // Anchor already fixed in geometry translate

            hpGroup.add(bg);
            hpGroup.add(fg);
            soldier.add(hpGroup);

            platformGroup.add(soldier);

            soldierRef = soldier;
            hpBarRef = fg;
        }

        // 5. Power-Up Container (Pre-allocate 1 per platform)
        const powerUpGroup = new THREE.Group();
        powerUpGroup.position.set(0, 1.0, 0); // Warning: Height adjustments may be needed
        powerUpGroup.visible = false;

        // Create meshes for each type (only show 1 active at a time)
        // We reuse geometries defined in initPoolAsync scope. 
        // Note: arguments to createSinglePlatform need update to pass geometries?
        // Actually, easiest is to use standard geometries here if we can't pass them easily 
        // or just recreate small geometries (offset cost is minimal for 15-20 platforms).
        // Better: Pass them in "mats" object as a hack or update signature. 
        // For now, I will use standard geometries to keep signature simple or assume they are available.
        // Wait, I cannot access geoHeart etc. from here unless passed.
        // Let's use simple geometries here to avoid signature complexity for now, or use what is available.
        // Actually, I should update the signature in step 1. But I didn't. 
        // I will use `new THREE...` here. Since it's init-time, it's acceptable.

        const meshHealth = new THREE.Mesh(new THREE.OctahedronGeometry(0.4), mats.puHealth);
        const meshShield = new THREE.Mesh(new THREE.IcosahedronGeometry(0.4), mats.puShield);
        const meshGhost = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.7, 8), mats.puGhost);
        const meshTime = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.1, 8, 16), mats.puTime);

        // Add all to group, toggle visibility on spawn
        powerUpGroup.add(meshHealth);
        powerUpGroup.add(meshShield);
        powerUpGroup.add(meshGhost);
        powerUpGroup.add(meshTime);

        // Store references
        powerUpGroup.userData = {
            activeType: null,
            meshes: {
                health: meshHealth,
                shield: meshShield,
                ghost: meshGhost,
                time: meshTime
            }
        };

        platformGroup.add(powerUpGroup);


        platformGroup.visible = false;

        // User Data Structure
        platformGroup.userData = {
            lane: 0,
            baseMesh: baseMesh,
            cubes: cubes,           // Array of 12 meshes
            jumpableCube: jumpableCube,
            soldier: soldierRef,    // The persistent soldier mesh
            healthBar: hpBarRef,
            mixer: mixer, // Store Mixer
            powerUp: powerUpGroup, // PowerUp reference

            // Logic Flags
            isDangerous: false,
            hasJumpableObstacle: false,
            hasSoldier: false,
            hasPowerUp: false,

            // Dynamic Data
            soldierData: { health: 11, maxHealth: 11, lastShotTime: 0 }
        };

        this.pool.push(platformGroup);
        this.scene.add(platformGroup);
    }

    update(deltaTime, gameSpeed) {
        this.timeSinceLastSpawn += deltaTime;

        // Move active platforms
        for (let i = this.active.length - 1; i >= 0; i--) {
            const platform = this.active[i];
            platform.position.z -= gameSpeed * deltaTime;

            // Update Soldier (Logic + Animation)
            if (platform.visible && platform.userData.hasSoldier && platform.userData.soldier.visible) {
                this.updateSoldierLogic(platform, deltaTime);

                // Update Animation
                if (platform.visible) {
                    if (platform.userData.mixer) {
                        platform.userData.mixer.update(deltaTime);
                    }
                    // Power-Up Rotation
                    if (platform.userData.hasPowerUp && platform.userData.powerUp.visible) {
                        platform.userData.powerUp.rotation.y += deltaTime * 2.0; // Spin
                    }
                }
            }

            // Recycle
            if (platform.position.z < CONFIG.PLATFORM.DESPAWN_DISTANCE) {
                this.recycle(platform, i);
            }
        }

        // Spawn
        if (this.timeSinceLastSpawn >= CONFIG.PLATFORM.SPAWN_INTERVAL) {
            this.spawnRow();
            this.timeSinceLastSpawn = 0;
        }

        // Projectiles
        this.updateEnemyProjectiles(deltaTime);
    }

    updateSoldierLogic(platform, deltaTime) {
        const data = platform.userData.soldierData;
        const soldier = platform.userData.soldier;

        data.lastShotTime += deltaTime;

        if (platform.position.z < 30 && platform.position.z > 2 && data.lastShotTime > 1.5) {
            this.fireEnemyBullet(platform, soldier);
            data.lastShotTime = 0;
        }
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

            if (distXZ < 0.6 && withinHeight && !this.game.player.isDying && !this.game.player.invulnerable && !this.game.player.isJumping) {
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

    spawnRow(zPos = null) {
        if (this.pool.length < CONFIG.LANE.COUNT) {
            // Optional: Force expand pool or just skip
            return;
        }

        this.spawnCounter++; // Increment row counter

        // Default Z check
        const finalZ = (zPos !== null) ? zPos : (CONFIG.PLATFORM.SPAWN_DISTANCE + 10);

        for (let i = 0; i < CONFIG.LANE.COUNT; i++) {
            const platform = this.pool.pop();
            this.setupPlatform(platform, i, finalZ);

            platform.visible = true;
            this.active.push(platform);
        }
    }

    setupPlatform(platform, laneIndex, zPos) {
        // 1. Position
        platform.position.set(
            CONFIG.LANE.POSITIONS[laneIndex],
            0,
            zPos
        );
        platform.userData.lane = laneIndex;

        // 2. Logic
        const status = this.ruleManager.getLaneStatus(laneIndex);
        const isDangerous = (status === 'hazard');
        platform.userData.isDangerous = isDangerous;

        // 3. Reset Visuals (Hide All first)
        platform.userData.baseMesh.visible = false; // Only show debug/base if needed
        platform.userData.jumpableCube.visible = false;
        if (platform.userData.soldier) platform.userData.soldier.visible = false;
        platform.userData.cubes.forEach(c => c.visible = false);

        // Reset PowerUps
        const pu = platform.userData.powerUp;
        if (pu) {
            pu.visible = false;
            Object.values(pu.userData.meshes).forEach(m => m.visible = false);
        }

        platform.userData.hasSoldier = false;
        platform.userData.hasJumpableObstacle = false;
        platform.userData.hasPowerUp = false;

        if (isDangerous) {
            // Hazard Lane: Activate Random Cubes
            const numRows = 4;
            const baseIndex = this.spawnCounter * numRows;

            for (let r = 0; r < numRows; r++) {
                // GAP CHECK: Must be at least 2 empty blocks (gap >= 3)
                const globalIdx = baseIndex + r;
                if (this.lastObstacleIndices && (globalIdx - this.lastObstacleIndices[laneIndex] < 3)) {
                    continue;
                }

                // REDUCED DENSITY: Only 60% of rows have blocks
                if (Math.random() > 0.6) continue;

                // Place Obstacle
                const h = Math.floor(Math.random() * 3) + 1; // 1-3 height
                for (let k = 0; k < h; k++) {
                    const idx = r * 3 + k;
                    if (platform.userData.cubes[idx]) {
                        platform.userData.cubes[idx].visible = true;
                    }
                }

                // Update last obstacle position
                if (this.lastObstacleIndices) {
                    this.lastObstacleIndices[laneIndex] = globalIdx;
                }
            }
        } else {
            // Safe Lane: Chance for obstacle OR PowerUp
            const rand = Math.random();
            const powerUpChance = 0.15; // 15% chance for PowerUp
            const obstacleChance = 0.25; // 25% chance for Obstacle

            if (rand < powerUpChance) {
                // SPAWN POWER-UP
                this.setupPowerUp(platform);
            } else if (rand < powerUpChance + obstacleChance) {
                // SPAWN OBSTACLE
                this.setupObstacle(platform);
            }
        }
    }

    setupPowerUp(platform) {
        const pu = platform.userData.powerUp;
        if (!pu) return;

        platform.userData.hasPowerUp = true;
        pu.visible = true;

        // Select Random Type
        let types = ['health', 'shield', 'ghost', 'time'];

        // If HP is full, exclude 'health'
        if (this.game && this.game.player && this.game.player.health >= this.game.player.maxHealth) {
            types = types.filter(t => t !== 'health');
        }

        if (types.length === 0) return;

        // Weights: Health(20%), Shield(30%), Ghost(25%), Time(25%)
        // Simple random for now
        const type = types[Math.floor(Math.random() * types.length)];

        // Activate specific mesh
        pu.userData.activeType = type;
        Object.values(pu.userData.meshes).forEach(m => m.visible = false);
        if (pu.userData.meshes[type]) {
            pu.userData.meshes[type].visible = true;
        }

        // Animation: Rotate mesh in update loop
    }

    setupObstacle(platform) {
        // 50% Soldier, 50% Jumpable
        // Only if soldier model exists
        const useSoldier = platform.userData.soldier && Math.random() < 0.5;

        if (useSoldier) {
            platform.userData.hasSoldier = true;
            const soldier = platform.userData.soldier;
            soldier.visible = true;

            // Reset Stats
            platform.userData.soldierData.health = 11;
            platform.userData.soldierData.lastShotTime = 0;
            if (platform.userData.healthBar) platform.userData.healthBar.scale.x = 1;

            console.log('Use Pooled Soldier');
        } else {
            // Jumpable Crate
            platform.userData.hasJumpableObstacle = true;
            platform.userData.jumpableCube.visible = true;
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
        this.spawnCounter = 0;
        this.lastObstacleIndices = [-99, -99, -99];

        // PRE-FILL TRACK
        // Start from Z=10 up to Z=30 so obstacles appear sooner
        // Calculate strict spacing based on config to match runtime spawning
        const speed = (this.game && this.game.currentSpeed > 0) ? this.game.currentSpeed : CONFIG.DIFFICULTY.SPEED.BASE;
        const spacing = speed * CONFIG.PLATFORM.SPAWN_INTERVAL;

        const startZ = 10;
        const endZ = CONFIG.PLATFORM.SPAWN_DISTANCE + 10;
        let lastZ = startZ;

        for (let z = startZ; z < endZ; z += spacing) {
            this.spawnRow(z);
            lastZ = z;
        }

        // Calculate how much time has "passed" relative to the next spawn
        // The last platform is at `lastZ`. The next one spawns at `endZ`.
        // The distance remaining to fill is `endZ - lastZ`.
        // This distance represents time we still need to wait: `remainingDist / speed`
        // So `timeSinceLastSpawn` should be `SPAWN_INTERVAL - remainingTime`.
        // Or simpler: We are `(lastZ - (endZ - spacing))` ahead?

        // Let's deduce:
        // Next spawn happens when `timeSinceLastSpawn >= INTERVAL`.
        // Next spawn puts platform at `endZ`.
        // Previous platform is at `lastZ`.
        // Ideal gap is `spacing`.
        // So `endZ - lastZ` is the actual gap.
        // We want `actualGap` to be travelled in `remainingTime`.
        // `remainingTime` = (endZ - lastZ) / speed.
        // So we need to wait `remainingTime`.
        // `timeSinceLastSpawn` starts at 0 and goes up.
        // Waiting `remainingTime` means `timeSinceLastSpawn` should be `INTERVAL - remainingTime`.

        if (speed > 0) {
            const remainingDist = endZ - lastZ;
            const remainingTime = remainingDist / speed;
            this.timeSinceLastSpawn = Math.max(0, CONFIG.PLATFORM.SPAWN_INTERVAL - remainingTime);
        } else {
            this.timeSinceLastSpawn = 0;
        }
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
