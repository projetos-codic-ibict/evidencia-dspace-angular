import { AsyncPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  Input,
  OnInit,
  ViewChild,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import {
  Observable,
  of,
} from 'rxjs';
import { map } from 'rxjs/operators';

import { DSpaceObjectType } from '../../../../../../app/core/shared/dspace-object-type.model';
import { Item } from '../../../../../../app/core/shared/item.model';
import { getFirstCompletedRemoteData } from '../../../../../../app/core/shared/operators';
import { SearchService } from '../../../../../../app/core/shared/search/search.service';
import { PaginationComponentOptions } from '@dspace/core/pagination/pagination-component-options.model';
import { PaginatedSearchOptions } from '../../../../../../app/core/shared/search/models/paginated-search-options.model';
import { SearchResult } from '../../../../../../app/core/shared/search/models/search-result.model';
import { followLink } from '@dspace/core/shared/follow-link-config.model';
import { getItemPageRoute } from '@dspace/core/router/utils/dso-route.utils';
import { ThemedThumbnailComponent } from '../../../../../../app/thumbnail/themed-thumbnail.component';

@Component({
  selector: 'ds-related-publications',
  standalone: true,
  imports: [
    AsyncPipe,
    RouterLink,
    ThemedThumbnailComponent,
    TranslateModule,
  ],
  templateUrl: './related-publications.component.html',
  styleUrls: ['./related-publications.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RelatedPublicationsComponent implements OnInit {

  @Input() item: Item;
  @ViewChild('carousel') carouselRef: ElementRef<HTMLElement>;

  relatedItems$: Observable<Item[]>;

  constructor(private searchService: SearchService) {}

  scrollPrev(): void {
    this.carouselRef.nativeElement.scrollBy({ left: -240, behavior: 'smooth' });
  }

  scrollNext(): void {
    this.carouselRef.nativeElement.scrollBy({ left: 240, behavior: 'smooth' });
  }

  ngOnInit(): void {
    const subjects = (this.item?.allMetadataValues('dc.subject') ?? []).slice(0, 10);

    if (!subjects.length) {
      this.relatedItems$ = of([]);
      return;
    }

    const query = subjects
      .map(s => `dc.subject:"${s.replace(/"/g, '\\"')}"`)
      .join(' OR ');

    this.relatedItems$ = this.searchService.search<Item>(
      new PaginatedSearchOptions({
        query,
        dsoTypes: [DSpaceObjectType.ITEM],
        pagination: Object.assign(new PaginationComponentOptions(), {
          id: 'related-publications',
          pageSize: 12,
          currentPage: 1,
        }),
      }),
      undefined, true, true,
      followLink('thumbnail'),
    ).pipe(
      getFirstCompletedRemoteData(),
      map(rd => {
        if (!rd.hasSucceeded || !rd.payload?.page) {
          return [];
        }
        return rd.payload.page
          .map((result: SearchResult<Item>) => result.indexableObject)
          .filter(i => i?.uuid !== this.item?.uuid);
      }),
    );
  }

  getRoute(i: Item): string {
    return getItemPageRoute(i);
  }

  getYear(i: Item): string {
    return i?.firstMetadataValue('dc.date.issued')?.slice(0, 4) ?? '';
  }
}
