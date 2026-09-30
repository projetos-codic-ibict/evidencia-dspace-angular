import { Injectable } from '@angular/core';
import {
  Observable,
  of,
} from 'rxjs';

import { MenuItemType } from '../../../../../../app/shared/menu/menu-item-type.model';
import {
  AbstractMenuProvider,
  PartialMenuSection,
} from '../../../../../../app/shared/menu/menu-provider.model';


@Injectable()
export class FavoritesMenuProvider extends AbstractMenuProvider {
  public getSections(): Observable<PartialMenuSection[]> {
    return of([
      {
        visible: true,
        model: {
          type: MenuItemType.LINK,
          text: 'evidencia.menu.favorites',
          link: '/favorites',
        },
        icon: 'star',
      },
    ] as PartialMenuSection[]);
  }
}
