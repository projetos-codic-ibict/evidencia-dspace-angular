import {
  animate,
  state,
  style,
  transition,
  trigger,
} from '@angular/animations';
import { Component, Inject, Input, OnDestroy, OnInit } from '@angular/core';
import { Params, Router } from '@angular/router';
import {
  BehaviorSubject,
  combineLatest as observableCombineLatest,
  Observable,
  of,
  Subscription,
} from 'rxjs';
import {
  distinctUntilChanged,
  map,
  switchMap,
  take,
  tap,
} from 'rxjs/operators';

import { RemoteDataBuildService } from '../../../../../core/cache/builders/remote-data-build.service';
import { getFirstSucceededRemoteDataPayload } from '../../../../../core/shared/operators';
import { SearchService } from '../../../../../core/shared/search/search.service';
import { SearchConfigurationService } from '../../../../../core/shared/search/search-configuration.service';
import { SearchFilterService } from '../../search-filter.service'
import { SEARCH_CONFIG_SERVICE } from '../../../../../my-dspace-page/my-dspace-configuration.service';
import { hasNoValue, hasValue } from '@dspace/shared/utils/empty.util';
import { InputSuggestion } from '../../../../input-suggestions/input-suggestions.model';
import { currentPath } from '@dspace/core/router/utils/route.utils';
import { AppliedFilter } from '../../../../../../app/core/shared/search/models/applied-filter.model';
import { FacetValue } from '@dspace/core/shared/search/models/facet-value.model';
import { FacetValues } from '@dspace/core/shared/search/models/facet-values.model';
import { SearchFilterConfig } from '@dspace/core/shared/search/models/search-filter-config.model';
import { SearchOptions } from '@dspace/core/shared/search/models/search-options.model';

export const FACET_OPERATORS: string[] = [
  'equals',
  'authority',
  'range',
  'query',
];

@Component({
  selector: 'ds-search-facet-filter',
  template: ``,
})
export class SearchFacetFilterComponent implements OnInit, OnDestroy {
  @Input() filterConfig: SearchFilterConfig;
  @Input() inPlaceSearch: boolean;
  @Input() refreshFilters: BehaviorSubject<boolean>;
  @Input() scope: string;

  facetValues$: BehaviorSubject<FacetValues[]> = new BehaviorSubject([]);
  currentPage: Observable<number>;
  isLastPage$: BehaviorSubject<boolean> = new BehaviorSubject(false);
  isAvailableForShowSearchText: BehaviorSubject<boolean> = new BehaviorSubject(
    false,
  );
  filter: string;
  protected subs: Subscription[] = [];
  filterSearchResults$: Observable<InputSuggestion[]> = of([]);
  selectedAppliedFilters$: Observable<AppliedFilter[]>;
  protected collapseNextUpdate = true;
  animationState = 'loading';
  searchOptions$: Observable<SearchOptions>;
  currentUrl: string;

  selectedCount$: BehaviorSubject<number> = new BehaviorSubject<number>(0);
  pendingSelections: Record<string, boolean> = {};

  toggleMultiValue(rawValue: string): void {
    const cleanValue = rawValue.replace(/,(equals|query|authority)$/, '');

    this.pendingSelections = {
      ...this.pendingSelections,
      [cleanValue]: !this.pendingSelections[cleanValue],
    };

    this.selectedCount$.next(
      Object.values(this.pendingSelections).filter(Boolean).length,
    );
  }

  isMultiValueSelected(value: FacetValue): boolean {
    return !!this.pendingSelections[value.value];
  }

  applyMultiSelect(): void {
    const selectedKeys = Object.keys(this.pendingSelections).filter(
      (k) => this.pendingSelections[k],
    );
    const urlTree = this.router.parseUrl(this.router.url);
    const params = { ...urlTree.queryParams };

    const searchField = this.filterConfig.name;
    let currentQuery = params['query'] || '';

    const regexRemove = new RegExp(`( AND )?${searchField}:\\(.*?"\\)`, 'g');
    currentQuery = currentQuery.replace(regexRemove, '').trim();

    if (currentQuery.startsWith('AND ')) {
      currentQuery = currentQuery.substring(4).trim();
    }

    if (selectedKeys.length > 0) {
      const orQuery = selectedKeys.map((v) => `"${v}"`).join(' OR ');
      const facetQueryString = `${searchField}:(${orQuery})`;

      if (currentQuery !== '') {
        params['query'] = `${currentQuery} AND ${facetQueryString}`;
      } else {
        params['query'] = facetQueryString;
      }
    } else {
      if (currentQuery === '') {
        delete params['query'];
      } else {
        params['query'] = currentQuery;
      }
    }

    delete params[this.filterConfig.paramName];

    delete params.page;
    delete params['spc.page'];

    void this.router
      .navigate(this.getSearchLinkParts(), {
        queryParams: params,
      })
      .then(() => {
        this.pendingSelections = {};
        this.selectedCount$.next(0);
      });
  }

  constructor(
    protected searchService: SearchService,
    protected filterService: SearchFilterService,
    protected rdbs: RemoteDataBuildService,
    protected router: Router,
    @Inject(SEARCH_CONFIG_SERVICE)
    public searchConfigService: SearchConfigurationService,
  ) {}

