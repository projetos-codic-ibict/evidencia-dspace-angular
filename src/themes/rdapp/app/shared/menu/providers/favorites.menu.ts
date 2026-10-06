import { Injectable } from '@angular/core';
import { AuthService } from '@dspace/core/auth/auth.service';
import {
  Observable,
} from 'rxjs';
import { map } from 'rxjs/operators';

import { MenuItemType } from '../../../../../../app/shared/menu/menu-item-type.model';
import {
  AbstractMenuProvider,
  PartialMenuSection,
} from '../../../../../../app/shared/menu/menu-provider.model';


/** Item "Favoritos" do menu principal, visível só para usuário logado (a página exige login). */
@Injectable()
export class FavoritesMenuProvider extends AbstractMenuProvider {
  constructor(protected authService: AuthService) {
    super();
  }

  public getSections(): Observable<PartialMenuSection[]> {
    return this.authService.isAuthenticated().pipe(
      map((isAuthenticated) => [
        {
          visible: isAuthenticated,
          model: {
            type: MenuItemType.LINK,
            text: 'evidencia.menu.favorites',
            link: '/favorites',
          },
          icon: 'star',
        },
      ] as PartialMenuSection[]),
    );
  }
}
