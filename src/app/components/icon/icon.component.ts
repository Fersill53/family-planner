import { Component, input } from '@angular/core';

export type IconName =
  | 'tasks' | 'calendar' | 'family' | 'profile'
  | 'x' | 'pencil' | 'plus' | 'repeat' | 'clock'
  | 'chevron-left' | 'chevron-right' | 'arrow-right';

/**
 * Line icons drawn from the Lucide set (ISC license, https://lucide.dev).
 * Sizes with the surrounding font-size and takes the surrounding text color.
 */
@Component({
  selector: 'app-icon',
  standalone: true,
  template: `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
         stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      @switch (name()) {
        @case ('tasks') {
          <path d="M21 10.5V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h12.5"/>
          <path d="m9 11 3 3L22 4"/>
        }
        @case ('calendar') {
          <rect width="18" height="18" x="3" y="4" rx="2"/>
          <path d="M16 2v4"/><path d="M8 2v4"/><path d="M3 10h18"/>
        }
        @case ('family') {
          <path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8"/>
          <path d="M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
        }
        @case ('profile') {
          <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/>
          <circle cx="12" cy="7" r="4"/>
        }
        @case ('x') {
          <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
        }
        @case ('pencil') {
          <path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"/>
          <path d="m15 5 4 4"/>
        }
        @case ('plus') {
          <path d="M5 12h14"/><path d="M12 5v14"/>
        }
        @case ('repeat') {
          <path d="m17 2 4 4-4 4"/><path d="M3 11v-1a4 4 0 0 1 4-4h14"/>
          <path d="m7 22-4-4 4-4"/><path d="M21 13v1a4 4 0 0 1-4 4H3"/>
        }
        @case ('clock') {
          <circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>
        }
        @case ('chevron-left') { <path d="m15 18-6-6 6-6"/> }
        @case ('chevron-right') { <path d="m9 18 6-6-6-6"/> }
        @case ('arrow-right') { <path d="M5 12h14"/><path d="m12 5 7 7-7 7"/> }
      }
    </svg>
  `,
  styles: `
    :host { display: inline-flex; width: 1em; height: 1em; vertical-align: -0.15em; }
    svg { width: 100%; height: 100%; }
  `,
})
export class IconComponent {
  name = input.required<IconName>();
}
