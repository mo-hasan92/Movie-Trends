import { Component, signal, WritableSignal, computed, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router , RouterLink } from '@angular/router';
import {
  IonContent,IonButton, IonIcon,
  IonSkeletonText, IonFab, IonFabButton, IonSearchbar, AlertController, IonFooter, IonToolbar } from '@ionic/angular/standalone';
import { WatchlistService, WatchlistItem } from '../../services/watchlist.service';
import { Auth, onAuthStateChanged, User } from '@angular/fire/auth';
import { BottomNavComponent } from '../../components/bottom-nav/bottom-nav.component';
import { IonicModule } from "@ionic/angular";

@Component({
    selector: 'app-watchlist',
    templateUrl: './watchlist.page.html',
    styleUrls: ['./watchlist.page.scss'],
    imports: [
    CommonModule, FormsModule,
    IonContent, IonButton,
    BottomNavComponent,
    IonIcon, IonSkeletonText, IonFab, IonFabButton,
    IonSearchbar, RouterLink, IonicModule]
})
export class WatchlistPage implements OnDestroy {

  // State
  public watchlist: WritableSignal<WatchlistItem[]> = signal([]);
  public isLoading: WritableSignal<boolean> = signal(true);
  public error: WritableSignal<string | null> = signal(null);
  public user: User | null = null;
  public searchQuery: WritableSignal<string> = signal('');
  public sortBy: WritableSignal<'added' | 'rating' | 'title' | 'date'> = signal('added');

  // Computed
  public hasMovies = computed(() => this.watchlist().length > 0);
  public movieCount = computed(() => this.watchlist().length);
  public averageRating = computed(() => {
    const movies = this.watchlist();
    if (!movies.length) return 0;
    const sum = movies.reduce((acc, movie) => acc + movie.vote_average, 0);
    return Math.round((sum / movies.length) * 10) / 10;
  });

  // Computed filtered list
  public filteredWatchlist = computed(() => {
    const query = this.searchQuery().toLowerCase().trim();
    let movies = [...this.watchlist()];

    // Sort
    switch (this.sortBy()) {
      case 'rating':
        movies.sort((a, b) => b.vote_average - a.vote_average);
        break;
      case 'title':
        movies.sort((a, b) => a.title.localeCompare(b.title, 'de'));
        break;
      case 'date':
        movies.sort((a, b) => new Date(b.release_date).getTime() - new Date(a.release_date).getTime());
        break;
      case 'added':
      default:
        movies.sort((a, b) => b.addedAt - a.addedAt);
        break;
    }

    if (!query) return movies;
    return movies.filter(movie =>
      movie.title.toLowerCase().includes(query) ||
      movie.overview.toLowerCase().includes(query)
    );
  });

  public imageBaseUrl = 'https://image.tmdb.org/t/p';

  private authUnsubscribe?: () => void;

  constructor(
    private watchlistService: WatchlistService,
    private auth: Auth,
    private router: Router,
    private alertController: AlertController
  ) {
    this.initAuth();
  }

  private initAuth(): void {
    this.authUnsubscribe = onAuthStateChanged(this.auth, (user) => {
      this.user = user;
      if (user) {
        this.loadWatchlist();
      } else {
        this.watchlist.set([]);
        this.isLoading.set(false);
        this.error.set('Bitte melden Sie sich an, um Ihre Watchlist zu sehen.');
      }
    });
  }

  ngOnDestroy(): void {
    this.authUnsubscribe?.();
  }

  async loadWatchlist(): Promise<void> {
    if (!this.user) {
      this.error.set('Nicht angemeldet');
      this.isLoading.set(false);
      return;
    }

    this.isLoading.set(true);
    this.error.set(null);

    try {
      const movies = await this.watchlistService.getWatchlist();
      this.watchlist.set(movies);
      console.log('Watchlist geladen:', movies.length, 'Filme');
    } catch (err: any) {
      console.error('Fehler beim Laden der Watchlist:', err);
      this.error.set(this.getErrorMessage(err));
      this.watchlist.set([]);
    } finally {
      this.isLoading.set(false);
    }
  }

