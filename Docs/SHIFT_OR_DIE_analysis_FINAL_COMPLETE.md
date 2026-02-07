# SHIFT OR DIE – COMPLETE ANALYSIS (PRODUCTION READY - COMPLETE)

## DOCUMENT PURPOSE
This is the complete technical and design specification for SHIFT OR DIE.
All systems are defined with exact parameters, formulas, and implementation details.
This document works in tandem with **prompts_FINAL_COMPLETE.md** for complete AI-driven development.

---

## 1. GAME CONCEPT

### Overview
SHIFT OR DIE is a **single-tap arcade survival game** where players control a character running through an endless lane-based environment. The core mechanic is switching lanes according to rapidly changing rules. Wrong lane = instant death.

### Target Metrics
- **Session Length:** 20-40 seconds average
- **Replay Rate:** High (instant restart)
- **Ad Revenue:** Primary monetization
- **Retention:** D1: 40%, D7: 15%

### Platform
- **Primary:** Mobile web (fullscreen, portrait)
- **Engine:** Three.js
- **Target FPS:** 60 (minimum 30)
- **Orientation:** Portrait only, locked

---

## 2. CORE GAMEPLAY LOOP

```
START
  ↓
Character Auto-Runs Forward
  ↓
Rules Displayed (Icons)
  ↓
Player Taps → Switch Lane
  ↓
Correct Lane? → Continue
  ↓
Wrong Lane? → DEATH
  ↓
GAME OVER
  ↓
Ad / Restart / Menu
```

### Game Flow
1. Game starts, character runs forward automatically
2. Rules appear as icons (no text)
3. Player taps screen to cycle lanes: 0 → 1 → 2 → 0
4. Every few seconds, rules change
5. Speed increases over time
6. One mistake = game over

---

## 3. LANE & RULE SYSTEM

### Lane Structure
- **Default:** 3 lanes (Left - Center - Right)
- **Positions:** -2, 0, +2 (Three.js X coordinates)
- **Advanced (optional):** Fake lanes, temporary lanes

### Rule Types

#### Basic Rules (0-15 seconds)
1. ❌ **Red Kills** - Red lane is deadly
2. ✅ **Green Safe** - Only green lane is safe
3. ⚠️ **Middle Only** - Stay in center lane
4. ⛔ **Sides Only** - Avoid center lane

#### Advanced Rules (15+ seconds)
5. ⚡ **Blinking Lane** - Flashing lane kills
6. ➡️ **Arrow Lane** - Arrow points to safe direction
7. ⬅️ **Reverse Arrow** - Opposite of arrow is safe
8. 🔀 **Temporary Lane** - New lane appears for 2s, then vanishes

### Rule Display
- Icons shown at top of screen
- Smooth transition animation (0.5s)
- No text labels
- Sound cue on rule change

### Rule Progression Example
```
0-5s:   Red Kills (simple, gives time to learn)
5-10s:  Green Safe
10-15s: Middle Only
15-20s: Blinking Lane (first complex rule)
20-25s: Arrow Lane
25-30s: Reverse Arrow
30+s:   All rules randomized, fast changes
```

---

## 4. PLATFORM GENERATION & COLLISION SYSTEM

### Platform Configuration

```javascript
const platformConfig = {
  // Spawning
  spawnInterval: 1.5,          // seconds between new platforms
  spawnDistance: 20,           // units ahead of camera
  despawnDistance: -10,        // units behind camera (recycle)
  
  // Geometry
  platformLength: 4,           // Z-axis (forward direction)
  platformWidth: 1.8,          // X-axis (lane width)
  platformHeight: 0.2,         // Y-axis (thickness)
  platformGap: 0.5,            // gap between platforms
  
  // Lanes
  laneCount: 3,
  lanePositions: [-2, 0, 2],   // X coordinates
  
  // Object Pooling
  poolSize: 30,                // pre-created instances
  maxActive: 15                // maximum visible at once
};
```

### Platform Spawning Algorithm

**Spawn Timing:**
```javascript
class PlatformSpawner {
  constructor() {
    this.timeSinceLastSpawn = 0;
    this.spawnZ = 20; // initial spawn position
  }
  
  update(deltaTime, gameSpeed) {
    this.timeSinceLastSpawn += deltaTime;
    
    if (this.timeSinceLastSpawn >= platformConfig.spawnInterval) {
      this.spawnPlatformRow();
      this.timeSinceLastSpawn = 0;
      
      // Move spawn position forward
      this.spawnZ += (platformConfig.platformLength + platformConfig.platformGap);
    }
    
    // Move all platforms backward
    this.moveActivePlatforms(gameSpeed * deltaTime);
  }
  
  spawnPlatformRow() {
    // Create 3 platforms (one per lane)
    for (let i = 0; i < 3; i++) {
      const platform = this.pool.get();
      platform.position.set(
        platformConfig.lanePositions[i],
        0,
        this.spawnZ
      );
      
      // Assign rule-based appearance
      this.applyRuleToplatform(platform, i);
      
      this.activePlatforms.push(platform);
    }
  }
}
```

### Object Pooling Implementation

```javascript
class PlatformPool {
  constructor(size = 30) {
    this.pool = [];
    this.active = [];
    
    // Pre-create all platforms
    for (let i = 0; i < size; i++) {
      const platform = this.createPlatform();
      platform.visible = false;
      this.pool.push(platform);
      scene.add(platform); // Add to scene once
    }
  }
  
  createPlatform() {
    const geometry = new THREE.BoxGeometry(
      platformConfig.platformWidth,
      platformConfig.platformHeight,
      platformConfig.platformLength
    );
    
    const material = new THREE.MeshStandardMaterial({
      color: 0x00ff00,
      metalness: 0.3,
      roughness: 0.7
    });
    
    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    
    // Add userData for collision
    mesh.userData = {
      isPlatform: true,
      rule: null,
      lane: 0
    };
    
    return mesh;
  }
  
  get() {
    if (this.pool.length === 0) {
      console.warn('Platform pool exhausted!');
      return this.createPlatform();
    }
    
    const platform = this.pool.pop();
    platform.visible = true;
    this.active.push(platform);
    return platform;
  }
  
  recycle(platform) {
    platform.visible = false;
    this.pool.push(platform);
    this.active = this.active.filter(p => p !== platform);
  }
  
  recycleBehindCamera(cameraZ) {
    this.active.forEach(platform => {
      if (platform.position.z < cameraZ + platformConfig.despawnDistance) {
        this.recycle(platform);
      }
    });
  }
}
```

