import { MovieService } from './../services/movie.service';
import { Component, inject, Input, signal, WritableSignal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonHeader, IonTitle, IonToolbar, IonButtons, IonBackButton, IonCard, IonText, IonCardHeader, IonCardContent, IonLabel, IonCardTitle, IonCardSubtitle, IonItem, IonIcon } from '@ionic/angular/standalone';
import { MovieResult } from '../services/interfaces';
import { cashOutline , calendarOutline, starOutline, peopleOutline, filmOutline, languageOutline, linkOutline } from 'ionicons/icons';
import { addIcons } from 'ionicons';

@Component({
  selector: 'app-details',
  templateUrl: './details.page.html',
  styleUrls: ['./details.page.scss'],
  standalone: true,
  imports: [IonIcon, IonItem, IonCardSubtitle, IonCardTitle, IonLabel, IonCardContent, IonCardHeader, IonText, IonCard, IonBackButton, IonButtons, IonContent, IonHeader, IonTitle, IonToolbar, CommonModule, FormsModule]
})
export class DetailsPage  {

  private MovieService = inject(MovieService);
  public imageBaseUrl = 'https://image.tmdb.org/t/p';
  public movie: WritableSignal <MovieResult | null> = signal(null);

  @Input()
  set id(movieId: string) {
    if (movieId) {
      this.MovieService.getMovieDetails(movieId).subscribe((movie) => {
        this.movie.set(movie);
      });
    }
  }

  //this function makes the app more faster and
  constructor() {
    addIcons({calendarOutline,cashOutline,starOutline,peopleOutline,filmOutline,languageOutline,linkOutline});
  }

}
