import { gameState, GameStates } from '../core/GameState';
import { CONFIG } from '../core/Config';
import { AdMob, RewardAdPluginEvents, AdLoadInfo, AdMobRewardItem } from '@capacitor-community/admob';
import { Capacitor } from '@capacitor/core';

export class AdManager {
    constructor(game) {
        this.game = game;
        this.usedContinueThisRun = false;
        this.isNative = Capacitor.isNativePlatform();
        this.rewardedAdLoaded = false;

        // Callbacks
        this.onRewardSuccess = null;
        this.onRewardFail = null;

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
                // testingDevices: ['YOUR_TEST_DEVICE_ID'], // Add test device ID here if testing on real device
                initializeForTesting: false, // Set to true for test ads without ID
            });
            console.log('AdManager: AdMob Initialized');

            this.setupListeners();
            this.prepareRewarded();
        } catch (error) {
            console.error('AdManager: Initialization failed', error);
        }
    }

    setupListeners() {
        AdMob.addListener(RewardAdPluginEvents.Loaded, (info) => {
            console.log('AdManager: Rewarded Ad Loaded', info);
            this.rewardedAdLoaded = true;
        });

        AdMob.addListener(RewardAdPluginEvents.FailedToLoad, (error) => {
            console.error('AdManager: Rewarded Ad Failed to Load', error);
            this.rewardedAdLoaded = false;
            // Retry loading after delay
            setTimeout(() => this.prepareRewarded(), 10000);
        });

        AdMob.addListener(RewardAdPluginEvents.Showed, () => {
            console.log('AdManager: Rewarded Ad Showed');
        });

        AdMob.addListener(RewardAdPluginEvents.FailedToShow, (error) => {
            console.error('AdManager: Failed to Show Ad', error);
            if (this.onRewardFail) this.onRewardFail();
            this.cleanupCallbacks();
            gameState.transition(GameStates.GAMEOVER);

            // Reload for next time
            this.prepareRewarded();
        });

        AdMob.addListener(RewardAdPluginEvents.Dismissed, () => {
            console.log('AdManager: Ad Dismissed');
            // Check if reward was NOT earned (user closed prematurely)
            // But usually 'Rewarded' event fires before Dismissed if successful.
            // If reward event didn't fire, we can assume failure/cancellation.
            // However, rely on the Rewarded event to trigger success.
            // If Dismissed happens without Reward, we treat it as fail/cancel.

            // Note: We don't trigger Fail here immediately because Rewarded event might be async.
            // But generally, Rewarded comes first.

            // If we haven't triggered success yet, trigger fail
            if (this.onRewardFail) {
                this.onRewardFail();
                this.cleanupCallbacks();
                gameState.transition(GameStates.GAMEOVER);
            }

            // Reload for next time
            this.prepareRewarded();
        });

        AdMob.addListener(RewardAdPluginEvents.Rewarded, (reward) => {
            console.log('AdManager: User Earned Reward', reward);
            if (this.onRewardSuccess) {
                this.onRewardSuccess();
                this.onRewardSuccess = null; // Clear to prevent double call
                this.onRewardFail = null; // Clear fail callback too
            }
            // Game state transition happens in callback or dismissed
        });
    }

    async prepareRewarded() {
        if (!this.isNative) return;

        try {
            await AdMob.prepareRewardVideoAd({
                adId: CONFIG.ADS.REWARDED
            });
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
            // Web Mock Implementation
            this.showMockAd(onSuccess, onFail);
            return;
        }

        if (this.rewardedAdLoaded) {
            AdMob.showRewardVideoAd().catch(error => {
                console.error('AdManager: Show Error', error);
                if (onFail) onFail();
                gameState.transition(GameStates.GAMEOVER);
            });
        } else {
            console.warn('AdManager: Ad not ready, trying to load...');
            this.prepareRewarded().then(() => {
                // Try one more time or just fail
                // For better UX, maybe show spinner then fail
                setTimeout(() => {
                    if (onFail) onFail();
                    gameState.transition(GameStates.GAMEOVER);
                }, 1000);
            });
        }
    }

    showMockAd(onSuccess, onFail) {
        setTimeout(() => {
            try {
                const success = true;
                if (success) {
                    console.log('AdManager: Mock Ad Success!');
                    if (onSuccess) onSuccess();
                } else {
                    console.log('AdManager: Mock Ad Failed');
                    if (onFail) onFail();
                }
            } catch (error) {
                console.error('AdManager Mock Error:', error);
                gameState.transition(GameStates.GAMEOVER);
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
