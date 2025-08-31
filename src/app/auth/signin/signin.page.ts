import { Component, OnInit } from '@angular/core';

import { FormsModule } from '@angular/forms';
import { IonContent, IonHeader, IonTitle, IonToolbar, IonLabel, IonItem, IonButton, IonInput} from '@ionic/angular/standalone';
import { Router } from '@angular/router';
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from 'src/app/firebase.config';

// Definition der Angular-Komponente
@Component({
    selector: 'app-signin', // Der HTML-Selektor für diese Komponente
    templateUrl: './signin.page.html', // Der Pfad zur HTML-Vorlage der Komponente
    styleUrls: ['./signin.page.scss'], // Gibt an, dass dies eine eigenständige Komponente ist (ab Angular 14)
    // Importiert notwendige Ionic-Module und Angular-Module für die Komponente
    imports: [IonButton, IonContent, FormsModule]
})

// Exportiert die SigninPage-Klasse, die die Logik für die Anmeldeseite enthält
export class SigninPage implements OnInit {

  // Variablen für E-Mail, Passwort und Fehlermeldungen
  email: string = '';
  password: string = '';
  error: string = '';

  // Konstruktor der Klasse, injiziert den Router für die Navigation
  constructor(private router: Router) { }

  // ngOnInit ist eine Lifecycle-Methode, die nach der Initialisierung der Komponente aufgerufen wird
  ngOnInit() {}

  // Methode zum Übersetzen der Firebase-Fehlercodes in deutsche Nachrichten
  private getErrorMessage(errorCode: string): string {
    switch (errorCode) {
      case 'auth/invalid-email':
        return 'Bitte geben Sie eine gültige E-Mail-Adresse ein.';

      case 'auth/user-disabled':
        return 'Dieses Benutzerkonto wurde deaktiviert.';

      case 'auth/user-not-found':
        return 'Kein Benutzer mit dieser E-Mail-Adresse gefunden.';

      case 'auth/wrong-password':
        return 'Das eingegebene Passwort ist falsch.';

      case 'auth/email-already-in-use':
        return 'Diese E-Mail-Adresse wird bereits verwendet.';

      case 'auth/weak-password':
        return 'Das Passwort ist zu schwach. Verwenden Sie mindestens 6 Zeichen.';

      case 'auth/operation-not-allowed':
        return 'Diese Anmeldemethode ist nicht erlaubt.';

      case 'auth/invalid-credential':
        return 'E-Mail oder Passwort ist falsch. Bitte überprüfen Sie Ihre Angaben.';

      case 'auth/too-many-requests':
        return 'Zu viele Anmeldeversuche. Bitte versuchen Sie es später erneut.';

      case 'auth/network-request-failed':
        return 'Netzwerkfehler. Bitte überprüfen Sie Ihre Internetverbindung.';

      case 'auth/internal-error':
        return 'Ein interner Fehler ist aufgetreten. Bitte versuchen Sie es erneut.';

      case 'auth/invalid-api-key':
        return 'Ungültiger API-Schlüssel. Bitte kontaktieren Sie den Support.';

      case 'auth/missing-password':
        return 'Bitte geben Sie ein Passwort ein.';

      case 'auth/missing-email':
        return 'Bitte geben Sie eine E-Mail-Adresse ein.';

      case 'auth/account-exists-with-different-credential':
        return 'Ein Konto mit dieser E-Mail-Adresse existiert bereits mit einer anderen Anmeldemethode.';

      case 'auth/credential-already-in-use':
        return 'Diese Anmeldedaten werden bereits von einem anderen Konto verwendet.';

      default:
        return 'Anmeldung fehlgeschlagen. Bitte überprüfen Sie Ihre Angaben und versuchen Sie es erneut.';
    }
  }

  // Methode zum Validieren der Eingabedaten
  private validateInputs(): string | null {
    // E-Mail-Feld prüfen
    if (!this.email || this.email.trim() === '') {
      return 'Bitte geben Sie eine E-Mail-Adresse ein.';
    }

    // Passwort-Feld prüfen
    if (!this.password || this.password.trim() === '') {
      return 'Bitte geben Sie ein Passwort ein.';
    }

    // E-Mail-Format prüfen (einfache Validierung)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(this.email.trim())) {
      return 'Bitte geben Sie eine gültige E-Mail-Adresse ein.';
    }

    return null;
  }

  // Asynchrone Methode zur Anmeldung des Benutzers
  async signin() {
    // Fehlermeldung zurücksetzen
    this.error = '';

    // Eingabedaten validieren
    const validationError = this.validateInputs();
    if (validationError) {
      this.error = validationError;
      return;
    }

    try {
      // Whitespace von Eingaben entfernen
      const email = this.email.trim();
      const password = this.password.trim();

      // Versucht, den Benutzer mit E-Mail und Passwort über Firebase zu authentifizieren
      await signInWithEmailAndPassword(auth, email, password);

      // Bei erfolgreicher Anmeldung navigiert der Benutzer zur 'home'-Seite
      this.router.navigateByUrl('/home');

    } catch (err: any) {
      // Fehler abfangen und benutzerfreundliche Nachricht anzeigen
      console.error('Anmeldungsfehler:', err);

      // Firebase-Fehlercode extrahieren
      const errorCode = err.code || 'unknown-error';

      // Benutzerfreundliche Fehlermeldung setzen
      this.error = this.getErrorMessage(errorCode);
    }
  }
}
