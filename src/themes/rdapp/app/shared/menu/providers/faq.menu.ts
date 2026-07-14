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

/**
 * Menu provider for the "Perguntas Frequentes" link in the rdapp public navbar
 */
@Injectable()
export class FaqMenuProvider extends AbstractMenuProvider {
  public getSections(): Observable<PartialMenuSection[]> {
    return of([
      {
        visible: true,
        model: {
          type: MenuItemType.LINK,
          text: 'rdapp.menu.faq',
          link: '/faq',
        },
        icon: 'circle-question',
      },
    ] as PartialMenuSection[]);
  }
}
