import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';

import { ThemedFileDownloadLinkComponent } from '../../../../../../../app/shared/file-download-link/themed-file-download-link.component';
import { ThemedLoadingComponent } from '../../../../../../../app/shared/loading/themed-loading.component';
import { MetadataFieldWrapperComponent } from '../../../../../../../app/shared/metadata-field-wrapper/metadata-field-wrapper.component';
import { FileSizePipe } from '../../../../../../../app/shared/utils/file-size-pipe';
import { VarDirective } from '../../../../../../../app/shared/utils/var.directive';
import { FileSectionComponent as BaseFileSectionComponent } from '../../../../../../../app/item-page/simple/field-components/file-section/file-section.component';

/**
 * Cópia do template do base com o [label] do ds-metadata-field-wrapper
 * comentado, para não renderizar o título "Arquivos" acima do botão de
 * download (pedido do Jabon). Descomentar a linha no .html para reverter.
 */
@Component({
  selector: 'ds-themed-item-page-file-section',
  templateUrl: './file-section.component.html',
  imports: [
    CommonModule,
    FileSizePipe,
    MetadataFieldWrapperComponent,
    ThemedFileDownloadLinkComponent,
    ThemedLoadingComponent,
    TranslateModule,
    VarDirective,
  ],
})
export class FileSectionComponent extends BaseFileSectionComponent {
}
