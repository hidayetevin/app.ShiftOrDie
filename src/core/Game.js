import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass';
import { gameState, GameStates } from './GameState';
import { CONFIG } from './Config';
import { Player } from '../systems/Player';
import { InputManager } from '../systems/InputManager';
import { ScoreManager } from '../systems/ScoreManager';
import { RuleManager } from '../systems/RuleManager';
import { PlatformManager } from '../systems/PlatformManager';
import { CollisionDetector } from '../systems/CollisionDetector';
import { UIManager } from '../ui/UIManager';
import { ProgressionManager } from '../systems/ProgressionManager';
import { AdManager } from '../systems/AdManager';
import { AudioManager } from '../systems/AudioManager';
import { StyleManager } from '../systems/StyleManager';
import { ErrorManager } from '../systems/ErrorManager';
import { ParticleSystem } from '../systems/ParticleSystem';

class Game {
    constructor() {
        this.renderer = null;
        this.scene = null;
        this.camera = null;
        this.composer = null;
        this.clock = new THREE.Clock();

        // Systems
        this.player = null;
        this.input = null;
        this.score = null;
        this.rule = null;
        this.platform = null;
        this.collision = null;
        this.ui = null;
        this.progression = null;
        this.ads = null;
        this.audio = null;
        this.style = null;
        this.error = null;

        this.currentSpeed = CONFIG.DIFFICULTY.SPEED.BASE;
        this.onboardingActive = false;

        this.init();
    }

    init() {
        // Renderer
        this.renderer = new THREE.WebGLRenderer({
            antialias: true,
            powerPreference: 'high-performance'
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

        // Tone Mapping & Exposure (from Walk Example)
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 0.8;

        document.getElementById('game-container').appendChild(this.renderer.domElement);

        // Scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x0a0a0a);

        // Camera
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.camera.position.set(0, 3, -5);
        this.camera.lookAt(0, 1, 5);

        // Lighting
        const ambient = new THREE.AmbientLight(0xffffff, 0.4);
        this.scene.add(ambient);

        const directional = new THREE.DirectionalLight(0xffffff, 0.8);
        directional.position.set(5, 10, 5);
        directional.castShadow = true;
        directional.shadow.camera.near = 0.1;
        directional.shadow.camera.far = 50;
        this.scene.add(directional);

        const hemisphere = new THREE.HemisphereLight(0x87ceeb, 0x545454, 0.3);
        this.scene.add(hemisphere);

        // Ground visualization
        this.createGround();

        // Post-Processing Initialization (Required before StyleManager applies it)
        this.composer = new EffectComposer(this.renderer);
        const renderPass = new RenderPass(this.scene, this.camera);
        this.composer.addPass(renderPass);

        this.bloomPass = new UnrealBloomPass(
            new THREE.Vector2(window.innerWidth, window.innerHeight),
            1.5, 0.4, 0.85
        );
        this.composer.addPass(this.bloomPass);

        // Systems Initialization
        this.player = new Player(this.scene);
        this.input = new InputManager(this.player, this);
        this.score = new ScoreManager();
        this.rule = new RuleManager();
        this.platform = new PlatformManager(this.scene, this.rule);
        this.collision = new CollisionDetector(this.player, this.platform, this); // Pass game instance
        this.progression = new ProgressionManager();
        this.vfx = new ParticleSystem(this.scene);
        this.ads = new AdManager(this);
        this.audio = new AudioManager();
        this.style = new StyleManager(this);
        this.ui = new UIManager(this);
        this.error = new ErrorManager(this);

        // Apply saved style
        this.style.applyStyle(this.progression.data.selected_style);

        // State Change Listeners
        gameState.onStateChange((newState, oldState) => this.onStateChange(newState, oldState));

        // Resize handling
        window.addEventListener('resize', () => this.onResize());

        // Fullscreen touch trigger
        document.addEventListener('touchstart', () => this.tryEnterFullscreen(), { once: true });

        // Start loop
        this.animate();
    }

    onStateChange(newState, oldState) {
        if (newState === GameStates.PLAYING && oldState !== GameStates.PAUSED) {
            this.resetGame();
        }
        if (newState === GameStates.MENU) {
            this.audio.playMusic('main');
        }
    }

    resetGame() {
        this.player.reset();
        this.score.reset();
        this.platform.reset();
        this.ads.reset();
        this.clock.stop();
        this.clock.start();

        if (!this.progression.data.has_played) {
            this.onboardingActive = true;
            this.currentSpeed = CONFIG.DIFFICULTY.SPEED.BASE * CONFIG.ONBOARDING.FIRST_GAME_SPEED_MULT;
            this.progression.data.has_played = true;
            this.progression.saveData();
        } else {
            this.onboardingActive = false;
            this.currentSpeed = CONFIG.DIFFICULTY.SPEED.BASE;
        }
    }

    continueGame() {
        this.player.setInvulnerable(CONFIG.PLAYER.INVULNERABLE_DURATION);
        gameState.transition(GameStates.PLAYING);
    }

    createGround() {
        const geometry = new THREE.PlaneGeometry(10, 200);
        const material = new THREE.MeshStandardMaterial({ color: 0x1a1a2e });
        const ground = new THREE.Mesh(geometry, material);
        ground.rotation.x = -Math.PI / 2;
        ground.position.z = 80;
        ground.receiveShadow = true;
        this.scene.add(ground);
    }

    onResize() {
        const width = window.innerWidth;
        const height = window.innerHeight;
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height);
        this.composer.setSize(width, height);
    }

    tryEnterFullscreen() {
        if (document.documentElement.requestFullscreen) {
            document.documentElement.requestFullscreen().catch(() => { });
        }
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        const deltaTime = this.clock.getDelta();
        this.update(deltaTime);
        this.render();
    }

    update(deltaTime) {
        if (gameState.currentState === GameStates.PLAYING) {
            this.updateDifficulty();
            this.score.update(deltaTime);
            this.rule.update(this.score.timeSurvived);
            this.platform.update(deltaTime, this.currentSpeed);
            this.collision.update();
            this.vfx.update(deltaTime);
            this.player.update(deltaTime, this.currentSpeed, this.vfx, true);

            // Dynamic camera tracking with speed-based smoothing
            const smoothFactor = this.currentSpeed > 10 ? 0.15 : 0.1;
            this.camera.position.x += (this.player.mesh.position.x - this.camera.position.x) * smoothFactor;

            // Camera shake effect when running fast
            if (this.currentSpeed > 12) {
                this.camera.position.y += Math.sin(Date.now() * 0.01) * 0.02;
            }

            this.progression.updateTaskProgress('survival', this.score.timeSurvived);
        }
    }

    updateDifficulty() {
        if (this.onboardingActive) return;

        const time = this.score.timeSurvived;
        const { BASE, INCREMENT, INTERVAL, MAX } = CONFIG.DIFFICULTY.SPEED;
        this.currentSpeed = Math.min(
            BASE + Math.floor(time / INTERVAL) * INCREMENT,
            MAX
        );
    }

    render() {
        this.composer.render();
    }
}

export const game = new Game();
