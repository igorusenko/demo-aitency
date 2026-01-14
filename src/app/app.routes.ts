import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    title: 'Dashboard',
    loadComponent: () =>
      import('./pages/home/home').then(
        (m) => m.Home
      ),
  },
  {
    path: 'assistant',
    loadComponent: () =>
      import('./components/voice-assistaint/voice-assistaint').then(
        (m) => m.VoiceAssistaint
      ),
  }
];
