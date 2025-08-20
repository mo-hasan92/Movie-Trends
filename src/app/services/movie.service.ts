import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { ApiResult, MovieResult } from './interfaces';
import { delay, Observable } from 'rxjs';


const BASE_URL = 'https://api.themoviedb.org/3';
const API_KEY = '64c522d83459d756bde1818638620516';

@Injectable({
  providedIn: 'root'
})
export class MovieService {
  private http = inject(HttpClient);

  constructor() { }

  getTopRatedMovies(page = 1): Observable<ApiResult> {
    return this.http.get <ApiResult>(`${BASE_URL}/movie/popular?&page=${page}&api_key=${API_KEY}`)
    //.pipe(delay(5000));
  }

  getMovieDetails(id: string): Observable<MovieResult> {
    return this.http.get <MovieResult>(`${BASE_URL}/movie/${id}?api_key=${API_KEY}`);

  }

}
