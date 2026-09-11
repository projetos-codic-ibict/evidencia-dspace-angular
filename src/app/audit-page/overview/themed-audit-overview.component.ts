import { Component } from '@angular/core';

import { ThemedComponent } from '../../shared/theme-support/themed.component';
import { AuditOverviewComponent } from './audit-overview.component';

/**
 * Themed wrapper for AuditOverviewComponent
 */
@Component({
  selector: 'ds-audit-overview',
  templateUrl: '../../shared/theme-support/themed.component.html',
})
export class ThemedAuditOverviewComponent extends ThemedComponent<AuditOverviewComponent> {

  protected getComponentName(): string {
    return 'AuditOverviewComponent';
  }

  protected importThemedComponent(themeName: string): Promise<any> {
    return import(`../../../themes/${themeName}/app/audit-page/overview/audit-overview.component`);
  }

  protected importUnthemedComponent(): Promise<any> {
    return import(`./audit-overview.component`);
  }
}
