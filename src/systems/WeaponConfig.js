export const WEAPON_CONFIG = [
    { id: 'w_machinegun', name: 'Machine Gun', model: 'w_machinegun', damage: 1, color: 0x0000ff, type: 'sphere' },
    { id: 'w_blaster', name: 'Blaster', model: 'w_blaster', damage: 2, color: 0x00ff00, type: 'sphere' },
    { id: 'w_chaingun', name: 'Chain Gun', model: 'w_chaingun', damage: 3, color: 0xffff00, type: 'sphere' },
    { id: 'w_glauncher', name: 'Grenade Launcher', model: 'w_glauncher', damage: 4, color: 0xff0000, type: 'sphere' },
    { id: 'w_hyperblaster', name: 'Hyper Blaster', model: 'w_hyperblaster', damage: 5, color: 0xff00ff, type: 'sphere' },
    { id: 'w_railgun', name: 'Railgun', model: 'w_railgun', damage: 6, color: 0x0000ff, type: 'laser' },
    { id: 'w_rlauncher', name: 'Rocket Launcher', model: 'w_rlauncher', damage: 7, color: 0x00ff00, type: 'laser' },
    { id: 'w_shotgun', name: 'Shotgun', model: 'w_shotgun', damage: 8, color: 0xffff00, type: 'laser' },
    { id: 'w_sshotgun', name: 'Super Shotgun', model: 'w_sshotgun', damage: 9, color: 0xff0000, type: 'laser' },
    { id: 'weapon', name: 'Plasma Gun', model: 'weapon', damage: 10, color: 0xff00ff, type: 'laser' },
    { id: 'w_bfg', name: 'BFG 9000', model: 'w_bfg', damage: 11, color: 0xff0000, type: 'laser' } // One-shot kill
];

export const SKIN_CONFIG = [
    { id: 'ratamahatta', name: 'Ratamahatta', texture: 'ratamahatta.png' },
    { id: 'ctf_b', name: 'Blue Team', texture: 'ctf_b.png' },
    { id: 'ctf_r', name: 'Red Team', texture: 'ctf_r.png' },
    { id: 'dead', name: 'Undead', texture: 'dead.png' },
    { id: 'gearwhore', name: 'Gearwhore', texture: 'gearwhore.png' }
];

export const getWeaponById = (id) => WEAPON_CONFIG.find(w => w.id === id);
export const getSkinById = (id) => SKIN_CONFIG.find(s => s.id === id);
