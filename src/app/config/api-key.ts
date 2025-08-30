// OpenStreetMap APIs
export const OSM_CONFIG = {
  // Overpass API für POI-Suche
  OVERPASS_URL: 'https://overpass-api.de/api/interpreter',
  OVERPASS_TIMEOUT: 25, // Sekunden

  // Nominatim für Geocoding (PLZ -> Koordinaten)
  NOMINATIM_URL: 'https://nominatim.openstreetmap.org',

  // Suche Parameter
  SEARCH_RADIUS: 25000, // 25km in Metern
  SEARCH_LIMIT: 50,

  // Cinema Tags in OSM
  CINEMA_TAGS: {
    amenity: 'cinema',
    leisure: 'cinema'
  }
};

// Backup Overpass Server (falls Haupt-Server überlastet)
export const OVERPASS_SERVERS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass.openstreetmap.ru/api/interpreter'
];

// Deutsche Postleitzahl Regex
export const PLZ_REGEX = /^\d{5}$/;
export const CITY_MIN_LENGTH = 2;


