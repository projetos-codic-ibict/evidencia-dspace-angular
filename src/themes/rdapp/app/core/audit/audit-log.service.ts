import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../../../environments/environment';
import { AuditLog } from './audit-log.model';

@Injectable({
  providedIn: 'root',
})
export class AuditLogService {

  constructor(private http: HttpClient) {}

  getLogs(): Observable<AuditLog[]> {
    const url = `${environment.rest.baseUrl}/api/custom/auditlogs`;
    return this.http.get<AuditLog[]>(url);
  }
}
