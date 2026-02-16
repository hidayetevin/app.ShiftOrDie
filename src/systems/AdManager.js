import { gameState, GameStates } from '../core/GameState';
import { CONFIG } from '../core/Config';
import { AdMob, RewardAdPluginEvents, InterstitialAdPluginEvents } from '@capacitor-community/admob';
import { Capacitor } from '@capacitor/core';

export class AdManager {
    constructor(game) {
        this.game = game;
        this.usedContinueThisRun = false;
        this.isNative = Capacitor.isNativePlatform();

        this.rewardedAdLoaded = false;
        this.interstitialAdLoaded = false;

        // Callbacks
        this.onRewardSuccess = null;
        this.onRewardFail = null;
        this.onInterstitialDismiss = null;

        this.init();
    }

    async init() {
        if (!this.isNative) {
            console.log('AdManager: Running in web mode (Mock Ads)');
            return;
        }

        try {
            await AdMob.initialize({
                requestTrackingAuthorization: true,
                testingDevices: ['YOUR_TEST_DEVICE_ID'], // Console'da device ID gösterilecek
                initializeForTesting: false, // Production mode - gerçek reklamlar
            });
            console.log('AdManager: AdMob Initialized (Production Mode)');
            console.log('AdManager: Using Ad IDs:', CONFIG.ADS);

            this.setupListeners();
            this.prepareRewarded();
            this.prepareInterstitial();
        } catch (error) {
            console.error('AdManager: Initialization failed', error);
        }
    }

    setupListeners() {
        // --- Rewarded Ads Listeners ---
        AdMob.addListener(RewardAdPluginEvents.Loaded, (info) => {
            console.log('AdManager: Rewarded Ad Loaded', info);
            this.rewardedAdLoaded = true;
        });

        AdMob.addListener(RewardAdPluginEvents.FailedToLoad, (error) => {
            console.error('AdManager: Rewarded Ad Failed to Load', error);
            this.rewardedAdLoaded = false;
            setTimeout(() => this.prepareRewarded(), 15000); // Retry later
        });

        AdMob.addListener(RewardAdPluginEvents.FailedToShow, (error) => {
            console.error('AdManager: Failed to Show Rewarded Ad', error);
            if (this.onRewardFail) this.onRewardFail();
            this.cleanupCallbacks();
            gameState.transition(GameStates.GAMEOVER);
            this.prepareRewarded();
        });

        AdMob.addListener(RewardAdPluginEvents.Dismissed, () => {
            console.log('AdManager: Rewarded Ad Dismissed');
            // Check if user dismissed without earning reward (fail state)
            if (this.onRewardFail) {
                this.onRewardFail();
                this.cleanupCallbacks();
                gameState.transition(GameStates.GAMEOVER);
            }
            this.prepareRewarded();
        });

        AdMob.addListener(RewardAdPluginEvents.Rewarded, (reward) => {
            console.log('AdManager: User Earned Reward', reward);
            if (this.onRewardSuccess) {
                this.onRewardSuccess();
                this.onRewardSuccess = null; // Prevent double trigger
                this.onRewardFail = null; // Clear fail callback
            }
        });

        // --- Interstitial Ads Listeners ---
        AdMob.addListener(InterstitialAdPluginEvents.Loaded, (info) => {
            console.log('AdManager: Interstitial Ad Loaded', info);
            this.interstitialAdLoaded = true;
        });

        AdMob.addListener(InterstitialAdPluginEvents.FailedToLoad, (error) => {
            console.error('AdManager: Interstitial Ad Failed to Load', error);
            this.interstitialAdLoaded = false;
            setTimeout(() => this.prepareInterstitial(), 15000); // Retry later
        });

        AdMob.addListener(InterstitialAdPluginEvents.Dismissed, () => {
            console.log('AdManager: Interstitial Dismissed');
            if (this.onInterstitialDismiss) {
                this.onInterstitialDismiss();
                this.onInterstitialDismiss = null;
            }
            this.prepareInterstitial();
        });

        AdMob.addListener(InterstitialAdPluginEvents.FailedToShow, (error) => {
            console.error('AdManager: Failed to Show Interstitial', error);
            // If failed, proceed as if dismissed to not block user
            if (this.onInterstitialDismiss) {
                this.onInterstitialDismiss();
                this.onInterstitialDismiss = null;
            }
            this.prepareInterstitial();
        });
    }

