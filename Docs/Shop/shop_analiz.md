# Market System - Technical Analysis

## Overview
Complete market system replacing "Menu Style" button with customization shop for skins and weapons.

---

## 1. UI Structure

### Main Menu Changes
- **Remove:** "Menu Style" button
- **Add:** "Market" button (same position)

### Market Modal
**Two-Tab System:**
1. **Skins Tab**
2. **Weapons Tab**

**Layout:**
- Grid: 2 columns × N rows
- Each cell: Image + "Select" button
- Responsive modal with close button

---

## 2. Skins System

### Available Skins
1. `ratamahatta` (current/default)
2. `ctf_b`
3. `ctf_r`
4. `dead`
5. `gearwhore`

### Required Assets
**Model Files (.md2):**
- `ctf_b.md2`
- `ctf_r.md2`
- `dead.md2`
- `gearwhore.md2`

**Texture Files (.png):**
- `ctf_b.png`
- `ctf_r.png`
- `dead.png`
- `gearwhore.png`

**Download Locations:**
```
Source: https://github.com/mrdoob/three.js/tree/dev/examples/models/md2/ratamahatta
Target: d:\PROJECTS\app.ShiftOrDie\public\models\md2\ratamahatta\
Target (textures): d:\PROJECTS\app.ShiftOrDie\public\models\md2\ratamahatta\skins\
```

### Functionality
- Click "Select" → Update player skin immediately
- Persist selection to localStorage
- Apply on game start

---

## 3. Weapons System

### Weapon Data Model
```javascript
{
  id: string,           // e.g., "w_machinegun"
  name: string,         // Display name
  model: string,        // Model file without extension
  bulletColor: number,  // Hex color
  bulletType: string,   // "sphere" | "laser"
  damage: number        // Hit value (1-11)
}
```

### Available Weapons

| ID | Model | Bullet Color | Bullet Type | Damage |
|----|-------|--------------|-------------|--------|
| w_machinegun | w_machinegun | Blue (0x0000ff) | sphere | 1 |
| w_blaster | w_blaster | Green (0x00ff00) | sphere | 2 |
| w_chaingun | w_chaingun | Yellow (0xffff00) | sphere | 3 |
| w_glauncher | w_glauncher | Red (0xff0000) | sphere | 4 |
| w_hyperblaster | w_hyperblaster | Purple (0xff00ff) | sphere | 5 |
| w_railgun | w_railgun | Blue (0x0000ff) | laser | 6 |
| w_rlauncher | w_rlauncher | Green (0x00ff00) | laser | 7 |
| w_shotgun | w_shotgun | Yellow (0xffff00) | laser | 8 |
| w_sshotgun | w_sshotgun | Red (0xff0000) | laser | 9 |
| weapon | weapon | Purple (0xff00ff) | laser | 10 |
| w_bfg | w_bfg | Red (0xff0000) | laser | 11 |

### Required Assets
**Model Files (.md2):**
- All 11 weapon model files

**Texture Files (.png):**
- All 11 weapon texture files

**Download Locations:**
```
Source: https://github.com/mrdoob/three.js/tree/dev/examples/models/md2/ratamahatta
Target: d:\PROJECTS\app.ShiftOrDie\public\models\md2\ratamahatta\
Target (textures): d:\PROJECTS\app.ShiftOrDie\public\models\md2\ratamahatta\skins\
```

### New Projectile Type: Laser
**Visual:**
- Short laser beam (cylinder geometry)
- Length: ~1.0 unit
- Glow effect with emissive material
- Faster travel speed than sphere

**Behavior:**
- Same physics as sphere projectiles
- Different visual only

---

## 4. Code Architecture

### New Files to Create
```
src/
├── systems/
│   ├── MarketManager.js      # Market state management
│   └── WeaponConfig.js        # Weapon data definitions
├── ui/
│   └── MarketModal.js         # Market UI component
└── data/
    └── weapons.json           # Weapon configurations (optional)
```

### Modified Files
```
src/
├── ui/
│   └── UIManager.js           # Replace "Menu Style" with "Market"
├── systems/
│   └── Player.js              # Support skin/weapon swapping
└── core/
    └── Config.js              # Add market config if needed
```

