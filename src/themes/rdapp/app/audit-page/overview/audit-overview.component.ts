import { AsyncPipe } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import {
  forkJoin,
  of,
  switchMap,
} from 'rxjs';
import {
  filter,
  map,
  mergeMap,
} from 'rxjs/operators';

import { AuditOverviewComponent as BaseAuditOverviewComponent } from '../../../../../app/audit-page/overview/audit-overview.component';
import { AuditTableComponent } from '../audit-table/audit-table.component';
import { Audit } from '../../../../../app/core/audit/model/audit.model';
import { PaginatedList } from '../../../../../app/core/data/paginated-list.model';
import { RemoteData } from '../../../../../app/core/data/remote-data';
import { followLink } from '../../../../../app/core/shared/follow-link-config.model';

export const AUDIT_SUBJECT_TYPE_ALL = 'all';

interface SubjectTypeOption {
  value: string;
  labelKey: string;
}

/**
 * RDAPP override of the native audit overview page: adiciona filtro por tipo de sujeito
 * (Usuário/Grupo), pra focar a trilha de auditoria em identidade, como a HU009 CA09 pede.
 */
@Component({
  selector: 'ds-themed-audit-overview',
  templateUrl: './audit-overview.component.html',
  styleUrls: ['./audit-overview.component.scss'],
  standalone: true,
  imports: [
    AsyncPipe,
    AuditTableComponent,
    TranslateModule,
    FormsModule,
  ],
})
export class AuditOverviewComponent extends BaseAuditOverviewComponent {

  // O campo subject_type no Solr é indexado como string exata, sem normalização de caixa
  // (confirmado via /solr/audit/schema/fields/subject_type: type "string", sem analyzer),
  // e o DSpace grava o nome da constante em maiúsculas (EPERSON, GROUP) — os valores aqui
  // precisam bater exatamente com isso, não com a grafia "bonita" (EPerson, Group).
  readonly subjectTypeOptions: SubjectTypeOption[] = [
    { value: AUDIT_SUBJECT_TYPE_ALL, labelKey: 'rdapp.audit-overview.filter.all' },
    { value: 'EPERSON', labelKey: 'rdapp.audit-overview.filter.eperson' },
    { value: 'GROUP', labelKey: 'rdapp.audit-overview.filter.group' },
  ];

  selectedType = AUDIT_SUBJECT_TYPE_ALL;

  onFilterChange(): void {
    this.setAudits();
  }

  override setAudits(): void {
    this.auditsRD$ = this.paginationService.getFindListOptions(this.pageId, this.config).pipe(
      switchMap((config) => {
        return this.selectedType === AUDIT_SUBJECT_TYPE_ALL
          ? this.auditService.findAll(config, false, true, followLink('eperson'))
          : this.auditService.findBySubjectType([this.selectedType], config, false);
      }),
      filter(data => !!data),
      map((audits) => {
        audits.payload?.page.forEach((audit) => {
          audit.hasDetails = this.auditService.auditHasDetails(audit);
        });
        return audits;
      }),
      mergeMap((auditsRD) => {
        const page = auditsRD.payload?.page ?? [];
        if (page.length === 0) {
          return of(auditsRD);
        }
        const updatedAudits$ = page.map((audit) => {
          return this.auditService.getEpersonName(audit).pipe(
            map((name) => Object.assign(new Audit(), audit, { epersonName: name })),
          );
        });
        return forkJoin(updatedAudits$).pipe(
          map((updatedAudits) => Object.assign(new RemoteData(
            auditsRD.timeCompleted,
            auditsRD.msToLive,
            auditsRD.lastUpdated,
            auditsRD.state,
            auditsRD.errorMessage,
            Object.assign(new PaginatedList(), { ...auditsRD.payload, page: updatedAudits }),
            auditsRD.statusCode,
          ))),
        );
      }),
    );
  }
}
