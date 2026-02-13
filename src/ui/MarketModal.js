import { marketManager } from '../systems/MarketManager';
import { WEAPON_CONFIG, SKIN_CONFIG } from '../systems/WeaponConfig';
import { i18n } from '../systems/I18n';

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
                    <h2>${i18n.t('market.title')}</h2>
                    <button class="btn-close">X</button>
                </div>
                
                <div class="market-tabs">
                    <button class="tab-btn ${this.currentTab === 'skins' ? 'active' : ''}" data-tab="skins">${i18n.t('market.skins')}</button>
                    <button class="tab-btn ${this.currentTab === 'weapons' ? 'active' : ''}" data-tab="weapons">${i18n.t('market.weapons')}</button>
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
            SKIN_CONFIG.forEach((skin, index) => {
                const price = index === 0 ? 0 : 30 + (index - 1) * 10;
                const isOwned = this.game.progression.isSkinOwned(skin.id);
                const isSelected = marketManager.getSelectedSkin() === skin.id;

                const item = document.createElement('div');
                item.className = `market-item ${isSelected ? 'selected' : ''}`;

                let btnText = '';
                let isDisabled = false;

                if (isSelected) {
                    btnText = i18n.t('market.equipped');
                    isDisabled = true;
                } else if (isOwned) {
                    btnText = i18n.t('market.select');
                } else {
                    btnText = `🪙 ${price}`;
                }

                item.innerHTML = `
                    <div class="item-preview skin-preview">
                        <img src="models/md2/ratamahatta/skins/Shop/${skin.shop}" style="width: 100%; height: 100%; object-fit: cover;">
                    </div>
                    <div class="item-info">
                        <h3>${skin.name}</h3>
                        <div class="stat-health">${i18n.t('market.protection')}: ${skin.health}</div>
                        <button class="btn-select" data-id="${skin.id}" data-price="${price}" data-type="skin" ${isDisabled ? 'disabled' : ''}>
                            ${btnText}
                        </button>
                    </div>  
                `;
                grid.appendChild(item);
            });
        } else {
            WEAPON_CONFIG.forEach((weapon, index) => {
                const price = index === 0 ? 0 : 30 + (index - 1) * 10;
                const isOwned = this.game.progression.isWeaponOwned(weapon.id);
                const isSelected = marketManager.getSelectedWeapon() === weapon.id;

                const item = document.createElement('div');
                item.className = `market-item ${isSelected ? 'selected' : ''}`;

                let btnText = '';
                let isDisabled = false;

                if (isSelected) {
                    btnText = i18n.t('market.equipped');
                    isDisabled = true;
                } else if (isOwned) {
                    btnText = i18n.t('market.select');
                } else {
                    btnText = `🪙 ${price}`;
                }

                item.innerHTML = `
                    <div class="item-preview weapon-preview">
                        <img src="models/md2/ratamahatta/Weapons/${weapon.shop}" style="width: 100%;  object-fit: contain;">
                    </div>
                    <div class="item-info">
                        <h3>${weapon.name}</h3>
                        <div class="stat-damage">${i18n.t('market.dmg')}: ${weapon.damage}</div>
                        <button class="btn-select" data-id="${weapon.id}" data-price="${price}" data-type="weapon" ${isDisabled ? 'disabled' : ''}>
                            ${btnText}
                        </button>
                    </div>
                `;
                grid.appendChild(item);
            });
        }

        // Attach select/buy events
        grid.querySelectorAll('.btn-select').forEach(btn => {
            btn.onclick = () => {
                const id = btn.getAttribute('data-id');
                const type = btn.getAttribute('data-type');
                const price = parseInt(btn.getAttribute('data-price'));

                let isOwned = false;
                if (type === 'skin') isOwned = this.game.progression.isSkinOwned(id);
                if (type === 'weapon') isOwned = this.game.progression.isWeaponOwned(id);

                if (!isOwned) {
                    // Attempt Purchase
                    let success = false;
                    if (type === 'skin') success = this.game.progression.buySkin(id, price);
                    if (type === 'weapon') success = this.game.progression.buyWeapon(id, price);

                    if (success) {
                        this.renderItems();
                        // Trigger manual coin refresh in main menu
                        const menuCoins = document.querySelector('.stats-top span:first-child');
                        if (menuCoins) menuCoins.innerHTML = `🪙 ${this.game.progression.data.total_coins}`;

                        if (this.game.ui) {
                            this.game.ui.showNotification(i18n.t('market.purchase_success'), 'success');
                        }
                    } else {
                        if (this.game.ui) {
                            this.game.ui.showNotification(i18n.t('market.insufficient_coins'), 'error');
                        }
                    }
                } else {
                    // Select Item
                    if (type === 'skin') {
                        marketManager.selectSkin(id);
                        if (this.game && this.game.player) {
                            const skin = SKIN_CONFIG.find(s => s.id === id);
                            const idx = marketManager.getSkinIndex(id);

                            if (this.game.player.character) {
                                this.game.player.character.setSkin(idx);
                            }
                            if (skin && skin.health) {
                                this.game.player.maxHealth = skin.health;
                                this.game.player.health = skin.health;
                                if (this.game.ui) this.game.ui.updateHealth(skin.health, skin.health);
                            }
                        }
                    } else {
                        marketManager.selectWeapon(id);
                        if (this.game && this.game.player) {
                            const idx = marketManager.getWeaponIndex(id);
                            if (this.game.player.character) {
                                this.game.player.character.setWeapon(idx);
                            }
                        }
                    }
                    this.renderItems();
                }
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