### Rule-Based Platform Appearance

```javascript
function applyRuleToplatform(platform, laneIndex) {
  const currentRule = getRuleManager().currentRule;
  
  switch(currentRule.type) {
    case 'RED_KILLS':
      // Lane 0 = red (death), others = green (safe)
      platform.material.color.setHex(
        laneIndex === 0 ? 0xff0000 : 0x00ff00
      );
      platform.userData.isDangerous = (laneIndex === 0);
      break;
      
    case 'GREEN_SAFE':
      // Only lane 1 (center) = green (safe)
      platform.material.color.setHex(
        laneIndex === 1 ? 0x00ff00 : 0xff0000
      );
      platform.userData.isDangerous = (laneIndex !== 1);
      break;
      
    case 'MIDDLE_ONLY':
      // Center safe, sides death
      platform.material.color.setHex(
        laneIndex === 1 ? 0x00ff00 : 0xff0000
      );
      platform.userData.isDangerous = (laneIndex !== 1);
      break;
      
    case 'BLINKING_LANE':
      // Lane 2 blinks (dangerous when visible)
      if (laneIndex === 2) {
        platform.userData.isBlinking = true;
        platform.userData.isDangerous = true;
        this.addBlinkAnimation(platform);
      } else {
        platform.material.color.setHex(0x00ff00);
        platform.userData.isDangerous = false;
      }
      break;
      
    // Add more rules...
  }
  
  // Store lane for collision check
  platform.userData.lane = laneIndex;
}
```

### Platform Visual Effects

**Blinking Animation:**
```javascript
function addBlinkAnimation(platform) {
  gsap.to(platform.material, {
    opacity: 0.3,
    duration: 0.5,
    repeat: -1,
    yoyo: true,
    ease: 'sine.inOut'
  });
}
```

**Arrow Sprite:**
```javascript
function addArrowSprite(platform, direction) {
  const sprite = new THREE.Sprite(arrowMaterial);
  sprite.scale.set(0.8, 0.8, 1);
  sprite.position.y = 0.5; // Above platform
  
  // Rotate based on direction
  if (direction === 'right') {
    sprite.material.rotation = 0;
  } else if (direction === 'left') {
    sprite.material.rotation = Math.PI;
  }
  
  platform.add(sprite);
}
```

### Collision Detection System

**Method: AABB (Axis-Aligned Bounding Box)**

```javascript
class CollisionDetector {
  constructor() {
    this.playerBox = new THREE.Box3();
    this.platformBox = new THREE.Box3();
  }
  
  update(player, platforms) {
    // Update player bounding box
    this.playerBox.setFromObject(player);
    
    // Check each active platform
    for (const platform of platforms) {
      // Skip if too far
      if (Math.abs(platform.position.z - player.position.z) > 3) {
        continue;
      }
      
      // Update platform bounding box
      this.platformBox.setFromObject(platform);
      
      // Check intersection
      if (this.playerBox.intersectsBox(this.platformBox)) {
        this.handleCollision(player, platform);
      }
    }
  }
  
  handleCollision(player, platform) {
    // Check if player is in correct lane
    const playerLane = this.getPlayerLane(player.position.x);
    const platformLane = platform.userData.lane;
    
    // Player must be on same lane as platform
    if (playerLane !== platformLane) {
      return; // No collision, player is in different lane
    }
    
    // Check if platform is dangerous
    if (platform.userData.isDangerous) {
      // DEATH
      this.triggerDeath();
    } else {
      // SAFE - check for perfect shift
      this.checkPerfectShift(platform);
    }
  }
  
  getPlayerLane(xPosition) {
    // Map X position to lane index
    const distances = platformConfig.lanePositions.map(pos => 
      Math.abs(xPosition - pos)
    );
    return distances.indexOf(Math.min(...distances));
  }
  
  triggerDeath() {
    gameState.transition('GAMEOVER');
    playSound('death');
    showDeathEffect();
  }
  
  checkPerfectShift(platform) {
    const timeSinceRuleChange = Date.now() - ruleManager.lastChangeTime;
    
    if (timeSinceRuleChange < 500) { // 0.5 seconds
      // PERFECT SHIFT!
      scoreManager.addPerfectShiftBonus();
      showPerfectShiftEffect();
      playSound('perfect');
    }
  }
}
```

### Safe Zone Implementation (First 3 Seconds)

```javascript
class SafeZoneManager {
  constructor() {
    this.safeZoneActive = true;
    this.safeZoneDuration = 3000; // 3 seconds
    this.startTime = null;
  }
  
  start() {
    this.startTime = Date.now();
    this.safeZoneActive = true;
  }
  
  update() {
    if (!this.safeZoneActive) return;
    
    const elapsed = Date.now() - this.startTime;
    
    if (elapsed >= this.safeZoneDuration) {
      this.safeZoneActive = false;
      console.log('Safe zone ended');
    }
  }
  
  isPlatformDangerous(platform) {
    if (this.safeZoneActive) {
      return false; // All platforms safe during safe zone
    }
    
    return platform.userData.isDangerous;
  }
}
```

**Visual Indicator:**
```javascript
function renderSafeZoneIndicator() {
  if (safeZone.safeZoneActive) {
    const remaining = safeZone.safeZoneDuration - (Date.now() - safeZone.startTime);
    const seconds = Math.ceil(remaining / 1000);
    
    // Show countdown or shield icon
    ui.showSafeZoneTimer(seconds);
  }
}
```

### Performance Optimization

**Collision Check Frequency:**
```javascript
class OptimizedCollisionDetector extends CollisionDetector {
  constructor() {
    super();
    this.checkInterval = 16; // ms (~60fps)
    this.lastCheckTime = 0;
  }
  
  update(player, platforms, currentTime) {
    // Only check every 16ms
    if (currentTime - this.lastCheckTime < this.checkInterval) {
      return;
    }
    
    this.lastCheckTime = currentTime;
    
    // Only check nearby platforms
    const nearbyPlatforms = platforms.filter(p => {
      const distance = Math.abs(p.position.z - player.position.z);
      return distance < 5; // 5 units radius
    });
    
    super.update(player, nearbyPlatforms);
  }
}
```

