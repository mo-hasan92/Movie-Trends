import { MovieService } from './../services/movie.service';
import { Component, inject, Input, signal, WritableSignal, computed } from '@angular/core';
import { CommonModule, DatePipe, DecimalPipe, UpperCasePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { WatchlistService } from '../services/watchlist.service';
import { Auth, authState } from '@angular/fire/auth';
import { Firestore } from '@angular/fire/firestore';
import {
  IonContent, IonHeader, IonToolbar, IonButtons, IonBackButton, IonIcon, IonButton, IonSkeletonText
} from '@ionic/angular/standalone';
import {
  MovieResult, CastMember, CrewMember, MovieVideo, CreditsResponse, VideoResponse,
  TMDB_IMAGE_SIZES, RATING_THRESHOLDS, isTrailer, getMainCast, getDirector,
  isCompleteMovieResult, MovieListItem
} from '../services/interfaces';
import {
  cashOutline, calendarOutline, starOutline, peopleOutline,
  filmOutline, languageOutline, linkOutline, playOutline,
  shareOutline, heartOutline, bookmarkOutline, timeOutline,
  businessOutline, globeOutline, alertCircleOutline, refreshOutline,
  add, checkmarkCircleOutline, documentTextOutline, informationCircleOutline,
  openOutline, trophyOutline, personOutline, videocamOutline,
  star
} from 'ionicons/icons';
import { addIcons } from 'ionicons';
import { catchError, firstValueFrom, forkJoin, of } from 'rxjs';

@Component({
    selector: 'app-details',
    templateUrl: './details.page.html',
    styleUrls: ['./details.page.scss'],
    imports: [
        IonSkeletonText, IonButton, IonIcon, IonBackButton,
        IonButtons, IonContent, IonHeader, IonToolbar,
        CommonModule, FormsModule, DatePipe, DecimalPipe, UpperCasePipe
    ]
})
export class DetailsPage {

  //  SERVICE INJECTIONS
  private movieService = inject(MovieService);
  private watchlistService = inject(WatchlistService);
  private auth = inject(Auth);
  private firestore = inject(Firestore);
  private router = inject(Router);

  //  KONFIGURATION - Bildgrößen und Bewertungsgrenzen
  public imageBaseUrl = 'https://image.tmdb.org/t/p';
  public imageSizes = TMDB_IMAGE_SIZES;
  public ratingThresholds = RATING_THRESHOLDS;

  //  STATE MANAGEMENT MIT SIGNALS
  public movie: WritableSignal<MovieResult | null> = signal(null);
  public cast: WritableSignal<CastMember[]> = signal([]);
  public crew: WritableSignal<CrewMember[]> = signal([]);
  public videos: WritableSignal<MovieVideo[]> = signal([]);
  public similarMovies: WritableSignal<MovieListItem[]> = signal([]);
  public isLoading: WritableSignal<boolean> = signal(false);
  public error: WritableSignal<string | null> = signal(null);
  public isInWatchlist: WritableSignal<boolean> = signal(false);

  //  COMPUTED PROPERTIES FÜR ABGELEITETE DATEN
  public mainCast = computed(() => getMainCast(this.cast(), 6));// Top 6 Schauspieler
  public director = computed(() => getDirector(this.crew()));
  public trailer = computed(() => {
    const videos = this.videos();
    return videos.find(video => isTrailer(video)) || null;// Ersten Trailer finden
  });

  //  VALIDIERUNGEN
  public isValidMovie = computed(() => {
    const movie = this.movie();
    return movie ? isCompleteMovieResult(movie) : false;
  });

  public mainGenres = computed(() => {
    const movie = this.movie();
    return movie?.genres?.slice(0, 3) || []; // Erste 3 Genres
  });

  public productionCompanies = computed(() => {
    const movie = this.movie();
    return movie?.production_companies || [];
  });

  //  MOVIE ID FÜR RELOAD-ZWECKE
  private currentMovieId: string = '';

 /**
   *  INPUT SETTER - Wird gesetzt wenn Navigation stattfindet
   * Lädt automatisch alle Film-Daten wenn die ID sich ändert
   */
  @Input()
  set id(movieId: string) {
    if (movieId && movieId !== this.currentMovieId) {
      this.currentMovieId = movieId;
      this.loadMovieData(movieId);
      this.checkWatchlist(movieId);
    }
  }

  constructor() {
    // Icons für bessere Performance vorab laden
    addIcons({
      alertCircleOutline, refreshOutline, star, playOutline, documentTextOutline,
      informationCircleOutline, calendarOutline, timeOutline, cashOutline, starOutline,
      languageOutline, checkmarkCircleOutline, linkOutline, openOutline, businessOutline,
      shareOutline, peopleOutline, filmOutline, add, heartOutline, bookmarkOutline,
      globeOutline, trophyOutline, personOutline, videocamOutline
    });

    //  FIREBASE VERBINDUNGSTEST (Nur für Debugging)
    //this.testFirebaseConnection();
  }

  //  FIREBASE CONNECTION TEST (Debugging)
/*   async testFirebaseConnection(): Promise<void> {
    try {
      console.log('Testing Firebase connection...');
      console.log('Auth instance:', this.auth);
      console.log('Firestore instance:', this.firestore);

      // KORREKTE Methode: Auth State Observable verwenden
      const user = await firstValueFrom(authState(this.auth));

      if (!user) {
        console.log('ERROR: No user logged in');

        // Auth State Listener für Debug
        authState(this.auth).subscribe(authUser => {
          if (authUser) {
            console.log('Auth state changed - User logged in:', authUser.email);
            this.performFirestoreTest(authUser);
          } else {
            console.log('Auth state changed - User logged out');
          }
        });

        return;
      }

      console.log('User logged in:', user.email);
      console.log('User UID:', user.uid);

      await this.performFirestoreTest(user);

    } catch (error: any) {
      console.error('Firebase connection test failed:');
      console.error('Error code:', error.code);
      console.error('Error message:', error.message);
      console.error('Full error:', error);
    }
  }
 */

  //  FIRESTORE TEST METHODE (Debugging)
/*   private async performFirestoreTest(user: any): Promise<void> {
    try {
      // Firestore Test
      const testRef = doc(this.firestore, 'test', 'connection');

      console.log('Attempting Firestore write...');
      await setDoc(testRef, {
        message: 'Connection test',
        timestamp: new Date().toISOString(),
        user: user.uid,
        userEmail: user.email
      });

      console.log('SUCCESS: Firestore write completed');

      // Firestore Read Test
      const docSnap = await getDoc(testRef);
      if (docSnap.exists()) {
        console.log('SUCCESS: Firestore read completed:', docSnap.data());
        console.log('Firebase is working correctly!');
      } else {
        console.log('ERROR: Document does not exist');
      }

    } catch (error: any) {
      console.error('Firestore operation failed:');
      console.error('Error code:', error.code);
      console.error('Error message:', error.message);

      // Spezifische Firebase-Fehler
      if (error.code === 'permission-denied') {
        console.error('Firestore permission denied - check your rules in Firebase Console');
      } else if (error.code === 'not-found') {
        console.error('Firestore database not found - create database in Firebase Console');
      }
    }
  } */

  /**
   *  WATCHLIST-STATUS PRÜFEN
   * Überprüft ob der aktuelle Film in der Watchlist ist
   */
  async checkWatchlist(movieId: string): Promise<void> {
    try {
      // User State prüfen mit authState Observable
      const user = await firstValueFrom(authState(this.auth));

      if (!user) {
        console.log('User not logged in for watchlist check');
        this.isInWatchlist.set(false);
        return;
      }

      const inWatchlist = await this.watchlistService.isInWatchlist(movieId);
      this.isInWatchlist.set(inWatchlist);
      console.log(`Film ${movieId} in Watchlist:`, inWatchlist);
    } catch (error) {
      console.error('Fehler beim Prüfen der Watchlist:', error);
      this.isInWatchlist.set(false);
    }
  }

  /**
   *  FILM ZUR WATCHLIST HINZUFÜGEN/ENTFERNEN
   * Toggle-Funktion für die Watchlist
   */
  async toggleWatchlist(): Promise<void> {
    const movie = this.movie();
    if (!movie || !isCompleteMovieResult(movie)) return;

    // Prüfen ob User angemeldet ist
    const isLoggedIn = await this.watchlistService.isUserLoggedIn();
    if (!isLoggedIn) {
      console.log('User ist nicht angemeldet');
      this.router.navigate(['/auth/signin']);
      return;
    }

    const id = movie.id.toString();

    try {
      if (this.isInWatchlist()) {
        await this.watchlistService.removeFromWatchlist(id);
        this.isInWatchlist.set(false);
        console.log('Film entfernt aus Watchlist');
      } else {
        const watchlistItem: Partial<MovieListItem> = {
          id: movie.id,
          title: movie.title,
          poster_path: movie.poster_path,
          vote_average: movie.vote_average,
          release_date: movie.release_date,
          overview: movie.overview
        };

        await this.watchlistService.addToWatchlist(id, watchlistItem);
        this.isInWatchlist.set(true);
        console.log('Film hinzugefügt zur Watchlist');
      }
    } catch (error) {
      console.error('Fehler beim Aktualisieren der Watchlist:', error);
    }
  }

  /**
   *  LÄDT ALLE FILM-DATEN PARALLEL
   * Verwendet forkJoin für parallele API-Calls
   */
  public loadMovieData(movieId?: string): void {
    const id = movieId || this.currentMovieId;
    if (!id) {
      this.error.set('Keine Film-ID verfügbar');
      return;
    }

    this.isLoading.set(true);
    this.error.set(null);

    const movieIdNumber = parseInt(id, 10);
    if (isNaN(movieIdNumber)) {
      this.error.set('Ungültige Film-ID');
      this.isLoading.set(false);
      return;
    }

    // Parallele API-Calls mit korrekter Typisierung
    forkJoin({
      movie: this.movieService.getMovieDetails(id),
      credits: this.movieService.getMovieCredits(movieIdNumber).pipe(
        catchError(() => of({
          id: movieIdNumber,
          cast: [],
          crew: []
        } as CreditsResponse))
      ),
      videos: this.movieService.getMovieVideos(movieIdNumber).pipe(
        catchError(() => of({
          id: movieIdNumber,
          results: []
        } as VideoResponse))
      ),
      similar: this.movieService.getSimilarMovies(movieIdNumber).pipe(
        catchError(() => of({ results: [] }))
      )
    }).pipe(
      catchError((error) => {
        console.error('Fehler beim Laden der Film-Daten:', error);
        const errorMessage = this.getErrorMessage(error);
        this.error.set(errorMessage);
        return of(null);
      })
    ).subscribe({
      next: (data) => {
        if (data) {
          if (isCompleteMovieResult(data.movie)) {
            this.movie.set(data.movie);
          } else {
            this.error.set('Unvollständige Film-Daten erhalten');
            return;
          }

          //  CAST & CREED DATEN SETZEN
          this.cast.set(data.credits.cast || []);
          this.crew.set(data.credits.crew || []);
          this.videos.set(data.videos.results || []);

          //  ÄHNLICHE FILME
          const similarItems: MovieListItem[] = (data.similar.results || []).map(movie => ({
            id: movie.id,
            title: movie.title,
            poster_path: movie.poster_path,
            release_date: movie.release_date,
            vote_average: movie.vote_average,
            vote_count: movie.vote_count,
            overview: movie.overview
          }));
          this.similarMovies.set(similarItems);
        }
      },
      complete: () => {
        this.isLoading.set(false);
      }
    });
  }

  /**
   *  FEHLERBEHANDLUNG MIT SPEZIFISCHEN NACHRICHTEN
   */
  private getErrorMessage(error: any): string {
    if (error?.status === 404) {
      return 'Film nicht gefunden. Möglicherweise wurde er entfernt oder die ID ist ungültig.';
    }

    if (error?.status === 401) {
      return 'API-Authentifizierung fehlgeschlagen. Bitte kontaktieren Sie den Support.';
    }

    if (error?.status === 0) {
      return 'Netzwerkfehler. Bitte überprüfen Sie Ihre Internetverbindung.';
    }

    if (error?.status >= 500) {
      return 'Server-Fehler. Bitte versuchen Sie es später erneut.';
    }

    if (error?.message) {
      return `Fehler: ${error.message}`;
    }

    return 'Unbekannter Fehler beim Laden der Film-Details. Bitte versuchen Sie es erneut.';
  }

  /**
   * Reload-Funktion für Error State
   */
  public reloadMovieData(): void {
    if (this.currentMovieId) {
      this.loadMovieData(this.currentMovieId);
    }
  }

  /**
   * Get Rating Color - Nutzung der Interface-Konstanten
   */
  getRatingColor(rating: number): string {
    if (rating >= this.ratingThresholds.excellent) return 'success';
    if (rating >= this.ratingThresholds.good) return 'warning';
    return 'danger';
  }

  /**
   * Get Rating Stars mit besserer Berechnung
   */
  getRatingStars(rating: number): number {
    return Math.round((rating / 10) * 5);
  }

  /**
   * Get Rating Percentage
   */
  getRatingPercentage(rating: number): number {
    return Math.round((rating / 10) * 100);
  }

  /**
   * Get Main Genres - Nutzung des Computed Properties
   */
  getMainGenres(genres?: any[], limit = 3): any[] {
    if (!genres) return [];
    return genres.slice(0, limit);
  }

  /**
   * Format Budget mit besserer Lokalisierung
   */
  formatBudget(budget: number): string {
    if (!budget || budget === 0) return 'Nicht bekannt';

    if (budget >= 1000000000) {
      return new Intl.NumberFormat('de-DE', {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: 1
      }).format(budget / 1000000000) + ' Mrd.';
    } else if (budget >= 1000000) {
      return new Intl.NumberFormat('de-DE', {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: 1
      }).format(budget / 1000000) + ' Mio.';
    }

    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0
    }).format(budget);
  }

  /**
   * Format Revenue
   */
  formatRevenue(revenue: number): string {
    if (!revenue || revenue === 0) return 'Nicht bekannt';

    if (revenue >= 1000000000) {
      return new Intl.NumberFormat('de-DE', {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: 1
      }).format(revenue / 1000000000) + ' Mrd.';
    } else if (revenue >= 1000000) {
      return new Intl.NumberFormat('de-DE', {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: 1
      }).format(revenue / 1000000) + ' Mio.';
    }

    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0
    }).format(revenue);
  }

  /**
   * Format Runtime mit Interface-Helper
   */
  formatRuntime(minutes: number): string {
    if (!minutes) return 'Nicht bekannt';

    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;

    if (hours === 0) return `${mins} min`;
    if (mins === 0) return `${hours}h`;
    return `${hours}h ${mins}min`;
  }

  /**
   * Play Trailer - Nutzung des Computed Properties
   */
  playTrailer(): void {
    const trailer = this.trailer();
    if (trailer && isTrailer(trailer)) {
      const url = `https://www.youtube.com/watch?v=${trailer.key}`;
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  }

  /**
   * Get Poster URL mit Image Size Konstanten
   */
  getPosterUrl(posterPath: string | null, size: keyof typeof TMDB_IMAGE_SIZES.poster = 'large'): string {
    if (!posterPath) return this.getFallbackImageUrl();
    return `${this.imageBaseUrl}/${this.imageSizes.poster[size]}${posterPath}`;
  }

  /**
   * Get Backdrop URL
   */
  getBackdropUrl(backdropPath: string | null, size: keyof typeof TMDB_IMAGE_SIZES.backdrop = 'large'): string {
    if (!backdropPath) return this.getFallbackImageUrl();
    return `${this.imageBaseUrl}/${this.imageSizes.backdrop[size]}${backdropPath}`;
  }

  /**
   * Get Profile URL für Cast
   */
  getProfileUrl(profilePath: string | null, size: keyof typeof TMDB_IMAGE_SIZES.profile = 'medium'): string {
    if (!profilePath) return this.getFallbackImageUrl();
    return `${this.imageBaseUrl}/${this.imageSizes.profile[size]}${profilePath}`;
  }

  /**
   * Fallback Image URL
   */
  private getFallbackImageUrl(): string {
    return `data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjQ1MCIgdmlld0JveD0iMCAwIDMwMCA0NTAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIzMDAiIGhlaWdodD0iNDUwIiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0xNTAgMjI1QzE2Ni41NjkgMjI1IDE4MCAyMTEuNTY5IDE4MCAxOTVDMTgwIDE3OC40MzEgMTY2LjU2OSAxNjUgMTUwIDE2NUMxMzMuNDMxIDE2NSAxMjAgMTc4LjQzMSAxMjAgMTk1QzEyMCAyMTEuNTY5IDEzMy40MzEgMjI1IDE1MCAyMjVaIiBmaWxsPSIjRDFEM0Q3Ci8+CjxwYXRoIGQ9Ik05MCAyODVDOTAgMjc2LjE2NCA5Ny4xNjQgMjY5IDEwNiAyNjlIMTk0QzIwMi44MzYgMjY5IDIxMCAyNzYuMTY0IDIxMCAyODVWMzE1SDkwVjI4NVoiIGZpbGw9IiNEMUQzRDciLz4KPC9zdmc+`;
  }

  /**
   *  TEILEN-FUNKTION MIT WEB SHARE API
   *  FUNKTIONIERT AUF HANDYS MIT NATIVER SHARE-DIALOG
   * FALLBACK: CLIPBOARD FÜR DESKTOP
   */
async shareMovie(): Promise<void> {
  const movie = this.movie();
  if (!movie) return;

  const shareData = {
    title: `${movie.title} (${new Date(movie.release_date).getFullYear()})`,
    text: `Schau dir "${movie.title}" an! Bewertung: ${movie.vote_average}/10`,
    url: window.location.href
  };

  try {
    // Native Web Share API (hauptsächlich Mobile)
    if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
      await navigator.share(shareData);
      console.log('Film erfolgreich geteilt!');
    } else {
      // Fallback: Clipboard
      const textToShare = `${shareData.title}\n${shareData.text}\n${shareData.url}`;
      await navigator.clipboard.writeText(textToShare);
      console.log('Film-Details in die Zwischenablage kopiert!');
    }
  } catch (error: any) {
    // User aborted sharing
    if (error.name === 'AbortError') {
      console.log('User cancelled sharing');
      return;
    }

    console.error('Fehler beim Teilen:', error);
  }
}

