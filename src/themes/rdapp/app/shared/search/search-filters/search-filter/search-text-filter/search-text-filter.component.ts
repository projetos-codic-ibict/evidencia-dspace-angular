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
import {
  hasNoValue,
  hasValue,
} from '@dspace/shared/utils/empty.util';
import { TranslateModule } from '@ngx-translate/core';
import {
  BehaviorSubject,
  combineLatest as observableCombineLatest,
  EMPTY,
  Observable,
  of,
} from 'rxjs';
import {
  expand,
  map,
  reduce,
  switchMap,
  take,
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
  /** Teto de páginas buscadas pelo "Selecionar todos", para um filtro enorme não virar dezenas de requisições */
  private static readonly SELECT_ALL_MAX_PAGES = 20;

  /** Seleção que o usuário tinha antes do "Selecionar todos", devolvida ao desmarcar */
  private selectionBeforeSelectAll: string[] | null = null;

  /**
   * Valores (sem operador) que o "Selecionar todos" aplicou. O checkbox só fica marcado enquanto todos eles
   * continuam aplicados, mesmo os que não estão entre os valores carregados na sidebar.
   */
  private selectAllValues$ = new BehaviorSubject<string[]>([]);

  /** Verdadeiro quando o "Selecionar todos" está valendo, ou quando todos os valores carregados estão aplicados */
  allSelected$: Observable<boolean>;

  override ngOnInit(): void {
    super.ngOnInit();
    this.allSelected$ = observableCombineLatest([
      this.searchService.getSelectedValuesForFilter(this.filterConfig.name),
      this.facetValues$,
      this.selectAllValues$,
      this.isLastPage$,
    ]).pipe(
      map(([applied, pages, selectAllValues, isLastPage]) => {
        const isApplied = (value: string) => applied.some((a) => a.value === value);
        if (selectAllValues.length > 0) {
          return selectAllValues.every(isApplied);
        }
        // Sem o estado do "Selecionar todos" (ex.: página recarregada), só vale como marcado quando o filtro
        // inteiro já está na tela, senão marcar os valores visíveis daria falso positivo.
        const values = pages.reduce((acc: FacetValue[], p: FacetValues) => acc.concat(p.page), []);
        return isLastPage && values.length > 0 && values.every((v) => isApplied(stripOperatorFromFilterValue(getFacetValueForType(v, this.filterConfig))));
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
    if ((event.target as HTMLInputElement).checked) {
      const current = this.currentFilterValues();
      this.selectionBeforeSelectAll = current;
      this.loadAllFacetValues().pipe(take(1)).subscribe((facetValues: FacetValue[]) => {
        const merged = [...current];
        facetValues.forEach((facetValue: FacetValue) => {
          const value = getFacetValueForType(facetValue, this.filterConfig);
          if (!merged.some((m) => stripOperatorFromFilterValue(m) === stripOperatorFromFilterValue(value))) {
            merged.push(value);
          }
        });
        this.selectAllValues$.next(facetValues.map((facetValue: FacetValue) =>
          stripOperatorFromFilterValue(getFacetValueForType(facetValue, this.filterConfig))));
        this.applyFilterValues(merged);
      });
    } else {
      this.selectAllValues$.next([]);
      this.applyFilterValues(this.selectionBeforeSelectAll ?? []);
      this.selectionBeforeSelectAll = null;
    }
  }

  /** Valores deste filtro que estão hoje na URL, com o operador */
  private currentFilterValues(): string[] {
    const raw = this.router.parseUrl(this.router.url).queryParams[this.filterConfig.paramName];
    return hasValue(raw) ? [].concat(raw) : [];
  }

  /** Troca os valores deste filtro na URL e volta os resultados para a primeira página */
  private applyFilterValues(values: string[]): void {
    this.router.navigate(this.getSearchLinkParts(), {
      queryParams: {
        [this.filterConfig.paramName]: values.length > 0 ? values : null,
        [`${this.searchConfigService.paginationID}.page`]: 1,
      },
      queryParamsHandling: 'merge',
    });
  }

  /** Valores já carregados mais os das páginas seguintes, até o fim ou o teto de páginas */
  private loadAllFacetValues(): Observable<FacetValue[]> {
    const loaded: FacetValues[] = this.facetValues$.getValue();
    const loadedValues = loaded.reduce((acc: FacetValue[], p: FacetValues) => acc.concat(p.page), []);
    const last = loaded[loaded.length - 1];
    if (hasNoValue(last) || hasNoValue(last.next)) {
      return of(loadedValues);
    }
    return this.searchOptions$.pipe(
      take(1),
      switchMap((options: SearchOptions) => {
        const fetchPage = (page: number) => this.searchService.getFacetValuesFor(this.filterConfig, page, options).pipe(
          getFirstSucceededRemoteDataPayload(),
        );
        const firstPage = last.pageInfo.currentPage + 1;
        return fetchPage(firstPage).pipe(
          expand((facetValues: FacetValues) => hasValue(facetValues.next) &&
            facetValues.pageInfo.currentPage < firstPage + RdappSearchTextFilterComponent.SELECT_ALL_MAX_PAGES
            ? fetchPage(facetValues.pageInfo.currentPage + 1)
            : EMPTY),
          reduce((acc: FacetValue[], facetValues: FacetValues) => acc.concat(facetValues.page), loadedValues),
        );
      }),
    );
  }
}
