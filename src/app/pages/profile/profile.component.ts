import { Component, inject, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { AuthService } from '../../services/auth.service';
import { LanguageService } from '../../services/language.service';
import { MEMBER_COLORS, defaultColorFor } from '../../color-utils';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.scss',
})
export class ProfileComponent {
  private auth = inject(AuthService);
  private lang = inject(LanguageService);
  private router = inject(Router);

  profile = toSignal(this.auth.profile$, { initialValue: null });

  // editable form state
  displayName = signal('');
  language = signal<'en' | 'es' | 'uk'>('en');
  color = signal('');

  palette = MEMBER_COLORS;

  saving = signal(false);
  saved = signal(false);

  constructor() {
    // when the profile loads, seed the form fields
    effect(() => {
      const p = this.profile();
      if (p) {
        this.displayName.set(p.displayName);
        this.language.set(p.language);
        this.color.set(p.color || defaultColorFor(p.uid));
      }
    });
  }

  selectColor(c: string) { this.color.set(c); }

  // live-preview language as they change the dropdown
  onLanguageChange(lang: 'en' | 'es' | 'uk') {
    this.language.set(lang);
    this.lang.use(lang); // instant UI switch
  }

  async save() {
    const p = this.profile();
    if (!p) return;

    this.saving.set(true);
    this.saved.set(false);
    try {
      await this.auth.updateMyProfile({
        displayName: this.displayName().trim() || p.displayName,
        language: this.language(),
        color: this.color(),
      });
      this.lang.use(this.language());
      this.saved.set(true);
      setTimeout(() => this.saved.set(false), 2500);
    } finally {
      this.saving.set(false);
    }
  }

  async logout() {
    await this.auth.logout();
    this.router.navigate(['/login']);
  }
}