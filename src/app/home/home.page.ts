import {
  IonButton,
  IonContent,
  InfiniteScrollCustomEvent,
  IonSkeletonText,
  IonInfiniteScrollContent,
  IonInfiniteScroll,
  IonRefresher,
  IonRefresherContent,
  IonSearchbar,
  IonIcon,
  IonFab,
  IonFabButton
} from '@ionic/angular/standalone';

import { MovieService } from '../services/movie.service';
import { catchError, finalize, debounceTime, distinctUntilChanged } from 'rxjs';
import { MovieResult, RATING_THRESHOLDS } from '../services/interfaces';
import { DatePipe, DecimalPipe } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { Component, inject, signal, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BottomNavComponent } from '../components/bottom-nav/bottom-nav.component';

import { auth } from '../firebase.config';
import { User } from 'firebase/auth';
import { addIcons } from 'ionicons';
@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  imports: [
    IonFabButton, IonFab, IonIcon, IonButton, IonSearchbar,
    IonRefresherContent, IonRefresher, IonInfiniteScroll, IonInfiniteScrollContent,
    IonSkeletonText, IonContent, DatePipe, DecimalPipe, RouterModule, FormsModule,
    CommonModule, BottomNavComponent
  ]
})
export class HomePage {

  // Dependency Injection des Movie Services
  private movieService = inject(MovieService);
  private currentPage = 1;
  private searchSubject = new Subject<string>();

  public error: string | null = null;
  public movies: MovieResult[] = [];
  public isLoading = false;
  public isSearching = false;
  public searchQuery = '';
  public dummyArray = new Array(6); // Mehr Skeleton Items für Grid
  public imageBaseUrl = 'https://image.tmdb.org/t/p';

  // Signal für Scroll-to-Top Button Sichtbarkeit
  showScrollButton = signal<boolean>(false);

  // Referenz auf den IonContent für Scroll-Operations
  @ViewChild(IonContent)
  content!: IonContent;

  // Firebase Auth User
  public currentUser: User | null = null;

  constructor() {

    this.loadMovies();
    this.setupSearch();
    this.checkAuthState();
  }

  // Firebase Auth State prüfen
  private checkAuthState() {
    auth.onAuthStateChanged((user) => {
      this.currentUser = user;
      console.log('User:', user?.email || 'Nicht angemeldet');
    });
  }

  // Filme laden
  loadMovies(event?: InfiniteScrollCustomEvent, isRefresh = false) {
    this.error = null;

    // Loading State setzen
    if (!event && !isRefresh) {
      this.isLoading = true;
    }
    // Entscheiden ob Suche oder Top Rated
    const apiCall = this.searchQuery.trim()
      ? this.movieService.searchMovies(this.searchQuery, this.currentPage)
      : this.movieService.getTopRatedMovies(this.currentPage);

    // API Call mit RxJS Operators
    apiCall.pipe(
      finalize(() => {
        this.isLoading = false;
        this.isSearching = false;
        if (event) event.target.complete();
      }),
      catchError((err: any) => {
        console.error('API Fehler:', err);
        this.error = 'Fehler beim Laden der Filme. Bitte versuchen Sie es erneut.';
        return [];
      })
    ).subscribe(res => {
      // Bei Refresh oder erster Seite Array leeren
      if (isRefresh || this.currentPage === 1) {
        this.movies = [];
      }

      // Filme zum Array hinzufügen
      if (res && res.results) {
        this.movies.push(...res.results);
      }

      // Infinite Scroll deaktivieren wenn keine weiteren Seiten
      if (event) {
        event.target.disabled = res?.total_pages === this.currentPage;
      }
    });
  }

  // Mehr Filme laden (Infinite Scroll)
  loadMore(event: InfiniteScrollCustomEvent) {
    this.currentPage++;
    this.loadMovies(event);
  }

  // Pull-to-Refresh Handler
  handleRefresh(event: any) {
    this.currentPage = 1;
    this.loadMovies(undefined, true);
    setTimeout(() => {
      if (event && event.target) {
        event.target.complete();
      }
    }, 1000);
  }

  // Such-Funktionalität setupen mit Debounce
  private setupSearch() {
    this.searchSubject.pipe(
      debounceTime(500),
      distinctUntilChanged()
    ).subscribe(query => {
      this.searchQuery = query;
      this.currentPage = 1;
      this.loadMovies();
    });
  }

  // Sucheingabe Handler
  onSearchInput(event: any) {
    const query = event.target.value || '';
    this.isSearching = true;
    this.searchSubject.next(query);
  }

  // Suche leeren
  onSearchClear() {
    this.searchQuery = '';
    this.currentPage = 1;
    this.isSearching = false;
    this.loadMovies();
  }

  // Manual refresh button
  manualRefresh() {
    this.currentPage = 1;
    this.error = null;
    this.loadMovies(undefined, true);
  }

  // Performance tracking
  trackByMovieId(index: number, movie: MovieResult): number {
    return movie.id;
  }

  // Image Fallback für fehlende Poster
  onImageError(event: any) {
    const target = event.target;
    // Fallback zu einem Standard-Bild oder Platzhalter
    target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjQ1MCIgdmlld0JveD0iMCAwIDMwMCA0NTAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIzMDAiIGhlaWdodD0iNDUwIiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0xNTAgMjI1QzE2Ni41NjkgMjI1IDE4MCAyMTEuNTY5IDE4MCAxOTVDMTgwIDE3OC40MzEgMTY2LjU2OSAxNjUgMTUwIDE2NUMxMzMuNDMxIDE2NSAxMjAgMTc4LjQzMSAxMjAgMTk1QzEyMCAyMTEuNTY5IDEzMy40MzEgMjI1IDE1MCAyMjVaIiBmaWxsPSIjRDFEM0Q3Ii8+CjxwYXRoIGQ9Ik05MCAyODVDOTAgMjc2LjE2NCA5Ny4xNjQgMjY5IDEwNiAyNjlIMTk0QzIwMi44MzYgMjY5IDIxMCAyNzYuMTY0IDIxMCAyODVWMzE1SDkwVjI4NVoiIGZpbGw9IiNEMUQzRDciLz4KPC9zdmc+';
    target.style.backgroundColor = '#f3f4f6';
  }

  // Rating farbe basierend auf TMDB Score
  getRatingColor(rating: number): string {
    if (rating >= RATING_THRESHOLDS.excellent) return 'success';
    if (rating >= RATING_THRESHOLDS.good) return 'warning';
    return 'danger';
  }

  // Methode zum Scrollen nach oben
  scrollToTop() {
    if (this.content) {
      this.content.scrollToTop(500);

    }
  }

  ionViewDidEnter() {
    if (this.content) {
      this.content.getScrollElement().then(scrollElement => {
        scrollElement.addEventListener('scroll', this.handleScroll.bind(this));
      });
    }
  }

  private handleScroll(event: any) {
    const scrollElement = event.target;
    const scrollTop = scrollElement.scrollTop;

    // Show/hide scroll to top button
    this.showScrollButton.set(scrollTop > 400);
  }


  // Utility method für bessere Fehlerbehandlung
  private handleError(error: any, defaultMessage: string): string {
    console.error('Fehler:', error);

    if (error?.message) {
      return error.message;
    }

    if (error?.status === 0) {
      return 'Netzwerkfehler. Bitte überprüfen Sie Ihre Internetverbindung.';
    }

    if (error?.status >= 500) {
      return 'Server-Fehler. Bitte versuchen Sie es später erneut.';
    }

    return defaultMessage;
  }

  // Lifecycle method für Cleanup
  ngOnDestroy() {
    this.searchSubject.complete();
  }
}




