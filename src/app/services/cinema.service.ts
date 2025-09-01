// src/app/services/cinema.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError, of, forkJoin } from 'rxjs';
import { map, catchError, timeout, switchMap } from 'rxjs/operators';
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
  searchCinemasByCoordinates(latitude: number, longitude: number, radius?: number): Observable<CinemaSearchResponse> {
    const startTime = Date.now();

    const searchParams: CinemaSearchParams = {
      latitude,
      longitude,
      radius: radius || CINEMA_SEARCH_DEFAULTS.RADIUS
    };

    // Cache prüfen
    const cacheKey = this.getCacheKey(searchParams);
    const cachedResult = this.searchCache.get(cacheKey);
    if (cachedResult) {
      console.log('Cache hit für Koordinaten-Suche:', cacheKey);
      return of(cachedResult);
    }

    // Direkte Suche mit Koordinaten
    return this.searchCinemasAroundCoordinates(
      { lat: latitude, lng: longitude, location: 'Mein Standort' },
      searchParams
    ).pipe(
      map(response => ({
        ...response,
        queryTime: Date.now() - startTime
      })),
      catchError(error => this.handleError(error)),
      // Cache speichern
      map(result => {
        this.searchCache.set(cacheKey, result);
        setTimeout(() => {
          this.searchCache.delete(cacheKey);
        }, this.CACHE_DURATION);
        return result;
      })
    );
  }

  /**
   * Aktuellen Standort des Benutzers abrufen
   */

async getCurrentLocation(): Promise<{latitude: number, longitude: number}> {
  try {
    // Berechtigungen prüfen und anfordern
    const permissions = await Geolocation.checkPermissions();

    if (permissions.location !== 'granted') {
      const requestResult = await Geolocation.requestPermissions();

      if (requestResult.location !== 'granted') {
        throw new Error('Standortberechtigung wurde verweigert');
      }
    }

    const coordinates = await Geolocation.getCurrentPosition({
      enableHighAccuracy: true,
      timeout: 10000
    });

    return {
      latitude: coordinates.coords.latitude,
      longitude: coordinates.coords.longitude
    };
  } catch (error) {
    console.error('Fehler beim Standortabruf:', error);
    throw error;
  }
}

  /**
   * Hauptmethode: Suche Kinos nach Postleitzahl oder Stadt
   */
  searchCinemas(params: CinemaSearchParams): Observable<CinemaSearchResponse> {
    const startTime = Date.now();

    // Eingabe validieren
    if (!this.isValidSearchParams(params)) {
      return throwError(() => ({
        code: CinemaErrorCode.INVALID_LOCATION,
        message: 'Bitte geben Sie eine gültige 5-stellige Postleitzahl oder Stadt ein.'
      } as CinemaSearchError));
    }

    // Cache prüfen
    const cacheKey = this.getCacheKey(params);
    const cachedResult = this.searchCache.get(cacheKey);
    if (cachedResult) {
      console.log('Cache hit für Kino-Suche:', cacheKey);
      return of(cachedResult);
    }

    // Koordinaten ermitteln und dann Kinos suchen
    return this.getCoordinates(params).pipe(
      switchMap(coords => this.searchCinemasAroundCoordinates(coords, params)),
      map(response => ({
        ...response,
        queryTime: Date.now() - startTime
      })),
      catchError(error => this.handleError(error)),
      // Cache speichern
      map(result => {
        this.searchCache.set(cacheKey, result);
        // Cache nach Zeit löschen
        setTimeout(() => {
          this.searchCache.delete(cacheKey);
        }, this.CACHE_DURATION);
        return result;
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
