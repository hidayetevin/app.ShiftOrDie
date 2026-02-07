# SHIFT OR DIE – MASTER PROMPTS (PRODUCTION READY - COMPLETE)

Bu doküman, SHIFT OR DIE oyununu baştan sona geliştirmek için kullanılacak AI prompt'larını içerir.
Her prompt açık, görev odaklı ve yoruma kapalıdır.
Detaylı açıklamalar için **SHIFT_OR_DIE_analysis_FINAL.md** dosyasına bakın.

---

## GLOBAL SYSTEM PROMPT

You are a **Senior Mobile Game Engineer & Technical Artist**.

Your mission:
- Build a complete, production-ready Three.js mobile game
- Follow the analysis document exactly
- No assumptions, no placeholders, no "TODO" comments
- Mobile-first, 60 FPS target
- Every system must be fully functional

---

## PROMPT 1 – PROJECT SETUP

**Role:** Senior Three.js Developer

**Task:**
Create the base project structure for SHIFT OR DIE.

**Requirements:**
1. Setup project (Vite + Vanilla JS or React + Three.js)
2. Create folder structure:
   ```
   /src
     /core       (game loop, state machine, config)
     /scenes     (menu, game, gameover)
     /ui         (modals, buttons, HUD)
     /systems    (collision, input, ads, audio, i18n, platform)
     /assets     (models, textures, sounds)
   ```
3. Initialize Three.js scene with:
   - PerspectiveCamera
   - WebGLRenderer (antialias: true)
   - Automatic resize handling
4. Enable mobile fullscreen (immersive mode)
   - Hide browser navigation
   - Portrait orientation lock
   - Prevent scroll/zoom

**Output:**
- Working empty scene
- Mobile fullscreen structure
- 60 FPS baseline

---

## PROMPT 2 – STATE MACHINE

**Role:** Game Systems Architect

**Task:**
Implement the Finite State Machine (see analysis §7).

**States:**
- LOADING
- MENU
- PLAYING
- PAUSED
- GAMEOVER
- REWARDED_AD

**Requirements:**
1. Create clean state transition system
2. Follow strict transition rules (defined in analysis)
3. Prevent invalid transitions
4. Emit events on state change
5. Integrate with game loop

**Technical:**
```javascript
class GameStateMachine {
  constructor() {
    this.currentState = 'LOADING';
    this.validTransitions = { /* see analysis */ };
  }
  
  transition(newState) {
    // Validate and transition
  }
}
```

**Output:**
- Fully functional state machine
- Clean transition logic
- Event system integration

---

## PROMPT 3 – THREE.JS SCENE DESIGN

**Role:** Technical Artist & Graphics Programmer

**Task:**
Build the 3D scene environment (see analysis §16).

**Requirements:**
1. **Camera Setup:**
   - PerspectiveCamera
   - Follow player smoothly
   - Subtle camera shake on events

2. **Lighting:**
   - AmbientLight (low intensity)
   - DirectionalLight with shadows
   - Hemisphere light for depth

3. **Performance:**
   - InstancedMesh for platforms
   - Object pooling for all repeating objects
   - Single draw-call ground plane

4. **Post-Processing:**
   - EffectComposer setup
   - Bloom pass (style-dependent intensity)
   - Vignette effect
   - (see analysis §13 for style variations)

**Output:**
- Optimized 3D scene
- Style-switchable rendering
- <50 draw calls

---

## PROMPT 4 – PLATFORM & COLLISION SYSTEM

**Role:** Gameplay Systems Engineer

**Task:**
Implement platform generation and collision detection (see analysis §21).

**Platform Generation:**

1. **Spawning System:**
   ```javascript
   const platformConfig = {
     spawnInterval: 1.5,      // seconds between platforms
     spawnDistance: 20,       // units ahead of player
     lanePositions: [-2, 0, 2], // X coordinates
     platformLength: 4,       // Z-axis length
     platformWidth: 1.8,      // X-axis width
     poolSize: 30             // object pool size
   };
   ```

2. **Object Pooling:**
   - Create 30 platform instances at start
   - Reuse platforms that passed behind player
   - Never destroy/create during gameplay

3. **Rule Assignment:**
   ```javascript
   function assignRuleToLanes() {
     const rule = getCurrentRule(); // from difficulty system
     
     // Example: "Red Kills"
     lanes[0].color = 0xff0000;  // Red = death
     lanes[1].color = 0x00ff00;  // Green = safe
     lanes[2].color = 0x00ff00;  // Green = safe
     
     // Update platform materials
     updatePlatformColors();
   }
   ```