**Spatial Partitioning (Optional):**
```javascript
class SpatialGrid {
  constructor(cellSize = 10) {
    this.cellSize = cellSize;
    this.grid = new Map();
  }
  
  insert(platform) {
    const key = this.getKey(platform.position.z);
    if (!this.grid.has(key)) {
      this.grid.set(key, []);
    }
    this.grid.get(key).push(platform);
  }
  
  getNearby(z, radius = 5) {
    const results = [];
    const startKey = this.getKey(z - radius);
    const endKey = this.getKey(z + radius);
    
    for (let key = startKey; key <= endKey; key++) {
      if (this.grid.has(key)) {
        results.push(...this.grid.get(key));
      }
    }
    
    return results;
  }
  
  getKey(z) {
    return Math.floor(z / this.cellSize);
  }
  
  clear() {
    this.grid.clear();
  }
}
```

### Debug Visualization

```javascript
function enableCollisionDebug() {
  // Show bounding boxes
  const playerHelper = new THREE.Box3Helper(playerBox, 0x00ff00);
  scene.add(playerHelper);
  
  platforms.forEach(platform => {
    const helper = new THREE.Box3Helper(
      new THREE.Box3().setFromObject(platform),
      platform.userData.isDangerous ? 0xff0000 : 0x00ff00
    );
    scene.add(helper);
  });
  
  // Show lane guides
  platformConfig.lanePositions.forEach(x => {
    const geometry = new THREE.PlaneGeometry(0.1, 100);
    const material = new THREE.MeshBasicMaterial({
      color: 0xffff00,
      transparent: true,
      opacity: 0.3
    });
    const guide = new THREE.Mesh(geometry, material);
    guide.rotation.x = -Math.PI / 2;
    guide.position.set(x, 0, 0);
    scene.add(guide);
  });
}
```

---

## 5. SCORE SYSTEM

### Score Formula
```
Base Score = Time Survived (seconds) × 100

Perfect Shift Bonus = +50 points
(Correct lane switch within 0.5s of rule change)

Combo Multiplier:
- 3 perfect shifts → 2x multiplier
- 6 perfect shifts → 3x multiplier (maximum)

Final Score = (Base Score + All Bonuses) × Current Multiplier
```

### Example Calculation
```
Player survives 25 seconds
Got 8 perfect shifts
Reached 3x combo

Base: 25 × 100 = 2,500
Bonuses: 8 × 50 = 400
Subtotal: 2,900
With 3x combo: 2,900 × 3 = 8,700 points
```

### Perfect Shift Definition
A lane switch is "perfect" if:
1. Made within 0.5 seconds after rule change
2. Switched to correct lane
3. Visual feedback: sparkle effect + "+50" text

### Combo System
- Combo counter shown in HUD when active
- One mistake resets combo to 0
- Visual feedback on combo milestones:
  - 2x: Screen pulse + "COMBO x2!"
  - 3x: Stronger pulse + "MAX COMBO!"

### High Score
- Stored in localStorage: `shift_or_die_highscore`
- Compared at every game over
- New record triggers:
  - Animated "NEW RECORD!" text
  - Confetti effect
  - Special sound effect

---

## 6. DIFFICULTY SCALING

### Speed Progression
```javascript
const speedConfig = {
  base: 5,           // units per second at start
  increment: 0.5,    // added every interval
  interval: 5,       // seconds between increments
  max: 15            // cap at 30 seconds
};

// Formula:
currentSpeed = Math.min(
  base + (timeSurvived / interval) * increment,
  max
);

// Examples:
0s  → 5.0 speed
5s  → 5.5 speed
10s → 6.0 speed
15s → 6.5 speed
30s → 15.0 speed (max)
```

### Rule Change Frequency
```javascript
const ruleChangeConfig = [
  { time: 0,  interval: 5.0 },  // 0-10s: every 5 seconds
  { time: 10, interval: 4.0 },  // 10-20s: every 4 seconds
  { time: 20, interval: 3.0 },  // 20-30s: every 3 seconds
  { time: 30, interval: 2.5 }   // 30+s: every 2.5 seconds
];
```

### Visual Complexity Scaling
```
0-15s:  Only basic rules (red/green/middle)
15-25s: Add blinking lanes
25-30s: Add directional arrows
30+s:   All rules active, fast rotation
```

### Implementation Note
All scaling is **deterministic** (no randomness in difficulty curve).
Only rule selection can be randomized, but frequency/speed are fixed.

---

## 7. ONBOARDING (CONTEXTUAL LEARNING)

### Philosophy
No classic tutorial. Players learn by dying.

### First-Time User Experience

#### First Game (localStorage: `has_played` = null)
```javascript
gameSpeed = 0.5;              // 50% speed
firstRuleDuration = 8000;     // First rule stays 8s
showTouchHint = true;         // Show finger icon
```

**What happens:**
- Game runs at half speed
- First rule: "Green Safe" - fixed for 8 seconds
- Touch hint appears: finger icon + tap animation
- Hint fades out after 3 seconds
- After death, set `has_played = true`

#### Second Game
```javascript
gameSpeed = 1.0;              // Normal speed
firstRuleDuration = 5000;     // First rule 5s
showTouchHint = false;        // No hint
```

#### Third Game and Beyond
```javascript
gameSpeed = 1.0;              // Normal speed
firstRuleDuration = 3000;     // First rule 3s
fullDifficultyScaling = true; // All scaling active
```

### Benefits
- No UI clutter
- Natural skill progression
- Players understand mechanics through play
- Zero friction to gameplay

---

## 8. STATE MANAGEMENT

### Finite State Machine

```javascript
const GameStates = {
  LOADING: 'loading',        // Asset loading phase
  MENU: 'menu',              // Main menu screen
  PLAYING: 'playing',        // Active gameplay
  PAUSED: 'paused',          // Pause modal open
  GAMEOVER: 'gameover',      // Game over screen
  REWARDED_AD: 'rewarded_ad' // Watching ad to continue
};
```

### Valid State Transitions

