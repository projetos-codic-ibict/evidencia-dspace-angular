import { Injectable } from '@angular/core';
import {
  Observable,
  of,
} from 'rxjs';

import { MenuItemType } from '../../../../../../app/shared/menu/menu-item-type.model';
import { TextMenuItemModel } from '../../../../../../app/shared/menu/menu-item/models/text.model';
import { PartialMenuSection } from '../../../../../../app/shared/menu/menu-provider.model';
import { AbstractExpandableMenuProvider } from '../../../../../../app/shared/menu/providers/helper-providers/expandable-menu-provider';

/**
 * Menu provider for the "O RDAPP" expandable menu in the rdapp public navbar
 * Sub-items: Apresentação, Objetivos, Quem Somos
 */
@Injectable()
export class AboutRdappMenuProvider extends AbstractExpandableMenuProvider {

  getTopSection(): Observable<PartialMenuSection> {
    return of({
      visible: true,
      model: {
        type: MenuItemType.TEXT,
        text: 'rdapp.menu.about',
      } as TextMenuItemModel,
      icon: 'circle-info',
    });
  }

  getSubSections(): Observable<PartialMenuSection[]> {
    return of([
      {
        visible: true,
        model: {
          type: MenuItemType.LINK,
          text: 'rdapp.menu.about.presentation',
          link: '/sobre',
        },
      },
      {
        visible: true,
        model: {
          type: MenuItemType.LINK,
          text: 'rdapp.menu.about.goals',
          link: '/sobre',
        },
      },
      {
        visible: true,
        model: {
          type: MenuItemType.LINK,
          text: 'rdapp.menu.about.team',
          link: '/sobre',
        },
      },
    ] as PartialMenuSection[]);
  }
}
