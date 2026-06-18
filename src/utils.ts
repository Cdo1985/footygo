import { PlayerCard } from './types';

// Distance calculation using Haversine formula
export function getDistanceInMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3; // Earth's radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

const PLAYER_POOL = [
  { name: 'Nick Daicos', defaultClub: 'collingwood' },
  { name: 'Darcy Moore', defaultClub: 'collingwood' },
  { name: 'Bobby Hill', defaultClub: 'collingwood' },
  { name: 'Jordan De Goey', defaultClub: 'collingwood' },
  { name: 'Lachie Neale', defaultClub: 'brisbane' },
  { name: 'Charlie Cameron', defaultClub: 'brisbane' },
  { name: 'Joe Daniher', defaultClub: 'brisbane' },
  { name: 'Harris Andrews', defaultClub: 'brisbane' },
  { name: 'Patrick Cripps', defaultClub: 'carlton' },
  { name: 'Charlie Curnow', defaultClub: 'carlton' },
  { name: 'Sam Walsh', defaultClub: 'carlton' },
  { name: 'Zach Merrett', defaultClub: 'essendon' },
  { name: 'Kyle Langford', defaultClub: 'essendon' },
  { name: 'Dustin Martin', defaultClub: 'richmond' },
  { name: 'Shai Bolton', defaultClub: 'richmond' },
  { name: 'Isaac Heeney', defaultClub: 'sydney' },
  { name: 'Errol Gulden', defaultClub: 'sydney' },
  { name: 'Jeremy Cameron', defaultClub: 'geelong' },
  { name: 'Tom Stewart', defaultClub: 'geelong' },
  { name: 'Marcus Bontempelli', defaultClub: 'westernbulldogs' },
  { name: 'Christian Petracca', defaultClub: 'melbourne' },
  { name: 'Toby Greene', defaultClub: 'gws' },
];

export function generateWildPlayer(forceVariant: boolean = false): PlayerCard {
  const template = PLAYER_POOL[Math.floor(Math.random() * PLAYER_POOL.length)];
  
  // Decide Tier
  const random = Math.random();
  let tier: PlayerCard['tier'] = 'Common';
  if (random > 0.95) tier = 'Legend';
  else if (random > 0.85) tier = 'Gold';
  else if (random > 0.65) tier = 'Silver';
  else if (random > 0.35) tier = 'Bronze';

  // Decide Variant (Cosmetic prestige only - identical stats limits)
  let variant: PlayerCard['variant'] = 'Standard';
  if (forceVariant || Math.random() > 0.8) {
    const variants: PlayerCard['variant'][] = ['Retro Kit 1990', 'Anzac Day Special', 'Legacy'];
    variant = variants[Math.floor(Math.random() * variants.length)];
  }

  // Stats are base 10-100 based on tier
  const baseMin = tier === 'Legend' ? 80 : tier === 'Gold' ? 65 : tier === 'Silver' ? 45 : tier === 'Bronze' ? 25 : 10;
  const baseMax = tier === 'Legend' ? 100 : tier === 'Gold' ? 90 : tier === 'Silver' ? 75 : tier === 'Bronze' ? 55 : 35;

  const power = Math.floor(Math.random() * (baseMax - baseMin + 1)) + baseMin;
  const skill = Math.floor(Math.random() * (baseMax - baseMin + 1)) + baseMin;
  const finesse = Math.floor(Math.random() * (baseMax - baseMin + 1)) + baseMin;

  return {
    id: `card_${Math.random().toString(36).substr(2, 9)}`,
    name: template.name,
    clubId: template.defaultClub,
    tier,
    power,
    skill,
    finesse,
    xp: 0,
    level: 1,
    omitted: false,
    variant,
  };
}

export function generateMCGGateDefenders(gateNumber: number): PlayerCard[] {
  // Generate 10 unique defenders for a venue node
  const defenders: PlayerCard[] = [];
  const usedNames = new Set<string>();

  for (let s = 1; s <= 10; s++) {
    let card = generateWildPlayer();
    // make sure names are unique in this gym gauntlet
    while (usedNames.has(card.name)) {
      card = generateWildPlayer();
    }
    usedNames.add(card.name);

    // Progressive slot difficulty increase - Slot 10 is the ultimate boss
    const scale = 1.0 + (s - 1) * 0.1; // Slot 1 = 1.0x, Slot 10 = 1.9x stats
    card.power = Math.min(100, Math.floor(card.power * scale));
    card.skill = Math.min(100, Math.floor(card.skill * scale));
    card.finesse = Math.min(100, Math.floor(card.finesse * scale));
    card.level = s;
    if (s === 10) {
      card.tier = 'Legend';
      card.name = `${card.name} (GATE BOSS)`;
    }
    defenders.push(card);
  }

  return defenders;
}
