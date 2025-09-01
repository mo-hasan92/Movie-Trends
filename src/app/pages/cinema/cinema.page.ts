import { Component, inject, signal, WritableSignal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  IonContent, IonButton, IonIcon, IonSpinner, IonSkeletonText, IonSearchbar
} from '@ionic/angular/standalone';
import { CinemaService } from '../../services/cinema.service';
import { Cinema, CinemaSearchResponse, CinemaSearchError } from '../../services/cinema-interfaces';
import { PLZ_REGEX } from '../../config/api-key';
import { BottomNavComponent } from '../../components/bottom-nav/bottom-nav.component';
import { addIcons } from 'ionicons';
import {
  searchOutline, locationOutline, callOutline, globeOutline, timeOutline,
  filmOutline, mapOutline, alertCircleOutline, refreshOutline,  accessibilityOutline, navigateOutline } from 'ionicons/icons';

@Component({
    selector: 'app-cinema',
    templateUrl: './cinema.page.html',
    styleUrls: ['./cinema.page.scss'],
    imports: [
        CommonModule, FormsModule,
        IonContent, IonButton, IonIcon, BottomNavComponent,
        IonSpinner, IonSkeletonText, IonSearchbar
    ]
})

export class CinemaPage {

  // Services
  private cinemaService = inject(CinemaService);
  private router = inject(Router);

  // State Management mit Signals
  public searchTerm: WritableSignal<string> = signal('');
  public isSearching: WritableSignal<boolean> = signal(false);
  public searchResults: WritableSignal<CinemaSearchResponse | null> = signal(null);
  public error: WritableSignal<CinemaSearchError | null> = signal(null);
  public hasSearched: WritableSignal<boolean> = signal(false);

  // UI State
  public showSuggestions: WritableSignal<boolean> = signal(false);

   // Neue Properties für Geolocation
  public isLocating: WritableSignal<boolean> = signal(false);
  public locationPermission: WritableSignal<'granted' | 'denied' | 'prompt'> = signal('prompt');


  // Beispiel-Suchvorschläge
  public suggestions = [
    { type: 'plz', value: '60311', label: 'Frankfurt am Main' },
    { type: 'plz', value: '10115', label: 'Berlin Mitte' },
    { type: 'plz', value: '80331', label: 'München Innenstadt' },
    { type: 'city', value: 'Hamburg', label: 'Hamburg' },
    { type: 'city', value: 'Köln', label: 'Köln' }
  ];

  constructor() {
    // Icons registrieren
    addIcons({searchOutline,locationOutline,alertCircleOutline,refreshOutline,
      timeOutline,filmOutline,accessibilityOutline,callOutline,globeOutline,mapOutline,navigateOutline});
    this.checkLocationPermission();
  }


  /**
   * Standortberechtigung prüfen
   */
  async checkLocationPermission(): Promise<void> {
    try {
      // Für Capacitor/Web-API
      if (typeof (navigator as any).permissions !== 'undefined') {
        const status = await (navigator as any).permissions.query({ name: 'geolocation' });
        this.locationPermission.set(status.state === 'granted' ? 'granted' :
                                  status.state === 'denied' ? 'denied' : 'prompt');
      }
    } catch (error) {
      console.error('Fehler bei Berechtigungsprüfung:', error);
    }
  }

  /**
   * Kinos in der Nähe finden
   */
  async findCinemasNearby(): Promise<void> {
    this.isLocating.set(true);
    this.error.set(null);

    try {
      // Aktuelle Position abrufen
      const location = await this.cinemaService.getCurrentLocation();

      // Nach Kinos in der Nähe suchen
      this.isSearching.set(true);
      this.searchTerm.set('Mein Standort');
      this.hasSearched.set(true);
      this.showSuggestions.set(false);

      this.cinemaService.searchCinemasByCoordinates(
        location.latitude,
        location.longitude,
        20000 // 20km Radius
      ).subscribe({
        next: (result) => {
          console.log('Kinos in der Nähe:', result);
          this.searchResults.set(result);
          this.isSearching.set(false);
          this.isLocating.set(false);
          this.locationPermission.set('granted');

          if (result.cinemas.length === 0) {
            this.error.set({
              code: 'NO_RESULTS',
              message: 'Keine Kinos in Ihrer Nähe gefunden.'
            });
          }
        },
        error: (err) => {
          console.error('Fehler bei der Standortsuche:', err);
          this.error.set(err);
          this.isSearching.set(false);
          this.isLocating.set(false);

          if (err.message?.includes('Standortberechtigung')) {
            this.locationPermission.set('denied');
          }
        }
      });

    } catch (error) {
      console.error('Fehler beim Standortabruf:', error);
      this.isLocating.set(false);
      this.error.set({
        code: 'LOCATION_ERROR',
        message: typeof error === 'object' && error !== null && 'message' in error
          ? (error as { message?: string }).message || 'Standort konnte nicht ermittelt werden.'
          : 'Standort konnte nicht ermittelt werden.'
      });

      if (typeof error === 'object' && error !== null && 'message' in error && typeof (error as any).message === 'string' && (error as any).message.includes('verweigert')) {
        this.locationPermission.set('denied');
      }
    }
  }

