import { Injectable } from '@angular/core';
import { AuthorizationDataService } from '@dspace/core/data/feature-authorization/authorization-data.service';
import { FeatureID } from '@dspace/core/data/feature-authorization/feature-id';
import {
  combineLatest,
  map,
  Observable,
} from 'rxjs';

import { MenuID } from '../../../../../../app/shared/menu/menu-id.model';
import { MenuItemType } from '../../../../../../app/shared/menu/menu-item-type.model';
import {
  AbstractMenuProvider,
  PartialMenuSection,
} from '../../../../../../app/shared/menu/menu-provider.model';

/**
 * Menu provider for the "Trilha de Auditoria" link in the DSpace admin sidebar.
 * Visible only to site administrators.
 */
@Injectable()
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
              text: 'evidencia.menu.audit-logs',
              link: '/admin/audit-logs',
            },
            icon: 'list-alt',
          },
        ] as PartialMenuSection[];
      }),
    );
  }
}
