import { Component, OnInit } from '@angular/core';

import { FormsModule } from '@angular/forms';
// Ionic UI-Komponenten
import { IonContent, IonHeader, IonTitle, IonToolbar, IonItem, IonLabel, IonButton } from '@ionic/angular/standalone';
// Angular Router zum Weiterleiten nach erfolgreichem Signup
import { Router } from '@angular/router';
// Firebase Authentifizierungsfunktion für Registrierung
import { createUserWithEmailAndPassword } from "firebase/auth";
// Firebase-Auth Instanz aus der Konfigurationsdatei
import { auth } from 'src/app/firebase.config';


@Component({
    selector: 'app-signup', // Name des Selektors für diese Komponente
    templateUrl: './signup.page.html', // HTML-Template
    styleUrls: ['./signup.page.scss'], // ermöglicht Standalone-Komponenten (ohne Module)
    imports: [IonButton, IonContent, FormsModule]
})
export class SignupPage implements OnInit {

  // Felder für E-Mail, Passwort und Fehlermeldung
  email: string = '';
  password: string = '';
  error: string = '';

  // Router wird per Dependency Injection bereitgestellt
  constructor(private router : Router) { }

  ngOnInit() {
    // Initialisierungscode (falls nötig) wird hier ausgeführt
  }

  // Methode zum Registrieren eines neuen Benutzers
  async signup() {

    // Überprüfung: beide Felder müssen ausgefüllt sein
    if (!this.email || !this.password) {
      this.error = 'Felder sind leer!';
      return;
    }

    try {
      // Whitespace von Eingaben entfernen
      const email = this.email.trim();
      const password = this.password.trim();

      // Firebase-Methode zum Erstellen eines Accounts mit E-Mail + Passwort
      await createUserWithEmailAndPassword(auth, email, password);

      // Nach erfolgreicher Registrierung zur Login-Seite weiterleiten
      this.router.navigateByUrl('/auth/signin');

    } catch (err: any) {
      // Fehler abfangen, loggen und im UI anzeigen
      console.error('Fehler:', err);
      this.error = err.message;
    }
  }
}
