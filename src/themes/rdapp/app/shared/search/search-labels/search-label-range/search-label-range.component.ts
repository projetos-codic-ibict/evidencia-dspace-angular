import { AsyncPipe } from '@angular/common';
import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';

import { SearchLabelRangeComponent as BaseComponent } from '../../../../../../../app/shared/search/search-labels/search-label-range/search-label-range.component';

@Component({
  selector: 'ds-search-label-range',
  templateUrl: './search-label-range.component.html',
  styleUrls: ['./search-label-range.component.scss'],
  imports: [
    AsyncPipe,
    RouterLink,
    TranslateModule,
  ],
})
export class RdappSearchLabelRangeComponent extends BaseComponent {}
