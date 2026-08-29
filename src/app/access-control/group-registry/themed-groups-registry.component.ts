import { Component } from '@angular/core';

import { ThemedComponent } from '../../shared/theme-support/themed.component';
import { GroupsRegistryComponent } from './groups-registry.component';


@Component({
  selector: 'ds-groups-registry',
  templateUrl: '../../shared/theme-support/themed.component.html',
})
export class ThemedGroupsRegistryComponent extends ThemedComponent<GroupsRegistryComponent> {
  protected getComponentName(): string {
    return 'GroupsRegistryComponent';
  }

  protected importThemedComponent(themeName: string): Promise<any> {
    return import(`../../../themes/${themeName}/app/access-control/group-registry/groups-registry.component`);
  }

  protected importUnthemedComponent(): Promise<any> {
    return import(`./groups-registry.component`);
  }

}