---

## 5. State Management

### LocalStorage Schema
```javascript
{
  selectedSkin: "ratamahatta",      // Current active skin
  selectedWeapon: "w_glauncher",    // Current active weapon
  unlockedSkins: [...],             // Array of unlocked skins (future)
  unlockedWeapons: [...]            // Array of unlocked weapons (future)
}
```

### Default Values
- **Skin:** `ratamahatta`
- **Weapon:** `w_glauncher`
- **All items unlocked** (for now)

---

## 6. Damage System

### Soldier Health System
**Question:** How does damage work?
- Option A: Soldier has HP = 10, `damage: 1` requires 10 hits
- Option B: Soldier has HP = 1, `damage: 11` kills in 1 hit

**Assumption:** Higher damage = Fewer hits needed
- `damage: 1` → 10 hits to kill
- `damage: 11` → 1 hit to kill

### Implementation
```javascript
// Soldier.js
soldierHealth = 10;

// On bullet hit:
soldierHealth -= weapon.damage;
if (soldierHealth <= 0) {
  // Kill soldier
}
```

---

## 7. Confirmed Requirements ✅

### Persistence
✅ **Save to localStorage:** YES
- Selected skin persisted
- Selected weapon persisted
- Auto-load on game start

### Defaults
✅ **Default Skin:** `ratamahatta` (current)
✅ **Default Weapon:** `w_glauncher` (current)

### Unlock System
✅ **Phase 1 (Now):** All items unlocked for testing
✅ **Phase 2 (Future):** Coin-based unlock system
- Infrastructure prepared for coins
- Items have "price" property (set to 0 for now)
- Items have "unlocked" status

### Damage Logic
✅ **Higher damage = More powerful**
- `damage: 1` → Weakest (requires 11 hits)
- `damage: 11` → Strongest (requires 1 hit)
- Formula: `hitsRequired = 12 - damage`

### Laser Visual
✅ **Thick Beam** (Cylinder)
- Geometry: Cylinder (radius: 0.08, length: 1.5)
- Emissive glow effect
- Travel speed: 30 units/sec (vs sphere: 25)

### Market Access
✅ **Both locations:**
- Main Menu (replaces "Menu Style" button)
- Pause Menu (new "Market" button)

---

## 8. Coin System Infrastructure (Phase 2 Ready)

### Coin Economy Design

**Earning Coins:**
- Survival time: 1 coin per second
- Kill soldier: 10 coins
- Distance traveled: 1 coin per 10 units

**Coin Storage:**
```javascript
localStorage: {
  totalCoins: number,        // Current balance
  coinsEarned: number,       // Lifetime total
  coinsSpent: number         // Lifetime spent
}
```

### Item Unlock System

**Skin Prices (Placeholder):**
```javascript
{
  ratamahatta: 0,    // Free/default
  ctf_b: 100,        // Blue team skin
  ctf_r: 100,        // Red team skin
  dead: 200,         // Zombie skin
  gearwhore: 300     // Premium skin
}
```

**Weapon Prices (Placeholder):**
```javascript
{
  w_machinegun: 0,
  w_blaster: 50,
  w_chaingun: 100,
  w_glauncher: 0,      // Free/default
  w_hyperblaster: 200,
  w_railgun: 300,
  w_rlauncher: 400,
  w_shotgun: 500,
  w_sshotgun: 600,
  weapon: 700,
  w_bfg: 1000          // Most expensive
}
```

**Note:** Prices correlate with damage for balance

### Item State Model
```javascript
{
  id: "w_machinegun",
  unlocked: true,           // Phase 1: all true, Phase 2: based on purchase
  price: 0,                 // Phase 1: all 0, Phase 2: actual prices
  selected: false           // Currently equipped
}
```

---

## 9. Damage System Implementation

### Soldier Health
```javascript
class SoldierObstacle {
  health = 11;  // Maximum health
  
  takeDamage(amount) {
    this.health -= amount;
    if (this.health <= 0) {
      this.destroy();
    }
  }
}
```

