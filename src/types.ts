export interface AFLClub {
  id: string;
  name: string;
  mascot: string;
  colors: {
    primary: string; // Tailwind color or CSS hex
    secondary: string;
    text: string;
    bg: string;
    border: string;
  };
}

export interface PlayerCard {
  id: string;
  name: string;
  clubId: string;
  tier: 'Common' | 'Bronze' | 'Silver' | 'Gold' | 'Legend';
  power: number; // 10-100
  skill: number; // 10-100
  finesse: number; // 10-100
  xp: number;
  level: number;
  omitted: boolean;
  variant: 'Standard' | 'Retro Kit 1990' | 'Anzac Day Special' | 'Legacy';
}

export interface ConquestNode {
  id: string;
  name: string;
  gateNumber: number;
  latitude: number;
  longitude: number;
  defenders: PlayerCard[]; // 10 unique defense cards
  ownerClubId: string | null; // which club currently controls it
  lastConqueredAt: string | null;
  conqueringUsername: string | null;
}

export interface TeamHub {
  id: string;
  name: string;
  clubId: string;
  latitude: number;
  longitude: number;
}

export interface SocialEventZone {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  radius: number; // in meters (geofenced)
  spawnDensityMultiplier: number; // 3x to 5x
  isActive: boolean;
}

export interface GameState {
  userClubId: string | null;
  username: string | null;
  experience: number;
  userLatitude: number;
  userLongitude: number;
  inventory: {
    wakeUpSessions: number; // cap of 50
  };
  cards: PlayerCard[];
  nodes: ConquestNode[];
  lastTeamHubCheckIn: { [hubId: string]: string }; // hubId: timestamp ISO string
  hasInitialized: boolean;
}

export const AFL_CLUBS: AFLClub[] = [
  {
    id: 'collingwood',
    name: 'Collingwood',
    mascot: 'Magpies',
    colors: {
      primary: '#000000',
      secondary: '#ffffff',
      text: '#ffffff',
      bg: 'bg-black border-neutral-800 text-white',
      border: 'border-white',
    },
  },
  {
    id: 'brisbane',
    name: 'Brisbane',
    mascot: 'Lions',
    colors: {
      primary: '#7a1434', // MAROON
      secondary: '#004b87', // BLUE
      text: '#ffffff',
      bg: 'bg-amber-500 border-red-800 text-amber-950',
      border: 'border-red-600',
    },
  },
  {
    id: 'carlton',
    name: 'Carlton',
    mascot: 'Blues',
    colors: {
      primary: '#031424',
      secondary: '#ffffff',
      text: '#ffffff',
      bg: 'bg-[#031424] border-blue-900 text-white',
      border: 'border-sky-700',
    },
  },
  {
    id: 'essendon',
    name: 'Essendon',
    mascot: 'Bombers',
    colors: {
      primary: '#cc1e22',
      secondary: '#1a1a1a',
      text: '#ffffff',
      bg: 'bg-black border-red-600 text-red-500',
      border: 'border-red-600',
    },
  },
  {
    id: 'richmond',
    name: 'Richmond',
    mascot: 'Tigers',
    colors: {
      primary: '#ffd100',
      secondary: '#000000',
      text: '#000000',
      bg: 'bg-black border-yellow-500 text-yellow-400',
      border: 'border-yellow-400',
    },
  },
  {
    id: 'sydney',
    name: 'Sydney',
    mascot: 'Swans',
    colors: {
      primary: '#ed1c24',
      secondary: '#ffffff',
      text: '#ffffff',
      bg: 'bg-red-600 border-white text-white',
      border: 'border-white',
    },
  },
  {
    id: 'geelong',
    name: 'Geelong',
    mascot: 'Cats',
    colors: {
      primary: '#1c3c73',
      secondary: '#ffffff',
      text: '#ffffff',
      bg: 'bg-blue-900 border-neutral-100 text-white',
      border: 'border-white',
    },
  },
];

// Coordinate center helper: Melbourne Cricket Ground (MCG)
export const MCG_COORDINATES = {
  latitude: -37.81997,
  longitude: 144.98344,
};

