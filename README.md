# 🏰 HiveWar Pro

**Mobile-first alliance hive planner for Last War: Survival**

> Plan, export, and share your hive layouts with ease. The ultimate tool for alliance coordination during wars and seasons.

![HiveWar Pro](https://img.shields.io/badge/Last%20War-Survival-purple)
![Version](https://img.shields.io/badge/version-1.0.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)

## 🚀 Features

### Core Features (MVP)
- **50x50 Grid Canvas** - Interactive canvas with zoom, pan, and touch support
- **Drag & Drop Buildings** - 20+ building types including HQs, defenses, production, and seasonal buildings
- **Snap-to-Grid** - Buildings automatically snap to grid positions
- **Rotate & Level Controls** - Customize building rotation (0°, 90°, 180°, 270°) and levels
- **Player Name Labels** - Assign player names to buildings for coordination
- **Defense Power Calculator** - See your hive's total defense score

### Export & Share
- **PNG Export** - Download high-quality images for Discord/Reddit sharing
- **JSON Export** - Save full plan data for backup
- **Share Links** - Generate compressed URLs that load your plan

### Plan Management
- **Multiple Plans** - Create and manage multiple hive layouts
- **Auto-Save** - Plans automatically save to local storage
- **Import/Export** - Share plans as JSON files

### Mobile-First Design
- **Touch Optimized** - Pinch to zoom, drag to pan
- **Responsive Layout** - Works on phones, tablets, and desktops
- **PWA Ready** - Install as an app on mobile devices

## 🛠️ Tech Stack

- **Frontend**: React 18 + TypeScript
- **Canvas**: Konva.js + react-konva
- **Build Tool**: Vite
- **Styling**: Pure CSS with CSS variables
- **Storage**: LocalStorage + URL compression (lz-string)

## 🏃‍♂️ Quick Start

### Prerequisites
- Node.js 18+
- npm or yarn

### Installation

```bash
# Clone the repository
git clone <your-repo-url>
cd lastwarmobilegame_addonapp

# Install dependencies
npm install

# Start development server
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

### Build for Production

```bash
npm run build
npm run preview
```

## 📖 Usage Guide

### Planning a Hive

1. **Select a Building** - Click on a building type in the left/bottom palette
2. **Place on Grid** - Click on the grid to place the building
3. **Adjust Properties** - Click on a placed building to:
   - Change position (X, Y coordinates)
   - Adjust level (1-30)
   - Rotate (0°, 90°, 180°, 270°)
   - Add player name
   - Add notes

### Sharing Your Plan

1. Click the **🔗 Share** button in the toolbar
2. Options:
   - **Copy Link** - Share URL with your alliance
   - **Download PNG** - Save image for Discord/Reddit
   - **Download JSON** - Backup your plan data

### Managing Plans

1. Click the **☰ Menu** button
2. Create new plans, switch between plans, or import existing ones

## 🎮 Building Types

| Category | Buildings |
|----------|-----------|
| **Headquarters** | HQ, Marshal HQ, R4 HQ |
| **Defense** | Wall, Anti-Air Tower, Artillery Tower, Bunker |
| **Production** | Barracks, Vehicle Factory, Airfield, Hospital |
| **Seasonal (S5)** | Saloon, Sheriff's Office, Gold Mine, Train Station |
| **Special** | Rally Point, Resource Tile, Danger Zone, Empty Slot |

## 🎨 Customization

### Adding New Buildings

Edit `src/data/buildings.ts` to add new building types:

```typescript
{
  id: 'new-building',
  name: 'New Building',
  category: 'defense',
  width: 2,
  height: 2,
  color: '#FF5733',
  icon: '🏢',
  maxLevel: 20,
  description: 'Description here'
}
```

## 🤝 Contributing

Contributions are welcome! Please feel free to submit issues and pull requests.

## 📝 Roadmap

- [ ] Real-time collaboration (multiple users editing)
- [ ] AI optimizer ("Max defense vs air")
- [ ] Raid simulator
- [ ] Discord bot integration
- [ ] More seasonal building presets
- [ ] Template library from top alliances

## 📄 License

MIT License - feel free to use this for your own projects!

---

**Made with ❤️ for the Last War community**

*Not affiliated with First Fun or Last War: Survival. This is an unofficial community tool.*
