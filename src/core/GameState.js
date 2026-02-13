export const GameStates = {
    LOADING: 'loading',
    MENU: 'menu',
    PLAYING: 'playing',
    PAUSED: 'paused',
    DYING: 'dying', // Death animation playing, game frozen
    GAMEOVER: 'gameover',
    REWARDED_AD: 'rewarded_ad'
};

class GameStateMachine {
    constructor() {
        this.currentState = GameStates.LOADING;
        this.listeners = [];

        this.validTransitions = {
            [GameStates.LOADING]: [GameStates.MENU],
            [GameStates.MENU]: [GameStates.PLAYING],
            [GameStates.PLAYING]: [GameStates.PAUSED, GameStates.DYING],
            [GameStates.PAUSED]: [GameStates.PLAYING, GameStates.MENU],
            [GameStates.DYING]: [GameStates.GAMEOVER], // Death animation -> Game Over
            [GameStates.GAMEOVER]: [GameStates.PLAYING, GameStates.MENU, GameStates.REWARDED_AD],
            [GameStates.REWARDED_AD]: [GameStates.PLAYING, GameStates.GAMEOVER, GameStates.MENU]
        };
    }

    transition(newState) {
        if (!this.isValidTransition(this.currentState, newState)) {
            console.warn(`Invalid state transition: ${this.currentState} -> ${newState}`);
            return false;
        }

        const oldState = this.currentState;
        this.currentState = newState;

        console.log(`State transition: ${oldState} -> ${newState}`);
        this.notify(newState, oldState);
        return true;
    }

    isValidTransition(from, to) {
        return this.validTransitions[from] && this.validTransitions[from].includes(to);
    }

    onStateChange(callback) {
        this.listeners.push(callback);
    }

    notify(newState, oldState) {
        this.listeners.forEach(callback => callback(newState, oldState));
    }

    reset() {
        this.currentState = GameStates.MENU;
    }
}

export const gameState = new GameStateMachine();
