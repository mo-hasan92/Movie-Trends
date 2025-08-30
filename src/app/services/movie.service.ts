import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { ApiResult, MovieResult } from './interfaces';
import { delay, Observable } from 'rxjs';

// **🎬 TMDB API Configuration**
const BASE_URL = 'https://api.themoviedb.org/3';
const API_KEY = '64c522d83459d756bde1818638620516';

@Injectable({
  providedIn: 'root'
})
export class MovieService {
  private http = inject(HttpClient);

  constructor() { }

  /**
   * **🔥 Get Popular Movies (Original Method)**
   * Lädt beliebte Filme von TMDB
   * @param page - Seitennummer (Standard: 1)
   * @returns Observable mit ApiResult
   */
  getTopRatedMovies(page = 1): Observable<ApiResult> {
    return this.http.get<ApiResult>(`${BASE_URL}/movie/popular?&page=${page}&api_key=${API_KEY}`)
    //.pipe(delay(5000)); // Für Testing auskommentiert
  }

  /**
   * **🎯 Get Movie Details (Original Method)**
   * Lädt Details für einen spezifischen Film
   * @param id - Film ID
   * @returns Observable mit MovieResult
   */
  getMovieDetails(id: string): Observable<MovieResult> {
    return this.http.get<MovieResult>(`${BASE_URL}/movie/${id}?api_key=${API_KEY}`);
  }

  /**
   * **🔍 Search Movies (Neue Method für Search-Funktionalität)**
   * Sucht nach Filmen basierend auf einem Query
   * @param query - Suchbegriff
   * @param page - Seitennummer (Standard: 1)
   * @returns Observable mit ApiResult
   */
  searchMovies(query: string, page = 1): Observable<ApiResult> {
    if (!query.trim()) {
      // Wenn kein Search Query, dann Popular Movies zurückgeben
      return this.getTopRatedMovies(page);
    }

    // Encode the query for URL safety
    const encodedQuery = encodeURIComponent(query.trim());
    return this.http.get<ApiResult>(
      `${BASE_URL}/search/movie?query=${encodedQuery}&page=${page}&api_key=${API_KEY}`
    );
  }

  /**
   * **⭐ Get Top Rated Movies (Zusätzliche Method)**
   * Lädt die am besten bewerteten Filme
   * @param page - Seitennummer (Standard: 1)
   * @returns Observable mit ApiResult
   */
  getActualTopRatedMovies(page = 1): Observable<ApiResult> {
    return this.http.get<ApiResult>(`${BASE_URL}/movie/top_rated?page=${page}&api_key=${API_KEY}`);
  }

  /**
   * **🎭 Get Movies by Genre (Zusätzliche Method)**
   * Lädt Filme nach Genre
   * @param genreId - Genre ID
   * @param page - Seitennummer (Standard: 1)
   * @returns Observable mit ApiResult
   */
  getMoviesByGenre(genreId: number, page = 1): Observable<ApiResult> {
    return this.http.get<ApiResult>(
      `${BASE_URL}/discover/movie?with_genres=${genreId}&page=${page}&api_key=${API_KEY}`
    );
  }

  /**
   * **🎬 Get Now Playing Movies (Zusätzliche Method)**
   * Lädt aktuell laufende Filme
   * @param page - Seitennummer (Standard: 1)
   * @returns Observable mit ApiResult
   */
  getNowPlayingMovies(page = 1): Observable<ApiResult> {
    return this.http.get<ApiResult>(`${BASE_URL}/movie/now_playing?page=${page}&api_key=${API_KEY}`);
  }

  /**
   * **🔮 Get Upcoming Movies (Zusätzliche Method)**
   * Lädt kommende Filme
   * @param page - Seitennummer (Standard: 1)
   * @returns Observable mit ApiResult
   */
  getUpcomingMovies(page = 1): Observable<ApiResult> {
    return this.http.get<ApiResult>(`${BASE_URL}/movie/upcoming?page=${page}&api_key=${API_KEY}`);
  }

  /**
   * **🎯 Get Similar Movies (Zusätzliche Method)**
   * Lädt ähnliche Filme zu einem bestimmten Film
   * @param movieId - Film ID
   * @param page - Seitennummer (Standard: 1)
   * @returns Observable mit ApiResult
   */
  getSimilarMovies(movieId: number, page = 1): Observable<ApiResult> {
    return this.http.get<ApiResult>(
      `${BASE_URL}/movie/${movieId}/similar?page=${page}&api_key=${API_KEY}`
    );
  }

  /**
   * **🏷️ Get Movie Genres (Zusätzliche Method)**
   * Lädt alle verfügbaren Genres
   * @returns Observable mit Genre-Liste
   */
  getGenres(): Observable<{genres: {id: number, name: string}[]}> {
    return this.http.get<{genres: {id: number, name: string}[]}>(
      `${BASE_URL}/genre/movie/list?api_key=${API_KEY}&language=de-DE`
    );
  }

  /**
   * **🎥 Get Movie Videos (Zusätzliche Method)**
   * Lädt Videos (Trailer, etc.) für einen Film
   * @param movieId - Film ID
   * @returns Observable mit Video-Daten
   */
  getMovieVideos(movieId: number): Observable<{results: any[]}> {
    return this.http.get<{results: any[]}>(
      `${BASE_URL}/movie/${movieId}/videos?api_key=${API_KEY}`
    );
  }

  /**
   * **👥 Get Movie Credits (Zusätzliche Method)**
   * Lädt Cast und Crew für einen Film
   * @param movieId - Film ID
   * @returns Observable mit Credits-Daten
   */
  getMovieCredits(movieId: number): Observable<{cast: any[], crew: any[]}> {
    return this.http.get<{cast: any[], crew: any[]}>(
      `${BASE_URL}/movie/${movieId}/credits?api_key=${API_KEY}`
    );
  }
}
