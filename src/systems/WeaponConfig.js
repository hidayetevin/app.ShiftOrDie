export const WEAPON_CONFIG = [
    { id: 'w_machinegun', name: 'Machine Gun', model: 'w_machinegun', damage: 1, color: 0x0000ff, type: 'sphere', shop: '1.jpg' },
    { id: 'w_blaster', name: 'Blaster', model: 'w_blaster', damage: 2, color: 0x00ff00, type: 'sphere', shop: '2.jpg' },
    { id: 'w_chaingun', name: 'Chain Gun', model: 'w_chaingun', damage: 3, color: 0xffff00, type: 'sphere', shop: '3.jpg' },
    { id: 'w_glauncher', name: 'Grenade Launcher', model: 'w_glauncher', damage: 4, color: 0xff0000, type: 'sphere', shop: '4.jpg' },
    { id: 'w_hyperblaster', name: 'Hyper Blaster', model: 'w_hyperblaster', damage: 5, color: 0xff00ff, type: 'sphere', shop: '5.jpg' },
    { id: 'w_railgun', name: 'Railgun', model: 'w_railgun', damage: 6, color: 0x0000ff, type: 'laser', shop: '6.jpg' },
    { id: 'w_rlauncher', name: 'Rocket Launcher', model: 'w_rlauncher', damage: 7, color: 0x00ff00, type: 'laser', shop: '7.jpg' },
    { id: 'w_shotgun', name: 'Shotgun', model: 'w_shotgun', damage: 8, color: 0xffff00, type: 'laser', shop: '8.jpg' },
    { id: 'w_sshotgun', name: 'Super Shotgun', model: 'w_sshotgun', damage: 9, color: 0xff0000, type: 'laser', shop: '9.jpg' },
    { id: 'weapon', name: 'Plasma Gun', model: 'weapon', damage: 10, color: 0xff00ff, type: 'laser', shop: '10.jpg' },
    { id: 'w_bfg', name: 'BFG 9000', model: 'w_bfg', damage: 11, color: 0xff0000, type: 'laser', shop: '11.jpg' } // One-shot kill
];

export const SKIN_CONFIG = [
    { id: 'ratamahatta', name: 'Ratamahatta', texture: 'ratamahatta.png', shop: 'ratamahatta.jpg', health: 2 },
    { id: 'ctf_b', name: 'Blue Team', texture: 'ctf_b.png', shop: 'ctf_b.jpg', health: 3 },
    { id: 'ctf_r', name: 'Red Team', texture: 'ctf_r.png', shop: 'ctf_r.jpg', health: 3 },
    { id: 'dead', name: 'Undead', texture: 'dead.png', shop: 'dead.jpg', health: 4 },
    { id: 'gearwhore', name: 'Gearwhore', texture: 'gearwhore.png', shop: 'gearwhore.jpg', health: 5 }
];

export const getWeaponById = (id) => WEAPON_CONFIG.find(w => w.id === id);
export const getSkinById = (id) => SKIN_CONFIG.find(s => s.id === id);
