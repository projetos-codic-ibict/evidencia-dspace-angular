import { Route } from '@angular/router';

import { authenticatedGuard } from '@dspace/core/auth/authenticated.guard';

import { FavoriteItemsComponent } from './favorite-items.component';

export const ROUTES: Route[] = [
  {
    path: '',
    component: FavoriteItemsComponent,
    pathMatch: 'full',
    canActivate: [authenticatedGuard],
    data: { title: 'evidencia.favorites.title' },
  },
];
