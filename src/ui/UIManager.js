import { gameState, GameStates } from '../core/GameState';
import { CONFIG } from '../core/Config';
import { i18n } from '../systems/I18n';
import { MarketModal } from './MarketModal';

export class UIManager {
    constructor(game) {
        this.game = game;
        this.root = document.getElementById('ui-root');

        this.init();
    }

    init() {
        gameState.onStateChange((newState) => this.render(newState));
        this.render(gameState.currentState);
    }

    render(state) {
        this.root.innerHTML = '';
        this.root.className = `state-${state}`;

        switch (state) {
            case GameStates.MENU: this.renderMenu(); break;
            case GameStates.PLAYING: this.renderHUD(); break;
            case GameStates.PAUSED: this.renderPauseMenu(); break;
            case GameStates.GAMEOVER: this.renderGameOver(); break;
            case GameStates.LOADING: this.renderLoading(); break;
            case GameStates.REWARDED_AD: this.renderAdState(); break;
        }
    }

    showNotification(message, type = 'info') {
        const div = document.createElement('div');
        div.className = `ui-notification ${type}`;
        div.innerHTML = `<span>${message}</span>`;

        // Append to body to ensure it's on top of everything including modals
        document.body.appendChild(div);

        // Trigger animation
        requestAnimationFrame(() => {
            div.classList.add('show');
        });

        // Remove after delay
        setTimeout(() => {
            div.classList.remove('show');
            setTimeout(() => div.remove(), 300);
        }, 2000);
    }

    renderLoading() {
        const div = document.createElement('div');
        div.className = 'ui-screen loading-screen';
        div.innerHTML = `
            <h1>SHIFT OR DIE</h1>
            <div class="progress-bar"><div class="fill"></div></div>
            <p>Loading...</p>
        `;
        this.root.appendChild(div);
    }

    renderMenu() {
        const div = document.createElement('div');
        div.className = 'ui-screen menu-screen';

        // Settings button alone at top-left
        const settingsIcon = '⚙️';

        div.innerHTML = `
            <button id="btn-settings" class="btn-settings-icon">${settingsIcon}</button>
            <div class="stats-top">
                <span>🪙 ${this.game.progression.data.total_coins}</span>
                <span>🏆 ${this.game.score.highScore}</span>
            </div>
            
            <p class="game-title">RUN OR DIE</p>
            
            <div class="menu-bottom-container">
                <button id="btn-play" class="btn-primary-large">${i18n.t('menu.play')}</button>
                <div class="menu-row-sub">
                    <button id="btn-tasks" class="btn-secondary">${i18n.t('menu.daily_tasks')}</button>
                    <button id="btn-market" class="btn-secondary">${i18n.t('menu.market')}</button>
                </div>
            </div>
        `;
        this.root.appendChild(div);

        document.getElementById('btn-play').onclick = () => this.game.startGameWithLoading();
        document.getElementById('btn-tasks').onclick = () => this.renderTasks();
        document.getElementById('btn-settings').onclick = () => this.renderSettings();
        document.getElementById('btn-market').onclick = () => new MarketModal(this.game);
    }

    renderHUD() {
        const div = document.createElement('div');
        div.className = 'ui-screen hud-screen';
        div.innerHTML = `
            <div class="hud-top">
                <div class="hud-info">
                    <span id="hud-coins">🪙 0</span>
                    <span id="hud-score-small">0</span>
                </div>
                <div class="hud-health">
                    <span id="health-text">❤️ 10</span>
                    <div id="health-segments" class="health-segments-container"></div>
                </div>
                <button id="btn-pause">||</button>
            </div>
            <div id="hud-combo" class="combo-indicator"></div>
            <div id="hud-rule" class="rule-icon">
                <p id="rule-text"></p>
            </div>
        `;
        this.root.appendChild(div);
        document.getElementById('btn-pause').onclick = () => gameState.transition(GameStates.PAUSED);

        this.scoreUpdateInterval = setInterval(() => {
            if (gameState.currentState !== GameStates.PLAYING) {
                clearInterval(this.scoreUpdateInterval);
                return;
            }
            const coinsEl = document.getElementById('hud-coins');
            if (coinsEl) {
                coinsEl.innerHTML = `🪙 ${this.game.progression.coinsEarnedThisRun}`;
            }

            const scoreEl = document.getElementById('hud-score-small');
            if (scoreEl) {
                scoreEl.innerText = Math.floor(this.game.score.currentScore);
            }

            const ruleTextEl = document.getElementById('rule-text');
            if (ruleTextEl) ruleTextEl.innerText = this.game.rule.currentRule.label;

            const comboEl = document.getElementById('hud-combo');
            if (comboEl) {
                if (this.game.score.multiplier > 1) {
                    comboEl.innerText = `COMBO x${this.game.score.multiplier} 🔥`;
                    comboEl.style.display = 'block';
                } else {
                    comboEl.style.display = 'none';
                }
            }
        }, 100);
    }

