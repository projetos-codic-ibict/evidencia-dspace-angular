import { AsyncPipe } from '@angular/common';
import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';

import { SearchLabelComponent as BaseComponent } from '../../../../../../../app/shared/search/search-labels/search-label/search-label.component';

@Component({
  selector: 'ds-search-label',
  templateUrl: './search-label.component.html',
  styleUrls: ['./search-label.component.scss'],
  imports: [
    AsyncPipe,
    RouterLink,
    TranslateModule,
  ],
})
export class RdappSearchLabelComponent extends BaseComponent {}