4. **Safe Zone (First 3 seconds):**
   - All platforms same color (safe)
   - No rule changes
   - Player cannot die

**Collision Detection:**

1. **Method: AABB (Axis-Aligned Bounding Box)**
   ```javascript
   function checkCollision() {
     const playerBox = new THREE.Box3().setFromObject(player);
     
     for (const platform of activePlatforms) {
       const platformBox = new THREE.Box3().setFromObject(platform);
       
       if (playerBox.intersectsBox(platformBox)) {
         handleCollision(platform);
       }
     }
   }
   ```

2. **Collision Response:**
   ```javascript
   function handleCollision(platform) {
     // Check if player is on correct lane
     if (platform.userData.rule === 'RED_KILLS' && platform.material.color.getHex() === 0xff0000) {
       if (currentLane === getPlatformLane(platform)) {
         triggerDeath();
       }
     }
   }
   ```

3. **Check Frequency:**
   - Every frame during PLAYING state
   - Only check platforms within 5 units of player

**Platform Visualization:**

1. **Base Platform Mesh:**
   ```javascript
   const geometry = new THREE.BoxGeometry(1.8, 0.2, 4);
   const material = new THREE.MeshStandardMaterial({
     color: 0x00ff00,
     metalness: 0.3,
     roughness: 0.7
   });
   ```

2. **Rule Icons:**
   - Sprite above platform center
   - Billboard to always face camera
   - Scale: 0.8 units
   - Alpha fade on rule change

3. **Special Effects:**
   - Blinking: opacity oscillate 0.3 - 1.0 (1Hz)
   - Arrows: animated sprite rotation
   - Temporary: fade in/out over 2 seconds

**Implementation Requirements:**
- See analysis §21 for complete formulas
- Platform recycling must be seamless
- No stuttering when spawning
- Collision checks < 2ms per frame

**Output:**
- Working platform generation
- Accurate collision detection
- Rule visualization system
- Object pooling functional

---

## PROMPT 5 – UI SYSTEM

**Role:** UI/UX Developer

**Task:**
Create all UI screens and modals (see analysis §9).

**Screens to Build:**

### 1. Main Menu
- Total Coins display
- High Score display
- Buttons:
  - Play Game
  - Daily Tasks
  - Style
  - Settings

### 2. Game HUD
- Current Score (top center)
- Pause button (top right)
- Combo indicator (shows when active)

### 3. Pause Modal
- Continue
- Restart
- Quit to Menu

### 4. Game Over Screen
- Final Score
- High Score (if beaten, show "NEW RECORD!" animation)
- Buttons:
  - Continue (Rewarded Ad)
  - Restart
  - Main Menu

### 5. Daily Tasks Modal
- 3 daily tasks with progress bars
- Claim reward button (when completed)
- Close button

### 6. Style Selection Modal
- 3 style options (Neon / Minimal / Stylized)
- Preview thumbnails
- Apply button

### 7. Settings Modal
- Music On/Off toggle
- SFX On/Off toggle
- Language selector (TR / EN)
- Close button

**Technical:**
- Canvas overlay HTML or Three.js UI
- Mobile-optimized touch targets (min 44px)
- Smooth transitions (GSAP)
- Responsive to all screen sizes

**Output:**
- Complete UI system
- All modals functional
- Professional appearance

---

## PROMPT 6 – INPUT SYSTEM

**Role:** Input Systems Engineer

**Task:**
Implement touch input (see analysis §8).

**Requirements:**
1. **Single Tap Only:**
   - No swipe
   - No hold
   - No multi-touch

2. **Lane Switching:**
   - Each tap cycles: Lane 0 → 1 → 2 → 0
   - Smooth GSAP animation (0.15s)
   - Play "shift" sound

3. **Event Handling:**
   ```javascript
   canvas.addEventListener('touchstart', (e) => {
     e.preventDefault();
     if (gameState !== 'PLAYING') return;
     if (e.touches.length > 1) return;
     switchLane();
   }, { passive: false });
   ```

4. **Active Only in PLAYING State:**
   - Disable input in other states
   - Re-enable on state transition

**Output:**
- Responsive tap control
- No input lag
- Multi-touch prevented

---

## PROMPT 7 – SCORE SYSTEM