### Weapon Stats
```javascript
WEAPONS = {
  w_machinegun: { damage: 1, hitsToKill: 11 },
  w_blaster: { damage: 2, hitsToKill: 10 },
  w_chaingun: { damage: 3, hitsToKill: 9 },
  w_glauncher: { damage: 4, hitsToKill: 8 },
  w_hyperblaster: { damage: 5, hitsToKill: 7 },
  w_railgun: { damage: 6, hitsToKill: 6 },
  w_rlauncher: { damage: 7, hitsToKill: 5 },
  w_shotgun: { damage: 8, hitsToKill: 4 },
  w_sshotgun: { damage: 9, hitsToKill: 3 },
  weapon: { damage: 10, hitsToKill: 2 },
  w_bfg: { damage: 11, hitsToKill: 1 }  // One-shot kill
}
```

---

## 10. Laser Projectile Specification

### Visual Design
```javascript
// Thick beam cylinder
const geometry = new CylinderGeometry(
  0.08,    // radiusTop
  0.08,    // radiusBottom
  1.5,     // height (length)
  8,       // radialSegments
  1        // heightSegments
);

const material = new MeshStandardMaterial({
  color: weaponColor,
  emissive: weaponColor,
  emissiveIntensity: 2.0,
  transparent: true,
  opacity: 0.9
});

// Rotate to face forward (Z-axis)
laser.rotation.z = Math.PI / 2;
```

### Travel Properties
- **Speed:** 30 units/second (faster than sphere)
- **Lifetime:** 3 seconds
- **Glow:** PointLight attached (intensity: 1.5, distance: 2)

### Trail Effect
- Leave fading trail particles
- Color matches laser color
- 5 particles per frame along path

---

## 11. Asset Download Instructions (UPDATED)

USER must download these files:

### Directory Structure
```
d:\PROJECTS\app.ShiftOrDie\public\models\md2\ratamahatta\
├── (existing) ratamahatta.md2
├── (existing) w_glauncher.md2
├── (NEW) ctf_b.md2
├── (NEW) ctf_r.md2
├── (NEW) dead.md2
├── (NEW) gearwhore.md2
├── (NEW) w_machinegun.md2
├── (NEW) w_blaster.md2
├── (NEW) w_chaingun.md2
├── (NEW) w_hyperblaster.md2
├── (NEW) w_railgun.md2
├── (NEW) w_rlauncher.md2
├── (NEW) w_shotgun.md2
├── (NEW) w_sshotgun.md2
├── (NEW) weapon.md2
└── (NEW) w_bfg.md2

d:\PROJECTS\app.ShiftOrDie\public\models\md2\ratamahatta\skins\
├── (existing) ratamahatta.png
├── (existing) w_glauncher.png
├── (NEW) ctf_b.png
├── (NEW) ctf_r.png
├── (NEW) dead.png
├── (NEW) gearwhore.png
├── (NEW) w_machinegun.png
├── (NEW) w_blaster.png
├── (NEW) w_chaingun.png
├── (NEW) w_hyperblaster.png
├── (NEW) w_railgun.png
├── (NEW) w_rlauncher.png
├── (NEW) w_shotgun.png
├── (NEW) w_sshotgun.png
├── (NEW) weapon.png
└── (NEW) w_bfg.png
```

### Download Links

**Skins (4 models + 4 textures):**
```
Models:
https://github.com/mrdoob/three.js/raw/dev/examples/models/md2/ratamahatta/ctf_b.md2
https://github.com/mrdoob/three.js/raw/dev/examples/models/md2/ratamahatta/ctf_r.md2
https://github.com/mrdoob/three.js/raw/dev/examples/models/md2/ratamahatta/dead.md2
https://github.com/mrdoob/three.js/raw/dev/examples/models/md2/ratamahatta/gearwhore.md2

Textures:
https://github.com/mrdoob/three.js/raw/dev/examples/models/md2/ratamahatta/skins/ctf_b.png
https://github.com/mrdoob/three.js/raw/dev/examples/models/md2/ratamahatta/skins/ctf_r.png
https://github.com/mrdoob/three.js/raw/dev/examples/models/md2/ratamahatta/skins/dead.png
https://github.com/mrdoob/three.js/raw/dev/examples/models/md2/ratamahatta/skins/gearwhore.png
```

