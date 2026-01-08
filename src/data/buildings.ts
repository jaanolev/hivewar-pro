import type { BuildingType } from '../types';

// Core building types for Last War: Survival
// Buildings are measured in grid tiles (1 tile = base unit)

export const BUILDING_TYPES: BuildingType[] = [
  // Headquarters - Player bases (1x1 to 3x3 depending on level visualization)
  {
    id: 'hq',
    name: 'Headquarters',
    category: 'headquarters',
    width: 2,
    height: 2,
    color: '#3B82F6',
    icon: '🏰',
    maxLevel: 30,
    description: 'Player main base - the core of any hive formation'
  },
  {
    id: 'hq-marshal',
    name: 'Marshal HQ',
    category: 'headquarters',
    width: 3,
    height: 3,
    color: '#8B5CF6',
    icon: '👑',
    maxLevel: 30,
    description: 'Alliance leader/officer headquarters'
  },
  {
    id: 'hq-r4',
    name: 'R4 HQ',
    category: 'headquarters',
    width: 2,
    height: 2,
    color: '#EC4899',
    icon: '⭐',
    maxLevel: 30,
    description: 'R4 officer headquarters'
  },

  // Defense buildings
  {
    id: 'wall',
    name: 'Wall',
    category: 'defense',
    width: 1,
    height: 1,
    color: '#6B7280',
    icon: '🧱',
    maxLevel: 1,
    description: 'Basic wall segment for perimeter defense'
  },
  {
    id: 'tower-antiair',
    name: 'Anti-Air Tower',
    category: 'defense',
    width: 2,
    height: 2,
    color: '#EF4444',
    icon: '🗼',
    maxLevel: 20,
    description: 'Defends against aerial attacks'
  },
  {
    id: 'tower-artillery',
    name: 'Artillery Tower',
    category: 'defense',
    width: 2,
    height: 2,
    color: '#F97316',
    icon: '💥',
    maxLevel: 20,
    description: 'Long-range ground defense'
  },
  {
    id: 'bunker',
    name: 'Bunker',
    category: 'defense',
    width: 2,
    height: 2,
    color: '#84CC16',
    icon: '🛡️',
    maxLevel: 20,
    description: 'Reinforced defensive structure'
  },

  // Production buildings
  {
    id: 'barracks',
    name: 'Barracks',
    category: 'production',
    width: 2,
    height: 2,
    color: '#22C55E',
    icon: '🎖️',
    maxLevel: 25,
    description: 'Troop training facility'
  },
  {
    id: 'factory',
    name: 'Vehicle Factory',
    category: 'production',
    width: 2,
    height: 2,
    color: '#14B8A6',
    icon: '🏭',
    maxLevel: 25,
    description: 'Vehicle production'
  },
  {
    id: 'airfield',
    name: 'Airfield',
    category: 'production',
    width: 3,
    height: 2,
    color: '#06B6D4',
    icon: '✈️',
    maxLevel: 25,
    description: 'Aircraft production and landing'
  },
  {
    id: 'hospital',
    name: 'Hospital',
    category: 'production',
    width: 2,
    height: 2,
    color: '#F43F5E',
    icon: '🏥',
    maxLevel: 25,
    description: 'Troop healing facility'
  },

  // Seasonal buildings (S5 Wild West themed)
  {
    id: 'saloon',
    name: 'Saloon',
    category: 'seasonal',
    width: 2,
    height: 2,
    color: '#D97706',
    icon: '🍺',
    maxLevel: 10,
    description: 'S5 Wild West - Saloon building'
  },
  {
    id: 'sheriffs-office',
    name: "Sheriff's Office",
    category: 'seasonal',
    width: 2,
    height: 2,
    color: '#CA8A04',
    icon: '🤠',
    maxLevel: 10,
    description: 'S5 Wild West - Law enforcement'
  },
  {
    id: 'gold-mine',
    name: 'Gold Mine',
    category: 'seasonal',
    width: 2,
    height: 2,
    color: '#FBBF24',
    icon: '⛏️',
    maxLevel: 10,
    description: 'S5 Wild West - Resource extraction'
  },
  {
    id: 'train-station',
    name: 'Train Station',
    category: 'seasonal',
    width: 3,
    height: 2,
    color: '#78716C',
    icon: '🚂',
    maxLevel: 10,
    description: 'S5 Wild West - Transportation hub'
  },

  // Special/Utility
  {
    id: 'rally-point',
    name: 'Rally Point',
    category: 'special',
    width: 1,
    height: 1,
    color: '#A855F7',
    icon: '📍',
    maxLevel: 1,
    description: 'Troop gathering point marker'
  },
  {
    id: 'resource-tile',
    name: 'Resource Tile',
    category: 'special',
    width: 1,
    height: 1,
    color: '#10B981',
    icon: '💎',
    maxLevel: 1,
    description: 'Mark resource locations on map'
  },
  {
    id: 'danger-zone',
    name: 'Danger Zone',
    category: 'special',
    width: 2,
    height: 2,
    color: '#DC2626',
    icon: '⚠️',
    maxLevel: 1,
    description: 'Mark dangerous/enemy areas'
  },
  {
    id: 'empty-slot',
    name: 'Empty Slot',
    category: 'special',
    width: 1,
    height: 1,
    color: '#374151',
    icon: '⬜',
    maxLevel: 1,
    description: 'Reserved empty position'
  },
];

export const BUILDING_CATEGORIES = [
  { id: 'headquarters', name: 'Headquarters', icon: '🏰' },
  { id: 'defense', name: 'Defense', icon: '🛡️' },
  { id: 'production', name: 'Production', icon: '🏭' },
  { id: 'seasonal', name: 'S5 Wild West', icon: '🤠' },
  { id: 'special', name: 'Special', icon: '📍' },
] as const;

export const getBuildingById = (id: string): BuildingType | undefined => {
  return BUILDING_TYPES.find(b => b.id === id);
};

export const getBuildingsByCategory = (category: BuildingType['category']): BuildingType[] => {
  return BUILDING_TYPES.filter(b => b.category === category);
};