```
LOADING → MENU
  (when all assets loaded)

MENU → PLAYING
  (play button pressed)

PLAYING → PAUSED
  (pause button pressed)

PLAYING → GAMEOVER
  (player died)

PAUSED → PLAYING
  (continue button pressed)

PAUSED → MENU
  (quit button pressed)

GAMEOVER → PLAYING
  (restart button pressed)

GAMEOVER → MENU
  (menu button pressed)

GAMEOVER → REWARDED_AD
  (continue button pressed)

REWARDED_AD → PLAYING
  (ad successfully watched)
```

### State Validation
```javascript
class GameStateMachine {
  transition(newState) {
    if (!this.isValidTransition(this.currentState, newState)) {
      console.error(`Invalid transition: ${this.currentState} → ${newState}`);
      return false;
    }
    
    this.currentState = newState;
    this.emit('stateChanged', newState);
    return true;
  }
}
```

---

## 9. INPUT SYSTEM

### Control Scheme
**Single Tap Only**
- No swipe gestures
- No hold mechanics
- No multi-touch

### Lane Switching Behavior
```javascript
// 3 lanes: 0 (left), 1 (center), 2 (right)

function switchLane() {
  currentLane = (currentLane + 1) % 3;
  
  // Animate player position
  gsap.to(player.position, {
    x: lanePositions[currentLane],  // [-2, 0, 2]
    duration: 0.15,
    ease: 'power2.out'
  });
  
  // Play sound
  if (settings.sfx) {
    playSound('shift');
  }
  
  // Check if perfect shift
  checkPerfectShift();
}
```

### Touch Event Implementation
```javascript
canvas.addEventListener('touchstart', (e) => {
  e.preventDefault();  // Prevent scroll
  
  // Only respond in PLAYING state
  if (gameState !== 'PLAYING') return;
  
  // Block multi-touch
  if (e.touches.length > 1) return;
  
  // Execute lane switch
  switchLane();
  
}, { passive: false });  // Required for preventDefault
```

### Input Feedback
- Haptic feedback (vibration) on tap
- Visual lane highlight on switch
- Sound effect on shift

---

## 10. UI SYSTEM

### 1. Main Menu

**Layout:**
```
┌─────────────────────┐
│   SHIFT OR DIE      │  (Logo)
│                     │
│  🪙 850 Coins       │
│  🏆 15,420 High     │
│                     │
│  [ PLAY GAME ]      │  (Large, centered)
│                     │
│  [ Daily Tasks ]    │
│  [ Style ]          │
│  [ Settings ]       │
└─────────────────────┘
```

**Elements:**
- Logo (top)
- Coin count (top right)
- High score (top right, below coins)
- Play button (large, center)
- Three secondary buttons (bottom)

---

### 2. Game HUD

**Layout:**
```
┌─────────────────────┐
│  8,420    [||]      │  (Score + Pause)
│                     │
│  COMBO x2 🔥        │  (Only when active)
│                     │
│     [RULE ICON]     │  (Current rule)
│                     │
│                     │
│      (gameplay)     │
│                     │
└─────────────────────┘
```

**Elements:**
- Score (top left)
- Pause button (top right)
- Combo indicator (below score, conditional)
- Rule icon (top center)

---

### 3. Pause Modal

**Layout:**
```
┌─────────────────────┐
│                     │
│   ═══ PAUSED ═══    │
│                     │
│   [ CONTINUE ]      │
│   [ RESTART  ]      │
│   [ QUIT     ]      │
│                     │
└─────────────────────┘
```

**Behavior:**
- Blur game background
- Stop all game logic
- Music continues (optional)

---

### 4. Game Over Screen

**Layout:**
```
┌─────────────────────┐
│   GAME OVER         │
│                     │
│   Your Score        │
│      8,420          │
│                     │
│   High Score        │
│     15,420          │
│                     │
│ [Continue (AD)]     │  (Rewarded)
│ [Restart]           │
│ [Main Menu]         │
└─────────────────────┘
```

**New Record Variant:**
```
┌─────────────────────┐
│  🎉 NEW RECORD! 🎉  │
│                     │
│   Your Score        │
│     18,920          │
│   (confetti effect) │
│                     │
│ [Restart]           │
│ [Main Menu]         │
└─────────────────────┘
```

---

### 5. Daily Tasks Modal

**Layout:**
```
┌─────────────────────┐
│   DAILY TASKS       │ [X]
│   Resets in: 8h 42m │  ← NEW
│                     │
│ ◆ Survive 30s       │
│   [████░░░] 25/30   │
│                     │
│ ◆ Make 50 shifts    │
│   [███████░] 42/50  │
│                     │
│ ◆ 10 perfect shifts │
│   [██████████] ✓    │
│   [ CLAIM 100🪙 ]   │
│                     │
└─────────────────────┘
```

**Elements:**
- 3 tasks per day
- Progress bars
- Claim button (enabled when complete)
- **Reset timer** (HH:MM format, updates every minute)
- Close button

**Reset Timer Logic:**
```javascript
function getTimeUntilReset() {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0); // Midnight
  
  const diff = tomorrow - now;
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  
  return `${hours}h ${minutes}m`;
}
```

**Purpose:**
- Encourages daily return
- Creates urgency to complete tasks
- Clear expectation setting

---

### 6. Style Selection Modal

**Layout:**
```
┌─────────────────────┐
│   SELECT STYLE      │ [X]
│                     │
│  [Neon Cyber]       │  (preview thumbnail)
│  [Minimal Flat]     │
│  [Stylized Arcade]  │
│                     │
│     [ APPLY ]       │
└─────────────────────┘
```

---

### 7. Settings Modal

**Layout:**
```
┌─────────────────────┐
│   SETTINGS          │ [X]
│                     │
│  Music        [ON]  │  (toggle)
│  SFX          [ON]  │  (toggle)
│                     │
│  Language:          │
│   ● Turkish         │
│   ○ English         │
│                     │
└─────────────────────┘
```

---

## 11. DAILY TASKS & COIN SYSTEM

### Daily Task Examples

**Task Types:**
1. **Survival:** Survive for X seconds
2. **Action:** Make X lane shifts
3. **Skill:** Get X perfect shifts
4. **Combo:** Reach X combo level

**Daily Rotation (3 tasks/day):**
```javascript
const dailyTasks = [
  {
    id: 'survive_30s',
    type: 'survival',
    target: 30,
    reward: 100,
    description: { tr: '30 saniye hayatta kal', en: 'Survive 30 seconds' }
  },
  {
    id: 'shift_50_times',
    type: 'action',
    target: 50,
    reward: 100,
    description: { tr: '50 kez şerit değiştir', en: 'Make 50 lane shifts' }
  },
  {
    id: 'perfect_10',
    type: 'skill',
    target: 10,
    reward: 150,
    description: { tr: '10 mükemmel geçiş yap', en: 'Get 10 perfect shifts' }
  }
];
```

