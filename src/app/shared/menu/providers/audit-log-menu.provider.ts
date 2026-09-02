import { Injectable } from '@angular/core';
import { AuthorizationDataService } from '../../../core/data/feature-authorization/authorization-data.service';
import { FeatureID } from '../../../core/data/feature-authorization/feature-id';
import { combineLatest, map, Observable } from 'rxjs';

import { MenuItemType } from '../menu-item-type.model';
import { AbstractMenuProvider, PartialMenuSection } from '../menu-provider.model';
import { MenuID } from '../menu-id.model';

@Injectable({
  providedIn: 'root'
})
export class AuditLogAdminMenuProvider extends AbstractMenuProvider {
  
  menuID = MenuID.ADMIN;

  constructor(
    protected authorizationService: AuthorizationDataService,
  ) {
    super();
  }

  public getSections(): Observable<PartialMenuSection[]> {
    return combineLatest([
      this.authorizationService.isAuthorized(FeatureID.AdministratorOf),
    ]).pipe(
      map(([isSiteAdmin]) => {
        return [
          {
            id: 'audit-logs',
            visible: isSiteAdmin,
            model: {
              type: MenuItemType.LINK,
              text: 'Trilha de Auditoria',
              link: '/admin/audit-logs',
            },
            icon: 'list-alt',
          },
        ] as PartialMenuSection[];
      }),
    );
  }
}