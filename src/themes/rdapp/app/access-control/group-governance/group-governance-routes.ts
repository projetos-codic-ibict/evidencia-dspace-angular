import { Route } from '@angular/router';

import { ResourcePolicyEditComponent } from '../../../../../app/shared/resource-policies/edit/resource-policy-edit.component';
import { resourcePolicyResolver } from '../../../../../app/shared/resource-policies/resolvers/resource-policy.resolver';
import { GroupGovernanceComponent } from './group-governance.component';

export const ROUTES: Route[] = [
  {
    path: 'authorizations',
    children: [
      {
        path: 'edit',
        resolve: {
          resourcePolicy: resourcePolicyResolver,
        },
        component: ResourcePolicyEditComponent,
        data: { title: 'resource-policies.edit.page.title' },
      },
      {
        path: '',
        component: GroupGovernanceComponent,
        data: { title: 'evidencia.group-governance.title' },
      },
    ],
  },
];