### Task Reset Logic
```javascript
function checkDailyReset() {
  const today = new Date().toDateString();
  const lastPlayed = localStorage.getItem('last_task_date');
  
  if (lastPlayed !== today) {
    resetDailyTasks();
    localStorage.setItem('last_task_date', today);
  }
}
```

**Runtime Validation:**
Daily task date is validated:
- **On app launch** (initial load)
- **On returning to MENU state** (from GAMEOVER or PAUSED)
- **Every 60 seconds during MENU state** (edge case: player leaves game open overnight)

```javascript
// In game loop or menu update
function validateDailyTasks() {
  const currentDate = new Date().toDateString();
  const storedDate = localStorage.getItem('last_task_date');
  
  if (storedDate !== currentDate) {
    // Date changed while game was running
    resetDailyTasks();
    localStorage.setItem('last_task_date', currentDate);
    
    // Show notification
    showNotification('New daily tasks available!');
  }
}
```

**Edge Case Handling:**
- If player leaves game open overnight → tasks reset when returning to menu
- If date changes during gameplay → tasks reset after current run ends
- Reset preserves unclaimed rewards from previous day (grace period: 24h)

### Coin Economy

**Earning Coins:**
- Daily task completion: 100-150 per task
- (Future) Achievements: 50-500
- (Future) Level milestones: variable

**Spending Coins (Launch Version):**

1. **Visual Styles:**
   - Neon Cyber: FREE (default)
   - Minimal Flat: 300 coins
   - Stylized Arcade: 500 coins

2. **Cosmetic Trails (Future):**
   - Basic trail: 200 coins
   - Premium trail: 400 coins

**Important Rules:**
- **NO gameplay advantages** - purely cosmetic
- **Cannot buy continues** - preserves ad monetization
- **Cannot skip difficulty** - maintains core challenge

**Economy Balance:**
```javascript
const coinEconomy = {
  dailyEarnings: {
    min: 300,  // 3 tasks × 100
    max: 450   // 3 tasks × 150
  },
  
  daysToUnlockAll: {
    casual: 3,  // 3 days for all styles
    hardcore: 1 // 1 day if all tasks completed
  }
};
```

**Display:**
- Main menu: Total coins (top right)
- Game over: +0 coins (no earning from gameplay)
- Daily tasks: Reward amounts
- Style modal: Price tags on locked items

**Unlock Flow:**
```javascript
function unlockStyle(styleName) {
  const price = stylePrices[styleName];
  const currentCoins = getCoinBalance();
  
  if (currentCoins < price) {
    showMessage('Not enough coins');
    return false;
  }
  
  // Deduct coins
  setCoinBalance(currentCoins - price);
  
  // Unlock style
  unlockedStyles.push(styleName);
  saveUnlocks();
  
  // Show success
  showMessage(`${styleName} unlocked!`);
  playSoundEffect('purchase');
  
  return true;
}
```

---

## 12. AD SYSTEM

### Rewarded Ads

**Trigger:**
- Game Over screen → "Continue" button

**Behavior:**
1. User clicks "Continue"
2. Transition to REWARDED_AD state
3. Show ad (2-3 seconds in mock mode)
4. On success: Resume game from death point
5. On failure/skip: Return to game over

**Continue Logic (CRITICAL):**
```javascript
function continueAfterAd() {
  // Check if already used this run
  if (currentRun.usedContinue) {
    showMessage('Continue already used this run');
    return;
  }
  
  // Respawn at last safe lane
  player.position.x = lanePositions[lastSafeLane];
  
  // Enable invulnerability (ghost mode)
  player.userData.invulnerable = true;
  player.material.opacity = 0.5; // Visual feedback
  
  setTimeout(() => {
    player.userData.invulnerable = false;
    player.material.opacity = 1.0;
  }, 2000); // 2 seconds protection
  
  // Mark as used
  currentRun.usedContinue = true;
  
  // NO score rollback - keep current score
  // Resume gameplay
  gameState.transition('PLAYING');
}
```

**Rules:**
- **Respawn Location:** Last safe lane (where player was before death)
- **Invulnerability:** 2 seconds ghost mode (visual: semi-transparent)
- **Score:** No rollback, continues from current
- **Limit:** Maximum 1 continue per run
- **Button State:** "Continue" button disabled after first use

**Abuse Prevention:**
- Continue button grays out after use
- Visual indicator: "1/1 Continue Used"
- Cannot continue twice in same run

**Frequency:**
- User-initiated only (not automatic)

---

### Interstitial Ads

**Trigger:**
- Every 2-3 completed games
- NOT on first game

**Timing:**
```javascript
let gamesPlayed = 0;

function onGameOver() {
  gamesPlayed++;
  
  if (gamesPlayed === 1) {
    // Never show on first game
    return;
  }
  
  if (gamesPlayed % 3 === 0) {
    showInterstitialAd();
  }
}
```

**Placement:**
- Between game over and menu transition
- Never interrupts gameplay

---

### Banner Ads

**Placement:**
- Main menu (bottom)
- Settings screen (bottom)

**Size:**
- 320x50 (standard mobile banner)

**Behavior:**
- Hidden during gameplay
- Visible only in MENU state
- Auto-refresh every 60s

---

### Mock Ad System (for testing)

```javascript
class MockAdManager {
  showRewarded(onSuccess, onFail) {
    setTimeout(() => {
      const success = Math.random() > 0.1; // 90% success rate
      success ? onSuccess() : onFail();
    }, 2000);
  }
  
  showInterstitial() {
    setTimeout(() => {
      console.log('Interstitial shown');
    }, 2000);
  }
  
  showBanner() {
    console.log('Banner visible');
  }
}
```

---

## 13. INTERNATIONALIZATION (i18n)

### Supported Languages
- Turkish (tr)
- English (en)

### Translation Files

