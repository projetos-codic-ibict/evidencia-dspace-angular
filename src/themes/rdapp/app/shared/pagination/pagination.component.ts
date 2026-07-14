import { AsyncPipe, NgClass } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
} from '@angular/core';
import {
  NgbDropdownModule,
  NgbPaginationModule,
  NgbTooltipModule,
} from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule } from '@ngx-translate/core';

import { BtnDisabledDirective } from '../../../../../app/shared/btn-disabled.directive';
import { RSSComponent } from '../../../../../app/shared/rss-feed/rss.component';
import { EnumKeysPipe } from '../../../../../app/shared/utils/enum-keys-pipe';
import { PaginationComponent as BasePaginationComponent } from '../../../../../app/shared/pagination/pagination.component';

@Component({
  exportAs: 'paginationComponent',
  selector: 'ds-pagination',
  styleUrls: ['pagination.component.scss'],
  templateUrl: 'pagination.component.html',
  changeDetection: ChangeDetectionStrategy.Default,
  encapsulation: ViewEncapsulation.Emulated,
  imports: [
    AsyncPipe,
    BtnDisabledDirective,
    EnumKeysPipe,
    NgbDropdownModule,
    NgbPaginationModule,
    NgbTooltipModule,
    NgClass,
    RSSComponent,
    TranslateModule,
  ],
})
export class PaginationComponent extends BasePaginationComponent {}
