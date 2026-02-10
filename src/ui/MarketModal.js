import { marketManager } from '../systems/MarketManager';
import { WEAPON_CONFIG, SKIN_CONFIG } from '../systems/WeaponConfig';

export class MarketModal {
    constructor(game, onClose) {
        this.game = game;
        this.onClose = onClose; // Callback when closed
        this.root = document.createElement('div');
        this.root.className = 'ui-modal market-modal';
        this.currentTab = 'skins'; // 'skins' or 'weapons'

        this.init();
    }

    init() {
        this.render();
        document.body.appendChild(this.root);
    }

    render() {
        this.root.innerHTML = `
            <div class="modal-content market-content">
                <div class="market-header">
                    <h2>MARKET</h2>
                    <button class="btn-close">X</button>
                </div>
                
                <div class="market-tabs">
                    <button class="tab-btn ${this.currentTab === 'skins' ? 'active' : ''}" data-tab="skins">SKINS</button>
                    <button class="tab-btn ${this.currentTab === 'weapons' ? 'active' : ''}" data-tab="weapons">WEAPONS</button>
                </div>

                <div class="market-grid" id="market-grid">
                    <!-- Items rendered here -->
                </div>
            </div>
        `;

        this.renderItems();
        this.attachEvents();
    }

    renderItems() {
        const grid = this.root.querySelector('#market-grid');
        grid.innerHTML = '';

        if (this.currentTab === 'skins') {
            SKIN_CONFIG.forEach(skin => {
                const isSelected = marketManager.getSelectedSkin() === skin.id;
                const item = document.createElement('div');
                item.className = `market-item ${isSelected ? 'selected' : ''}`;
                item.innerHTML = `
                    <div class="item-preview skin-preview">
                        <img src="models/md2/ratamahatta/skins/Shop/${skin.shop}" style="width: 100%; height: 100%; object-fit: cover;">
                    </div>
                    <div class="item-info">
                        <h3>${skin.name}</h3>
                        <button class="btn-select" data-id="${skin.id}" ${isSelected ? 'disabled' : ''}>
                            ${isSelected ? 'EQUIPPED' : 'SELECT'}
                        </button>
                    </div>
                `;
                grid.appendChild(item);
            });
        } else {
            WEAPON_CONFIG.forEach(weapon => {
                const isSelected = marketManager.getSelectedWeapon() === weapon.id;
                const item = document.createElement('div');
                item.className = `market-item ${isSelected ? 'selected' : ''}`;
                item.innerHTML = `
                    <div class="item-preview weapon-preview">
                        <img src="models/md2/ratamahatta/Weapons/${weapon.shop}" style="width: 100%; height: 100%; object-fit: cover;">
                    </div>
                    <div class="item-info">
                        <h3>${weapon.name}</h3>
                        <div class="stat-damage">DMG: ${weapon.damage}</div>
                        <button class="btn-select" data-id="${weapon.id}" ${isSelected ? 'disabled' : ''}>
                            ${isSelected ? 'EQUIPPED' : 'SELECT'}
                        </button>
                    </div>
                `;
                grid.appendChild(item);
            });
        }

        // Attach select events
        grid.querySelectorAll('.btn-select').forEach(btn => {
            btn.onclick = () => {
                const id = btn.getAttribute('data-id');
                if (this.currentTab === 'skins') {
                    marketManager.selectSkin(id);
                    // Update Player Immediately if possible
                    if (this.game && this.game.player) {
                        const idx = marketManager.getSkinIndex(id);
                        if (this.game.player.character) {
                            this.game.player.character.setSkin(idx);
                            console.log('Skin updated to', id);
                        }
                    }
                } else {
                    marketManager.selectWeapon(id);
                    // Update Player Immediately
                    if (this.game && this.game.player) {
                        const idx = marketManager.getWeaponIndex(id);
                        if (this.game.player.character) {
                            this.game.player.character.setWeapon(idx);
                            console.log('Weapon updated to', id);
                        }
                    }
                }
                this.renderItems(); // Re-render to update buttons
            };
        });
    }

    attachEvents() {
        this.root.querySelector('.btn-close').onclick = () => {
            this.root.remove();
            if (this.onClose) this.onClose();
        };

        this.root.querySelectorAll('.tab-btn').forEach(btn => {
            btn.onclick = () => {
                this.currentTab = btn.getAttribute('data-tab');
                this.render(); // Re-render full view
            };
        });
    }
}