**locales/tr.json:**
```json
{
  "menu": {
    "play": "OYNA",
    "daily_tasks": "Günlük Görevler",
    "style": "Stil",
    "settings": "Ayarlar"
  },
  "game": {
    "paused": "DURAKLATILDI",
    "game_over": "OYUN BİTTİ",
    "new_record": "YENİ REKOR!",
    "your_score": "Skorun",
    "high_score": "En Yüksek",
    "continue": "Devam Et",
    "restart": "Yeniden Başla",
    "quit": "Çık"
  },
  "tasks": {
    "daily_tasks": "Günlük Görevler",
    "claim": "AL",
    "survive": "{{time}} saniye hayatta kal",
    "shifts": "{{count}} kez şerit değiştir",
    "perfect": "{{count}} mükemmel geçiş yap"
  },
  "settings": {
    "music": "Müzik",
    "sfx": "Ses Efektleri",
    "language": "Dil"
  }
}
```

**locales/en.json:**
```json
{
  "menu": {
    "play": "PLAY",
    "daily_tasks": "Daily Tasks",
    "style": "Style",
    "settings": "Settings"
  },
  "game": {
    "paused": "PAUSED",
    "game_over": "GAME OVER",
    "new_record": "NEW RECORD!",
    "your_score": "Your Score",
    "high_score": "High Score",
    "continue": "Continue",
    "restart": "Restart",
    "quit": "Quit"
  },
  "tasks": {
    "daily_tasks": "Daily Tasks",
    "claim": "CLAIM",
    "survive": "Survive {{time}} seconds",
    "shifts": "Make {{count}} lane shifts",
    "perfect": "Get {{count}} perfect shifts"
  },
  "settings": {
    "music": "Music",
    "sfx": "Sound Effects",
    "language": "Language"
  }
}
```

### Language Detection
```javascript
function getDefaultLanguage() {
  const saved = localStorage.getItem('language');
  if (saved) return saved;
  
  const browser = navigator.language.split('-')[0];
  return ['tr', 'en'].includes(browser) ? browser : 'en';
}
```

---

## 14. STYLE SYSTEM

### 1. Neon Cyber

**Visual Properties:**
```javascript
{
  background: '#0a0a0a',      // Very dark
  bloom: {
    strength: 1.5,
    threshold: 0.2,
    radius: 1
  },
  vignette: {
    darkness: 0.8,
    offset: 0.5
  },
  colors: {
    primary: '#00ffff',       // Cyan
    secondary: '#ff00ff',     // Magenta
    accent: '#ffff00',        // Yellow
    lane: '#1a1a2e'
  },
  glow: true,
  shadows: false
}
```

**Character:**
- Glowing edges
- Neon trail effect
- High contrast

---

### 2. Minimal Flat

**Visual Properties:**
```javascript
{
  background: '#e0e0e0',      // Light gray
  bloom: {
    strength: 0,              // No bloom
    threshold: 1,
    radius: 0
  },
  vignette: {
    darkness: 0,              // No vignette
    offset: 0
  },
  colors: {
    primary: '#4a90e2',       // Blue
    secondary: '#f39c12',     // Orange
    accent: '#2ecc71',        // Green
    lane: '#ffffff'
  },
  glow: false,
  shadows: true                // Soft shadows only
}
```

**Character:**
- Clean silhouette
- No glow
- Pastel colors

---

### 3. Stylized Arcade

**Visual Properties:**
```javascript
{
  background: '#1a1a2e',      // Dark blue
  bloom: {
    strength: 0.8,
    threshold: 0.5,
    radius: 0.8
  },
  vignette: {
    darkness: 0.5,
    offset: 0.4
  },
  colors: {
    primary: '#ff6b6b',       // Red
    secondary: '#a29bfe',     // Purple
    accent: '#feca57',        // Yellow
    lane: '#2d3561'
  },
  glow: true,
  shadows: true
}
```

**Character:**
- Cartoon shading
- Medium glow
- Saturated colors

---

### Style Application
```javascript
function applyStyle(styleName) {
  const config = styleConfigs[styleName];
  
  // Update post-processing
  bloomPass.strength = config.bloom.strength;
  vignettePass.darkness = config.vignette.darkness;
  
  // Update scene colors
  scene.background = new THREE.Color(config.background);
  
  // Update materials
  updateMaterials(config.colors);
  
  // Save selection
  localStorage.setItem('selected_style', styleName);
}
```

---

## 15. ASSET LOADING

### Loading Order (Priority)

1. **Critical UI (20%):**
   - Loading screen elements
   - Progress bar

2. **Characters (40%):**
   - Human model
   - Robot model
   - Neon silhouette

3. **Rule Icons (60%):**
   - 8-10 rule icons

4. **Sounds (80%):**
   - SFX files
   - Music track

5. **Effects (100%):**
   - VFX sprites
   - Particle textures

### Loading Screen

**Visual:**
```
┌─────────────────────┐
│                     │
│   SHIFT OR DIE      │  (Logo, centered)
│                     │
│  [████████░░░░]     │  (Progress bar, 70%)
│    Loading...       │
│                     │
└─────────────────────┘
```

**Minimum Display Time:**
1 second (prevents flash on fast connections)

```javascript
async function load() {
  const startTime = Date.now();
  
  await assetLoader.loadAll();
  
  const elapsed = Date.now() - startTime;
  const remaining = Math.max(0, 1000 - elapsed);
  
  await delay(remaining);
  
  transition('LOADING', 'MENU');
}
```

### Fallback System

**WebGL Check:**
```javascript
if (!WebGLDetector.isSupported()) {
  showErrorModal({
    title: 'WebGL Not Supported',
    message: 'Please update your browser or device',
    button: 'OK'
  });
  return;
}
```

**Asset Load Failure:**
```javascript
try {
  character = await loadModel('character.glb');
} catch (error) {
  console.warn('Failed to load character, using fallback');
  character = new THREE.Mesh(
    new THREE.BoxGeometry(1, 2, 1),
    new THREE.MeshStandardMaterial({ color: 0x00ff00 })
  );
}
```

---

## 16. LOCALSTORAGE SCHEMA

