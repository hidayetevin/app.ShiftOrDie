import './style.css';
import { game } from './core/Game';
import { gameState, GameStates } from './core/GameState';

// Initialize Game
console.log('SHIFT OR DIE - Initializing...');

// Simulate loading for now (Analysis §15/16)
setTimeout(() => {
    gameState.transition(GameStates.MENU);
}, 1000);
