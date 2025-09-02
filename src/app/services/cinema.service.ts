// src/app/services/cinema.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError, of, catchError ,from , map , timeout , switchMap } from 'rxjs';
import { Geolocation } from '@capacitor/geolocation';
import {
  Cinema,
  CinemaSearchParams,
  CinemaSearchResponse,
  CinemaSearchError,
  OverpassResponse,
  NominatimResponse,
  convertOverpassElementToCinema,
  buildOverpassQuery,
  CINEMA_SEARCH_DEFAULTS,
  CinemaErrorCode
} from './cinema-interfaces';
import { OSM_CONFIG, PLZ_REGEX } from '../config/api-key';
import { Http } from '@capacitor-community/http';

const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';
const NOMINATIM_SEARCH = 'https://nominatim.openstreetmap.org/search';

@Injectable({
  providedIn: 'root'
})
export class CinemaService {
  private http = inject(HttpClient);

  // Cache für bessere Performance
  private searchCache = new Map<string, CinemaSearchResponse>();
  private geocodeCache = new Map<string, {lat: number, lng: number}>();
  private readonly CACHE_DURATION = 10 * 60 * 1000; // 10 Minuten

  constructor() {}

   /**
   * Kinos basierend auf dem aktuellen Standort suchen
   */
  searchCinemasByCoordinates(
    latitude: number,
    longitude: number,
    radius: number = CINEMA_SEARCH_DEFAULTS.RADIUS ): Observable<CinemaSearchResponse> {

    const query = buildOverpassQuery(latitude, longitude, radius);
    const started = performance.now();

    // Wichtig: Overpass etiquette – eigenen User-Agent setzen
    const headers = {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Accept': 'application/json',
      'User-Agent': 'MovieTrends/1.0 (contact: youremail@example.com)'
    };

    return from(Http.request({
      method: 'POST',
      url: OVERPASS_URL,
      headers,
      data: `data=${encodeURIComponent(query)}`, // urlencoded!
      connectTimeout: 30000, // ms
      readTimeout: 30000
    })).pipe(
      map(res => {
        const json = res.data as OverpassResponse;
        const center = { lat: latitude, lng: longitude };

        const cinemas = (json.elements || [])
          .map(el => convertOverpassElementToCinema(el, center))
          .filter((x): x is Cinema => !!x)
          .sort((a, b) => a.distance - b.distance);

        const elapsed = Math.round(performance.now() - started);

        return {
          cinemas,
          total: cinemas.length,
          searchLocation: 'Mein Standort',
          center,
          dataSource: 'openstreetmap' as const,
          queryTime: elapsed
        };
      }),
      catchError(err => {
        const error: CinemaSearchError = {
          code: 'OVERPASS_ERROR',
          message: 'Overpass-Anfrage fehlgeschlagen.',
          details: err
        };
        return throwError(() => error);
      })
    );
  }

  /**
   * Aktuellen Standort des Benutzers abrufen
   */

  async getCurrentLocation(): Promise<{ latitude: number; longitude: number }> {
    // 1) Berechtigung anfragen (Android 12+)
    try {
      await Geolocation.requestPermissions();
    } catch {}

    // 2) Position holen (mit Timeouts & Fallback)
    try {
      const pos = await Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 10000,       // 10s
        maximumAge: 30000     // 30s
      });
      return {
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude
      };
    } catch (err) {
      // Fallback: letzte bekannte Position
      const last = await Geolocation.getCurrentPosition({
        enableHighAccuracy: false,
        timeout: 5000,
        maximumAge: 600000 // 10 min
      });
      return {
        latitude: last.coords.latitude,
        longitude: last.coords.longitude
      };
    }
  }

  /**
   * Suche nach Stadt/PLZ:
   * 1) Nominatim geokodiert → (lat,lng)
   * 2) Overpass-Suche um das Zentrum
   */
