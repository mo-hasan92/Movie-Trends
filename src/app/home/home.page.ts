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
import { Component,HostListener , inject, signal, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BottomNavComponent } from '../components/bottom-nav/bottom-nav.component';

// Firebase Auth importieren
import { auth } from '../firebase.config';
import { User } from 'firebase/auth';
import { addIcons } from 'ionicons';
import { star, calendarOutline, shareOutline ,arrowUpOutline } from 'ionicons/icons';
@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  imports: [
    IonFabButton, IonFab, IonIcon, IonButton, IonSearchbar,
    IonRefresherContent, IonRefresher, IonInfiniteScroll, IonInfiniteScrollContent,
     IonSkeletonText,
     IonContent, DatePipe, DecimalPipe, RouterModule, FormsModule,
    CommonModule , BottomNavComponent
  ]
})
export class HomePage {

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

  showScrollButton = signal<boolean>(false);
  @ViewChild(IonContent)
  content!: IonContent;

  // Firebase Auth User
  public currentUser: User | null = null;

  constructor() {
    addIcons({  star,calendarOutline, shareOutline, arrowUpOutline});
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

    if (!event && !isRefresh) {
      this.isLoading = true;
    }

    const apiCall = this.searchQuery.trim()
      ? this.movieService.searchMovies(this.searchQuery, this.currentPage)
      : this.movieService.getTopRatedMovies(this.currentPage);

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
      if (isRefresh || this.currentPage === 1) {
        this.movies = [];
      }

      if (res && res.results) {
        this.movies.push(...res.results);
      }

      if (event) {
        event.target.disabled = res?.total_pages === this.currentPage;
      }
    });
  }

  // Mehr Filme laden
  loadMore(event: InfiniteScrollCustomEvent) {
    this.currentPage++;
    this.loadMovies(event);
  }

  // Refresh
  handleRefresh(event: any) {
    this.currentPage = 1;
    this.loadMovies(undefined, true);
    setTimeout(() => {
      if (event && event.target) {
        event.target.complete();
      }
    }, 1000);
  }

  // Suche setup
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

  // Suche eingabe
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

  // Image fallback für fehlende Poster
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

@HostListener('window:scroll', ['$event']) onWindowScroll() {
  // 1. Show/Hide Scroll to Top Button
  const yOffset = window.pageYOffset;
  const showButton = yOffset > 400; // Show button after scrolling 400px
  this.showScrollButton.set(showButton);

  // 2. Trigger Infinite Scroll
  const scrollPosition = window.innerHeight + window.pageYOffset;
  const documentHeight = document.documentElement.scrollHeight;
  console.log('Scroll Position:', scrollPosition);
  console.log('Document Height:', documentHeight);


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

