import { Component, inject } from '@angular/core';
import { IonHeader,
  IonToolbar,
  IonTitle,
  IonContent ,
  InfiniteScrollCustomEvent,
  IonList, IonItem, IonSkeletonText, IonAvatar, IonAlert, IonLabel, IonBadge, IonInfiniteScrollContent, IonInfiniteScroll } from '@ionic/angular/standalone';
import { MovieService } from '../services/movie.service';
import { catchError, finalize } from 'rxjs';
import { MovieResult } from '../services/interfaces';
import { DatePipe } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  imports: [IonInfiniteScroll, IonInfiniteScrollContent, IonBadge, IonLabel,  IonAlert,
    IonAvatar,
    IonSkeletonText,
    IonItem, IonList,
    IonHeader, IonToolbar,
    IonTitle, IonContent, DatePipe, RouterModule],
})
export class HomePage {
loadData($event: Event) {
throw new Error('Method not implemented.');
}
  private movieService = inject(MovieService);

  private currentPage = 1;
  public error = null;
  public movies : MovieResult []= [];
  public isLoading = false;
  public dummyArray = new Array(5);
  public imageBaseUrl = 'https://image.tmdb.org/t/p';

  constructor() {
    this.loadMovies();
  }

  loadMovies(event ?: InfiniteScrollCustomEvent) {
    this.error = null;

    if(!event) {
      this.isLoading = true;
    }


    this.movieService.getTopRatedMovies(this.currentPage).pipe(
      finalize(() => {
        this.isLoading = false;
        if(event) {
          event.target.complete();

        }
      }),
      catchError((err: any) => {
        console.error(err);
        this.error = err.error.status_message;
        return [];
      }),

    ).subscribe({

      next: (res) => {
        console.log(res);
        this.movies.push (...res.results);
      if (event) {
        event.target.disabled = res.total_pages === this.currentPage;
      }
      },
    });
  }

  loadMore(event : InfiniteScrollCustomEvent) {
    this.currentPage++;
    this.loadMovies(event);
  }
}