    updateHealth(current, max) {
        const healthText = document.getElementById('health-text');
        const segmentsContainer = document.getElementById('health-segments');

        if (healthText) healthText.innerText = `❤️ ${current}/${max}`;

        if (segmentsContainer) {
            segmentsContainer.innerHTML = ''; // Clear

            // Create segments
            for (let i = 0; i < max; i++) {
                const seg = document.createElement('div');
                seg.className = 'health-segment';
                if (i < current) {
                    seg.classList.add('active');
                } else {
                    seg.classList.add('empty');
                }
                segmentsContainer.appendChild(seg);
            }
        }
    }

    renderGameOver() {
        const div = document.createElement('div');
        div.className = 'ui-screen gameover-screen';

        const finalScore = this.game.score.handleGameOver();
        const isNewRecord = this.game.score.isNewRecord;
        const canContinue = !this.game.ads.usedContinueThisRun;
        const highScore = this.game.score.highScore;
        const coinsEarned = this.game.progression.coinsEarnedThisRun;
        const doubleClaimed = this.game.progression.doubleRewardClaimed;

        // Determine which primary action to show
        let primaryActionHTML = '';
        if (canContinue) {
            primaryActionHTML = `
                <button id="btn-continue" class="btn-continue-ad">
                    ${i18n.t('game.watch_continue')} <span class="ad-icon">📺</span>
                </button>`;
        } else if (!doubleClaimed) {
            const isZero = coinsEarned === 0;
            primaryActionHTML = `
                <button id="btn-double-coins" class="btn-primary-large" 
                    style="${isZero ? 'background: #333; color: #777; border: 1px solid #444; cursor: not-allowed;' : 'background: linear-gradient(45deg, #ffd700, #ffaa00); color: black; border:none; box-shadow: 0 0 15px rgba(255, 215, 0, 0.5);'}"
                    ${isZero ? 'disabled' : ''}>
                    ${isZero ? 'NO COINS' : `📺 ${i18n.t('game.watch_2x')}`}
                </button>`;
        } else if (doubleClaimed) {
            primaryActionHTML = `
                <div style="margin-bottom:20px; color:#ffd700; font-weight:bold; text-shadow:0 0 10px rgba(255,215,0,0.5);">
                     ✨ ${i18n.t('game.claimed_2x')} ✨
                </div>`;
        }
        // Removed 'No Continues Left' else block

        div.innerHTML = `
            ${isNewRecord ? `<h2 class="new-record" style="color:var(--accent); text-shadow:0 0 20px var(--accent); margin-bottom:10px;">${i18n.t('game.new_record')}</h2>` : ''}
            
            <h1 style="font-size: 3rem; margin-bottom: 20px;">${i18n.t('game.game_over')}</h1>
            
            <div class="game-over-scores">
                <div class="score-box">
                    <span class="score-label">${i18n.t('game.your_score')}</span>
                    <span class="score-value highlight">${finalScore.toLocaleString()}</span>
                </div>
                
                <div class="score-box" style="margin-top:10px; background: rgba(255, 215, 0, 0.1); border: 1px solid rgba(255, 215, 0, 0.3);">
                    <span class="score-label" style="color: #ffd700;">${i18n.t('game.earned_coins')}</span>
                    <span class="score-value" style="color: #ffd700;">🪙 ${coinsEarned}</span>
                </div>

                <div class="high-score-display">
                    <span class="score-label" style="font-size:0.8rem; margin:0;">${i18n.t('game.high_score')}:</span>
                    <span class="high-score-val">${highScore.toLocaleString()}</span>
                </div>
            </div>

            <div class="menu-buttons" style="width: 100%; max-width: 300px;">
                ${primaryActionHTML}
                
                <div id="secondary-actions" class="secondary-actions">
                    <button id="btn-restart" class="btn-primary-large" style="height: 60px; font-size: 1.2rem;">${i18n.t('game.restart')}</button>
                    <button id="btn-menu" class="btn-secondary" style="height: 50px;">${i18n.t('game.quit')}</button>
                </div>
            </div>
        `;
        this.root.appendChild(div);

        // Continue Button Event
        const continueBtn = document.getElementById('btn-continue');
        if (continueBtn) {
            continueBtn.onclick = () => this.game.ads.handleContinue();
        }

        // Double Coins Button Event
        const doubleBtn = document.getElementById('btn-double-coins');
        if (doubleBtn) {
            doubleBtn.onclick = () => {
                this.game.ads.showRewarded(
                    () => {
                        // Success
                        this.game.progression.doubleCoinsForRun();
                        gameState.transition(GameStates.GAMEOVER); // Re-render to show updated state
                    },
                    () => {
                        // Fail
                        gameState.transition(GameStates.GAMEOVER); // Return to game over anyway
                    }
                );
            };
        }

        // Reveal secondary buttons after 2 seconds
        setTimeout(() => {
            const secActions = document.getElementById('secondary-actions');
            if (secActions) {
                secActions.classList.add('visible');
            }
        }, 2000);

        // Secondary buttons events
        const btnRestart = document.getElementById('btn-restart');
        const btnMenu = document.getElementById('btn-menu');

        if (btnRestart) btnRestart.onclick = () => gameState.transition(GameStates.PLAYING);
        if (btnMenu) btnMenu.onclick = () => gameState.transition(GameStates.MENU);
    }