    // --- REWARDED ADS METHODS ---
    async prepareRewarded() {
        if (!this.isNative) return;
        try {
            await AdMob.prepareRewardVideoAd({ adId: CONFIG.ADS.REWARDED });
            console.log('AdManager: Preparing Rewarded Ad...');
        } catch (error) {
            console.error('AdManager: Prepare Rewarded Failed', error);
        }
    }

    showRewarded(onSuccess, onFail) {
        console.log('AdManager: Requesting Rewarded Ad...');
        gameState.transition(GameStates.REWARDED_AD);

        this.onRewardSuccess = onSuccess;
        this.onRewardFail = onFail;

        if (!this.isNative) {
            this.showMockAd(true, onSuccess, onFail);
            return;
        }

        if (this.rewardedAdLoaded) {
            AdMob.showRewardVideoAd().catch(error => {
                console.error('AdManager: Show Rewarded Error', error);
                if (onFail) onFail();
                gameState.transition(GameStates.GAMEOVER);
            });
        } else {
            console.warn('AdManager: Rewarded Ad not ready');
            // Can try to load and show, or just fail safely
            this.prepareRewarded();
            // Fallback for better UX
            setTimeout(() => {
                if (onFail) onFail();
                gameState.transition(GameStates.GAMEOVER);
            }, 500);
        }
    }

    // --- INTERSTITIAL ADS METHODS ---
    async prepareInterstitial() {
        if (!this.isNative) return;
        try {
            await AdMob.prepareInterstitial({ adId: CONFIG.ADS.INTERSTITIAL });
            console.log('AdManager: Preparing Interstitial Ad...');
        } catch (error) {
            console.error('AdManager: Prepare Interstitial Failed', error);
        }
    }

    showInterstitial(onDismiss) {
        console.log('AdManager: Requesting Interstitial Ad...');
        this.onInterstitialDismiss = onDismiss;

        if (!this.isNative) {
            this.showMockAd(false, null, null, onDismiss); // Interstitial mock
            return;
        }

        if (this.interstitialAdLoaded) {
            AdMob.showInterstitial().catch(error => {
                console.error('AdManager: Show Interstitial Error', error);
                // If error, proceed game
                if (onDismiss) onDismiss();
            });
        } else {
            console.log('AdManager: Interstitial not ready, skipping...');
            // If not ready, don't block the user, just continue
            if (onDismiss) onDismiss();
            this.prepareInterstitial();
        }
    }

    // --- MOCK ADS ---
    showMockAd(isRewarded, onSuccess, onFail, onDismiss) {
        // Show spinner / mock UI
        if (isRewarded) {
            // UI logic is handled by game state REWARDED_AD in UIManager
        } else {
            // For interstitial mock, we might want a quick overlay or just log
            console.log('AdManager: Showing Mock Interstitial...');
        }

        setTimeout(() => {
            if (isRewarded) {
                const success = true;
                if (success && onSuccess) onSuccess();
                else if (!success && onFail) onFail();
            } else {
                // Interstitial
                if (onDismiss) onDismiss();
            }
        }, 1000);
    }

    handleContinue() {
        if (this.usedContinueThisRun) return;

        this.showRewarded(
            () => {
                this.usedContinueThisRun = true;
                this.game.continueGame();
            },
            () => {
                gameState.transition(GameStates.GAMEOVER);
            }
        );
    }

    cleanupCallbacks() {
        this.onRewardSuccess = null;
        this.onRewardFail = null;
    }

    reset() {
        this.usedContinueThisRun = false;
    }
}
