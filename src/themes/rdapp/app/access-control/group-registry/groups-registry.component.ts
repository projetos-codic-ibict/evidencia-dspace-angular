import { AsyncPipe } from '@angular/common';
import {
  Component,
  OnDestroy,
  OnInit,
} from '@angular/core';
import {
  ReactiveFormsModule,
  UntypedFormBuilder,
} from '@angular/forms';
import { RouterLink } from '@angular/router';
import { DSONameService } from '@dspace/core/breadcrumbs/dso-name.service';
import { DSpaceObjectDataService } from '@dspace/core/data/dspace-object-data.service';
import { AuthorizationDataService } from '@dspace/core/data/feature-authorization/authorization-data.service';
import { RequestService } from '@dspace/core/data/request.service';
import { EPersonDataService } from '@dspace/core/eperson/eperson-data.service';
import { GroupDataService } from '@dspace/core/eperson/group-data.service';
import { NotificationsService } from '@dspace/core/notification-system/notifications.service';
import { PaginationService } from '@dspace/core/pagination/pagination.service';
import { RouteService } from '@dspace/core/services/route.service';
import { getFirstSucceededRemoteData } from '@dspace/core/shared/operators';
import { hasValue } from '@dspace/shared/utils/empty.util';
import {
  NgbModal,
  NgbTooltip,
} from '@ng-bootstrap/ng-bootstrap';
import {
  TranslateModule,
  TranslateService,
} from '@ngx-translate/core';
import {
  BehaviorSubject,
  combineLatest as observableCombineLatest,
  of,
  Subscription,
} from 'rxjs';
import {
  defaultIfEmpty,
  map,
  switchMap,
} from 'rxjs/operators';

import { getGroupGovernanceRoute } from '../../../../../app/access-control/access-control-routing-paths';
import { GroupsRegistryComponent as BaseGroupsRegistryComponent } from '../../../../../app/access-control/group-registry/groups-registry.component';
import { BtnDisabledDirective } from '../../../../../app/shared/btn-disabled.directive';
import { ThemedLoadingComponent } from '../../../../../app/shared/loading/themed-loading.component';
import { PaginationComponent } from '../../../../../app/shared/pagination/pagination.component';
import { GroupResourcePolicyDataService } from '../../core/resource-policy/group-resource-policy-data.service';

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
export class GroupsRegistryComponent extends BaseGroupsRegistryComponent implements OnInit, OnDestroy {
  protected readonly getGroupGovernanceRoute = getGroupGovernanceRoute;

  /**
   * CA01c — contagem de permissões (ResourcePolicy) associadas a cada grupo da página atual,
   * indexada por id do grupo. Usa elementsPerPage: 1 porque só interessa o pageInfo.totalElements
   * do resultado, não a lista de políticas em si.
   */
  policyCounts$: BehaviorSubject<Record<string, number>> = new BehaviorSubject<Record<string, number>>({});

  private policyCountsSub: Subscription;

  constructor(
    groupService: GroupDataService,
    ePersonDataService: EPersonDataService,
    dSpaceObjectDataService: DSpaceObjectDataService,
    translateService: TranslateService,
    notificationsService: NotificationsService,
    formBuilder: UntypedFormBuilder,
    routeService: RouteService,
    authorizationService: AuthorizationDataService,
    paginationService: PaginationService,
    requestService: RequestService,
    dsoNameService: DSONameService,
    modalService: NgbModal,
    protected groupResourcePolicyService: GroupResourcePolicyDataService,
  ) {
    super(
      groupService,
      ePersonDataService,
      dSpaceObjectDataService,
      translateService,
      notificationsService,
      formBuilder,
      routeService,
      authorizationService,
      paginationService,
      requestService,
      dsoNameService,
      modalService,
    );
  }

  override ngOnInit(): void {
    super.ngOnInit();
    this.policyCountsSub = this.groupsDto$.pipe(
      switchMap((paginatedGroups) => {
        const groupIds = (paginatedGroups?.page ?? []).map((dto) => dto.group?.id).filter((id) => hasValue(id));
        if (groupIds.length === 0) {
          return of({} as Record<string, number>);
        }
        return observableCombineLatest(groupIds.map((id) =>
          this.groupResourcePolicyService.searchByGroupPaginated(id, { elementsPerPage: 1, currentPage: 1 }).pipe(
            getFirstSucceededRemoteData(),
            map((rd) => ({ id, count: rd.payload.pageInfo.totalElements })),
          ),
        )).pipe(
          defaultIfEmpty([]),
          map((results) => {
            const counts: Record<string, number> = {};
            results.forEach((r) => { counts[r.id] = r.count; });
            return counts;
          }),
        );
      }),
    ).subscribe((counts) => this.policyCounts$.next(counts));
  }

  ngOnDestroy(): void {
    if (this.policyCountsSub) {
      this.policyCountsSub.unsubscribe();
    }
  }
}