    renderTasks() {
        const div = document.createElement('div');
        div.className = 'ui-modal';
        div.innerHTML = `
            <div class="modal-content">
                <h2>${i18n.t('tasks.daily_tasks')}</h2>
                <button class="btn-close">X</button>
                <p class="reset-timer">Resets in: ${this.game.progression.getTimeUntilReset()}</p>
                <div class="tasks-list">
                    ${this.game.progression.data.daily_tasks.map(t => {
            let label = t.label;
            if (t.id === 'survive_30') label = i18n.t('tasks.survive', { time: t.target });
            if (t.id === 'shifts_50') label = i18n.t('tasks.shifts', { count: t.target });
            if (t.id === 'perfect_10') label = i18n.t('tasks.perfect', { count: t.target });

            return `
                        <div class="task-item">
                            <p>${label}</p>
                            <div class="progress-bar mini">
                                <div class="fill" style="width: ${(Math.min(t.progress, t.target) / t.target) * 100}%"></div>
                            </div>
                            ${t.completed && !t.claimed ? `<button class="btn-claim" data-id="${t.id}">${i18n.t('tasks.claim')} ${t.reward}🪙</button>` : ''}
                            ${t.claimed ? '<span>CLAIMED ✓</span>' : ''}
                        </div>`;
        }).join('')}
                </div>
            </div>
        `;
        this.root.appendChild(div);

        div.querySelector('.btn-close').onclick = () => div.remove();
        div.querySelectorAll('.btn-claim').forEach(btn => {
            btn.onclick = () => {
                const id = btn.getAttribute('data-id');
                this.game.progression.claimReward(id);
                div.remove();
                this.renderTasks();
                this.render(gameState.currentState);
            };
        });
    }

    renderStyles() {
        const div = document.createElement('div');
        div.className = 'ui-modal';
        const styles = [
            { id: 'neon', name: 'Neon Cyber', price: 0 },
            { id: 'minimal', name: 'Minimal Flat', price: 300 },
            { id: 'arcade', name: 'Stylized Arcade', price: 500 }
        ];

        div.innerHTML = `
            <div class="modal-content">
                <h2>SELECT STYLE</h2>
                <button class="btn-close">X</button>
                <div class="styles-list">
                    ${styles.map(s => {
            const isUnlocked = this.game.progression.data.unlocked_styles.includes(s.id);
            const isSelected = this.game.progression.data.selected_style === s.id;
            return `
                        <div class="style-item ${isSelected ? 'selected' : ''}">
                            <div class="style-preview ${s.id}"></div>
                            <p>${s.name}</p>
                            ${isUnlocked ?
                    `<button class="btn-apply" data-id="${s.id}" ${isSelected ? 'disabled' : ''}>${isSelected ? 'SELECTED' : 'APPLY'}</button>` :
                    `<button class="btn-unlock" data-id="${s.id}" data-price="${s.price}">${s.price}🪙</button>`
                }
                        </div>`;
        }).join('')}
                </div>
            </div>
        `;
        this.root.appendChild(div);

        div.querySelector('.btn-close').onclick = () => div.remove();
        div.querySelectorAll('.btn-apply').forEach(btn => {
            btn.onclick = () => {
                const id = btn.getAttribute('data-id');
                this.game.style.applyStyle(id);
                div.remove();
                this.renderStyles();
            };
        });
        div.querySelectorAll('.btn-unlock').forEach(btn => {
            btn.onclick = () => {
                const id = btn.getAttribute('data-id');
                const price = parseInt(btn.getAttribute('data-price'));
                if (this.game.progression.unlockStyle(id, price)) {
                    this.renderStyles();
                    this.render(gameState.currentState); // refresh coin display
                } else {
                    this.showNotification('Not enough coins!', 'error');
                }
            };
        });
    }