  /**
   * Haupt-Suchmethode
   */
  searchCinemas(): void {
    const term = this.searchTerm().trim();

    if (!term) {
      this.error.set({
        code: 'EMPTY_SEARCH',
        message: 'Bitte geben Sie eine Postleitzahl oder Stadt ein.'
      });
      return;
    }

    this.isSearching.set(true);
    this.error.set(null);
    this.searchResults.set(null);
    this.hasSearched.set(true);
    this.showSuggestions.set(false);

    // Bestimmen ob PLZ oder Stadt
    const isZipCode = PLZ_REGEX.test(term);
    const searchParams = isZipCode
      ? { zipCode: term }
      : { city: term };

    console.log('Suche Kinos für:', searchParams);

    this.cinemaService.searchCinemas(searchParams).subscribe({
      next: (result) => {
        console.log('Kino-Suchergebnis:', result);
        this.searchResults.set(result);
        this.isSearching.set(false);

        if (result.cinemas.length === 0) {
          this.error.set({
            code: 'NO_RESULTS',
            message: `Keine Kinos in "${term}" gefunden. Versuchen Sie eine andere Postleitzahl oder Stadt.`
          });
        }
      },
      error: (err) => {
        console.error('Kino-Suchfehler:', err);
        this.error.set(err);
        this.isSearching.set(false);
      }
    });
  }

  /**
   * Search on Enter key
   */
  onSearchKeyPress(event: any): void {
    if (event.key === 'Enter') {
      this.searchCinemas();
    }
  }

  /**
   * Suggestion auswählen
   */
  selectSuggestion(suggestion: any): void {
    this.searchTerm.set(suggestion.value);
    this.showSuggestions.set(false);
    this.searchCinemas();
  }

  /**
   * Search Input Handler
   */
  onSearchInput(event: any): void {
    const value = event.target.value || '';
    this.searchTerm.set(value);

    // Suggestions anzeigen wenn Input leer ist oder wenig Text
    this.showSuggestions.set(value.length < 3 && !this.hasSearched());
  }

  /**
   * Search Clear Handler
   */
  onSearchClear(): void {
    this.searchTerm.set('');
    this.searchResults.set(null);
    this.error.set(null);
    this.hasSearched.set(false);
    this.showSuggestions.set(true);
  }

  /**
   * Kino anrufen
   */
  callCinema(cinema: Cinema): void {
    if (cinema.phone) {
      const phoneNumber = cinema.phone.replace(/\D/g, ''); // Nur Ziffern
      window.open(`tel:${phoneNumber}`, '_self');
    }
  }

  /**
   * Kino-Website öffnen
   */
  openWebsite(cinema: Cinema): void {
    if (cinema.website) {
      const url = cinema.website.startsWith('http')
        ? cinema.website
        : `https://${cinema.website}`;
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  }

  /**
   * Kino in Google Maps öffnen
   */
  openInMaps(cinema: Cinema): void {
    const query = encodeURIComponent(`${cinema.name}, ${cinema.address}, ${cinema.city}`);
    const mapsUrl = `https://www.google.com/maps/search/${query}`;
    window.open(mapsUrl, '_blank', 'noopener,noreferrer');
  }

  /**
   * Entfernungsfarbe basierend auf Distanz
   */
  getDistanceColor(distance: number): string {
    if (distance <= 5) return 'success';
    if (distance <= 15) return 'warning';
    return 'medium';
  }

  /**
   * Retry-Funktion für Fehlerfall
   */
  retrySearch(): void {
    if (this.searchTerm()) {
      this.searchCinemas();
    }
  }

  /**
   * Debug: Test-Suche
   */
  testSearch(): void {
    this.searchTerm.set('60311');
    this.searchCinemas();
  }

  /**
   * Format für Öffnungszeiten
   */
  formatOpeningHours(openingHours?: string): string {
    if (!openingHours) return 'Öffnungszeiten unbekannt';

    // Vereinfachte Formatierung für OSM-Daten
    return openingHours.length > 50
      ? openingHours.substring(0, 47) + '...'
      : openingHours;
  }

  /**
   * Check ob Kino weitere Details hat
   */
  hasDetails(cinema: Cinema): boolean {
    return !!(cinema.phone || cinema.website || cinema.openingHours || cinema.operator);
  }
}
