import { Component, inject, signal, WritableSignal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  IonContent, IonHeader, IonTitle, IonToolbar, IonButtons, IonItem, IonLabel,
  IonIcon, IonButton, IonInput, IonModal, IonSpinner, IonAlert,
  AlertController } from '@ionic/angular/standalone';
import { Auth, authState, User } from '@angular/fire/auth';
import {
  updateEmail, updatePassword, reauthenticateWithCredential,
  EmailAuthProvider, signOut, deleteUser
} from '@angular/fire/auth';
import { BottomNavComponent } from '../../components/bottom-nav/bottom-nav.component';

// Icons
import { addIcons } from 'ionicons';

@Component({
    selector: 'app-settings',
    templateUrl: './settings.page.html',
    styleUrls: ['./settings.page.scss'],
    imports: [
        IonSpinner, CommonModule, FormsModule, IonButton, IonIcon, IonLabel,
        IonItem,
        IonButtons, IonContent, IonHeader, IonTitle, IonToolbar,
        IonInput, IonModal, IonAlert, BottomNavComponent
    ]
})
export class SettingsPage {

  // Services
  private auth = inject(Auth);
  private router = inject(Router);
  private alertController = inject(AlertController); // <- Für Logout-Bestätigung

  // State Management mit Signals
  public firebaseUser: WritableSignal<User | null> = signal(null);

  // Modal States
  public showEmailModal: WritableSignal<boolean> = signal(false);
  public showPasswordModal: WritableSignal<boolean> = signal(false);
  public showDeleteAlert: WritableSignal<boolean> = signal(false);
  public showLogoutAlert: WritableSignal<boolean> = signal(false); // <- NEU

  // Form Inputs
  public newEmail: WritableSignal<string> = signal('');
  public newPassword: WritableSignal<string> = signal('');
  public currentPassword: WritableSignal<string> = signal('');

  // Loading States
  public isLoadingEmail: WritableSignal<boolean> = signal(false);
  public isLoadingPassword: WritableSignal<boolean> = signal(false);
  public isDeleting: WritableSignal<boolean> = signal(false);

  // Feedback Messages
  public feedbackEmailMsg: WritableSignal<string> = signal('');
  public feedbackPasswordMsg: WritableSignal<string> = signal('');
  public feedbackDeleteMsg: WritableSignal<string> = signal('');

  // Alert Buttons Configuration
  public deleteAlertButtons = [
    { text: 'Abbrechen', role: 'cancel' },
    {
      text: 'Löschen',
      role: 'destructive',
      handler: () => this.confirmDeleteAccount()
    },
  ];

  // NEU: Logout Alert Buttons
  public logoutAlertButtons = [
    { text: 'Abbrechen', role: 'cancel' },
    {
      text: 'Abmelden',
      role: 'destructive',
      handler: () => this.confirmLogout()
    },
  ];

  constructor() {

    // Auth State Listener
    this.initAuthState();
  }

  private initAuthState(): void {
    authState(this.auth).subscribe(user => {
      this.firebaseUser.set(user);
      console.log('Auth state changed:', user?.email || 'not logged in');
    });
  }

  // EMAIL MODAL METHODS (unverändert)
  openEmailModal(): void {
    const user = this.firebaseUser();
    this.newEmail.set(user?.email ?? '');
    this.currentPassword.set('');
    this.feedbackEmailMsg.set('');
    this.isLoadingEmail.set(false);
    this.showEmailModal.set(true);
  }

  async saveNewEmail(): Promise<void> {
    const user = this.firebaseUser();
    const newEmail = this.newEmail();
    const currentPassword = this.currentPassword();

    if (!user || !newEmail || !currentPassword) {
      this.feedbackEmailMsg.set('Bitte alle Felder ausfüllen');
      return;
    }

    this.isLoadingEmail.set(true);
    this.feedbackEmailMsg.set('');

    try {
      const credential = EmailAuthProvider.credential(user.email!, currentPassword);
      await reauthenticateWithCredential(user, credential);
      await updateEmail(user, newEmail);
      this.feedbackEmailMsg.set('E-Mail erfolgreich geändert!');

      setTimeout(() => {
        this.showEmailModal.set(false);
      }, 1500);

    } catch (err: any) {
      this.feedbackEmailMsg.set('Fehler: ' + (err.message || err));
    } finally {
      this.isLoadingEmail.set(false);
    }
  }