    renderSettings() {
        const div = document.createElement('div');
        div.className = 'ui-screen'; // Use full screen overlay for positioning
        div.style.background = 'rgba(0,0,0,0.5)'; // Darken background

        div.innerHTML = `
            <div class="settings-modal">
                <div class="settings-header">
                    <h2>${i18n.t('menu.settings')}</h2>
                    <button class="btn-close">X</button>
                </div>
                
                <div class="settings-list">
                    <!-- Music Setting -->
                    <div class="setting-item">
                        <span>${i18n.t('settings.music')}</span>
                        <div id="toggle-music" class="toggle-btn ${this.game.audio.settings.music ? 'active' : ''}">
                            <div class="toggle-knob"></div>
                        </div>
                    </div>
                    
                    <!-- SFX Setting -->
                    <div class="setting-item">
                        <span>${i18n.t('settings.sfx')}</span>
                        <div id="toggle-sfx" class="toggle-btn ${this.game.audio.settings.sfx ? 'active' : ''}">
                            <div class="toggle-knob"></div>
                        </div>
                    </div>
                    
                    <!-- Language Setting -->
                    <div class="setting-item">
                        <span>${i18n.t('settings.language')}</span>
                        <select id="select-lang" class="lang-select">
                            <option value="en" ${i18n.currentLang === 'en' ? 'selected' : ''}>English</option>
                            <option value="tr" ${i18n.currentLang === 'tr' ? 'selected' : ''}>Türkçe</option>
                        </select>
                    </div>
                </div>
            </div>
        `;
        this.root.appendChild(div);

        // Music Toggle Event
        const musicBtn = div.querySelector('#toggle-music');
        musicBtn.onclick = () => {
            this.game.audio.toggleMusic();
            musicBtn.classList.toggle('active');
        };

        // SFX Toggle Event
        const sfxBtn = div.querySelector('#toggle-sfx');
        sfxBtn.onclick = () => {
            this.game.audio.toggleSFX();
            sfxBtn.classList.toggle('active');
        };

        // Language Change Event
        div.querySelector('#select-lang').onchange = (e) => {
            i18n.setLanguage(e.target.value);
            div.remove(); // Close modal and re-render everything
            this.render(gameState.currentState);
            // Re-open settings immediately to show change
            this.renderSettings();
        };

        // Close Button Event
        div.querySelector('.btn-close').onclick = () => div.remove();

        // Click outside to close
        div.onclick = (e) => {
            if (e.target === div) div.remove();
        }
    }

    renderPauseMenu() {
        const div = document.createElement('div');
        div.className = 'ui-screen pause-screen';
        div.innerHTML = `
            <h1>${i18n.t('game.paused')}</h1>
            <div class="menu-buttons">
                <button id="btn-continue-game" class="btn-main">${i18n.t('game.continue')}</button>
                <button id="btn-restart-paused">${i18n.t('game.restart')}</button>
                <button id="btn-quit">${i18n.t('game.quit')}</button>
            </div>
        `;
        this.root.appendChild(div);

        document.getElementById('btn-continue-game').onclick = () => gameState.transition(GameStates.PLAYING);
        document.getElementById('btn-restart-paused').onclick = () => {
            this.game.resetGame();
            gameState.transition(GameStates.PLAYING);
        };
        document.getElementById('btn-quit').onclick = () => gameState.transition(GameStates.MENU);
    }

    renderAdState() {
        const div = document.createElement('div');
        div.className = 'ui-screen ad-screen';
        div.innerHTML = `
            <div class="ad-mock">
                <p>WATCHING AD...</p>
                <div class="spinner"></div>
            </div>
        `;
        this.root.appendChild(div);
    }
}
