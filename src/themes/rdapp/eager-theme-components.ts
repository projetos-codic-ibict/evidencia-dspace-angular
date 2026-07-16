/* eslint-disable dspace-angular-ts/themed-component-usages */
import {
  Component,
  Type,
} from '@angular/core';

import { FilterType } from '../../app/core/shared/search/models/filter-type.model';
import { renderFacetFor } from '../../app/shared/search/search-filters/search-filter/search-filter-type-decorator';
import {
  DEFAULT_LABEL_OPERATOR,
  LABEL_DECORATOR_MAP,
} from '../../app/shared/search/search-labels/search-label-loader/search-label-loader.decorator';
import { BreadcrumbsComponent } from './app/breadcrumbs/breadcrumbs.component';
import { CommunityListComponent } from './app/community-list-page/community-list/community-list.component';
import { CommunityListPageComponent } from './app/community-list-page/community-list-page.component';
import { FileSectionComponent } from './app/item-page/simple/field-components/file-section/file-section.component';
import { RelatedPublicationsComponent } from './app/item-page/simple/related-publications/related-publications.component';
import { FooterComponent } from './app/footer/footer.component';
import { HeaderComponent } from './app/header/header.component';
import { HeaderNavbarWrapperComponent } from './app/header-nav-wrapper/header-navbar-wrapper.component';
import { HomeNewsComponent } from './app/home-page/home-news/home-news.component';
import { HomePageComponent } from './app/home-page/home-page.component';
import { NavbarComponent } from './app/navbar/navbar.component';
import { PaginationComponent } from './app/shared/pagination/pagination.component';
import { RootComponent } from './app/root/root.component';
import { ScrollToTopComponent } from './app/shared/scroll-to-top/scroll-to-top.component';
import { SearchComponent } from './app/shared/search/search.component';
import { RdappSearchTextFilterComponent } from './app/shared/search/search-filters/search-filter/search-text-filter/search-text-filter.component';
import { SearchFiltersComponent } from './app/shared/search/search-filters/search-filters.component';
import { RdappSearchLabelComponent } from './app/shared/search/search-labels/search-label/search-label.component';
import { RdappSearchLabelRangeComponent } from './app/shared/search/search-labels/search-label-range/search-label-range.component';
import { SearchResultsComponent } from './app/shared/search/search-results/search-results.component';
import { SearchSettingsComponent } from './app/shared/search/search-settings/search-settings.component';

// Registra o override rdapp no mapa de tipos de filtro (substitui SearchTextFilterComponent base)
renderFacetFor(FilterType.text)(RdappSearchTextFilterComponent);

// Registra os chips de filtro aplicado (rdapp) no mapa de labels, por tipo de operador
LABEL_DECORATOR_MAP.get(DEFAULT_LABEL_OPERATOR).set('rdapp', RdappSearchLabelComponent as Type<Component>);
LABEL_DECORATOR_MAP.get('range').set('rdapp', RdappSearchLabelRangeComponent as Type<Component>);

export const COMPONENTS = [
  BreadcrumbsComponent,
  RelatedPublicationsComponent,
  FileSectionComponent,
  FooterComponent,
  HomePageComponent,
  HomeNewsComponent,
  HeaderComponent,
  HeaderNavbarWrapperComponent,
  NavbarComponent,
  PaginationComponent,
  RootComponent,
  CommunityListPageComponent,
  CommunityListComponent,
  ScrollToTopComponent,
  SearchComponent,
  SearchResultsComponent,
  SearchFiltersComponent,
  SearchSettingsComponent,
  RdappSearchTextFilterComponent,
  RdappSearchLabelComponent,
  RdappSearchLabelRangeComponent,
];