  // PASSWORD MODAL METHODS (unverändert)
  openPasswordModal(): void {
    this.newPassword.set('');
    this.currentPassword.set('');
    this.feedbackPasswordMsg.set('');
    this.isLoadingPassword.set(false);
    this.showPasswordModal.set(true);
  }

  async saveNewPassword(): Promise<void> {
    const user = this.firebaseUser();
    const newPassword = this.newPassword();
    const currentPassword = this.currentPassword();

    if (!user || !newPassword || !currentPassword) {
      this.feedbackPasswordMsg.set('Bitte alle Felder ausfüllen');
      return;
    }

    this.isLoadingPassword.set(true);
    this.feedbackPasswordMsg.set('');

    try {
      const credential = EmailAuthProvider.credential(user.email!, currentPassword);
      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, newPassword);
      this.feedbackPasswordMsg.set('Passwort erfolgreich geändert!');

      setTimeout(() => {
        this.showPasswordModal.set(false);
      }, 1500);

    } catch (err: any) {
      this.feedbackPasswordMsg.set('Fehler: ' + (err.message || err));
    } finally {
      this.isLoadingPassword.set(false);
    }
  }

  // LOGOUT METHODS - NEU mit Bestätigung
  showLogoutConfirmation(): void {
    this.showLogoutAlert.set(true);
  }

  // Alternative: Programmatisches Alert (empfohlen)
  async showLogoutConfirmationProgrammatic(): Promise<void> {
    const alert = await this.alertController.create({
      header: 'Abmelden bestätigen',
      message: 'Möchten Sie sich wirklich abmelden?',
      buttons: [
        {
          text: 'Abbrechen',
          role: 'cancel'
        },
        {
          text: 'Abmelden',
          role: 'destructive',
          handler: () => {
            this.confirmLogout();
          }
        }
      ]
    });

    await alert.present();
  }

  async confirmLogout(): Promise<void> {
    try {
      await signOut(this.auth);
      await this.router.navigate(['/auth/signin']);
      console.log('User erfolgreich abgemeldet');
    } catch (err: any) {
      console.error('Logout fehlgeschlagen:', err);
    }
  }

  // Alte logout Methode für Abwärtskompatibilität (falls wo anders verwendet)
  async logout(): Promise<void> {
    await this.showLogoutConfirmationProgrammatic();
  }

  // DELETE ACCOUNT METHODS (unverändert)
  openDeleteAlert(): void {
    this.feedbackDeleteMsg.set('');
    this.showDeleteAlert.set(true);
  }

  async confirmDeleteAccount(): Promise<void> {
    const user = this.firebaseUser();
    const currentPassword = this.currentPassword();

    if (!user) {
      this.feedbackDeleteMsg.set('Kein Nutzer angemeldet.');
      return;
    }

    if (!currentPassword) {
      this.feedbackDeleteMsg.set('Bitte aktuelles Passwort eingeben.');
      return;
    }

    this.isDeleting.set(true);

    try {
      const credential = EmailAuthProvider.credential(user.email!, currentPassword);
      await reauthenticateWithCredential(user, credential);
      await deleteUser(user);
      await this.router.navigate(['/auth/signup']);

    } catch (err: any) {
      console.error('Konto löschen fehlgeschlagen:', err);
      this.feedbackDeleteMsg.set(err?.message || String(err));
    } finally {
      this.isDeleting.set(false);
      this.showDeleteAlert.set(false);
    }
  }

  // UTILITY METHODS
  closeEmailModal(): void {
    this.showEmailModal.set(false);
  }

  closePasswordModal(): void {
    this.showPasswordModal.set(false);
  }

  onDeleteAlertDismiss(): void {
    this.showDeleteAlert.set(false);
  }

  onLogoutAlertDismiss(): void {
    this.showLogoutAlert.set(false);
  }




}


