import { Route } from '@angular/router';

import { AuditLogsComponent } from './audit-logs.component';

export const ROUTES: Route[] = [
  {
    path: '',
    component: AuditLogsComponent,
    pathMatch: 'full',
    data: { title: 'evidencia.audit-logs.title' },
  },
];
