import type { PlacedBuilding } from '../types';

export interface HiveTemplate {
  id: string;
  name: string;
  description: string;
  category: 'capitol' | 'seasonal' | 'defense' | 'farm' | 'community';
  season?: string;
  author?: string;
  thumbnail?: string;
  buildings: PlacedBuilding[];
  isPro?: boolean;
}

// Popular hive formations from community
export const HIVE_TEMPLATES: HiveTemplate[] = [
  {
    id: 'diamond-defense',
    name: 'Diamond Defense',
    description: 'Classic diamond formation - Marshal at center, R4s on corners. Great for S5/S6 wars.',
    category: 'defense',
    author: 'Community',
    buildings: [
      // Center Marshal HQ
      { id: 't1-1', buildingTypeId: 'hq-marshal', gridX: 23, gridY: 23, rotation: 0, level: 30, playerName: 'R5 Marshal' },
      
      // Inner ring - R4s at cardinal points
      { id: 't1-2', buildingTypeId: 'hq-r4', gridX: 23, gridY: 18, rotation: 0, level: 25, playerName: 'R4 North' },
      { id: 't1-3', buildingTypeId: 'hq-r4', gridX: 28, gridY: 23, rotation: 0, level: 25, playerName: 'R4 East' },
      { id: 't1-4', buildingTypeId: 'hq-r4', gridX: 23, gridY: 28, rotation: 0, level: 25, playerName: 'R4 South' },
      { id: 't1-5', buildingTypeId: 'hq-r4', gridX: 18, gridY: 23, rotation: 0, level: 25, playerName: 'R4 West' },
      
      // Outer ring - Regular HQs
      { id: 't1-6', buildingTypeId: 'hq', gridX: 20, gridY: 15, rotation: 0, level: 20, playerName: 'Member 1' },
      { id: 't1-7', buildingTypeId: 'hq', gridX: 26, gridY: 15, rotation: 0, level: 20, playerName: 'Member 2' },
      { id: 't1-8', buildingTypeId: 'hq', gridX: 31, gridY: 20, rotation: 0, level: 20, playerName: 'Member 3' },
      { id: 't1-9', buildingTypeId: 'hq', gridX: 31, gridY: 26, rotation: 0, level: 20, playerName: 'Member 4' },
      { id: 't1-10', buildingTypeId: 'hq', gridX: 26, gridY: 31, rotation: 0, level: 20, playerName: 'Member 5' },
      { id: 't1-11', buildingTypeId: 'hq', gridX: 20, gridY: 31, rotation: 0, level: 20, playerName: 'Member 6' },
      { id: 't1-12', buildingTypeId: 'hq', gridX: 15, gridY: 26, rotation: 0, level: 20, playerName: 'Member 7' },
      { id: 't1-13', buildingTypeId: 'hq', gridX: 15, gridY: 20, rotation: 0, level: 20, playerName: 'Member 8' },
      
      // Defense towers
      { id: 't1-14', buildingTypeId: 'tower-antiair', gridX: 21, gridY: 21, rotation: 0, level: 15 },
      { id: 't1-15', buildingTypeId: 'tower-antiair', gridX: 26, gridY: 21, rotation: 0, level: 15 },
      { id: 't1-16', buildingTypeId: 'tower-antiair', gridX: 21, gridY: 26, rotation: 0, level: 15 },
      { id: 't1-17', buildingTypeId: 'tower-antiair', gridX: 26, gridY: 26, rotation: 0, level: 15 },
    ]
  },
  {
    id: 'turtle-formation',
    name: 'Turtle Shell',
    description: 'Compact defensive formation with walls surrounding the core. Maximum protection.',
    category: 'defense',
    author: 'Community',
    buildings: [
      // Core
      { id: 't2-1', buildingTypeId: 'hq-marshal', gridX: 23, gridY: 23, rotation: 0, level: 30, playerName: 'R5 Marshal' },
      
      // Inner wall ring
      { id: 't2-2', buildingTypeId: 'wall', gridX: 22, gridY: 22, rotation: 0, level: 1 },
      { id: 't2-3', buildingTypeId: 'wall', gridX: 23, gridY: 22, rotation: 0, level: 1 },
      { id: 't2-4', buildingTypeId: 'wall', gridX: 24, gridY: 22, rotation: 0, level: 1 },
      { id: 't2-5', buildingTypeId: 'wall', gridX: 25, gridY: 22, rotation: 0, level: 1 },
      { id: 't2-6', buildingTypeId: 'wall', gridX: 26, gridY: 22, rotation: 0, level: 1 },
      { id: 't2-7', buildingTypeId: 'wall', gridX: 26, gridY: 23, rotation: 0, level: 1 },
      { id: 't2-8', buildingTypeId: 'wall', gridX: 26, gridY: 24, rotation: 0, level: 1 },
      { id: 't2-9', buildingTypeId: 'wall', gridX: 26, gridY: 25, rotation: 0, level: 1 },
      { id: 't2-10', buildingTypeId: 'wall', gridX: 26, gridY: 26, rotation: 0, level: 1 },
      { id: 't2-11', buildingTypeId: 'wall', gridX: 25, gridY: 26, rotation: 0, level: 1 },
      { id: 't2-12', buildingTypeId: 'wall', gridX: 24, gridY: 26, rotation: 0, level: 1 },
      { id: 't2-13', buildingTypeId: 'wall', gridX: 23, gridY: 26, rotation: 0, level: 1 },
      { id: 't2-14', buildingTypeId: 'wall', gridX: 22, gridY: 26, rotation: 0, level: 1 },
      { id: 't2-15', buildingTypeId: 'wall', gridX: 22, gridY: 25, rotation: 0, level: 1 },
      { id: 't2-16', buildingTypeId: 'wall', gridX: 22, gridY: 24, rotation: 0, level: 1 },
      { id: 't2-17', buildingTypeId: 'wall', gridX: 22, gridY: 23, rotation: 0, level: 1 },
      
      // R4s around wall
      { id: 't2-18', buildingTypeId: 'hq-r4', gridX: 20, gridY: 20, rotation: 0, level: 25, playerName: 'R4 NW' },
      { id: 't2-19', buildingTypeId: 'hq-r4', gridX: 27, gridY: 20, rotation: 0, level: 25, playerName: 'R4 NE' },
      { id: 't2-20', buildingTypeId: 'hq-r4', gridX: 27, gridY: 27, rotation: 0, level: 25, playerName: 'R4 SE' },
      { id: 't2-21', buildingTypeId: 'hq-r4', gridX: 20, gridY: 27, rotation: 0, level: 25, playerName: 'R4 SW' },
    ]
  },
  {
    id: 's6-wild-west-capitol',
    name: 'S6 Wild West Capitol',
    description: 'Optimized for Season 6 Wild West capitol battles. Includes seasonal buildings.',
    category: 'seasonal',
    season: 'S6',
    author: 'Top Alliance',
    isPro: true,
    buildings: [
      // Center - Capitol area
      { id: 't3-1', buildingTypeId: 'hq-marshal', gridX: 23, gridY: 23, rotation: 0, level: 30, playerName: 'R5' },
      { id: 't3-2', buildingTypeId: 'sheriffs-office', gridX: 20, gridY: 23, rotation: 0, level: 10 },
      { id: 't3-3', buildingTypeId: 'saloon', gridX: 27, gridY: 23, rotation: 0, level: 10 },
      
      // Gold mines for resources
      { id: 't3-4', buildingTypeId: 'gold-mine', gridX: 21, gridY: 19, rotation: 0, level: 10 },
      { id: 't3-5', buildingTypeId: 'gold-mine', gridX: 27, gridY: 19, rotation: 0, level: 10 },
      { id: 't3-6', buildingTypeId: 'gold-mine', gridX: 21, gridY: 28, rotation: 0, level: 10 },
      { id: 't3-7', buildingTypeId: 'gold-mine', gridX: 27, gridY: 28, rotation: 0, level: 10 },
      
      // Train station for logistics
      { id: 't3-8', buildingTypeId: 'train-station', gridX: 23, gridY: 17, rotation: 0, level: 10 },
      
      // R4 positions
      { id: 't3-9', buildingTypeId: 'hq-r4', gridX: 18, gridY: 21, rotation: 0, level: 25, playerName: 'R4-1' },
      { id: 't3-10', buildingTypeId: 'hq-r4', gridX: 29, gridY: 21, rotation: 0, level: 25, playerName: 'R4-2' },
      { id: 't3-11', buildingTypeId: 'hq-r4', gridX: 18, gridY: 27, rotation: 0, level: 25, playerName: 'R4-3' },
      { id: 't3-12', buildingTypeId: 'hq-r4', gridX: 29, gridY: 27, rotation: 0, level: 25, playerName: 'R4-4' },
      
      // Regular members
      { id: 't3-13', buildingTypeId: 'hq', gridX: 15, gridY: 18, rotation: 0, level: 20, playerName: 'M1' },
      { id: 't3-14', buildingTypeId: 'hq', gridX: 32, gridY: 18, rotation: 0, level: 20, playerName: 'M2' },
      { id: 't3-15', buildingTypeId: 'hq', gridX: 15, gridY: 30, rotation: 0, level: 20, playerName: 'M3' },
      { id: 't3-16', buildingTypeId: 'hq', gridX: 32, gridY: 30, rotation: 0, level: 20, playerName: 'M4' },
    ]
  },
  {
    id: 'anti-air-fortress',
    name: 'Anti-Air Fortress',
    description: 'Maximizes anti-air coverage. Perfect for defending against air raids.',
    category: 'defense',
    author: 'Community',
    buildings: [
      // Center
      { id: 't4-1', buildingTypeId: 'hq-marshal', gridX: 23, gridY: 23, rotation: 0, level: 30, playerName: 'R5' },
      
      // Anti-air ring
      { id: 't4-2', buildingTypeId: 'tower-antiair', gridX: 20, gridY: 20, rotation: 0, level: 20 },
      { id: 't4-3', buildingTypeId: 'tower-antiair', gridX: 26, gridY: 20, rotation: 0, level: 20 },
      { id: 't4-4', buildingTypeId: 'tower-antiair', gridX: 20, gridY: 26, rotation: 0, level: 20 },
      { id: 't4-5', buildingTypeId: 'tower-antiair', gridX: 26, gridY: 26, rotation: 0, level: 20 },
      { id: 't4-6', buildingTypeId: 'tower-antiair', gridX: 23, gridY: 18, rotation: 0, level: 20 },
      { id: 't4-7', buildingTypeId: 'tower-antiair', gridX: 23, gridY: 28, rotation: 0, level: 20 },
      { id: 't4-8', buildingTypeId: 'tower-antiair', gridX: 17, gridY: 23, rotation: 0, level: 20 },
      { id: 't4-9', buildingTypeId: 'tower-antiair', gridX: 29, gridY: 23, rotation: 0, level: 20 },
      
      // Bunkers in gaps
      { id: 't4-10', buildingTypeId: 'bunker', gridX: 18, gridY: 18, rotation: 0, level: 15 },
      { id: 't4-11', buildingTypeId: 'bunker', gridX: 28, gridY: 18, rotation: 0, level: 15 },
      { id: 't4-12', buildingTypeId: 'bunker', gridX: 18, gridY: 28, rotation: 0, level: 15 },
      { id: 't4-13', buildingTypeId: 'bunker', gridX: 28, gridY: 28, rotation: 0, level: 15 },
    ]
  },
  {
    id: 'compact-farm',
    name: 'Farm Hive',
    description: 'Resource gathering formation for peaceful farming. Hospitals and factories.',
    category: 'farm',
    author: 'Community',
    buildings: [
      { id: 't5-1', buildingTypeId: 'hq-marshal', gridX: 23, gridY: 23, rotation: 0, level: 30, playerName: 'R5' },
      { id: 't5-2', buildingTypeId: 'hospital', gridX: 20, gridY: 21, rotation: 0, level: 20 },
      { id: 't5-3', buildingTypeId: 'hospital', gridX: 26, gridY: 21, rotation: 0, level: 20 },
      { id: 't5-4', buildingTypeId: 'factory', gridX: 20, gridY: 26, rotation: 0, level: 20 },
      { id: 't5-5', buildingTypeId: 'factory', gridX: 26, gridY: 26, rotation: 0, level: 20 },
      { id: 't5-6', buildingTypeId: 'barracks', gridX: 17, gridY: 23, rotation: 0, level: 20 },
      { id: 't5-7', buildingTypeId: 'barracks', gridX: 29, gridY: 23, rotation: 0, level: 20 },
      { id: 't5-8', buildingTypeId: 'resource-tile', gridX: 15, gridY: 20, rotation: 0, level: 1 },
      { id: 't5-9', buildingTypeId: 'resource-tile', gridX: 33, gridY: 20, rotation: 0, level: 1 },
      { id: 't5-10', buildingTypeId: 'resource-tile', gridX: 15, gridY: 28, rotation: 0, level: 1 },
      { id: 't5-11', buildingTypeId: 'resource-tile', gridX: 33, gridY: 28, rotation: 0, level: 1 },
    ]
  },
  {
    id: 'line-formation',
    name: 'Battle Line',
    description: 'Linear formation for coordinated attacks. Easy to deploy and manage.',
    category: 'defense',
    author: 'Community',
    buildings: [
      // Front line
      { id: 't6-1', buildingTypeId: 'hq-marshal', gridX: 24, gridY: 20, rotation: 0, level: 30, playerName: 'R5' },
      { id: 't6-2', buildingTypeId: 'hq-r4', gridX: 20, gridY: 20, rotation: 0, level: 25, playerName: 'R4-L' },
      { id: 't6-3', buildingTypeId: 'hq-r4', gridX: 28, gridY: 20, rotation: 0, level: 25, playerName: 'R4-R' },
      
      // Second line
      { id: 't6-4', buildingTypeId: 'hq', gridX: 16, gridY: 23, rotation: 0, level: 20, playerName: 'M1' },
      { id: 't6-5', buildingTypeId: 'hq', gridX: 20, gridY: 23, rotation: 0, level: 20, playerName: 'M2' },
      { id: 't6-6', buildingTypeId: 'hq', gridX: 24, gridY: 23, rotation: 0, level: 20, playerName: 'M3' },
      { id: 't6-7', buildingTypeId: 'hq', gridX: 28, gridY: 23, rotation: 0, level: 20, playerName: 'M4' },
      { id: 't6-8', buildingTypeId: 'hq', gridX: 32, gridY: 23, rotation: 0, level: 20, playerName: 'M5' },
      
      // Third line
      { id: 't6-9', buildingTypeId: 'hq', gridX: 18, gridY: 26, rotation: 0, level: 18, playerName: 'M6' },
      { id: 't6-10', buildingTypeId: 'hq', gridX: 22, gridY: 26, rotation: 0, level: 18, playerName: 'M7' },
      { id: 't6-11', buildingTypeId: 'hq', gridX: 26, gridY: 26, rotation: 0, level: 18, playerName: 'M8' },
      { id: 't6-12', buildingTypeId: 'hq', gridX: 30, gridY: 26, rotation: 0, level: 18, playerName: 'M9' },
      
      // Artillery support
      { id: 't6-13', buildingTypeId: 'tower-artillery', gridX: 22, gridY: 29, rotation: 0, level: 15 },
      { id: 't6-14', buildingTypeId: 'tower-artillery', gridX: 26, gridY: 29, rotation: 0, level: 15 },
    ]
  },
];

export const TEMPLATE_CATEGORIES = [
  { id: 'defense', name: 'Defense', icon: '🛡️' },
  { id: 'seasonal', name: 'Seasonal', icon: '🎄' },
  { id: 'farm', name: 'Farm', icon: '🌾' },
  { id: 'capitol', name: 'Capitol', icon: '🏛️' },
  { id: 'community', name: 'Community', icon: '👥' },
] as const;

export const getTemplatesByCategory = (category: string): HiveTemplate[] => {
  return HIVE_TEMPLATES.filter(t => t.category === category);
};

export const getTemplateById = (id: string): HiveTemplate | undefined => {
  return HIVE_TEMPLATES.find(t => t.id === id);
};

