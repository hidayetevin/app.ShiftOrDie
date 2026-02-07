import { gameState, GameStates } from '../core/GameState';

export class ErrorManager {
    constructor(game) {
        this.game = game;
        this.init();
    }

    init() {
        window.addEventListener('error', (event) => {
            console.error('Runtime error:', event.error);
            if (this.isCriticalError(event.error)) {
                this.handleCriticalError(event.error);
            }
            event.preventDefault();
        });

        window.addEventListener('unhandledrejection', (event) => {
            console.error('Unhandled promise rejection:', event.reason);
            if (this.isCriticalError(event.reason)) {
                this.handleCriticalError(event.reason);
            }
            event.preventDefault();
        });

        // WebGL Context Loss Handling (Analysis §22)
        const canvas = this.game.renderer.domElement;
        canvas.addEventListener('webglcontextlost', (event) => {
            event.preventDefault();
            console.warn('WebGL context lost');
            this.handleCriticalError({ message: 'Graphics context lost. Reloading...' });

            setTimeout(() => {
                window.location.reload();
            }, 2000);
        });
    }

    isCriticalError(error) {
        const criticalPatterns = [
            'WebGL',
            'Cannot read property',
            'is not a function',
            'Maximum call stack',
            'Out of memory'
        ];
        const errorMessage = error?.message || String(error);
        return criticalPatterns.some(pattern => errorMessage.includes(pattern));
    }

    handleCriticalError(error) {
        // Pause game immediately
        if (gameState.currentState === GameStates.PLAYING) {
            gameState.transition(GameStates.PAUSED);
        }

        this.showErrorModal(error);
    }

    showErrorModal(error) {
        const uiRoot = document.getElementById('ui-root');
        const modal = document.createElement('div');
        modal.className = 'ui-modal critical-error';
        modal.innerHTML = `
            <div class="modal-content">
                <h2 style="color: #ff4444;">⚠️ ERROR</h2>
                <p>Something went wrong.</p>
                <p style="font-size: 0.8rem; opacity: 0.7; margin: 10px 0;">${error?.message || 'Unknown error'}</p>
                <div class="menu-buttons">
                    <button id="btn-reload" class="btn-main">Restart Game</button>
                    <button id="btn-to-menu">Return to Menu</button>
                </div>
            </div>
        `;
        uiRoot.appendChild(modal);

        document.getElementById('btn-reload').onclick = () => window.location.reload();
        document.getElementById('btn-to-menu').onclick = () => {
            this.game.resetGame();
            gameState.transition(GameStates.MENU);
            modal.remove();
        };
    }
}