  ngOnInit(): void {
    this.currentUrl = this.router.url;
    this.currentPage = this.getCurrentPage().pipe(distinctUntilChanged());

    this.subs.push(
      this.router.routerState.root.queryParams.subscribe((params) => {
        const globalQuery = params['query'] || '';
        this.pendingSelections = {};

        const searchField = this.filterConfig.name;

        if (globalQuery.includes(`${searchField}:(`)) {
          const regexExtract = new RegExp(`${searchField}:\\((.*?)\\)`);
          const match = globalQuery.match(regexExtract);

          if (match && match[1]) {
            const innerContent = match[1];
            const values = innerContent.split(' OR ');

            values.forEach((v) => {
              const cleanVal = v.replace(/(^"|"$)/g, '').replace(/\\"/g, '"');
              this.pendingSelections[cleanVal] = true;
            });
          }
        }

        this.selectedCount$.next(
          Object.keys(this.pendingSelections).filter(
            (k) => this.pendingSelections[k],
          ).length,
        );
      }),
    );

    this.searchOptions$ = this.searchConfigService.searchOptions.pipe(
      map((options: SearchOptions) =>
        hasNoValue(this.scope)
          ? options
          : Object.assign(new SearchOptions(options), {
              scope: this.scope,
            }),
      ),
    );
    this.subs.push(
      this.searchOptions$.subscribe(() => this.updateFilterValueList()),
      this.retrieveFilterValues().subscribe(),
    );
    this.selectedAppliedFilters$ = this.searchService
      .getSelectedValuesForFilter(this.filterConfig.name)
      .pipe(
        map((allAppliedFilters: AppliedFilter[]) =>
          allAppliedFilters.filter((appliedFilter: AppliedFilter) =>
            FACET_OPERATORS.includes(appliedFilter.operator),
          ),
        ),
        distinctUntilChanged(
          (previous: AppliedFilter[], next: AppliedFilter[]) =>
            JSON.stringify(previous) === JSON.stringify(next),
        ),
      );
  }

  updateFilterValueList() {
    this.animationState = 'loading';
    this.collapseNextUpdate = true;
    this.filter = '';
  }

  public getSearchLink(): string {
    if (this.inPlaceSearch) {
      return currentPath(this.router);
    }
    return this.searchService.getSearchLink();
  }

  public getSearchLinkParts(): string[] {
    if (this.inPlaceSearch) {
      return [];
    }
    return this.getSearchLink().split('/');
  }

  showMore() {
    this.filterService.incrementPage(this.filterConfig.name);
  }

  showFirstPageOnly() {
    this.filterService.resetPage(this.filterConfig.name);
  }

  getCurrentPage(): Observable<number> {
    return this.filterService.getPage(this.filterConfig.name);
  }

  onSubmit(data: any) {
    this.applyFilterValue(data);
  }

  onClick(data: InputSuggestion) {
    this.applyFilterValue(data.query);
  }

  hasValue(o: any): boolean {
    return hasValue(o);
  }

  ngOnDestroy(): void {
    this.subs
      .filter((sub) => hasValue(sub))
      .forEach((sub) => sub.unsubscribe());
  }

  findSuggestions(query: string): void {
    this.subs.push(
      this.searchOptions$
        .pipe(take(1))
        .subscribe((searchOptions: SearchOptions) => {
          this.filterSearchResults$ = this.filterService.findSuggestions(
            this.filterConfig,
            searchOptions,
            query,
          );
        }),
    );
  }

  protected applyFilterValue(data: string): void {
    if (data.match(new RegExp(`^.+,(equals|query|authority)$`))) {
      this.filterService.minimizeAll();
      const valueParts = data.split(',');
      this.subs.push(
        this.searchConfigService
          .selectNewAppliedFilterParams(
            this.filterConfig.name,
            valueParts.slice(0, valueParts.length - 1).join(),
            valueParts[valueParts.length - 1],
          )
          .pipe(take(1))
          .subscribe((params: Params) => {
            void this.router.navigate(this.getSearchLinkParts(), {
              queryParams: params,
            });
            this.filter = '';
            this.filterSearchResults$ = of([]);
          }),
      );
    }
  }

  protected retrieveFilterValues(): Observable<FacetValues[]> {
    return observableCombineLatest([
      this.searchOptions$,
      this.currentPage,
    ]).pipe(
      switchMap(([options, page]: [SearchOptions, number]) =>
        this.searchService
          .getFacetValuesFor(this.filterConfig, page, options)
          .pipe(
            getFirstSucceededRemoteDataPayload(),
            tap((facetValues: FacetValues) => {
              this.isLastPage$.next(hasNoValue(facetValues?.next));
              const hasLimitFacets =
                facetValues?.page?.length < facetValues?.facetLimit;
              this.isAvailableForShowSearchText.next(
                hasLimitFacets && hasNoValue(facetValues?.next),
              );
            }),
          ),
      ),
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

  trackUpdate(index, value: FacetValue) {
    return value ? value._links.search.href : undefined;
  }
}

export const facetLoad = trigger('facetLoad', [
  state('ready', style({ opacity: 1 })),
  state('loading', style({ opacity: 0 })),
  transition('loading <=> ready', animate(100)),
]);
