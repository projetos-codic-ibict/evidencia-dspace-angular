import { Route } from '@angular/router';

import { FaqPageComponent } from './faq-page.component';

export const ROUTES: Route[] = [
  {
    path: '',
    component: FaqPageComponent,
    pathMatch: 'full',
    data: { title: 'Perguntas Frequentes' },
  },
];
