import { bootstrapApplication } from '@angular/platform-browser';
import { RouteReuseStrategy, provideRouter, withPreloading, PreloadAllModules, withComponentInputBinding } from '@angular/router';
import { IonicRouteStrategy, provideIonicAngular } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { provideFirebaseApp, initializeApp } from '@angular/fire/app';
import { provideFirestore, getFirestore } from '@angular/fire/firestore';
import { provideAuth, getAuth } from '@angular/fire/auth';
import { firebaseConfig } from '../src/app/firebase.config';
import { menuOutline, arrowUpOutline
  , personOutline,
  mailOutline,
  keyOutline,
  closeOutline ,
  bookmarkOutline ,
  logOutOutline,
  trashOutline,
  shieldCheckmarkOutline
 } from 'ionicons/icons';
import { routes } from './app/app.routes';
import { AppComponent } from './app/app.component';
import { provideHttpClient } from '@angular/common/http';
import { environment } from './environments/environment.prod';
import { enableProdMode } from '@angular/core';

addIcons({
  'menu-outline': menuOutline,
  'arrow-up-outline': arrowUpOutline,
    'person-outline': personOutline,
  'mail-outline': mailOutline,
  'key-outline': keyOutline,
  'close-outline': closeOutline,
  'bookmark-outline': bookmarkOutline,
  'log-out-outline': logOutOutline,
  'trash-outline': trashOutline,
  'shield-checkmark-outline': shieldCheckmarkOutline
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
