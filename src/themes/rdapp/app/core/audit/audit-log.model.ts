export interface AuditLog {
  id: string;
  epersonId: string;
  actionType: string;
  subjectType: string;
  subjectId: string;
  timestamp: string;
  details: string;
  subjectName: string;
}