### Complete Schema
```javascript
{
  // First-time user tracking
  "has_played": true,
  
  // Scoring
  "highscore": 15420,
  
  // Economy
  "total_coins": 850,
  
  // Unlocks
  "unlocked_styles": ["neon"],  // neon is free by default
  
  // Daily tasks
  "daily_tasks": {
    "date": "2026-02-07",
    "tasks": [
      {
        "id": "survive_30s",
        "progress": 25,
        "target": 30,
        "completed": false,
        "claimed": false
      },
      {
        "id": "shift_50_times",
        "progress": 42,
        "target": 50,
        "completed": false,
        "claimed": false
      },
      {
        "id": "perfect_10",
        "progress": 10,
        "target": 10,
        "completed": true,
        "claimed": true
      }
    ]
  },
  
  // Settings
  "settings": {
    "music": true,
    "sfx": true,
    "language": "tr"
  },
  
  // Customization
  "selected_style": "neon",
  
  // Analytics (optional)
  "total_games_played": 42,
  "total_time_played": 1250,  // seconds
  "last_session_date": "2026-02-07"
}
```

### Key Names
All localStorage keys are prefixed:
- `shift_or_die_highscore`
- `shift_or_die_data` (main data object)
- `shift_or_die_settings`

---

## 17. THREE.JS TECHNICAL ARCHITECTURE

### Scene Setup

**Camera:**
```javascript
const camera = new THREE.PerspectiveCamera(
  75,                           // FOV
  window.innerWidth / window.innerHeight,
  0.1,                          // Near
  1000                          // Far
);
camera.position.set(0, 3, -5);  // Behind and above player
camera.lookAt(0, 1, 5);         // Look forward
```

**Renderer:**
```javascript
const renderer = new THREE.WebGLRenderer({
  antialias: true,
  powerPreference: 'high-performance'
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
```

**Lighting:**
```javascript
// Ambient (base illumination)
const ambient = new THREE.AmbientLight(0xffffff, 0.4);
scene.add(ambient);

// Directional (main light + shadows)
const directional = new THREE.DirectionalLight(0xffffff, 0.8);
directional.position.set(5, 10, 5);
directional.castShadow = true;
directional.shadow.camera.near = 0.1;
directional.shadow.camera.far = 50;
scene.add(directional);

// Hemisphere (sky/ground gradient)
const hemisphere = new THREE.HemisphereLight(0x87ceeb, 0x545454, 0.3);
scene.add(hemisphere);
```

### Post-Processing Stack

```javascript
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass';

const composer = new EffectComposer(renderer);

const renderPass = new RenderPass(scene, camera);
composer.addPass(renderPass);

const bloomPass = new UnrealBloomPass(
  new THREE.Vector2(window.innerWidth, window.innerHeight),
  1.5,  // strength
  0.4,  // radius
  0.85  // threshold
);
composer.addPass(bloomPass);
```

### Performance Targets

```javascript
const performanceConfig = {
  targetFPS: 60,
  minFPS: 30,
  maxDrawCalls: 50,
  maxMemory: 150 * 1024 * 1024,  // 150MB
  
  // Quality tiers
  low: {
    shadows: false,
    antialias: false,
    postProcessing: false,
    pixelRatio: 1
  },
  
  medium: {
    shadows: true,
    antialias: true,
    postProcessing: true,
    pixelRatio: 1.5
  },
  
  high: {
    shadows: true,
    antialias: true,
    postProcessing: true,
    pixelRatio: 2
  }
};
```

---

## 18. MOBILE OPTIMIZATION

### Fullscreen Implementation

```javascript
function enterFullscreen() {
  if (document.documentElement.requestFullscreen) {
    document.documentElement.requestFullscreen();
  } else if (document.documentElement.webkitRequestFullscreen) {
    document.documentElement.webkitRequestFullscreen();
  }
}

// Lock orientation
if (screen.orientation && screen.orientation.lock) {
  screen.orientation.lock('portrait').catch(err => {
    console.warn('Orientation lock failed:', err);
  });
}

// Hide browser UI
window.addEventListener('load', () => {
  setTimeout(() => {
    window.scrollTo(0, 1);
  }, 100);
});
```

### Viewport Setup

```html
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
```

### Performance Monitoring

```javascript
class PerformanceMonitor {
  constructor() {
    this.frameCount = 0;
    this.lastTime = performance.now();
    this.fps = 60;
  }
  
  update() {
    this.frameCount++;
    const now = performance.now();
    
    if (now >= this.lastTime + 1000) {
      this.fps = Math.round(this.frameCount * 1000 / (now - this.lastTime));
      this.frameCount = 0;
      this.lastTime = now;
      
      if (this.fps < 30) {
        console.warn('Low FPS detected, reducing quality');
        this.reduceQuality();
      }
    }
  }
  
  reduceQuality() {
    // Disable shadows
    renderer.shadowMap.enabled = false;
    
    // Reduce pixel ratio
    renderer.setPixelRatio(1);
    
    // Disable bloom
    bloomPass.enabled = false;
  }
}
```

---

## 19. DEVELOPMENT PHASES

### Phase 1: Core Mechanics (Week 1)
**Goals:**
- ✓ State machine working
- ✓ Input system functional
- ✓ Platform spawning
- ✓ Collision detection
- ✓ Basic lane switching
- ✓ Score calculation

**Deliverables:**
- Playable prototype
- Death on wrong lane
- Score display
- Restart functionality

---

### Phase 2: User Experience (Week 2)
**Goals:**
- ✓ All UI screens
- ✓ Onboarding flow
- ✓ Difficulty scaling
- ✓ Asset loading
- ✓ Audio integration
- ✓ Daily tasks

**Deliverables:**
- Complete menu system
- Smooth transitions
- Sound effects
- Music loop
- Task tracking

---

### Phase 3: Polish & Launch (Week 3)
**Goals:**
- ✓ VFX and animations
- ✓ Ad integration
- ✓ i18n
- ✓ Mobile optimization
- ✓ Style system
- ✓ Store assets

**Deliverables:**
- Production build
- Store graphics
- Launch-ready game

---

## 20. QUALITY CHECKLIST

Before launch, verify:

### Functional
- [ ] State transitions work correctly
- [ ] Platform spawning is seamless
- [ ] Collision detection is accurate
- [ ] Input responds instantly
- [ ] Scoring calculates accurately
- [ ] High score persists
- [ ] Daily tasks track progress
- [ ] Ads trigger correctly
- [ ] Language switching works
- [ ] Settings persist

### Visual
- [ ] 60 FPS on target devices
- [ ] All 3 styles render correctly
- [ ] No z-fighting or clipping
- [ ] UI scales to all screen sizes
- [ ] Animations are smooth
- [ ] Rule icons are clear

