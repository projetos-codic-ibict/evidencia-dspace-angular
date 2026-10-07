import { AsyncPipe } from '@angular/common';
import {
  Component,
  inject,
  OnInit,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { getFirstSucceededRemoteDataPayload } from '@dspace/core/shared/operators';
import { FacetValue } from '@dspace/core/shared/search/models/facet-value.model';
import { FacetValues } from '@dspace/core/shared/search/models/facet-values.model';
import { SearchFilterConfig } from '@dspace/core/shared/search/models/search-filter-config.model';
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
import {
  getFacetValueForType,
  stripOperatorFromFilterValue,
} from '../../../../../../../../app/shared/search/search.utils';
import { SearchTextFilterComponent as BaseComponent } from '../../../../../../../../app/shared/search/search-filters/search-filter/search-text-filter/search-text-filter.component';

import { FacetSelectAllStateService } from './facet-select-all-state.service';

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
  /** Quantos anos pedir de uma vez ao backend no filtro de data */
  private static readonly ALL_YEARS_PAGE_SIZE = 50;

  private selectAllState = inject(FacetSelectAllStateService);

  /** Marcado enquanto os valores aplicados pelo "Selecionar todos" continuam todos aplicados */
  allSelected$: Observable<boolean>;

  override ngOnInit(): void {
    super.ngOnInit();
    this.allSelected$ = observableCombineLatest([
      this.searchService.getSelectedValuesForFilter(this.filterConfig.name),
      this.facetValues$,
      this.selectAllState.get(this.filterConfig.name),
    ]).pipe(
      map(([applied, pages, selectAllValues]) => {
        const isApplied = (value: string) => applied.some((a) => a.value === value);
        if (selectAllValues.length > 0) {
          return selectAllValues.every(isApplied);
        }
        const values = pages.reduce((acc: FacetValue[], p: FacetValues) => acc.concat(p.page), []);
        return values.length > 0 && values.every((v) => isApplied(stripOperatorFromFilterValue(getFacetValueForType(v, this.filterConfig))));
      }),
    );
  }

  /**
   * Overrides the base facet retrieval so the search-by-text input stays visible regardless of
   * facetLimit (discovery.xml). facetLimit doubles as the facet page size there, so tying the input's
   * visibility to it also shrinks pagination whenever it's lowered to force the input to show.
   */
  protected retrieveFilterValues(): Observable<FacetValues[]> {
    return observableCombineLatest([this.searchOptions$, this.currentPage]).pipe(
      switchMap(([options, page]: [SearchOptions, number]) => this.getFacetValuesPage(options, page).pipe(
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

  /**
   * Uma página de valores da faceta. O filtro de data (dateIssued) mostra os anos do mais recente para o mais
   * antigo, mas o Solr só ordena por valor em ordem crescente. Por isso busca todos os anos de uma vez e
   * pagina aqui, do mesmo jeito dos outros filtros ("Mostrar mais" e "Mostrar menos").
   */
  private getFacetValuesPage(options: SearchOptions, page: number): Observable<FacetValues> {
    if (this.filterConfig.name !== 'dateIssued') {
      return this.searchService.getFacetValuesFor(this.filterConfig, page, options).pipe(
        getFirstSucceededRemoteDataPayload(),
      );
    }
    const allYears = Object.assign(new SearchFilterConfig(), this.filterConfig, { pageSize: RdappSearchTextFilterComponent.ALL_YEARS_PAGE_SIZE });
    return this.searchService.getFacetValuesFor(allYears, 1, options).pipe(
      getFirstSucceededRemoteDataPayload(),
      map((facetValues: FacetValues) => {
        const pageSize = this.filterConfig.pageSize;
        const years = [...facetValues.page].reverse();
        const hasMore = years.length > page * pageSize;
        // Só propriedades de dados: next, currentPage e afins são accessors com setter na PaginatedList e
        // quebram (pageInfo._links é indefinido nesta resposta). O getter next lê _links.next.
        return Object.assign(Object.create(Object.getPrototypeOf(facetValues)), facetValues, {
          page: years.slice((page - 1) * pageSize, page * pageSize),
          _links: Object.assign({}, facetValues._links, { next: hasMore ? { href: facetValues._links?.self?.href } : undefined }),
          pageInfo: Object.assign({}, facetValues.pageInfo, { currentPage: page }),
        });
      }),
    );
  }

  selectAll(event: Event): void {
    const isChecked = (event.target as HTMLInputElement).checked;
    const paramName = this.filterConfig.paramName;
    const queryParams = { ...this.router.parseUrl(this.router.url).queryParams };

    if (isChecked) {
      const allVisibleValues: FacetValue[] = this.facetValues$.getValue().reduce(
        (acc: FacetValue[], pageObj: FacetValues) => acc.concat(pageObj.page),
        [],
      );

      if (allVisibleValues.length === 0) {
        return;
      }

      const allFormattedValues = allVisibleValues.map((facetValue: FacetValue) => {
        const baseValue = getFacetValueForType(facetValue, this.filterConfig);
        return baseValue.match(new RegExp(`^.+,(equals|query|authority)$`)) ? baseValue : `${baseValue},equals`;
      });

      queryParams[paramName] = allFormattedValues;
      this.selectAllState.set(this.filterConfig.name, allFormattedValues.map((value: string) => stripOperatorFromFilterValue(value)));
    } else {
      // Com queryParamsHandling 'merge' o parâmetro ausente volta da URL atual, então a remoção é com null
      queryParams[paramName] = null;
      this.selectAllState.set(this.filterConfig.name, []);
    }

    // A lista de resultados muda de tamanho, então volta para a primeira página
    queryParams[`${this.searchConfigService.paginationID}.page`] = 1;

    this.router.navigate(this.getSearchLinkParts(), {
      queryParams: queryParams,
      queryParamsHandling: 'merge',
    });
  }
}
