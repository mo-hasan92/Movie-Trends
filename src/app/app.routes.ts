import { Routes } from '@angular/router';
import { AuthGuard } from './auth.guard';

export const routes: Routes = [
  // Startseite
  {
    path: '',
    redirectTo: 'auth/signin',
    pathMatch: 'full',
  },

  // Auth-Seiten (immer erreichbar)
  {
    path: 'auth/signup',
    loadComponent: () => import('./auth/signup/signup.page').then(m => m.SignupPage)
  },
  {
    path: 'auth/signin',
    loadComponent: () => import('./auth/signin/signin.page').then(m => m.SigninPage)
  },

  // Home-Seiten
  {
    path: 'home',
    loadComponent: () => import('./home/home.page').then(m => m.HomePage)
  },

  // Details-Seite mit Parameter (auch ohne Login sichtbar)
  {
    path: 'details/:id',
    loadComponent: () => import('./details/details.page').then(m => m.DetailsPage)
  },

  // Geschützte Seiten (nur eingeloggt erreichbar)
  {
    path: 'settings',
    loadComponent: () => import('./pages/settings/settings.page').then(m => m.SettingsPage),
    canActivate: [AuthGuard]
  },
  {
    path: 'watchlist',
    loadComponent: () => import('./pages/watchlist/watchlist.page').then( m => m.WatchlistPage),
    canActivate: [AuthGuard]
  },
{
    path: 'cinema',
    loadComponent: () => import('./pages/cinema/cinema.page').then( m => m.CinemaPage)
  },
  // Fallback: wenn Route nicht existiert → Home
  {
    path: '**',
    redirectTo: 'home'
  },


];
