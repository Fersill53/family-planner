import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { AuthService } from '../../services/auth.service';
import { LanguageService } from '../../services/language.service';

@Component({
  selector: 'app-auth',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe],
  templateUrl: './auth.component.html',
  styleUrl: './auth.component.scss',
})
export class AuthComponent {
  private auth = inject(AuthService);
  private lang = inject(LanguageService);
  private router = inject(Router);

  mode = signal<'login' | 'signup'>('login');
  error = signal<string | null>(null);
  busy = signal(false);

  // form fields
  email = '';
  password = '';
  displayName = '';
  language: 'en' | 'es' | 'uk' = 'en';
  familyId = '';

  toggleMode() {
    this.mode.set(this.mode() === 'login' ? 'signup' : 'login');
    this.error.set(null);
  }

  async submit() {
    this.busy.set(true);
    this.error.set(null);
    try {
      if (this.mode() === 'signup') {
        await this.auth.signup(
          this.email, this.password, this.displayName, this.language, this.familyId.trim()
        );
        this.lang.use(this.language);
      } else {
        await this.auth.login(this.email, this.password);
      }
      this.router.navigate(['/tasks']);
    } catch (e: any) {
      this.error.set(this.friendlyError(e?.code ?? 'unknown'));
    } finally {
      this.busy.set(false);
    }
  }

  private friendlyError(code: string): string {
    const map: Record<string, string> = {
      'auth/invalid-email': 'That email address looks invalid.',
      'auth/user-not-found': 'No account found with that email.',
      'auth/wrong-password': 'Incorrect password.',
      'auth/invalid-credential': 'Email or password is incorrect.',
      'auth/email-already-in-use': 'An account already exists for that email.',
      'auth/weak-password': 'Password should be at least 6 characters.',
    };
    return map[code] ?? 'Something went wrong. Please try again.';
  }
}