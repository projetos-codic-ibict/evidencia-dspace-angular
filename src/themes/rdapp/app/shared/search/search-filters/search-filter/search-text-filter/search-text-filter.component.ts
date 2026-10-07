import { AsyncPipe } from '@angular/common';
import {
  Component,
  OnInit,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { getFirstSucceededRemoteDataPayload } from '@dspace/core/shared/operators';
import { FacetValue } from '@dspace/core/shared/search/models/facet-value.model';
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
import { RdappSearchFacetOptionComponent } from '../search-facet-filter-options/search-facet-option/search-facet-option.component';
import { SearchFacetSelectedOptionComponent } from '../../../../../../../../app/shared/search/search-filters/search-filter/search-facet-filter-options/search-facet-selected-option/search-facet-selected-option.component';
import { getFacetValueForType } from '../../../../../../../../app/shared/search/search.utils';
import { SearchTextFilterComponent as BaseComponent } from '../../../../../../../../app/shared/search/search-filters/search-filter/search-text-filter/search-text-filter.component';

@Component({
  selector: 'ds-search-text-filter',
  templateUrl: './search-text-filter.component.html',
  animations: [facetLoad],
  imports: [
    AsyncPipe,
    FilterInputSuggestionsComponent,
    FormsModule,
    RdappSearchFacetOptionComponent,
    SearchFacetSelectedOptionComponent,
    TranslateModule,
  ],
})
export class RdappSearchTextFilterComponent extends BaseComponent implements OnInit {
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
        // Anos do mais recente para o mais antigo (o backend entrega em ordem crescente, ver discovery.xml)
        if (this.filterConfig.name === 'dateIssued') {
          newFacetValues = Object.assign(Object.create(Object.getPrototypeOf(newFacetValues)), newFacetValues, {
            page: [...newFacetValues.page].reverse(),
          });
        }

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

  selectAll(event: Event): void {
    const isChecked = (event.target as HTMLInputElement).checked;

    const allPages: FacetValues[] = this.facetValues$.getValue();

    const allVisibleValues: FacetValue[] = allPages.reduce(
      (acc: FacetValue[], pageObj: FacetValues) => acc.concat(pageObj.page),
      [],
    );

    if (allVisibleValues.length === 0) {
      return;
    }

    const urlTree = this.router.parseUrl(this.router.url);
    const queryParams = { ...urlTree.queryParams };

    const paramName = this.filterConfig.paramName;

    if (isChecked) {
      const allFormattedValues = allVisibleValues.map(
        (facetValue: FacetValue) => {
          const baseValue = getFacetValueForType(facetValue, this.filterConfig);

          if (baseValue.match(new RegExp(`^.+,(equals|query|authority)$`))) {
            return baseValue;
          }
          return `${baseValue},equals`;
        },
      );

      queryParams[paramName] = allFormattedValues;
    } else {
      delete queryParams[paramName];
    }

    this.router.navigate(this.getSearchLinkParts(), {
      queryParams: queryParams,
      queryParamsHandling: 'merge',
    });
  }
}
