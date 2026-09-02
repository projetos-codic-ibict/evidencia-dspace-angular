import { AsyncPipe } from '@angular/common';
import {
  Component,
  OnDestroy,
  OnInit,
} from '@angular/core';
import {
  ActivatedRoute,
  RouterLink,
} from '@angular/router';
import { DSONameService } from '@dspace/core/breadcrumbs/dso-name.service';
import { DSpaceObjectDataService } from '@dspace/core/data/dspace-object-data.service';
import { RemoteData } from '@dspace/core/data/remote-data';
import { NotificationsService } from '@dspace/core/notification-system/notifications.service';
import { PaginationService } from '@dspace/core/pagination/pagination.service';
import { PaginationComponentOptions } from '@dspace/core/pagination/pagination-component-options.model';
import { ActionType } from '@dspace/core/resource-policy/models/action-type.model';
import { ResourcePolicy } from '@dspace/core/resource-policy/models/resource-policy.model';
import { getDSORoute } from '@dspace/core/router/utils/dso-route.utils';
import { DSpaceObject } from '@dspace/core/shared/dspace-object.model';
import {
  getAllSucceededRemoteData,
  getRemoteDataPayload,
} from '@dspace/core/shared/operators';
import { PageInfo } from '@dspace/core/shared/page-info.model';
import { hasValue } from '@dspace/shared/utils/empty.util';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import {
  TranslateModule,
  TranslateService,
} from '@ngx-translate/core';
import {
  BehaviorSubject,
  Observable,
  of,
  Subscription,
} from 'rxjs';
import {
  switchMap,
  takeUntil,
  tap,
} from 'rxjs/operators';

import { ConfirmationModalComponent } from '../../../../../app/shared/confirmation-modal/confirmation-modal.component';
import { ThemedLoadingComponent } from '../../../../../app/shared/loading/themed-loading.component';
import { PaginationComponent } from '../../../../../app/shared/pagination/pagination.component';
import { GroupResourcePolicyDataService } from '../../core/resource-policy/group-resource-policy-data.service';

interface GroupGovernanceEntry {
  policy: ResourcePolicy;
  resource$: Observable<RemoteData<DSpaceObject>> | Observable<undefined>;
}

@Component({
  selector: 'ds-group-governance',
  templateUrl: './group-governance.component.html',
  imports: [
    AsyncPipe,
    PaginationComponent,
    RouterLink,
    ThemedLoadingComponent,
    TranslateModule,
  ],
})
export class GroupGovernanceComponent implements OnInit, OnDestroy {

  messagePrefix = 'evidencia.group-governance.';

  groupId: string;

  /**
   * Config de paginação da lista de políticas do grupo (CA08). Sem isso, a tela só mostrava a
   * primeira página do resultado, sem aviso, mesmo com centenas de políticas (ex.: grupo
   * Anonymous com 391).
   */
  config: PaginationComponentOptions = Object.assign(new PaginationComponentOptions(), {
    id: 'group-governance-policies',
    pageSize: 20,
    currentPage: 1,
  });

  pageInfoState$: BehaviorSubject<PageInfo> = new BehaviorSubject<PageInfo>(undefined);

  entries$: BehaviorSubject<GroupGovernanceEntry[]> = new BehaviorSubject<GroupGovernanceEntry[]>([]);

  loading$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(true);

  public readonly getDSORoute = getDSORoute;

  private paginationSub: Subscription;

  constructor(
    protected route: ActivatedRoute,
    protected resourcePolicyService: GroupResourcePolicyDataService,
    protected dSpaceObjectDataService: DSpaceObjectDataService,
    public dsoNameService: DSONameService,
    protected notificationsService: NotificationsService,
    protected translateService: TranslateService,
    protected modalService: NgbModal,
    protected paginationService: PaginationService,
  ) {
  }

  ngOnInit(): void {
    this.groupId = this.route.snapshot.params.groupId;
    this.paginationSub = this.paginationService.getCurrentPagination(this.config.id, this.config).pipe(
      tap(() => this.loading$.next(true)),
      switchMap((paginationOptions) => this.resourcePolicyService.searchByGroupPaginated(this.groupId, {
        currentPage: paginationOptions.currentPage,
        elementsPerPage: paginationOptions.pageSize,
      })),
      getAllSucceededRemoteData(),
      getRemoteDataPayload(),
    ).subscribe((list) => {
      this.entries$.next(list.page.map((policy: ResourcePolicy) => ({
        policy,
        resource$: this.getResource(policy),
      })));
      this.pageInfoState$.next(list.pageInfo);
      this.loading$.next(false);
    });
  }

  ngOnDestroy(): void {
    if (this.paginationSub) {
      this.paginationSub.unsubscribe();
    }
    this.paginationService.clearPagination(this.config.id);
  }

  /**
   * Resolve the resource a policy applies to, following its (unmodeled) `resource` HAL link
   */
  private getResource(policy: ResourcePolicy): Observable<RemoteData<DSpaceObject>> | Observable<undefined> {
    const resourceHref = (policy._links as any).resource?.href;
    if (!hasValue(resourceHref)) {
      return of(undefined);
    }
    return this.dSpaceObjectDataService.findByHref(resourceHref);
  }

  /**
   * Shows 'DELETE' instead of 'OBSOLETE (DELETE)' for better UX
   */
  getActionDisplayLabel(action: ActionType): string {
    if (action === ActionType.DELETE) {
      return 'DELETE';
    }
    return String(action);
  }

  confirmDelete(entry: GroupGovernanceEntry): void {
    const modalRef = this.modalService.open(ConfirmationModalComponent);
    modalRef.componentInstance.name = entry.policy.name ?? entry.policy.id;
    modalRef.componentInstance.headerLabel = 'admin.access-control.epeople.table.edit.buttons.remove.modal.header';
    modalRef.componentInstance.infoLabel = 'admin.access-control.epeople.table.edit.buttons.remove.modal.info';
    modalRef.componentInstance.cancelLabel = 'admin.access-control.epeople.table.edit.buttons.remove.modal.cancel';
    modalRef.componentInstance.confirmLabel = 'admin.access-control.epeople.table.edit.buttons.remove.modal.confirm';
    modalRef.componentInstance.brandColor = 'danger';
    modalRef.componentInstance.confirmIcon = 'fas fa-trash';

    const modalSub: Subscription = modalRef.componentInstance.response.pipe(
      takeUntil(modalRef.closed),
    ).subscribe((result: boolean) => {
      if (result === true) {
        this.deletePolicy(entry);
      }
    });

    void modalRef.result.then().finally(() => {
      modalRef.close();
      if (modalSub && !modalSub.closed) {
        modalSub.unsubscribe();
      }
    });
  }

  private deletePolicy(entry: GroupGovernanceEntry): void {
    this.resourcePolicyService.delete(entry.policy.id)
      .subscribe((succeeded: boolean) => {
        if (succeeded) {
          this.entries$.next(this.entries$.value.filter((e) => e.policy.id !== entry.policy.id));
          this.notificationsService.success(this.translateService.get(this.messagePrefix + 'notification.deleted.success'));
        } else {
          this.notificationsService.error(this.translateService.get(this.messagePrefix + 'notification.deleted.failure'));
        }
      });
  }
}
