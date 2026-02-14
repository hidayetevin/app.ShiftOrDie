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

import { EnvironmentManager } from '../systems/EnvironmentManager';

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
        this.environment = null; // New environment system

        this.currentSpeed = CONFIG.DIFFICULTY.SPEED.BASE;
        this.speedMultiplier = 1.0; // Added for jump dash effect
        this.timeScale = 1.0; // Time Slow Effect
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
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5)); // Reduced for mobile performance
        this.renderer.shadowMap.enabled = false;
        // this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

        // Tone Mapping & Exposure (from Walk Example)
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.0; // Slightly increased as bloom is gone

        document.getElementById('game-container').appendChild(this.renderer.domElement);

        // Scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x000000); // Dark background for dungeon

        // Camera
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.camera.position.set(0, 4.5, -6); // Slightly higher for better overview
        this.camera.lookAt(0, 0.5, 4); // Look down towards player path

        // Environment (replaces simple ground and adds walls/ceiling)
        this.environment = new EnvironmentManager(this.scene);

        // Post-Processing Initialization (Required before StyleManager applies it)
        this.composer = new EffectComposer(this.renderer);
        const renderPass = new RenderPass(this.scene, this.camera);
        this.composer.addPass(renderPass);

        // BLOOM DISABLED FOR MOBILE PERFORMANCE
        /*
        this.bloomPass = new UnrealBloomPass(
            new THREE.Vector2(window.innerWidth, window.innerHeight),
            1.5, 0.4, 0.85
        );
        this.composer.addPass(this.bloomPass);
        */

        // Systems Initialization
        this.player = new Player(this.scene);
        this.player.setGame(this); // Inject game reference for speed control
        this.input = new InputManager(this.player, this);
        this.score = new ScoreManager();
        this.rule = new RuleManager();
        this.platform = new PlatformManager(this.scene, this.rule);
        this.platform.setGame(this);
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

        // Initial Menu Mode Check
        if (gameState.currentState === GameStates.MENU) {
            this.setMenuMode(true);
        }

        // Resize handling
        window.addEventListener('resize', () => this.onResize());

        // Fullscreen touch trigger
        document.addEventListener('touchstart', () => this.tryEnterFullscreen(), { once: true });

        // Start loop
        this.animate();
    }

    /**
     * Called when user clicks PLAY.
     * Shows loading screen -> Loads Pool -> Starts Game
     */
    startGameWithLoading() {
        // 1. Show Loading Screen
        const screen = document.getElementById('loading-screen');
        if (screen) {
            screen.style.display = 'flex';
            screen.style.opacity = '1';
        }

        // 2. Load Assets (Pool)
        this.platform.initPoolAsync(
            (percent) => {
                this.updateLoadingUI(percent);
            },
            () => {
                this.onLoadingComplete();
            }
        );
    }

    updateLoadingUI(percent) {
        const bar = document.getElementById('loading-bar');
        const text = document.getElementById('loading-text');
        if (bar) bar.style.width = percent + '%';
        if (text) text.innerText = percent + '%';
    }

    onLoadingComplete() {
        // 3. Hide Loading Screen
        const screen = document.getElementById('loading-screen');
        if (screen) {
            screen.style.opacity = '0';
            setTimeout(() => screen.style.display = 'none', 300);
        }

        console.log('✅ Pool Ready. Starting Gameplay.');

        // 4. Transition to Playing
        this.player.setInvulnerable(CONFIG.PLAYER.INVULNERABLE_DURATION);
        gameState.transition(GameStates.PLAYING);
    }

    onStateChange(newState, oldState) {
        if (newState === GameStates.MENU) {
            this.audio.playMusic('main');
            this.setMenuMode(true);
        } else if (newState === GameStates.PLAYING) {
            this.setMenuMode(false);
            // Only reset if NOT continuing from ad/pause
            if (oldState !== GameStates.PAUSED && oldState !== GameStates.REWARDED_AD) {
                this.resetGame();
            }
        }
    }

    setMenuMode(active) {
        if (active) {
            // Hide game environment for studio view
            this.environment.setVisible(false);
            this.platform.setVisible(false);

            // Set Player to Menu Mode (Stand)
            this.player.setMenuMode(true);

            // Menu Camera Position (Front view - +Z axis)
            this.camera.position.set(0, 1.5, 4.0);
            this.camera.lookAt(0, 0.8, 0);
        } else {
            // Show game environment
            this.environment.setVisible(true);
            this.platform.setVisible(true);

            // Ensure player exits menu mode
            this.player.setMenuMode(false);

            // Restore Game Camera Position (-Z axis)
            this.camera.position.set(0, 4.5, -6);
            this.camera.lookAt(0, 0.5, 4);
        }
    }

    resetGame() {
        this.player.reset(); // Will verify menu mode is off by positioning
        this.score.reset();
        this.platform.reset();
        this.ads.reset();
        this.progression.resetRun(); // Reset daily coin count for this run
        this.collision.isDead = false; // Reset death flag
        this.clock.stop();
        this.clock.start();
        this.speedMultiplier = 1.0; // Reset multiplier

        if (!this.progression.data.has_played) {
            this.onboardingActive = true;
            this.currentSpeed = CONFIG.DIFFICULTY.SPEED.BASE * CONFIG.ONBOARDING.FIRST_GAME_SPEED_MULT;
            this.progression.data.has_played = true;
            this.progression.saveData();
        } else {
            this.onboardingActive = false;
            this.currentSpeed = CONFIG.DIFFICULTY.SPEED.BASE;
        }

        // Sync UI
        this.ui.updateHealth(this.player.health, this.player.maxHealth);
    }

    continueGame() {
        this.player.revive();
        this.collision.isDead = false; // Reset collision death flag
        this.player.setInvulnerable(CONFIG.PLAYER.INVULNERABLE_DURATION);
        gameState.transition(GameStates.PLAYING);
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
        // Apply Time Scale for Slow Motion
        const scaledDelta = deltaTime * (this.timeScale || 1.0);

        if (gameState.currentState === GameStates.MENU) {
            // Update player animation in menu (keep real time)
            this.player.update(deltaTime, 0, this.vfx, false);
        } else if (gameState.currentState === GameStates.PLAYING) {
            this.updateDifficulty();

            // Calculate effective speed with multiplier (for jump dash effect)
            const effectiveSpeed = this.currentSpeed * (this.speedMultiplier || 1.0);

            this.score.update(scaledDelta);
            this.rule.update(this.score.timeSurvived);
            this.platform.update(scaledDelta, effectiveSpeed); // Use effective speed
            this.collision.update();
            this.vfx.update(scaledDelta);
            this.environment.update(scaledDelta, effectiveSpeed); // Use effective speed
            this.player.update(scaledDelta, effectiveSpeed, this.vfx, true); // Use effective speed

            // Dynamic camera tracking with speed-based smoothing
            const smoothFactor = this.currentSpeed > 10 ? 0.15 : 0.1;
            this.camera.position.x += (this.player.mesh.position.x - this.camera.position.x) * smoothFactor;

            // Camera shake removed per user request

            this.progression.updateTaskProgress('survival', this.score.timeSurvived);
        } else if (gameState.currentState === GameStates.DYING) {
            // During death animation: freeze movement, only update player and VFX
            this.player.update(deltaTime, 0, this.vfx, false); // Speed = 0, no shooting
            this.vfx.update(deltaTime);
            // Platforms, environment, score all frozen
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

    activateTimeSlow(duration) {
        if (this.isTimeSlowActive) return;

        console.log('⏳ Time Slow Activated!');
        this.isTimeSlowActive = true;
        this.timeScale = 0.5; // Slow down game to 50%

        // Audio Effect (Pitch Down)
        if (this.audio && this.audio.bgMusic && this.audio.bgMusic.source) {
            try {
                this.audio.bgMusic.source.playbackRate.value = 0.5;
            } catch (e) { console.warn('Audio pitch error', e); }
        }

        setTimeout(() => {
            this.timeScale = 1.0;
            this.isTimeSlowActive = false;
            console.log('⌛ Time Slow Ended');

            // Restore Audio
            if (this.audio && this.audio.bgMusic && this.audio.bgMusic.source) {
                try {
                    this.audio.bgMusic.source.playbackRate.value = 1.0;
                } catch (e) { console.warn('Audio pitch error', e); }
            }
        }, duration);
    }
}

export const game = new Game();
