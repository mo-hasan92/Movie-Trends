import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { auth } from './firebase.config';
import { onAuthStateChanged, User } from 'firebase/auth';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {

  constructor(private router: Router) {}

  canActivate(): Promise<boolean> {
    return new Promise((resolve) => {
      // Firebase prüft, ob ein User eingeloggt ist
      onAuthStateChanged(auth, (user: User | null) => {
        if (user) {
          // ✅ User existiert -> Zugriff erlaubt
          resolve(true);
        } else {
          // ❌ kein User -> Weiterleitung
          this.router.navigate(['/auth/signup']);
          resolve(false);
        }
      });
    });
  }
}
