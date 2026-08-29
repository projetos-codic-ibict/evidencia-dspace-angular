import { AsyncPipe } from '@angular/common';
import { Component } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { NgbTooltip } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule } from '@ngx-translate/core';

import { getGroupGovernanceRoute } from '../../../../../app/access-control/access-control-routing-paths';
import { GroupsRegistryComponent as BaseGroupsRegistryComponent } from '../../../../../app/access-control/group-registry/groups-registry.component';
import { BtnDisabledDirective } from '../../../../../app/shared/btn-disabled.directive';
import { ThemedLoadingComponent } from '../../../../../app/shared/loading/themed-loading.component';
import { PaginationComponent } from '../../../../../app/shared/pagination/pagination.component';

@Component({
  selector: 'ds-themed-groups-registry',
  templateUrl: './groups-registry.component.html',
  imports: [
    AsyncPipe,
    BtnDisabledDirective,
    NgbTooltip,
    PaginationComponent,
    ReactiveFormsModule,
    RouterLink,
    ThemedLoadingComponent,
    TranslateModule,
  ],
})
export class GroupsRegistryComponent extends BaseGroupsRegistryComponent {
  protected readonly getGroupGovernanceRoute = getGroupGovernanceRoute;
}