/**
 * Prüfen ob Web Share API verfügbar ist
 */
isWebShareSupported(): boolean {
  return typeof navigator !== 'undefined' && 'share' in navigator;
}

  /**
   * Image Error Handler mit verbessertem Fallback
   */
  onImageError(event: any, type: 'poster' | 'backdrop' | 'profile' = 'poster'): void {
    const img = event.target;
    img.src = this.getFallbackImageUrl();
    img.style.backgroundColor = '#f3f4f6';
    img.style.borderRadius = '16px';
  }

  /**
   * Get Movie Status Color mit Interface-basierten Status-Werten
   */
  getStatusColor(status: string): string {
    const statusColors: { [key: string]: string } = {
      'Released': 'success',
      'Post Production': 'warning',
      'In Production': 'primary',
      'Planned': 'medium',
      'Rumored': 'light',
      'Canceled': 'danger'
    };

    return statusColors[status] || 'medium';
  }

  /**
   *  SPRACHNAME AUS SPRACHCODE
   */
  getLanguageName(languageCode: string): string {
    const languages: { [key: string]: string } = {
      'en': 'Englisch', 'de': 'Deutsch', 'fr': 'Französisch',
      'es': 'Spanisch', 'it': 'Italienisch', 'ja': 'Japanisch',
      'ko': 'Koreanisch', 'zh': 'Chinesisch'
    };
    return languages[languageCode] || languageCode.toUpperCase();
  }

  /**
   * Cleanup beim Zerstören der Komponente
   */
  ngOnDestroy(): void {
    // Cleanup falls nötig
  }
}
