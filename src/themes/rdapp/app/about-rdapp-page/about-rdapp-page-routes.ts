import { Route } from '@angular/router';

import { AboutRdappPageComponent } from './about-rdapp-page.component';

export const ROUTES: Route[] = [
  {
    path: '',
    component: AboutRdappPageComponent,
    pathMatch: 'full',
    data: { title: 'O RDAPP' },
  },
];