### Audio
- [ ] All sounds play correctly
- [ ] Music loops seamlessly
- [ ] Volume controls work
- [ ] No audio glitches on mobile

### Mobile
- [ ] Fullscreen works
- [ ] Portrait lock active
- [ ] No scroll/zoom
- [ ] Touch targets are 44px+
- [ ] No console errors
- [ ] Loading time < 3 seconds

---

## 22. ERROR HANDLING & CRASH RECOVERY

### Runtime Error Recovery

**Global Error Handler:**
```javascript
window.addEventListener('error', (event) => {
  console.error('Runtime error:', event.error);
  
  // Don't crash for minor errors
  if (isCriticalError(event.error)) {
    handleCriticalError(event.error);
  }
  
  event.preventDefault();
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason);
  
  if (isCriticalError(event.reason)) {
    handleCriticalError(event.reason);
  }
  
  event.preventDefault();
});
```

**Critical Error Detection:**
```javascript
function isCriticalError(error) {
  const criticalPatterns = [
    'WebGL',
    'Cannot read property',
    'is not a function',
    'Maximum call stack',
    'Out of memory'
  ];
  
  const errorMessage = error?.message || String(error);
  
  return criticalPatterns.some(pattern => 
    errorMessage.includes(pattern)
  );
}
```

**Recovery Modal:**
```javascript
function handleCriticalError(error) {
  // Pause game immediately
  if (gameState.currentState === 'PLAYING') {
    gameState.transition('PAUSED');
  }
  
  // Show error modal
  showErrorModal({
    title: 'Something went wrong',
    message: 'The game encountered an unexpected error.',
    details: error.message, // Only in dev mode
    buttons: [
      {
        text: 'Restart Game',
        action: () => {
          window.location.reload();
        }
      },
      {
        text: 'Return to Menu',
        action: () => {
          resetGameState();
          gameState.transition('MENU');
        }
      }
    ]
  });
  
  // Log to analytics (if available)
  logError({
    type: 'critical_runtime_error',
    message: error.message,
    stack: error.stack,
    gameState: gameState.currentState,
    timestamp: Date.now()
  });
}
```

**Error Modal UI:**
```
┌─────────────────────┐
│   ⚠️ ERROR          │
│                     │
│ Something went      │
│ wrong               │
│                     │
│ The game            │
│ encountered an      │
│ unexpected error.   │
│                     │
│ [ Restart Game ]    │
│ [ Return to Menu ]  │
└─────────────────────┘
```

### Safe State Reset

```javascript
function resetGameState() {
  try {
    // Clear active objects
    platformPool.recycleAll();
    
    // Reset player position
    player.position.set(0, 0, 0);
    
    // Reset game variables
    currentScore = 0;
    currentLane = 1;
    gameSpeed = 5;
    
    // Clear animations
    gsap.killTweensOf('*');
    
    // Reset state machine
    gameState.reset();
    
    console.log('Game state reset successfully');
  } catch (resetError) {
    console.error('Failed to reset game state:', resetError);
    // Last resort: full reload
    window.location.reload();
  }
}
```

### Graceful Degradation

**Asset Load Failures:**
```javascript
async function loadAssetSafe(url, fallback) {
  try {
    return await loadAsset(url);
  } catch (error) {
    console.warn(`Failed to load ${url}, using fallback`);
    return fallback;
  }
}

// Example usage
const character = await loadAssetSafe(
  'models/character.glb',
  createFallbackCharacter() // Simple box geometry
);
```

**WebGL Context Loss:**
```javascript
canvas.addEventListener('webglcontextlost', (event) => {
  event.preventDefault();
  console.warn('WebGL context lost');
  
  showNotification('Graphics error - reloading...');
  
  setTimeout(() => {
    window.location.reload();
  }, 1000);
});

canvas.addEventListener('webglcontextrestored', () => {
  console.log('WebGL context restored');
  reinitializeRenderer();
});
```

### User-Friendly Error Messages

**Error Categories:**

1. **Network Errors:**
   ```
   "Cannot connect to server"
   → "Check your internet connection"
   ```

2. **Storage Errors:**
   ```
   "localStorage quota exceeded"
   → "Please free up browser storage"
   ```

3. **Graphics Errors:**
   ```
   "WebGL context lost"
   → "Reloading game..."
   ```

4. **Generic Errors:**
   ```
   "Unknown error"
   → "Something went wrong. Please restart."
   ```

### Error Logging (Optional)

```javascript
class ErrorLogger {
  constructor() {
    this.errors = [];
    this.maxLogs = 50;
  }
  
  log(error) {
    const errorLog = {
      timestamp: Date.now(),
      message: error.message,
      stack: error.stack,
      gameState: gameState.currentState,
      userAgent: navigator.userAgent
    };
    
    this.errors.push(errorLog);
    
    // Keep only recent errors
    if (this.errors.length > this.maxLogs) {
      this.errors.shift();
    }
    
    // Store in localStorage for post-crash analysis
    try {
      localStorage.setItem('error_logs', JSON.stringify(this.errors));
    } catch (e) {
      // Storage full - clear old logs
      this.errors = [errorLog];
    }
  }
  
  getRecentErrors() {
    return this.errors.slice(-10);
  }
}
```

### Testing Error Handling

**Simulated Errors (Dev Mode Only):**
```javascript
if (isDevelopment) {
  window.simulateError = (type) => {
    switch(type) {
      case 'crash':
        throw new Error('Simulated crash');
      case 'context-loss':
        renderer.forceContextLoss();
        break;
      case 'storage-full':
        localStorage.setItem('test', 'x'.repeat(10000000));
        break;
    }
  };
}
```

---

## 23. KNOWN CONSTRAINTS

### Technical Limitations
- WebGL 2.0 required
- Minimum 2GB RAM recommended
- Safari < 15 may have issues
- No offline mode

### Design Constraints
- Portrait only (no landscape)
- 3 lanes maximum (core mechanic)
- Single tap input only
- No save states mid-game

---

**END OF ANALYSIS - 23 SECTIONS COMPLETE**

This document is the complete specification for SHIFT OR DIE.
All systems, formulas, behaviors, and edge cases are defined.
Use in conjunction with prompts_FINAL_COMPLETE.md for full implementation.