**Role:** Game Economy Designer

**Task:**
Implement scoring system (see analysis §4).

**Formula:**
```
Base Score = Time Survived (seconds) × 100
Perfect Shift Bonus = +50 points
Combo Multiplier:
  - 3 perfect shifts → 2x
  - 6 perfect shifts → 3x (max)

Final Score = (Base Score + Bonuses) × Multiplier
```

**Perfect Shift Definition:**
Correct lane switch within 0.5s after rule change.

**Requirements:**
1. Real-time score calculation
2. Combo counter UI
3. High score persistence (localStorage: `shift_or_die_highscore`)
4. "NEW RECORD!" animation on beat
5. Score displayed in HUD and Game Over

**Output:**
- Complete scoring system
- Combo mechanics
- High score tracking

---

## PROMPT 8 – DIFFICULTY SCALING

**Role:** Game Balance Designer

**Task:**
Apply difficulty curve (see analysis §5).

**Speed Progression:**
```
Start Speed: 5 units/second
Increment: +0.5 every 5 seconds
Max Speed: 15 units/second (at 30s)
```

**Rule Change Frequency:**
```
0–10s:  every 5s
10–20s: every 4s
20–30s: every 3s
30+s:   every 2.5s
```

**Visual Complexity:**
```
0–15s:  Basic rules only (red/green)
15–25s: Add blinking lanes
25+s:   Add fake lanes + directional arrows
```

**Implementation:**
```javascript
const difficultyConfig = {
  speed: { base: 5, increment: 0.5, interval: 5, max: 15 },
  ruleChange: [
    { time: 0, interval: 5 },
    { time: 10, interval: 4 },
    { time: 20, interval: 3 },
    { time: 30, interval: 2.5 }
  ]
};
```

**Output:**
- Mathematical difficulty scaling
- No randomness
- Predictable progression

---

## PROMPT 9 – ONBOARDING (CONTEXTUAL)

**Role:** UX Designer

**Task:**
Implement first-time user experience (see analysis §6).

**No Classic Tutorial:**
Learning happens through play.

**First Run (localStorage: has_played = null):**
- 50% game speed
- First rule fixed for 8 seconds
- Minimal touch hint (finger + arrow icon, fades after 3s)

**Second Run:**
- Normal speed
- Rule changes every 5s

**Third Run and Beyond:**
- Full difficulty scaling active

**Implementation:**
```javascript
if (localStorage.getItem('has_played') === null) {
  gameSpeed = 0.5;
  firstRuleDuration = 8000;
  showTouchHint = true;
  localStorage.setItem('has_played', 'true');
} else {
  gameSpeed = 1.0;
  firstRuleDuration = 3000;
  showTouchHint = false;
}
```

**Output:**
- Contextual learning
- No tutorial screens
- Smooth first experience

---

## PROMPT 10 – DAILY TASKS & COIN SYSTEM

**Role:** Progression Systems Designer

**Task:**
Implement daily tasks and coin economy (see analysis §11).

**Daily Tasks (3 per day):**
Examples:
- Survive for 30 seconds
- Make 50 lane shifts
- Get 10 perfect shifts

**Requirements:**
1. Tasks reset daily (check date in localStorage)
2. **Runtime validation:**
   - On app launch
   - On returning to MENU state
   - Every 60 seconds during MENU
3. Progress tracking in real-time
4. Coin rewards on completion
5. 2x reward option (Rewarded Ad)
6. **Reset timer display** (HH:MM until midnight)

**Implementation:**
```javascript
function validateDailyTasks() {
  const currentDate = new Date().toDateString();
  const storedDate = localStorage.getItem('last_task_date');
  
  if (storedDate !== currentDate) {
    resetDailyTasks();
    localStorage.setItem('last_task_date', currentDate);
    showNotification('New daily tasks available!');
  }
}

function getTimeUntilReset() {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);
  
  const diff = tomorrow - now;
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  
  return `${hours}h ${minutes}m`;
}
```

**Coin System:**

**Earning:**
- Daily task completion: 100-150 per task
- Total possible per day: 300-450 coins

**Spending (Launch Version):**
1. **Visual Styles:**
   - Neon Cyber: FREE (default)
   - Minimal Flat: 300 coins
   - Stylized Arcade: 500 coins

2. **(Future) Cosmetic Trails:**
   - Basic: 200 coins
   - Premium: 400 coins

