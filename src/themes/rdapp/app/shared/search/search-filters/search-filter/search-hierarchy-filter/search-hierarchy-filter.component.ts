import {
  AsyncPipe,
  LowerCasePipe,
} from '@angular/common';
import {
  Component,
  OnDestroy,
  OnInit,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { getFirstSucceededRemoteDataPayload } from '@dspace/core/shared/operators';
import { FacetValues } from '@dspace/core/shared/search/models/facet-values.model';
import { SearchOptions } from '@dspace/core/shared/search/models/search-options.model';
import { hasNoValue } from '@dspace/shared/utils/empty.util';
import { TranslateModule } from '@ngx-translate/core';
import {
  combineLatest as observableCombineLatest,
  Observable,
} from 'rxjs';
import {
  map,
  switchMap,
  tap,
} from 'rxjs/operators';

import { FilterInputSuggestionsComponent } from '../../../../../../../../app/shared/input-suggestions/filter-suggestions/filter-input-suggestions.component';
import { facetLoad } from '../../../../../../../../app/shared/search/search-filters/search-filter/search-facet-filter/search-facet-filter.component';
import { SearchFacetOptionComponent } from '../../../../../../../../app/shared/search/search-filters/search-filter/search-facet-filter-options/search-facet-option/search-facet-option.component';
import { SearchFacetSelectedOptionComponent } from '../../../../../../../../app/shared/search/search-filters/search-filter/search-facet-filter-options/search-facet-selected-option/search-facet-selected-option.component';
import { SearchHierarchyFilterComponent as BaseComponent } from '../../../../../../../../app/shared/search/search-filters/search-filter/search-hierarchy-filter/search-hierarchy-filter.component';

@Component({
  selector: 'ds-themed-search-hierarchy-filter',
  templateUrl: './search-hierarchy-filter.component.html',
  animations: [facetLoad],
  imports: [
    AsyncPipe,
    FilterInputSuggestionsComponent,
    FormsModule,
    LowerCasePipe,
    SearchFacetOptionComponent,
    SearchFacetSelectedOptionComponent,
    TranslateModule,
  ],
})
export class RdappSearchHierarchyFilterComponent extends BaseComponent implements OnDestroy, OnInit {
  /**
   * Overrides the base facet retrieval so the search-by-text input stays visible regardless of
   * facetLimit (discovery.xml). facetLimit doubles as the facet page size there, so tying the input's
   * visibility to it also shrinks pagination whenever it's lowered to force the input to show.
   */
  protected retrieveFilterValues(): Observable<FacetValues[]> {
    return observableCombineLatest([this.searchOptions$, this.currentPage]).pipe(
      switchMap(([options, page]: [SearchOptions, number]) => this.searchService.getFacetValuesFor(this.filterConfig, page, options).pipe(
        getFirstSucceededRemoteDataPayload(),
        tap((facetValues: FacetValues) => {
          this.isLastPage$.next(hasNoValue(facetValues?.next));
          this.isAvailableForShowSearchText.next(false);
        }),
      )),
      map((newFacetValues: FacetValues) => {
        let filterValues: FacetValues[] = this.facetValues$.value;

        if (this.collapseNextUpdate) {
          this.showFirstPageOnly();
          filterValues = [];
          this.collapseNextUpdate = false;
        }
        if (newFacetValues.pageInfo.currentPage === 1) {
          filterValues = [];
        }

        filterValues = [...filterValues, newFacetValues];

        return filterValues;
      }),
      tap((allFacetValues: FacetValues[]) => {
        this.animationState = 'ready';
        this.facetValues$.next(allFacetValues);
      }),
    );
  }
}
