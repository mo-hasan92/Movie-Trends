import { Injectable } from '@angular/core';
import {
  Firestore,
  doc,
  setDoc,
  deleteDoc,
  getDoc,
  collection,
  getDocs,
  query,
  orderBy
} from '@angular/fire/firestore';
import { Auth } from '@angular/fire/auth';
import { firstValueFrom } from 'rxjs';
import { authState } from '@angular/fire/auth';
import { MovieListItem } from './interfaces';

export interface WatchlistItem extends MovieListItem {
  addedAt: number; // Timestamp wann hinzugefügt
  overview: string;
}

@Injectable({
  providedIn: 'root'
})
export class WatchlistService {

  constructor(
    private firestore: Firestore,
    private auth: Auth
  ) {}

  /**
   * Aktuell angemeldeten User abwarten
   */
  private async getUser() {
    const user = await firstValueFrom(authState(this.auth));
    if (!user) {
      throw new Error('Nicht angemeldet! Bitte melden Sie sich an, um die Watchlist zu verwenden.');
    }
    return user;
  }

  /**
   * Movie zur Watchlist hinzufügen
   */
  async addToWatchlist(movieId: string, movieData: Partial<MovieListItem>): Promise<void> {
    try {
      const user = await this.getUser();

      if (!movieData?.id || !movieData?.title) {
        throw new Error('Ungültige Filmdaten! ID und Titel sind erforderlich.');
      }

      // Watchlist Item mit Timestamp erstellen
      const watchlistItem: WatchlistItem = {
        id: movieData.id,
        title: movieData.title,
        poster_path: movieData.poster_path || '',
        release_date: movieData.release_date || '',
        vote_average: movieData.vote_average || 0,
        vote_count: movieData.vote_count || 0,
        overview: movieData.overview || '',
        addedAt: Date.now()
      };

      const ref = doc(this.firestore, `users/${user.uid}/watchlist/${movieId}`);
      await setDoc(ref, watchlistItem);

      console.log('Film zur Watchlist hinzugefügt:', movieData.title);
    } catch (error) {
      console.error('Fehler beim Hinzufügen zur Watchlist:', error);
      throw error;
    }
  }

  /**
   * Movie aus Watchlist entfernen
   */
  async removeFromWatchlist(movieId: string): Promise<void> {
    try {
      const user = await this.getUser();
      const ref = doc(this.firestore, `users/${user.uid}/watchlist/${movieId}`);
      await deleteDoc(ref);

      console.log('Film aus Watchlist entfernt:', movieId);
    } catch (error) {
      console.error('Fehler beim Entfernen aus der Watchlist:', error);
      throw error;
    }
  }

  /**
   * Prüfen ob Movie in Watchlist
   */
  async isInWatchlist(movieId: string): Promise<boolean> {
    try {
      const user = await this.getUser();
      const ref = doc(this.firestore, `users/${user.uid}/watchlist/${movieId}`);
      const snap = await getDoc(ref);
      return snap.exists();
    } catch (error) {
      console.error('Fehler beim Prüfen der Watchlist:', error);
      return false; // Bei Fehler false zurückgeben
    }
  }

  /**
   * Ganze Watchlist laden - KORRIGIERT
   */
  async getWatchlist(): Promise<WatchlistItem[]> {
    try {
      const user = await this.getUser();

      // Collection referenz erstellen
      const collRef = collection(this.firestore, `users/${user.uid}/watchlist`);

      // Query mit Sortierung nach hinzugefügt-Datum (neueste zuerst)
      const q = query(collRef, orderBy('addedAt', 'desc'));

      // Dokumente laden
      const snapshot = await getDocs(q);

      // Daten extrahieren und typisieren
      const watchlist: WatchlistItem[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data() as WatchlistItem;
        if (data && data.id && data.title) {
          watchlist.push(data);
        }
      });

      console.log('Watchlist geladen:', watchlist.length, 'Filme');
      return watchlist;

    } catch (error) {
      console.error('Fehler beim Laden der Watchlist:', error);
      throw error;
    }
  }

  /**
   * Watchlist-Statistiken
   */
  async getWatchlistStats(): Promise<{
    totalMovies: number;
    averageRating: number;
    totalRuntime: number;
  }> {
    try {
      const watchlist = await this.getWatchlist();

      const totalMovies = watchlist.length;
      const averageRating = totalMovies > 0
        ? watchlist.reduce((sum, movie) => sum + movie.vote_average, 0) / totalMovies
        : 0;

      return {
        totalMovies,
        averageRating: Math.round(averageRating * 10) / 10,
        totalRuntime: 0 // Könnte später implementiert werden
      };
    } catch (error) {
      console.error('Fehler beim Laden der Watchlist-Statistiken:', error);
      return {
        totalMovies: 0,
        averageRating: 0,
        totalRuntime: 0
      };
    }
  }

  /**
   * Watchlist nach Rating sortieren
   */
  async getWatchlistSortedByRating(descending = true): Promise<WatchlistItem[]> {
    try {
      const watchlist = await this.getWatchlist();
      return watchlist.sort((a, b) => {
        return descending
          ? b.vote_average - a.vote_average
          : a.vote_average - b.vote_average;
      });
    } catch (error) {
      console.error('Fehler beim Sortieren der Watchlist:', error);
      return [];
    }
  }

  /**
   * Watchlist leeren (alle Filme entfernen)
   */
  async clearWatchlist(): Promise<void> {
    try {
      const user = await this.getUser();
      const collRef = collection(this.firestore, `users/${user.uid}/watchlist`);
      const snapshot = await getDocs(collRef);

      // Alle Dokumente löschen
      const deletePromises = snapshot.docs.map(doc => deleteDoc(doc.ref));
      await Promise.all(deletePromises);

      console.log('Watchlist geleert:', snapshot.size, 'Filme entfernt');
    } catch (error) {
      console.error('Fehler beim Leeren der Watchlist:', error);
      throw error;
    }
  }

  /**
   * Prüfen ob User angemeldet ist (ohne Error zu werfen)
   */
  async isUserLoggedIn(): Promise<boolean> {
    try {
      const user = await firstValueFrom(authState(this.auth));
      return !!user;
    } catch (error) {
      return false;
    }
  }
}
