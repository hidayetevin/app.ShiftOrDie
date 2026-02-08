import * as THREE from 'three';

export class EnvironmentManager {
    constructor(scene) {
        this.scene = scene;
        this.walls = [];
        this.floorSegments = [];
        this.wallCubes = []; // Track wall decoration cubes
        this.init();
    }

    init() {
        this.createFloorPattern();
        this.createWalls();
        this.createCeiling();
        this.createLighting();
    }

    createFloorPattern() {
        // Textured floor with grid pattern (like dungeon)
        const textureLoader = new THREE.TextureLoader();

        // Load ground texture (we'll use the crate texture for now, can be replaced)
        const groundTexture = textureLoader.load('/textures/crate.gif', (texture) => {
            texture.wrapS = THREE.RepeatWrapping;
            texture.wrapT = THREE.RepeatWrapping;
            texture.repeat.set(4, 40); // Repeat along the corridor
            texture.colorSpace = THREE.SRGBColorSpace;
        });

        const floorGeometry = new THREE.PlaneGeometry(10, 200);
        const floorMaterial = new THREE.MeshStandardMaterial({
            map: groundTexture,
            color: 0x888888,
            roughness: 0.8,
            metalness: 0.2
        });

        const floor = new THREE.Mesh(floorGeometry, floorMaterial);
        floor.rotation.x = -Math.PI / 2;
        floor.position.z = 80;
        floor.position.y = -0.5;
        floor.receiveShadow = true;
        this.scene.add(floor);

        // Store references for animation
        this.floor = floor;
        this.floorTexture = groundTexture;
    }

    createWalls() {
        const wallHeight = 5;
        const wallDepth = 200;
        const wallThickness = 0.5;

        // Load crate texture for walls (same as obstacles)
        const textureLoader = new THREE.TextureLoader();
        const crateTexture = textureLoader.load('/textures/crate.gif', (texture) => {
            texture.wrapS = THREE.RepeatWrapping;
            texture.wrapT = THREE.RepeatWrapping;
            texture.repeat.set(1, 40); // Vertical repeat along corridor
            texture.colorSpace = THREE.SRGBColorSpace;
        });

        // Wall material with texture (like dungeon example)
        const wallMaterial = new THREE.MeshStandardMaterial({
            map: crateTexture,
            color: 0xbbbbbb, // Slight tint
            roughness: 0.8,
            metalness: 0.1
        });

        // Left wall
        const leftWallGeometry = new THREE.BoxGeometry(wallThickness, wallHeight, wallDepth);
        const leftWall = new THREE.Mesh(leftWallGeometry, wallMaterial);
        leftWall.position.set(-5.25, wallHeight / 2, 80);
        leftWall.castShadow = true;
        leftWall.receiveShadow = true;
        this.scene.add(leftWall);
        this.walls.push(leftWall);

        // Right wall (clone material for independent texture)
        const rightWallMat = wallMaterial.clone();
        const rightWall = new THREE.Mesh(leftWallGeometry.clone(), rightWallMat);
        rightWall.position.set(5.25, wallHeight / 2, 80);
        rightWall.castShadow = true;
        rightWall.receiveShadow = true;
        this.scene.add(rightWall);
        this.walls.push(rightWall);

        // Add decorative wall cubes (stacked like dungeon bricks)
        this.createWallDetails();
    }

    createWallDetails() {
        // Create stacked cube details on walls (like dungeon screenshot)
        const textureLoader = new THREE.TextureLoader();
        const crateTexture = textureLoader.load('/textures/crate.gif', (texture) => {
            texture.colorSpace = THREE.SRGBColorSpace;
        });

        const cubeMaterial = new THREE.MeshStandardMaterial({
            map: crateTexture,
            roughness: 0.7,
            metalness: 0.2
        });

        const cubeSize = 0.8;
        const cubeGeometry = new THREE.BoxGeometry(cubeSize, cubeSize, cubeSize);
        const spacing = 15;

        for (let z = 0; z < 180; z += spacing) {
            // Random stacking on left wall
            const leftStackHeight = Math.floor(Math.random() * 3) + 1;
            for (let h = 0; h < leftStackHeight; h++) {
                const cube = new THREE.Mesh(cubeGeometry, cubeMaterial.clone());
                cube.position.set(-4.9, (cubeSize / 2) + (h * cubeSize), z);
                cube.castShadow = true;
                this.scene.add(cube);
                this.wallCubes.push(cube); // Track for movement
            }

            // Random stacking on right wall
            const rightStackHeight = Math.floor(Math.random() * 3) + 1;
            for (let h = 0; h < rightStackHeight; h++) {
                const cube = new THREE.Mesh(cubeGeometry, cubeMaterial.clone());
                cube.position.set(4.9, (cubeSize / 2) + (h * cubeSize), z);
                cube.castShadow = true;
                this.scene.add(cube);
                this.wallCubes.push(cube); // Track for movement
            }
        }
    }

    createCeiling() {
        const ceilingGeometry = new THREE.PlaneGeometry(10, 200);
        const ceilingMaterial = new THREE.MeshStandardMaterial({
            color: 0x1a1a1a,
            roughness: 0.9,
            side: THREE.DoubleSide
        });

        const ceiling = new THREE.Mesh(ceilingGeometry, ceilingMaterial);
        ceiling.rotation.x = Math.PI / 2;
        ceiling.position.z = 80;
        ceiling.position.y = 5;
        ceiling.receiveShadow = true;
        this.scene.add(ceiling);
    }

    createLighting() {
        // Ambient light for base illumination
        const ambient = new THREE.AmbientLight(0xffffff, 0.4);
        this.scene.add(ambient);

        // Main directional light from above
        const directional = new THREE.DirectionalLight(0xffffff, 0.6);
        directional.position.set(0, 10, 5);
        directional.castShadow = true;
        directional.shadow.camera.left = -10;
        directional.shadow.camera.right = 10;
        directional.shadow.camera.top = 10;
        directional.shadow.camera.bottom = -10;
        directional.shadow.camera.near = 0.1;
        directional.shadow.camera.far = 50;
        directional.shadow.mapSize.width = 1024;
        directional.shadow.mapSize.height = 1024;
        this.scene.add(directional);

        // Hemisphere light for ambient fill
        const hemisphere = new THREE.HemisphereLight(0x87ceeb, 0x2a2a2a, 0.3);
        this.scene.add(hemisphere);

        // Add fewer point lights along corridor (torch-like atmosphere)
        // Reduced from every 15 units to every 30 units to save performance
        const spacing = 30;
        for (let z = 0; z < 180; z += spacing) {
            // Left side torches
            const leftLight = new THREE.PointLight(0xffaa55, 0.4, 10);
            leftLight.position.set(-4, 3, z);
            // NO shadow casting to save texture units
            this.scene.add(leftLight);

            // Right side torches
            const rightLight = new THREE.PointLight(0xffaa55, 0.4, 10);
            rightLight.position.set(4, 3, z);
            // NO shadow casting to save texture units
            this.scene.add(rightLight);
        }
    }

    update(deltaTime, gameSpeed) {
        // Scroll floor texture to create movement illusion
        if (this.floorTexture) {
            this.floorTexture.offset.y -= gameSpeed * deltaTime * 0.2;
        }

        // Move wall decoration cubes backwards
        for (let i = this.wallCubes.length - 1; i >= 0; i--) {
            const cube = this.wallCubes[i];
            cube.position.z -= gameSpeed * deltaTime;

            // Recycle cubes that passed the camera
            if (cube.position.z < -20) {
                cube.position.z += 200; // Move to front
            }
        }
    }
}