**Important Rules:**
- NO gameplay advantages (purely cosmetic)
- Cannot buy continues (preserves ad monetization)
- Cannot skip difficulty

**Unlock Implementation:**
```javascript
function unlockStyle(styleName) {
  const price = stylePrices[styleName];
  const currentCoins = getCoinBalance();
  
  if (currentCoins < price) {
    showMessage('Not enough coins');
    return false;
  }
  
  setCoinBalance(currentCoins - price);
  unlockedStyles.push(styleName);
  saveUnlocks();
  
  showMessage(`${styleName} unlocked!`);
  playSoundEffect('purchase');
  return true;
}
```

**Display:**
- Main menu: Total coins
- Daily tasks modal: Reset timer (top)
- Style modal: Price tags on locked items

**localStorage Schema (see analysis §16):**
```javascript
{
  "total_coins": 850,
  "daily_tasks": {
    "date": "2026-02-07",
    "tasks": [...]
  },
  "unlocked_styles": ["neon"]
}
```

**Output:**
- Functional daily task system
- Runtime date validation
- Reset timer display
- Coin earning/spending
- Style unlock system
- Progress persistence

---

## PROMPT 11 – INTERNATIONALIZATION (i18n)

**Role:** Localization Engineer

**Task:**
Add multi-language support (TR / EN).

**Requirements:**
1. Create translation JSON files:
   ```
   /locales/tr.json
   /locales/en.json
   ```

2. Translate all UI text:
   - Menu buttons
   - Modal titles
   - Settings labels
   - Game over messages
   - Daily task descriptions

3. Language switching:
   - Selection in settings
   - Save to localStorage: `language`
   - Apply immediately (no restart)

4. Default language:
   - Detect from browser (navigator.language)
   - Fallback to English

**Output:**
- Complete i18n system
- TR/EN support
- Dynamic language switching

---

## PROMPT 12 – AD SYSTEM INTEGRATION

**Role:** Monetization Engineer

**Task:**
Implement ad system (see analysis §12).

**Ad Types:**

### 1. Rewarded Ads
- **Trigger:** Game Over → "Continue" button
- **Reward:** Resume game from death point
- **Frequency:** Maximum 1 per run

**Continue Logic (CRITICAL):**
```javascript
function continueAfterAd() {
  // Validation
  if (currentRun.usedContinue) {
    return; // Already used this run
  }
  
  // Respawn
  player.position.x = lanePositions[lastSafeLane];
  
  // Invulnerability
  player.userData.invulnerable = true;
  player.material.opacity = 0.5; // Ghost mode visual
  
  setTimeout(() => {
    player.userData.invulnerable = false;
    player.material.opacity = 1.0;
  }, 2000); // 2 seconds protection
  
  // Mark as used
  currentRun.usedContinue = true;
  
  // Resume (no score rollback)
  gameState.transition('PLAYING');
}
```

**Requirements:**
- Respawn at last safe lane
- 2 seconds invulnerability (visual feedback)
- No score rollback
- Limit: 1 continue per run
- Button state: grayed out after use
- Abuse prevention: track usage per run

### 2. Interstitial Ads
- **Trigger:** After every 2-3 games
- **Rule:** NOT shown on first game
- **Timing:** Between game over and menu

### 3. Banner Ads
- **Location:** Main menu, Settings screen only
- **Size:** 320x50 (standard mobile banner)

**Technical:**
1. Create modular ad system:
   ```javascript
   class AdManager {
     showRewarded(callback) { /* ... */ }
     showInterstitial() { /* ... */ }
     showBanner() { /* ... */ }
   }
   ```

2. Mock ad system for testing:
   ```javascript
   // 2s delay, then callback
   ```

3. Integration points:
   - Game over screen
   - Game session counter
   - State transitions

**Output:**
- Complete ad system
- Mock implementation
- Production-ready hooks
- Continue logic with all safeguards

---

## PROMPT 13 – AUDIO SYSTEM

**Role:** Audio Engineer

**Task:**
Implement sound system with on/off control.

**Sound Effects:**
- UI click (menu navigation)
- Lane shift (each tap)
- Coin pickup
- Death sound
- Perfect shift (bonus feedback)
- Combo milestone (2x, 3x)

**Music:**
- Loopable arcade track
- 120-140 BPM
- Electronic / minimal
- Tension-building

