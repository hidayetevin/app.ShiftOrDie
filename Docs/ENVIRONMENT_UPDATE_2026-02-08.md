# SHIFT OR DIE - Environment & Controls Update

**Date**: 2026-02-08 (Session 2)  
**Session Focus**: Dungeon Environment, Swipe Controls & Character Movement

---

## 🏰 Dungeon Environment System

### 1. Environment Manager (NEW)
**File**: `src/systems/EnvironmentManager.js`

**Features**:
- **Textured Walls**: Crate.gif texture on corridor walls
- **Textured Floor**: Scrolling ground texture for movement illusion
- **Ceiling**: Dark overhead surface
- **Wall Decorations**: Random stacked cubes (1-3 height) on walls
- **Atmospheric Lighting**: Ambient + Directional + Point lights (torch effect)

**Technical Implementation**:
```javascript
// Floor texture scrolling
this.floorTexture.offset.y -= gameSpeed * deltaTime * 0.2;

// Wall cube recycling (infinite loop)
cube.position.z -= gameSpeed * deltaTime;
if (cube.position.z < -20) {
    cube.position.z += 200;
}
```

**Lighting Setup**:
- **Ambient Light**: 0.4 intensity (base illumination)
- **Directional Light**: 0.6 intensity, shadow casting (1024x1024 map)
- **Hemisphere Light**: Sky/Ground color (0x87ceeb / 0x2a2a2a)
- **Point Lights**: Orange torches (0xffaa55) every 30 units, NO shadows (performance)

**Performance Optimization**:
- Reduced point light count: 15 units → 30 units spacing
- Disabled shadow casting on point lights (GPU texture limit fix)
- Lowered shadow map resolution: 2048 → 1024

---

## 🎮 Enhanced Input System

### 2. Swipe/Drag Gesture Controls
**File**: `src/systems/InputManager.js`

**Gestures**:
- **Horizontal Swipe (Left/Right)**: Lane switching
- **Vertical Swipe (Up)**: Jump

**Detection Logic**:
```javascript
// Determine dominant direction
if (Math.abs(deltaX) > Math.abs(deltaY)) {
    // Horizontal → Lane switch
} else {
    // Vertical (up only) → Jump
}
```

**Directional Mapping**:
- Swipe RIGHT → Player moves LEFT
- Swipe LEFT → Player moves RIGHT
- Swipe UP → Player jumps

**Threshold**: 30 pixels minimum for gesture recognition

---

## 🏃 Character Movement Enhancements

### 3. Diagonal Lane Switching
**File**: `src/systems/Player.js` - `switchLane()` method

**Animation Phases**:
1. **Turn Diagonal** (60% duration): Character rotates to NE/NW
   - Left swipe: `+1.0` radians (≈57° left)
   - Right swipe: `-1.0` radians (≈57° right)
2. **Return Forward** (40% duration): Character rotates back to north (0°)

**Visual Effect**:
- Character appears to "lean into" the lane change
- Creates illusion of diagonal forward movement
- Returns to straight-ahead facing after completing shift

**Timeline**:
```
[0.0s] ──► Straight ahead
[0.18s] ─► MAX diagonal (NE/NW)
[0.3s] ──► Straight ahead (completed)
```

### 4. Jump Mechanic
**File**: `src/systems/Player.js` - `jump()` method

**Properties**:
- **Height**: 1.5 units
- **Duration**: 0.4 seconds (0.2s up, 0.2s down)
- **Easing**: Power2 (smooth arc)
- **Protection**: `isJumping` flag prevents double-jump
- **VFX**: Green particle burst on takeoff

**Trigger**: Vertical swipe upward

---

## 🎨 Visual Cleanup

### 5. Platform Visibility
**File**: `src/systems/PlatformManager.js`

**Change**:
- **Hidden**: Green safe platforms (removed from view)
- **Visible**: Only obstacle cubes on hazard lanes

**Rationale**:
- Cleaner visual aesthetic
- Focus on obstacles only
- Corridor appears as continuous floor texture

---

## 📦 Asset Usage

**Textures**:
- `public/textures/crate.gif`:
  - Floor (4x40 repeat)
  - Walls (1x40 repeat)
  - Wall decoration cubes
  - Obstacle cubes

---

## 🔧 Technical Details

### Environment Integration
**File**: `src/core/Game.js`

1. Removed simple ground plane
2. Removed basic lighting setup
3. Added EnvironmentManager initialization:
   ```javascript
   this.environment = new EnvironmentManager(this.scene);
   ```
4. Added environment update in game loop:
   ```javascript
   this.environment.update(deltaTime, this.currentSpeed);
   ```

### Animation System
**GSAP Timelines** for smooth multi-phase animations:
- Position (X-axis): Lane movement
- Rotation (Y-axis): Diagonal facing
- Position (Y-axis): Jump (separate timeline)

### Collision Detection
No changes - existing collision system works with new visuals

---

## 🎯 User Experience Improvements

### Before vs After

**Before**:
- Tap to switch lanes (instant)
- Static green/red platforms
- Simple gray ground
- Basic walls

**After**:
- Swipe gestures (left/right/up)
- Character leans into lane changes
- Jump mechanic on upward swipe
- Textured dungeon corridor
- Animated environment (scrolling floor, moving wall cubes)
- Minimal visual clutter (no green platforms)

---

## 🐛 Bug Fixes

1. **GPU Texture Limit Error**:
   - **Problem**: Too many shadow-casting lights (>16 texture units)
   - **Solution**: Disabled shadows on point lights, reduced count
   
2. **Reverse Movement**:
   - **Problem**: Character rotation caused backward walking
   - **Solution**: Adjusted rotation to work with model's base `Math.PI` rotation

3. **Inverted Controls**:
   - **Problem**: Swipe direction opposite to player movement
   - **Solution**: Reversed directional mapping for intuitive feel

---

## 📝 Configuration Updates

**No changes to** `Config.js` - all values remain using existing constants:
- `CONFIG.PLAYER.SWITCH_DURATION`
- `CONFIG.LANE.POSITIONS`
- `CONFIG.LANE.COUNT`

---

## 🚀 Next Steps (Suggested)

- [ ] Add separate jump sound effect
- [ ] Ceiling texture/pattern
- [ ] More varied wall decorations
- [ ] Obstacle avoidance via jumping (collision during air-time)
- [ ] Speed-based floor scroll multiplier
- [ ] Character shadow on ground

---

**Total Files Modified**: 5  
**New Files Created**: 1 (EnvironmentManager.js)  
**Lines Added/Modified**: ~400+
