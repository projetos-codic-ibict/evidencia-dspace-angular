import {
  AsyncPipe,
  DatePipe,
  NgClass,
  NgTemplateOutlet,
} from '@angular/common';
import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgbCollapseModule } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule } from '@ngx-translate/core';

import { AuditTableComponent as BaseAuditTableComponent } from '../../../../../app/audit-page/audit-table/audit-table.component';
import { PaginationComponent } from '../../../../../app/shared/pagination/pagination.component';
import { StringReplacePipe } from '../../../../../app/shared/utils/string-replace.pipe';
import { VarDirective } from '../../../../../app/shared/utils/var.directive';

/**
 * RDAPP override: mesma tabela nativa, com o tipo de evento em badge colorido
 * (verde criação, amarelo edição, vermelho exclusão), no padrão visual que a
 * tela de auditoria custom antiga já usava.
 */
@Component({
  selector: 'ds-themed-audit-table',
  templateUrl: './audit-table.component.html',
  styleUrls: ['./audit-table.component.scss'],
  standalone: true,
  imports: [
    AsyncPipe,
    DatePipe,
    NgbCollapseModule,
    NgClass,
    NgTemplateOutlet,
    PaginationComponent,
    RouterLink,
    StringReplacePipe,
    TranslateModule,
    VarDirective,
  ],
})
export class AuditTableComponent extends BaseAuditTableComponent {

  /**
   * Classe de badge Bootstrap pro tipo de evento, seguindo o mesmo mapeamento
   * de cor que a tela de auditoria custom antiga usava.
   */
  getEventTypeBadgeClass(eventType: string): string {
    switch ((eventType || '').toUpperCase()) {
      case 'CREATE':
      case 'ADD':
        return 'audit-event-badge--create';
      case 'MODIFY':
      case 'MODIFY_METADATA':
        return 'audit-event-badge--modify';
      case 'DELETE':
      case 'REMOVE':
        return 'audit-event-badge--delete';
      default:
        return 'audit-event-badge--other';
    }
  }
}