**Requirements:**
1. Respect settings:
   ```javascript
   if (settings.sfx) { playSound('shift'); }
   if (settings.music) { playMusic('main'); }
   ```

2. Preload all audio
3. Web Audio API or Howler.js
4. Volume control (music quieter than SFX)

**Output:**
- Complete audio system
- On/off toggles working
- No audio glitches

---

## PROMPT 14 – ASSET LOADING

**Role:** Performance Engineer

**Task:**
Progressive asset loader (see analysis §14).

**Loading Order:**
1. Critical UI elements (loading screen UI)
2. Character models (human + robot)
3. Rule icons (8-10 icons)
4. Sound files
5. VFX sprites

**Loading Screen:**
- "SHIFT OR DIE" logo (center)
- Progress bar (0-100%)
- "Loading..." text (i18n)
- Minimum display time: 1 second

**Implementation:**
```javascript
class AssetLoader {
  async loadAll() {
    await this.loadUIAssets();
    this.updateProgress(20);
    
    await this.loadCharacters();
    this.updateProgress(40);
    
    await this.loadRuleIcons();
    this.updateProgress(60);
    
    await this.loadSounds();
    this.updateProgress(80);
    
    await this.loadEffects();
    this.updateProgress(100);
    
    await this.ensureMinimumLoadTime(1000);
  }
}
```

**Fallback System:**
```javascript
// WebGL not supported
if (!WebGLDetector.isSupported()) {
  showErrorModal('WebGL not supported');
  return;
}

// Asset load failed
try {
  await load('character.glb');
} catch (err) {
  useDefaultGeometry(); // Simple cube/sphere
}
```

**Output:**
- Progressive loading
- User feedback
- Graceful degradation

---

## PROMPT 15 – MOBILE OPTIMIZATION

**Role:** Performance Engineer

**Task:**
Optimize for mobile devices.

**Targets:**
- FPS: 60 (minimum 30)
- Draw calls: <50
- Memory: <150MB
- First load: <3 seconds

**Optimizations:**
1. **Geometry:**
   - Low-poly models
   - InstancedMesh for platforms
   - Object pooling

2. **Textures:**
   - Max 512x512 for characters
   - Compressed formats (WebP)
   - Texture atlases

3. **Rendering:**
   - Frustum culling
   - LOD system (optional)
   - Conditional post-processing

4. **Quality Settings:**
   - Auto-detect device tier
   - Option to disable effects
   - Shadow quality adjustment

**Output:**
- Stable 60 FPS on mid-range phones
- Graceful performance scaling

---

## PROMPT 16 – STYLE SYSTEM

**Role:** Technical Artist

**Task:**
Implement 3 visual styles (see analysis §13).

**Styles:**