  async removeFromWatchlist(movieId: number): Promise<void> {
    try {
      await this.watchlistService.removeFromWatchlist(movieId.toString());
      this.watchlist.set(this.watchlist().filter(m => m.id !== movieId));
    } catch (err) {
      console.error('Fehler beim Entfernen:', err);
    }
  }

  navigateToMovie(movieId: number): void {
    this.router.navigate(['/details', movieId]);
  }

  onSearchInput(event: any): void {
    this.searchQuery.set(event.target.value || '');
  }

  onSearchClear(): void {
    this.searchQuery.set('');
  }

  changeSortBy(sortMethod: 'added' | 'rating' | 'title' | 'date'): void {
    this.sortBy.set(sortMethod);
  }

  getRatingColor(rating: number): string {
    if (rating >= 8.0) return 'success';
    if (rating >= 6.0) return 'warning';
    return 'danger';
  }

  getYear(releaseDate: string): string {
    if (!releaseDate) return 'Unbekannt';
    return new Date(releaseDate).getFullYear().toString();
  }

  getPosterUrl(posterPath: string): string {
    return posterPath ? `${this.imageBaseUrl}/w300${posterPath}` : this.getFallbackImage();
  }

  private getFallbackImage(): string {
    return `data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjQ1MCIgdmlld0JveD0iMCAwIDMwMCA0NTAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjMwMCIgaGVpZ2h0PSI0NTAiIGZpbGw9IiNGM0Y0RjYiLz48cGF0aCBkPSJNMTUwIDIyNUMxNjYuNTY5IDIyNSAxODAgMjExLjU2OSAxODAgMTk1QzE4MCAxNzguNDMxIDE2Ni41NjkgMTY1IDE1MCAxNjVDMTMzLjQzMSAxNjUgMTIwIDE3OC40MzEgMTIwIDE5NUMxMjAgMjExLjU2OSAxMzMuNDMxIDIyNSAxNTAgMjI1WiIgZmlsbD0iI0QxRDNENyIvPjxwYXRoIGQ9Ik05MCAyODVDOTAgMjc2LjE2NCA5Ny4xNjQgMjY5IDEwNiAyNjlIMTk0QzIwMi44MzYgMjY5IDIxMCAyNzYuMTY0IDIxMCAyODVWMzE1SDkwVjI4NVoiIGZpbGw9IiNEMUQzRDciLz48L3N2Zz4=`;
  }

  onImageError(event: any): void {
    event.target.src = this.getFallbackImage();
  }

  private getErrorMessage(error: any): string {
    if (error?.message?.includes('permission')) return 'Keine Berechtigung zum Zugriff auf die Watchlist.';
    if (error?.message?.includes('network')) return 'Netzwerkfehler. Bitte überprüfen Sie Ihre Internetverbindung.';
    if (error?.message?.includes('Nicht angemeldet')) return 'Bitte melden Sie sich an, um Ihre Watchlist zu sehen.';
    return error?.message || 'Ein unbekannter Fehler ist aufgetreten.';
  }

  async refresh(): Promise<void> {
    await this.loadWatchlist();
  }

  async clearWatchlist(): Promise<void> {
    const alert = await this.alertController.create({
      header: 'Watchlist leeren',
      message: 'Möchten Sie wirklich alle Filme aus Ihrer Watchlist entfernen?',
      buttons: [
        { text: 'Abbrechen', role: 'cancel' },
        {
          text: 'Löschen', role: 'destructive', handler: async () => {
            try {
              this.isLoading.set(true);
              await this.watchlistService.clearWatchlist();
              this.watchlist.set([]);
            } catch (err) {
              console.error('Fehler beim Leeren der Watchlist:', err);
            } finally {
              this.isLoading.set(false);
            }
          }
        }
      ]
    });
    await alert.present();
  }
}
