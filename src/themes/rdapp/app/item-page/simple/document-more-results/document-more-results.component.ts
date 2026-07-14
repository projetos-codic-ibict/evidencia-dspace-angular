import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';

import { DocumentMoreResultsComponent as BaseComponent } from '../../../../../../app/item-page/simple/document-more-results/document-more-results.component';
import { BitstreamDataService } from '../../../../../../app/core/data/bitstream-data.service';

@Component({
  selector: 'ds-document-more-results',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  templateUrl: '../../../../../../app/item-page/simple/document-more-results/document-more-results.component.html',
  styleUrls: [
    '../../../../../../app/item-page/simple/document-more-results/document-more-results.component.scss',
    './document-more-results.component.scss',
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DocumentMoreResultsComponent extends BaseComponent {
  constructor(
    http: HttpClient,
    route: ActivatedRoute,
    router: Router,
    bitstreamDataService: BitstreamDataService,
    cdr: ChangeDetectorRef,
  ) {
    super(http, route, router, bitstreamDataService, cdr);
  }
}