### 1. Neon Cyber
- High bloom intensity
- Dark background (#0a0a0a)
- Cyan + magenta accents
- Glowing edges
- Strong vignette

### 2. Minimal Flat
- No bloom
- Light background (#e0e0e0)
- Pastel colors
- Clean shapes
- Minimal shadows

### 3. Stylized Arcade
- Medium bloom
- Dark blue background (#1a1a2e)
- Saturated colors (orange, purple)
- Cartoon shading
- Medium vignette

**Requirements:**
1. Each style has separate post-processing config
2. Switchable in real-time (no reload)
3. Saved to localStorage: `selected_style`
4. Applied to all scene elements

**Output:**
- 3 fully functional styles
- Smooth switching
- Persistent selection

---

## AI ASSET GENERATION PROMPTS

---

## PROMPT 17 – CHARACTER ASSETS

**Global Rules for All AI Asset Generation:**
- Assets must be game-ready, not concept art
- Professional, commercial quality
- NO text, watermarks, or logos
- PNG with transparent background
- 1024x1024 resolution
- Mobile Three.js compatible

---

### PROMPT 17A – ROBOT CHARACTER

**Role:** Senior Game Character Artist

Create a **stylized sci-fi robot character** for mobile arcade game.

**Details:**
- Humanoid proportions
- Slightly oversized head (appeal)
- Mechanical joints visible
- No exposed wires
- Matte metal materials
- Color palette: gunmetal gray + cyan light accents
- Glowing cyan eyes
- Emotionless but charismatic

**Pose:**
- Neutral idle stance
- Arms relaxed, feet shoulder-width apart

**Technical:**
- Full body visible, centered
- Transparent background
- High resolution (1024x1024)

**Purpose:** Playable character (Robot Style)

---

### PROMPT 17B – HUMAN CHARACTER

**Role:** Senior Game Character Artist

Create a **stylized human runner** for mobile arcade game.

**Details:**
- Gender neutral
- Athletic build
- Futuristic clothing
- No brand logos
- Clean shapes, readable from distance
- Color palette: dark outfit + neon accent lines
- Simplified facial features (friendly but focused)

**Pose:**
- Idle standing, slight forward lean

**Technical:**
- Full body visible, centered
- Transparent background
- High resolution (1024x1024)

**Purpose:** Playable character (Human Style)

---

### PROMPT 17C – NEON SILHOUETTE CHARACTER

**Role:** Senior Game Character Artist

Create a **neon silhouette character** for arcade game.

**Details:**
- No facial details
- Fully black silhouette
- Strong neon outline (choose ONE: purple OR cyan OR red)
- Glowing edges only
- No textures

**Pose:**
- Dynamic idle stance

**Purpose:** Unlockable visual style (Neon Mode)

---

## PROMPT 18 – GAME ASSETS

### PROMPT 18A – RULE ICONS (8-10 icons)

Create **minimal sci-fi rule icons** for mobile game.

**Icons Needed:**
1. Red prohibition (X mark)
2. Green safe (checkmark)
3. Blinking warning (hazard symbol)
4. Arrow right (directional)
5. Arrow left (directional)
6. Speed up (fast-forward)
7. Slow down (slow motion)
8. Temporary lane (dotted outline)

**Style:**
- Line-based, neon stroke
- Dark background friendly
- Consistent stroke width
- 256x256 each
- Transparent background

---

### PROMPT 18B – OBSTACLE ASSET

Create a **futuristic obstacle block** for mobile arcade game.

**Details:**
- Simple geometric shape
- Sharp edges, sci-fi panel lines
- Color: dark gray + warning neon stripe
- No text
- 512x512, transparent background

**Purpose:** Gameplay obstacle

---

### PROMPT 18C – COIN / COLLECTIBLE

Create a **stylized futuristic coin** for mobile game.

**Details:**
- Circular shape
- Glowing core
- Minimal details
- Sci-fi aesthetic
- Color: gold with subtle neon glow
- 256x256, transparent background

**Purpose:** In-game currency

---

## PROMPT 19 – UI ASSETS

### PROMPT 19A – UI ICON SET

Create **minimal sci-fi UI icons** for mobile game.

**Icons:**
- Play
- Pause
- Settings (gear)
- Restart (circular arrow)
- Exit (X)
- Sound on
- Sound off
- Language (globe)

**Style:**
- Line-based, neon stroke
- Dark background friendly
- 128x128 each
- Consistent stroke width

---

### PROMPT 19B – BACKGROUND

Create **futuristic endless arena background**.

**Details:**
- Abstract sci-fi environment
- No buildings or characters
- Depth perspective
- Dark tone with neon accents
- Suitable for tiling
- 2048x1024

**Purpose:** Game level background

---

## PROMPT 20 – VFX ASSETS

**Role:** Senior Game VFX Artist

Create game-ready visual effects for fast-paced mobile arcade.

**Effects Needed:**

1. **Player Death:**
   - Energy burst / disintegration
   - 8-frame sprite sheet
   - Alpha-based, no overdraw

2. **Perfect Shift:**
   - Screen pulse + glow
   - 6-frame sprite sheet
   - Additive blending

3. **Combo Chain:**
   - Streak effect
   - 8-frame sprite sheet
   - Neon colors

4. **Speed Trail:**
   - Motion blur behind character
   - 4-frame sprite sheet
   - Low opacity

**Technical:**
- PNG sprite sheets
- Transparent background
- Mobile performance friendly
- Dark background compatible

---

## PROMPT 21 – STORE ASSETS

**Role:** Mobile Store Visual Marketing Artist

Create store-ready visuals for Play Store / App Store.

**Assets:**

1. **App Icon**
   - 512x512 and 1024x1024
   - Character-focused
   - High contrast
   - No text

2. **Feature Graphic**
   - 1024x500
   - Action shot
   - Emotion-focused
   - Optional tagline space

3. **Screenshots** (5 frames)
   - 9:16 aspect ratio (1080x1920)
   - Show different game moments
   - UI visible
   - High score visible

4. **Promo Banner**
   - 1280x720
   - Character + logo
   - High energy composition

**Rules:**
- No text unless specified
- High contrast
- Conversion-optimized

---

## PROMPT 22 – SOUND GENERATION

**Role:** Mobile Game Sound Designer

Create sound effects for arcade game.

**Sounds:**
- Button click (short, punchy)
- Shift action (whoosh)
- Perfect timing reward (chime)
- Death sound (crash/explosion)
- Coin pickup (ding)
- Daily reward claim (fanfare)

**Music:**
- Loopable track
- 120-140 BPM
- Electronic / minimal / tension-based
- Non-distracting
- No vocals
- Clean loop point

**Technical:**
- Format: MP3 or OGG
- Max 200KB per file
- Normalized volume

---

## PROMPT 22 – ERROR HANDLING & RECOVERY

**Role:** Quality Assurance Engineer

**Task:**
Implement comprehensive error handling and crash recovery (see analysis §22).

**Global Error Handlers:**
```javascript
window.addEventListener('error', (event) => {
  console.error('Runtime error:', event.error);
  
  if (isCriticalError(event.error)) {
    handleCriticalError(event.error);
  }
  
  event.preventDefault();
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('Promise rejection:', event.reason);
  
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
  return criticalPatterns.some(p => errorMessage.includes(p));
}
```

**Recovery Flow:**
1. Pause game immediately
2. Show user-friendly error modal
3. Offer recovery options:
   - Restart Game (reload page)
   - Return to Menu (safe reset)
4. Log error for debugging

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

**Safe State Reset:**
```javascript
function resetGameState() {
  try {
    platformPool.recycleAll();
    player.position.set(0, 0, 0);
    currentScore = 0;
    currentLane = 1;
    gameSpeed = 5;
    gsap.killTweensOf('*');
    gameState.reset();
  } catch (resetError) {
    // Last resort: full reload
    window.location.reload();
  }
}
```

**WebGL Context Loss:**
```javascript
canvas.addEventListener('webglcontextlost', (event) => {
  event.preventDefault();
  showNotification('Graphics error - reloading...');
  setTimeout(() => window.location.reload(), 1000);
});
```

**Requirements:**
- Global error handlers for all uncaught errors
- Critical error detection
- User-friendly error messages
- Safe state reset function
- WebGL context loss handling
- Error logging (localStorage)
- Graceful fallbacks

**Output:**
- Complete error handling system
- Recovery modals
- Safe reset logic
- No silent failures

---

## PROMPT 23 – INTEGRATION & TESTING

**Role:** Lead Game Developer

**Task:**
Integrate all systems and prepare for production.

**Checklist:**
1. ✓ All systems connected
2. ✓ State machine working
3. ✓ Platform spawning smooth
4. ✓ Collision detection accurate
5. ✓ UI fully functional
6. ✓ Scoring accurate
7. ✓ Difficulty scaling correct
8. ✓ Ads integrated (mock)
9. ✓ **Rewarded continue logic (1 per run, 2s invulnerability)**
10. ✓ Audio playing
11. ✓ i18n working
12. ✓ LocalStorage persisting
13. ✓ **Daily task runtime validation**
14. ✓ **Reset timer displayed**
15. ✓ **Coin economy (style unlocks working)**
16. ✓ **Error handlers catching crashes**
17. ✓ **Recovery modal functional**
18. ✓ Mobile fullscreen active

**Testing:**
- Test on real mobile device
- Portrait orientation locked
- 60 FPS stable
- No console errors
- All transitions smooth
- Platform spawning seamless
- **Leave game open overnight (date change test)**
- **Trigger errors (WebGL loss, storage full)**
- **Test continue: invulnerability works**
- **Test style unlock: coins deducted correctly**

**Edge Cases:**
- [ ] Date changes during gameplay → tasks reset on return to menu
- [ ] Continue already used → button disabled
- [ ] Not enough coins → unlock fails gracefully
- [ ] WebGL context lost → game reloads
- [ ] Critical runtime error → recovery modal shown

**Bug Fixes:**
- Clean up all TODO comments
- Remove console.logs
- Fix any edge cases
- Polish animations

**Output:**
- Production-ready build
- Deployment package
- README with setup instructions

---

## FINAL RULE

After completing each prompt:
1. Confirm what was built
2. Show file structure changes
3. Highlight any issues
4. Wait for next prompt

Do not proceed to next prompt without explicit instruction.

---

**END OF PROMPTS - 24 TOTAL**
