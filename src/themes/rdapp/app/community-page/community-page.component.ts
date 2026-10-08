import { AsyncPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
} from '@angular/core';
import {
  RouterModule,
  RouterOutlet,
} from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';

import { CommunityPageComponent as BaseComponent } from '../../../../app/community-page/community-page.component';
import { fadeInOut } from '../../../../app/shared/animations/fade';
import { ThemedComcolPageContentComponent } from '../../../../app/shared/comcol/comcol-page-content/themed-comcol-page-content.component';
import { ThemedComcolPageHandleComponent } from '../../../../app/shared/comcol/comcol-page-handle/themed-comcol-page-handle.component';
import { ComcolPageHeaderComponent } from '../../../../app/shared/comcol/comcol-page-header/comcol-page-header.component';
import { ComcolPageLogoComponent } from '../../../../app/shared/comcol/comcol-page-logo/comcol-page-logo.component';
import { DsoEditMenuComponent } from '../../../../app/shared/dso-page/dso-edit-menu/dso-edit-menu.component';
import { ErrorComponent } from '../../../../app/shared/error/error.component';
import { ThemedLoadingComponent } from '../../../../app/shared/loading/themed-loading.component';
import { VarDirective } from '../../../../app/shared/utils/var.directive';

/**
 * Página da comunidade sem a barra "Navegar" (browse-by) e sem a borda abaixo do cabeçalho,
 * igual à página da coleção (análise do MVP, 4.2.1).
 */
@Component({
  selector: 'ds-themed-community-page',
  styleUrls: ['../../../../app/community-page/community-page.component.scss'],
  templateUrl: './community-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [fadeInOut],
  imports: [
    AsyncPipe,
    ComcolPageHeaderComponent,
    ComcolPageLogoComponent,
    DsoEditMenuComponent,
    ErrorComponent,
    RouterModule,
    RouterOutlet,
    ThemedComcolPageContentComponent,
    ThemedComcolPageHandleComponent,
    ThemedLoadingComponent,
    TranslateModule,
    VarDirective,
  ],
})
export class CommunityPageComponent extends BaseComponent {}
