import { Injectable, inject } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';

@Injectable({ providedIn: 'root' })
export class LanguageService {
  private translate = inject(TranslateService);
  readonly available = ['en', 'es', 'uk'] as const;

  init() {
    const saved = localStorage.getItem('lang');
    this.use(saved && this.available.includes(saved as any) ? saved : 'en');
  }

  use(lang: string) {
    this.translate.use(lang);
    localStorage.setItem('lang', lang);
  }
}