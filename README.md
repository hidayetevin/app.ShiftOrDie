# SHIFT OR DIE - Mobile Arcade Game

A high-performance, single-tap arcade survival game built with **Three.js** and **Vite**.

## Features

- **Dynamic Lane System**: Switch between 3 lanes to survive rapidly changing rules.
- **Visual Styles**: Unlock and switch between Neon Cyber, Minimal Flat, and Stylized Arcade modes.
- **Daily Tasks**: Complete survival and skill-based challenges to earn coins.
- **Monetization**: Watch ads to continue from your last death point with temporary invulnerability.
- **Mobile Optimized**: Immersive fullscreen, portrait orientation, and smooth 60 FPS performance.

## Tech Stack

- **Three.js**: 3D Graphics and Post-processing.
- **GSAP**: Smooth UI and Gameplay animations.
- **Vite**: Modern build tool and dev server.
- **Vanilla CSS**: Premium glassmorphism and neon aesthetics.

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm

### Installation

1. Install dependencies:
   ```bash
   npm install
   ```

2. Run the development server:
   ```bash
   npm run dev
   ```

3. Open in browser:
   - Access the URL provided by Vite (e.g., `http://localhost:5173`).
   - For mobile testing, use your local IP on the mobile browser.

## Project Structure

- `/src/core`: Game loop, State machine, and central Config.
- `/src/systems`: Specialized logic for Platforms, Rules, Input, Scoring, and Ads.
- `/src/ui`: HTML/CSS based UI screens and overlays.
- `/src/assets`: Place your 3D models, textures, and sounds here.

## Controls

- **Tap / Click**: Cycle Lanes (Left -> Center -> Right -> Left).
- **Pause Button**: Opens the pause menu.

---

*Built with precision for Shift Or Die enthusiasts.*
