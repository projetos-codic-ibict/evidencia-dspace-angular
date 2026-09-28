import { Route } from '@angular/router';

import { FavoriteItemsComponent } from './favorite-items.component';

export const ROUTES: Route[] = [
  {
    path: '',
    component: FavoriteItemsComponent,
    pathMatch: 'full',
    data: { title: 'Itens favoritos' },
  },
];
