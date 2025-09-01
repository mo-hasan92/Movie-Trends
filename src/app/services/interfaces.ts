// ** MAIN API INTERFACES**

export interface ApiResult {
  page: number;
  results: MovieResult[];
  total_pages: number;
  total_results: number;
}

export interface MovieResult {
  adult: boolean;
  backdrop_path: string;
  belongs_to_collection: Belongstocollection;
  budget: number;
  genres: Genre[];
  homepage: string;
  id: number;
  imdb_id: string;
  origin_country: string[];
  original_language: string;
  original_title: string;
  overview: string;
  popularity: number;
  poster_path: string;
  production_companies: Productioncompany[];
  production_countries: Productioncountry[];
  release_date: string;
  revenue: number;
  runtime: number;
  spoken_languages: Spokenlanguage[];
  status: string;
  tagline: string;
  title: string;
  video: boolean;
  vote_average: number;
  vote_count: number;
}

// **🏷️ GENRE INTERFACES**
export interface Genre {
  id: number;
  name: string;
}

export interface GenreResponse {
  genres: Genre[];
}

// **🎥 VIDEO INTERFACES für Trailer, etc.**
export interface MovieVideo {
  id: string;
  iso_639_1: string;
  iso_3166_1: string;
  key: string;
  name: string;
  official: boolean;
  published_at: string;
  site: string; // "YouTube", "Vimeo", etc.
  size: number;
  type: string; // "Trailer", "Teaser", "Clip", etc.
}

export interface VideoResponse {
  id: number;
  results: MovieVideo[];
}

// **👥 CAST & CREW INTERFACES**
export interface CastMember {
  adult: boolean;
  cast_id: number;
  character: string;
  credit_id: string;
  gender: number;
  id: number;
  known_for_department: string;
  name: string;
  order: number;
  original_name: string;
  popularity: number;
  profile_path: string | null;
}

export interface CrewMember {
  adult: boolean;
  credit_id: string;
  department: string;
  gender: number;
  id: number;
  job: string;
  known_for_department: string;
  name: string;
  original_name: string;
  popularity: number;
  profile_path: string | null;
}

export interface CreditsResponse {
  id: number;
  cast: CastMember[];
  crew: CrewMember[];
}

// **🏢 PRODUCTION INTERFACES**
export interface Productioncompany {
  id: number;
  logo_path: string;
  name: string;
  origin_country: string;
}

export interface Productioncountry {
  iso_3166_1: string;
  name: string;
}

export interface Spokenlanguage {
  english_name: string;
  iso_639_1: string;
  name: string;
}

export interface Belongstocollection {
  id: number;
  name: string;
  poster_path: string;
  backdrop_path: string;
}

// **📊 UTILITY INTERFACES für bessere UX**

/**
 * **🎯 Movie Category Enum**
 * Für verschiedene Movie-Listen Kategorien
 */
export enum MovieCategory {
  POPULAR = 'popular',
  TOP_RATED = 'top_rated',
  NOW_PLAYING = 'now_playing',
  UPCOMING = 'upcoming'
}

/**
 * **🔍 Search Filter Interface**
 * Für erweiterte Suchfunktionen
 */
export interface SearchFilters {
  query?: string;
  genre?: number;
  year?: number;
  rating_min?: number;
  rating_max?: number;
  sort_by?: 'popularity.desc' | 'popularity.asc' | 'vote_average.desc' | 'vote_average.asc' | 'release_date.desc' | 'release_date.asc';
}

/**
 * **📱 App State Interface**
 * Für Component State Management
 */
export interface MovieListState {
  movies: MovieResult[];
  isLoading: boolean;
  isSearching: boolean;
  error: string | null;
  currentPage: number;
  totalPages: number;
  searchQuery: string;
  selectedCategory: MovieCategory;
  hasMoreData: boolean;
}

/**
 * **🎨 UI Helper Interface**
 * Für Rating-Farben und UI-Logik
 */
export interface RatingConfig {
  value: number;
  color: 'success' | 'warning' | 'danger';
  icon: string;
  label: string;
}

/**
 * **📋 Movie List Item Interface**
 * Simplified interface für Listen-Anzeige
 */
export interface MovieListItem {
  id: number;
  title: string;
  poster_path: string;
  release_date: string;
  vote_average: number;
  vote_count: number;
  overview: string;
  genre_ids?: number[]; // Für Search Results
}

/**
 * **🔗 Navigation Interface**
 * Für Router-Navigation mit Parametern
 */
export interface MovieNavigationData {
  movieId: number;
  returnUrl?: string;
  searchQuery?: string;
}

// **🎯 TYPE GUARDS für bessere Typsicherheit**

/**
 * **Type Guard: Prüft ob MovieResult vollständige Daten hat**
 */
export function isCompleteMovieResult(movie: any): movie is MovieResult {
  return movie &&
         typeof movie.id === 'number' &&
         typeof movie.title === 'string' &&
         typeof movie.vote_average === 'number';
}

/**
 * **Type Guard: Prüft ob Video ein Trailer ist**
 */
export function isTrailer(video: MovieVideo): boolean {
  return video.type === 'Trailer' && video.site === 'YouTube';
}

/**
 * **Helper: Extrahiert Hauptdarsteller aus Cast**
 */
export function getMainCast(cast: CastMember[], limit = 5): CastMember[] {
  return cast
    .filter(member => member.order < limit)
    .sort((a, b) => a.order - b.order);
}

/**
 * **Helper: Findet Regisseur in Crew**
 */
export function getDirector(crew: CrewMember[]): CrewMember | undefined {
  return crew.find(member => member.job === 'Director');
}

// **📊 KONSTANTEN für App-Konfiguration**
export const TMDB_IMAGE_SIZES = {
  poster: {
    small: 'w185',
    medium: 'w342',
    large: 'w500',
    xlarge: 'w780'
  },
  backdrop: {
    small: 'w300',
    medium: 'w780',
    large: 'w1280',
    original: 'original'
  },
  profile: {
    small: 'w45',
    medium: 'w185',
    large: 'h632'
  }
} as const;

export const RATING_THRESHOLDS = {
  excellent: 8.0,
  good: 6.0,
  poor: 0
} as const;

export const DEFAULT_PAGINATION = {
  itemsPerPage: 20,
  maxPages: 500
} as const;
