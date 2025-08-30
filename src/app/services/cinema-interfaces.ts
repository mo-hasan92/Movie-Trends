

// OpenStreetMap Overpass Response Interfaces
export interface OverpassResponse {
  version: number;
  generator: string;
  osm3s: {
    timestamp_osm_base: string;
    copyright: string;
  };
  elements: OverpassElement[];
}

export interface OverpassElement {
  type: 'node' | 'way' | 'relation';
  id: number;
  lat?: number;
  lon?: number;
  center?: {
    lat: number;
    lon: number;
  };
  tags?: OverpassTags;
}

export interface OverpassTags {
  amenity?: string;
  leisure?: string;
  name?: string;
  'name:de'?: string;
  phone?: string;
  website?: string;
  'contact:phone'?: string;
  'contact:website'?: string;
  opening_hours?: string;
  addr?: string;
  'addr:street'?: string;
  'addr:housenumber'?: string;
  'addr:city'?: string;
  'addr:postcode'?: string;
  'addr:country'?: string;
  operator?: string;
  brand?: string;
  capacity?: string;
  wheelchair?: string;
}

// Nominatim Geocoding Response
export interface NominatimResponse {
  place_id: number;
  licence: string;
  osm_type: string;
  osm_id: number;
  boundingbox: string[];
  lat: string;
  lon: string;
  display_name: string;
  class: string;
  type: string;
  importance: number;
}

// Vereinfachte Cinema Interface für unsere App
export interface Cinema {
  id: string;
  name: string;
  address: string;
  city: string;
  zipCode?: string;
  phone?: string;
  website?: string;
  distance: number; // in kilometers
  coordinates: {
    lat: number;
    lng: number;
  };
  openingHours?: string;
  operator?: string;
  capacity?: string;
  wheelchairAccessible?: boolean;
  source: 'osm';
}

// Search Parameters
export interface CinemaSearchParams {
  zipCode?: string;
  city?: string;
  latitude?: number;
  longitude?: number;
  radius?: number; // in meters
  limit?: number;
}

// Search Response
export interface CinemaSearchResponse {
  cinemas: Cinema[];
  total: number;
  searchLocation: string;
  center?: {
    lat: number;
    lng: number;
  };
  dataSource: 'openstreetmap';
  queryTime: number; // ms
}

// Error Interface
export interface CinemaSearchError {
  code: string;
  message: string;
  details?: any;
}

// Helper Functions
export function convertOverpassElementToCinema(
  element: OverpassElement,
  searchCenter: { lat: number; lng: number }
): Cinema | null {

  if (!element.tags) return null;

  // Koordinaten extrahieren
  const lat = element.lat || element.center?.lat;
  const lng = element.lon || element.center?.lon;

  if (!lat || !lng) return null;

  // Name ist essentiell
  const name = element.tags.name || element.tags['name:de'] || 'Unbekanntes Kino';
  if (name === 'Unbekanntes Kino' && !element.tags.name) return null;

  // Entfernung berechnen
  const distance = calculateDistance(
    searchCenter.lat, searchCenter.lng,
    lat, lng
  );

  // Adresse zusammenbauen
  const address = buildAddress(element.tags);

  return {
    id: `osm_${element.type}_${element.id}`,
    name,
    address: address.street,
    city: address.city,
    zipCode: address.zipCode,
    phone: element.tags.phone || element.tags['contact:phone'],
    website: element.tags.website || element.tags['contact:website'],
    distance: Math.round(distance * 10) / 10, // Auf 1 Dezimalstelle runden
    coordinates: { lat, lng },
    openingHours: element.tags.opening_hours,
    operator: element.tags.operator || element.tags.brand,
    capacity: element.tags.capacity,
    wheelchairAccessible: element.tags.wheelchair === 'yes',
    source: 'osm'
  };
}

function buildAddress(tags: OverpassTags): {
  street: string;
  city: string;
  zipCode?: string
} {
  const street = [
    tags['addr:street'],
    tags['addr:housenumber']
  ].filter(Boolean).join(' ') || tags.addr || 'Adresse unbekannt';

  const city = tags['addr:city'] || '';
  const zipCode = tags['addr:postcode'];

  return { street, city, zipCode };
}

function calculateDistance(
  lat1: number, lng1: number,
  lat2: number, lng2: number
): number {
  const R = 6371; // Erdradius in km
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

// Constants
export const CINEMA_SEARCH_DEFAULTS = {
  RADIUS: 25000, // 25km
  LIMIT: 50,
} as const;

// Error Codes
export enum CinemaErrorCode {
  NETWORK_ERROR = 'NETWORK_ERROR',
  GEOCODING_ERROR = 'GEOCODING_ERROR',
  OVERPASS_ERROR = 'OVERPASS_ERROR',
  INVALID_LOCATION = 'INVALID_LOCATION',
  NO_RESULTS = 'NO_RESULTS',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR'
}

// Overpass Query Builder
export function buildOverpassQuery(
  lat: number,
  lng: number,
  radius: number
): string {
  return `
    [out:json][timeout:25];
    (
      nwr["amenity"="cinema"](around:${radius},${lat},${lng});
      nwr["leisure"="cinema"](around:${radius},${lat},${lng});
    );
    out center meta;
  `.trim();
}
