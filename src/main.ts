import { bootstrapApplication } from '@angular/platform-browser';
import { RouteReuseStrategy, provideRouter, withPreloading, PreloadAllModules, withComponentInputBinding } from '@angular/router';
import { IonicRouteStrategy, provideIonicAngular } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { provideFirebaseApp, initializeApp } from '@angular/fire/app';
import { provideFirestore, getFirestore } from '@angular/fire/firestore';
import { provideAuth, getAuth } from '@angular/fire/auth';
import { firebaseConfig } from '../src/app/firebase.config';
import { menuOutline, arrowUpOutline,
  mailOutline,
  keyOutline,
  closeOutline ,
  logOutOutline,
  trashOutline,
  shieldCheckmarkOutline , filmOutline ,
    cashOutline, calendarOutline, starOutline, peopleOutline,
   languageOutline, linkOutline, playOutline,
  shareOutline, bookmarkOutline, timeOutline,
  businessOutline, globeOutline, alertCircleOutline, refreshOutline, checkmarkCircleOutline, documentTextOutline, informationCircleOutline,
  openOutline, trophyOutline, personOutline, videocamOutline,
  star
 } from 'ionicons/icons';
import { routes } from './app/app.routes';
import { AppComponent } from './app/app.component';
import { provideHttpClient } from '@angular/common/http';
import { environment } from './environments/environment.prod';
import { enableProdMode } from '@angular/core';


addIcons({
  menuOutline,
  arrowUpOutline,
  personOutline,
  mailOutline,
  keyOutline,
  closeOutline,
  bookmarkOutline,
  logOutOutline,
  trashOutline,
  shieldCheckmarkOutline ,
  star ,calendarOutline, shareOutline , filmOutline,
  cashOutline ,  starOutline, languageOutline, linkOutline, playOutline, timeOutline, businessOutline, globeOutline, alertCircleOutline, refreshOutline, checkmarkCircleOutline, documentTextOutline, informationCircleOutline,
  openOutline, trophyOutline, videocamOutline , peopleOutline
});

if(environment.production) {
  enableProdMode();
}

bootstrapApplication(AppComponent, {
  providers: [
    provideFirebaseApp(() => initializeApp(firebaseConfig)),
    provideFirestore(() => getFirestore()),
    provideAuth(() => getAuth()),

    { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
    provideIonicAngular(),

    provideRouter(routes, withPreloading(PreloadAllModules) , withComponentInputBinding() ),
    provideHttpClient(),
  ],
});