searchCinemas(params: { city?: string; zipCode?: string; radius?: number }): Observable<CinemaSearchResponse> {
  const q = params.zipCode || params.city || '';
  const headers = {
    'Accept': 'application/json',
    'User-Agent': 'MovieTrends/1.0 (contact: youremail@example.com)',
    'Accept-Language': 'de'
  };

  return from(Http.request({
    method: 'GET',
    url: NOMINATIM_SEARCH,
    headers,
    params: {
      format: 'json',
      addressdetails: '1',
      limit: '1',
      q
    },
    connectTimeout: 15000,
    readTimeout: 15000
  })).pipe(
    map(res => {
      const arr = res.data as Array<any>;
      if (!arr?.length) {
        const e: CinemaSearchError = {
          code: 'GEOCODING_ERROR',
          message: `Ort "${q}" konnte nicht geokodiert werden.`
        };
        throw e;
      }
      const item = arr[0];
      return {
        lat: parseFloat(item.lat),
        lng: parseFloat(item.lon),
        display: item.display_name as string
      };
    }),
    switchMap(({ lat, lng, display }) =>
      this.searchCinemasByCoordinates(
        lat,
        lng,
        params.radius || CINEMA_SEARCH_DEFAULTS.RADIUS
      ).pipe(
        map(r => ({ ...r, searchLocation: display }))
      )
    ),
    catchError(err => {
      const mapped: CinemaSearchError = {
        code: (err?.code as string) || 'NETWORK_ERROR',
        message: err?.message || 'Netzwerkfehler bei der Suche.',
        details: err
      };
      return throwError(() => mapped);
    })
  );
}

  /**
   * Koordinaten aus Suchparametern ermitteln
   */
  private getCoordinates(params: CinemaSearchParams): Observable<{lat: number, lng: number, location: string}> {
    // Direkten Koordinaten verwenden falls vorhanden
    if (params.latitude && params.longitude) {
      return of({
        lat: params.latitude,
        lng: params.longitude,
        location: `${params.latitude.toFixed(3)}, ${params.longitude.toFixed(3)}`
      });
    }

    // Geocoding für PLZ oder Stadt
    const searchTerm = params.zipCode || params.city;
    if (!searchTerm) {
      return throwError(() => ({
        code: CinemaErrorCode.INVALID_LOCATION,
        message: 'Keine gültige Suchadresse angegeben.'
      }));
    }

    // Cache für Geocoding prüfen
    const geocodeKey = searchTerm.toLowerCase();
    const cachedCoords = this.geocodeCache.get(geocodeKey);
    if (cachedCoords) {
      return of({
        ...cachedCoords,
        location: searchTerm
      });
    }

    return this.geocodeLocation(searchTerm).pipe(
      map(coords => {
        // Geocoding-Cache speichern
        this.geocodeCache.set(geocodeKey, coords);
        setTimeout(() => {
          this.geocodeCache.delete(geocodeKey);
        }, this.CACHE_DURATION);

        return {
          ...coords,
          location: searchTerm
        };
      })
    );
  }

  /**
   * Geocoding über Nominatim
   */
  private geocodeLocation(searchTerm: string): Observable<{lat: number, lng: number}> {
    const isZipCode = PLZ_REGEX.test(searchTerm);

    // Query für deutsche Locations optimieren
    const query = isZipCode
      ? `${searchTerm}, Deutschland`
      : `${searchTerm}, Deutschland`;

    const url = `${OSM_CONFIG.NOMINATIM_URL}/search`;
    const params = {
      q: query,
      format: 'json',
      limit: '1',
      countrycodes: 'de', // Auf Deutschland beschränken
      addressdetails: '1'
    };

    console.log('Geocoding:', query);

    return this.http.get<NominatimResponse[]>(url, { params }).pipe(
      timeout(5000),
      map(response => {
        if (!response || response.length === 0) {
          throw new Error('Location nicht gefunden');
        }

        const location = response[0];
        return {
          lat: parseFloat(location.lat),
          lng: parseFloat(location.lon)
        };
      }),
      catchError(error => {
        console.error('Geocoding Error:', error);
        return throwError(() => ({
          code: CinemaErrorCode.GEOCODING_ERROR,
          message: `Location "${searchTerm}" konnte nicht gefunden werden. Überprüfen Sie die Eingabe.`,
          details: error
        }));
      })
    );
  }

  /**
   * Kinos um Koordinaten suchen
   */
  private searchCinemasAroundCoordinates(
    coords: {lat: number, lng: number, location: string},
    params: CinemaSearchParams
  ): Observable<CinemaSearchResponse> {

    const radius = params.radius || CINEMA_SEARCH_DEFAULTS.RADIUS;
    const query = buildOverpassQuery(coords.lat, coords.lng, radius);

    console.log('Overpass Query:', query);

    return this.http.post<OverpassResponse>(
      OSM_CONFIG.OVERPASS_URL,
      query,
      {
        headers: {
          'Content-Type': 'text/plain'
        }
      }
    ).pipe(
      timeout(30000), // 30 Sekunden für Overpass
      map(response => this.processOverpassResponse(response, coords, params)),
      catchError(error => {
        console.error('Overpass Error:', error);
        return throwError(() => ({
          code: CinemaErrorCode.OVERPASS_ERROR,
          message: 'Fehler beim Laden der Kino-Daten von OpenStreetMap.',
          details: error
        }));
      })
    );
  }

  /**
   * Overpass Response zu unserem Cinema Format konvertieren
   */
  private processOverpassResponse(
    response: OverpassResponse,
    searchCenter: {lat: number, lng: number, location: string},
    params: CinemaSearchParams
  ): CinemaSearchResponse {

    if (!response.elements) {
      return {
        cinemas: [],
        total: 0,
        searchLocation: searchCenter.location,
        center: { lat: searchCenter.lat, lng: searchCenter.lng },
        dataSource: 'openstreetmap',
        queryTime: 0
      };
    }

    // OSM Elemente zu Cinema-Objekten konvertieren
    const cinemas: Cinema[] = response.elements
      .map(element => convertOverpassElementToCinema(element, searchCenter))
      .filter((cinema): cinema is Cinema => cinema !== null)
      .filter(cinema => cinema.distance <= 50) // Max 50km Entfernung
      .sort((a, b) => a.distance - b.distance) // Nach Entfernung sortieren
      .slice(0, params.limit || CINEMA_SEARCH_DEFAULTS.LIMIT); // Limit anwenden

    console.log(`Gefunden: ${cinemas.length} Kinos in OSM`);

    return {
      cinemas,
      total: cinemas.length,
      searchLocation: searchCenter.location,
      center: { lat: searchCenter.lat, lng: searchCenter.lng },
      dataSource: 'openstreetmap',
      queryTime: 0 // Wird später überschrieben
    };
  }

  /**
   * Error Handling
   */
  private handleError(error: any): Observable<never> {
    console.error('Cinema Service Error:', error);

    // Bereits formatierte Cinema-Fehler durchreichen
    if (error.code && error.message) {
      return throwError(() => error);
    }

    let cinemaError: CinemaSearchError;

    if (error.name === 'TimeoutError') {
      cinemaError = {
        code: CinemaErrorCode.TIMEOUT_ERROR,
        message: 'Zeitüberschreitung beim Laden der Kino-Daten. Versuchen Sie es erneut.',
        details: error
      };
    } else if (error.status === 0) {
      cinemaError = {
        code: CinemaErrorCode.NETWORK_ERROR,
        message: 'Netzwerkfehler. Überprüfen Sie Ihre Internetverbindung.',
        details: error
      };
    } else if (error.status >= 500) {
      cinemaError = {
        code: CinemaErrorCode.OVERPASS_ERROR,
        message: 'Server-Fehler bei OpenStreetMap. Versuchen Sie es später erneut.',
        details: error
      };
    } else {
      cinemaError = {
        code: CinemaErrorCode.NETWORK_ERROR,
        message: 'Unbekannter Fehler beim Laden der Kino-Daten.',
        details: error
      };
    }

    return throwError(() => cinemaError);
  }

  /**
   * Validierung der Suchparameter
   */
  private isValidSearchParams(params: CinemaSearchParams): boolean {
    return !!(
      (params.zipCode && PLZ_REGEX.test(params.zipCode)) ||
      (params.city && params.city.trim().length >= 2) ||
      (params.latitude && params.longitude)
    );
  }

  /**
   * Cache Key generieren
   */
  private getCacheKey(params: CinemaSearchParams): string {
    const location = params.zipCode || params.city || `${params.latitude},${params.longitude}`;
    const radius = params.radius || CINEMA_SEARCH_DEFAULTS.RADIUS;
    return `osm_cinema_${location}_${radius}`.toLowerCase();
  }

  /**
   * Direkte Suche mit Postleitzahl (Convenience Method)
   */
  searchByZipCode(zipCode: string): Observable<CinemaSearchResponse> {
    return this.searchCinemas({ zipCode });
  }

  /**
   * Direkte Suche mit Stadt (Convenience Method)
   */
  searchByCity(city: string): Observable<CinemaSearchResponse> {
    return this.searchCinemas({ city });
  }

  /**
   * Cache leeren (für Testing/Debug)
   */
  clearCache(): void {
    this.searchCache.clear();
    this.geocodeCache.clear();
    console.log('Cinema Service Cache geleert');
  }

  /**
   * Service-Status für Debugging
   */
  getServiceStatus(): {
    searchCacheSize: number;
    geocodeCacheSize: number;
    lastQuery?: string;
  } {
    return {
      searchCacheSize: this.searchCache.size,
      geocodeCacheSize: this.geocodeCache.size
    };
  }

  /**
   * Test-Methode: Bekannte Location testen
   */
  testSearch(): Observable<CinemaSearchResponse> {
    console.log('Testing Cinema Service mit Frankfurt...');
    return this.searchByZipCode('60311');
  }
}