**Weapons (10 models + 10 textures):**
```
Models:
https://github.com/mrdoob/three.js/raw/dev/examples/models/md2/ratamahatta/w_machinegun.md2
https://github.com/mrdoob/three.js/raw/dev/examples/models/md2/ratamahatta/w_blaster.md2
https://github.com/mrdoob/three.js/raw/dev/examples/models/md2/ratamahatta/w_chaingun.md2
https://github.com/mrdoob/three.js/raw/dev/examples/models/md2/ratamahatta/w_hyperblaster.md2
https://github.com/mrdoob/three.js/raw/dev/examples/models/md2/ratamahatta/w_railgun.md2
https://github.com/mrdoob/three.js/raw/dev/examples/models/md2/ratamahatta/w_rlauncher.md2
https://github.com/mrdoob/three.js/raw/dev/examples/models/md2/ratamahatta/w_shotgun.md2
https://github.com/mrdoob/three.js/raw/dev/examples/models/md2/ratamahatta/w_sshotgun.md2
https://github.com/mrdoob/three.js/raw/dev/examples/models/md2/ratamahatta/weapon.md2
https://github.com/mrdoob/three.js/raw/dev/examples/models/md2/ratamahatta/w_bfg.md2

Textures:
https://github.com/mrdoob/three.js/raw/dev/examples/models/md2/ratamahatta/skins/w_machinegun.png
https://github.com/mrdoob/three.js/raw/dev/examples/models/md2/ratamahatta/skins/w_blaster.png
https://github.com/mrdoob/three.js/raw/dev/examples/models/md2/ratamahatta/skins/w_chaingun.png
https://github.com/mrdoob/three.js/raw/dev/examples/models/md2/ratamahatta/skins/w_hyperblaster.png
https://github.com/mrdoob/three.js/raw/dev/examples/models/md2/ratamahatta/skins/w_railgun.png
https://github.com/mrdoob/three.js/raw/dev/examples/models/md2/ratamahatta/skins/w_rlauncher.png
https://github.com/mrdoob/three.js/raw/dev/examples/models/md2/ratamahatta/skins/w_shotgun.png
https://github.com/mrdoob/three.js/raw/dev/examples/models/md2/ratamahatta/skins/w_sshotgun.png
https://github.com/mrdoob/three.js/raw/dev/examples/models/md2/ratamahatta/skins/weapon.png
https://github.com/mrdoob/three.js/raw/dev/examples/models/md2/ratamahatta/skins/w_bfg.png
```

---

## 12. Implementation Phases

### Phase 1: Core Market (Current Sprint)
✅ All items free and unlocked
- Market UI with tabs
- Skin/weapon selection
- LocalStorage persistence
- Visual preview (if time permits)

### Phase 2: Economy System (Future)
- Coin earning mechanics
- Purchase system
- Unlock animations
- Price balancing

---

## 13. Non-Breaking Changes Checklist

**Before ANY code change:**
- [ ] Backup current working state
- [ ] Test game still runs after each file creation
- [ ] Keep existing `w_glauncher` as fallback
- [ ] Don't modify existing Player init until market ready
- [ ] Use try-catch for asset loading
- [ ] Console warnings, not errors, for missing assets

**Development Order (Safe):**
1. Create data structures (no DOM/game changes)
2. Create UI modal (hidden by default)
3. Test UI in isolation
4. Add market button (non-breaking)
5. Connect to Player (last step, reversible)

---

## Next Steps

✅ **Analysis Complete - Ready for Review**

**Waiting for USER:**
1. Review this updated analysis
2. Download asset files (links above)
3. Confirm asset files are in place
4. Approve to start implementation

**Implementation Ready:**
- All requirements clear
- Asset locations defined
- Phase 1 scope confirmed
- Phase 2 infrastructure planned