// Generates 10 fixed geofenced portals representing the gate locations of the MCG
export const MCG_GATES: ConquestNode[] = [
  {
    id: 'gate-1',
    name: 'MCG Gate 1 (Members Entrance)',
    gateNumber: 1,
    latitude: -37.82025,
    longitude: 144.9825,
    ownerClubId: 'carlton',
    lastConqueredAt: new Date(Date.now() - 3600000 * 4).toISOString(),
    conqueringUsername: 'BlueBaggingDan',
    defenders: [],
  },
  {
    id: 'gate-2',
    name: 'MCG Gate 2 (AFL Members)',
    gateNumber: 2,
    latitude: -37.82075,
    longitude: 144.9830,
    ownerClubId: 'brisbane',
    lastConqueredAt: new Date(Date.now() - 3600000 * 12).toISOString(),
    conqueringUsername: 'LionsRoar99',
    defenders: [],
  },
  {
    id: 'gate-3',
    name: 'MCG Gate 3 (Olympic Stand)',
    gateNumber: 3,
    latitude: -37.82085,
    longitude: 144.9840,
    ownerClubId: 'collingwood',
    lastConqueredAt: new Date(Date.now() - 3600000 * 2).toISOString(),
    conqueringUsername: 'SwoopTrue',
    defenders: [],
  },
  {
    id: 'gate-4',
    name: 'MCG Gate 4 (Olympic Gate)',
    gateNumber: 4,
    latitude: -37.82045,
    longitude: 144.9848,
    ownerClubId: 'essendon',
    lastConqueredAt: new Date(Date.now() - 3600000 * 24).toISOString(),
    conqueringUsername: 'DonsFlyHigh',
    defenders: [],
  },
  {
    id: 'gate-5',
    name: 'MCG Gate 5 (Great Southern Stand)',
    gateNumber: 5,
    latitude: -37.81975,
    longitude: 144.9851,
    ownerClubId: 'richmond',
    lastConqueredAt: null,
    conqueringUsername: null,
    defenders: [],
  },
  {
    id: 'gate-6',
    name: 'MCG Gate 6 (Punt Road End)',
    gateNumber: 6,
    latitude: -37.81915,
    longitude: 144.9847,
    ownerClubId: 'richmond',
    lastConqueredAt: new Date(Date.now() - 3600000 * 8).toISOString(),
    conqueringUsername: 'TigerTough',
    defenders: [],
  },
  {
    id: 'gate-7',
    name: 'MCG Gate 7 (Great Southern Stand East)',
    gateNumber: 7,
    latitude: -37.81885,
    longitude: 144.9839,
    ownerClubId: null,
    lastConqueredAt: null,
    conqueringUsername: null,
    defenders: [],
  },
  {
    id: 'gate-8',
    name: 'MCG Gate 8 (Southern Gate)',
    gateNumber: 8,
    latitude: -37.81905,
    longitude: 144.9829,
    ownerClubId: 'sydney',
    lastConqueredAt: new Date(Date.now() - 3600000 * 6).toISOString(),
    conqueringUsername: 'SwansBanner',
    defenders: [],
  },
  {
    id: 'gate-9',
    name: 'MCG Gate 9 (Punt Road Gate)',
    gateNumber: 9,
    latitude: -37.81955,
    longitude: 144.9821,
    ownerClubId: 'geelong',
    lastConqueredAt: new Date(Date.now() - 3600000 * 36).toISOString(),
    conqueringUsername: 'CatEmpire',
    defenders: [],
  },
  {
    id: 'gate-10',
    name: 'MCG Gate 10 (Jolimont Gate)',
    gateNumber: 10,
    latitude: -37.81985,
    longitude: 144.9820,
    ownerClubId: 'collingwood',
    lastConqueredAt: new Date(Date.now() - 3600000).toISOString(),
    conqueringUsername: 'PieForceOne',
    defenders: [],
  },
];

// Physical Premier Training Facilities for Check-in (GPS portals near MCG or in VIC)
