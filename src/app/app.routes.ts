import { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';

export const routes: Routes = [
  { path: 'login', loadComponent: () => import('./pages/auth/auth.component').then(m => m.AuthComponent) },
  {
    path: 'tasks',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/tasks/tasks.component').then(m => m.TasksComponent),
  },

  {
    path: 'calendar',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/calendar/calendar.component').then(m => m.CalendarComponent),
  },

  {
  path: 'profile',
  canActivate: [authGuard],
  loadComponent: () => import('./pages/profile/profile.component').then(m => m.ProfileComponent),
},

  {
    path: 'family',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/family/family.component').then(m => m.FamilyComponent),
  },

  { path: '', redirectTo: 'login', pathMatch: 'full' },
];