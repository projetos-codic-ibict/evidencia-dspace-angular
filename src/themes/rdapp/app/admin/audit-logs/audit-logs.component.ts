import { CommonModule } from '@angular/common';
import {
  Component,
  OnInit,
} from '@angular/core';
import {
  TranslateModule,
  TranslateService,
} from '@ngx-translate/core';
import {
  BehaviorSubject,
  combineLatest,
  Observable,
  of,
} from 'rxjs';
import {
  catchError,
  map,
  startWith,
} from 'rxjs/operators';

import { AuditLog } from '../../../../../app/core/audit/model/audit-log.model';
import { AuditLogService } from '../../../../../app/core/audit/model/audit-log.service';

@Component({
  selector: 'ds-audit-logs',
  templateUrl: './audit-logs.component.html',
  styleUrls: ['./audit-logs.component.scss'],
  imports: [
    CommonModule,
    TranslateModule,
  ],
})
export class AuditLogsComponent implements OnInit {
  messagePrefix = 'evidencia.audit-logs.';

  logs$: Observable<AuditLog[]>;
  filteredLogs$: Observable<AuditLog[]>;
  searchTerm$ = new BehaviorSubject<string>('');
  expandedLogId: string | null = null;

  constructor(
    private auditService: AuditLogService,
    private translateService: TranslateService,
  ) { }

  ngOnInit(): void {
    this.logs$ = this.auditService.getLogs().pipe(
      catchError((error: unknown) => {
        console.error('Erro ao buscar logs de auditoria:', error);
        return of([]);
      }),
      startWith([]),
    );

    this.filteredLogs$ = combineLatest([this.logs$, this.searchTerm$]).pipe(
      map(([logs, term]) => {
        if (!logs) {return [];}
        if (!term) {return logs;}
        const lowerTerm = term.toLowerCase();
        return logs.filter(log =>
          log.subjectName?.toLowerCase().includes(lowerTerm) ||
          log.subjectId?.toLowerCase().includes(lowerTerm) ||
          this.translateAction(log.actionType).toLowerCase().includes(lowerTerm) ||
          this.translateSubject(log.subjectType).toLowerCase().includes(lowerTerm) ||
          log.details?.toLowerCase().includes(lowerTerm),
        );
      }),
    );
  }

  onSearch(event: any) {
    this.searchTerm$.next(event.target.value);
  }

  toggleDetails(id: string) {
    this.expandedLogId = this.expandedLogId === id ? null : id;
  }

  translateAction(action: string): string {
    return this.translateService.instant(`${this.messagePrefix}action.${(action || '').toLowerCase()}`);
  }

  translateSubject(subject: string): string {
    return this.translateService.instant(`${this.messagePrefix}subject.${(subject || '').toLowerCase()}`);
  }
}
