import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';

import { FilterType } from '../../app/core/shared/search/models/filter-type.model';
import { RootModule } from '../../app/root.module';
import { renderFacetFor } from '../../app/shared/search/search-filters/search-filter/search-filter-type-decorator';
import { GroupsRegistryComponent } from './app/access-control/group-registry/groups-registry.component';
import { BreadcrumbsComponent } from './app/breadcrumbs/breadcrumbs.component';
import { CommunityListComponent } from './app/community-list-page/community-list/community-list.component';
import { CommunityListPageComponent } from './app/community-list-page/community-list-page.component';
import { FooterComponent } from './app/footer/footer.component';
import { HeaderComponent } from './app/header/header.component';
import { HeaderNavbarWrapperComponent } from './app/header-nav-wrapper/header-navbar-wrapper.component';
import { HomeNewsComponent } from './app/home-page/home-news/home-news.component';
import { HomePageComponent } from './app/home-page/home-page.component';
import { FileSectionComponent } from './app/item-page/simple/field-components/file-section/file-section.component';
import { PublicationComponent } from './app/item-page/simple/item-types/publication/publication.component';
import { UntypedItemComponent } from './app/item-page/simple/item-types/untyped-item/untyped-item.component';
import { RelatedPublicationsComponent } from './app/item-page/simple/related-publications/related-publications.component';
import { NavbarComponent } from './app/navbar/navbar.component';
import { RootComponent } from './app/root/root.component';
import { ItemSearchResultListElementComponent } from './app/shared/object-list/search-result-list-element/item-search-result/item-types/item/item-search-result-list-element.component';
import { PaginationComponent } from './app/shared/pagination/pagination.component';
import { ScrollToTopComponent } from './app/shared/scroll-to-top/scroll-to-top.component';
import { SearchComponent } from './app/shared/search/search.component';
import { RdappSearchHierarchyFilterComponent } from './app/shared/search/search-filters/search-filter/search-hierarchy-filter/search-hierarchy-filter.component';
import { RdappSearchTextFilterComponent } from './app/shared/search/search-filters/search-filter/search-text-filter/search-text-filter.component';
import { SearchFiltersComponent } from './app/shared/search/search-filters/search-filters.component';
import { SearchResultsComponent } from './app/shared/search/search-results/search-results.component';
import { SearchSettingsComponent } from './app/shared/search/search-settings/search-settings.component';

// Registra os overrides rdapp no mapa de tipos de filtro (substituem os componentes base)
renderFacetFor(FilterType.text)(RdappSearchTextFilterComponent);
renderFacetFor(FilterType.hierarchy)(RdappSearchHierarchyFilterComponent);

/**
 * Add components that use a custom decorator to ENTRY_COMPONENTS as well as DECLARATIONS.
 * This will ensure that decorator gets picked up when the app loads
 */
const ENTRY_COMPONENTS = [
  ItemSearchResultListElementComponent,
  PublicationComponent,
  UntypedItemComponent,
];

const DECLARATIONS = [
  ...ENTRY_COMPONENTS,
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
  GroupsRegistryComponent,
  ScrollToTopComponent,
  SearchComponent,
  SearchResultsComponent,
  SearchFiltersComponent,
  SearchSettingsComponent,
  RdappSearchTextFilterComponent,
  RdappSearchHierarchyFilterComponent,
];

@NgModule({
  imports: [
    CommonModule,
    RootModule,
    ...DECLARATIONS,
  ],
  providers: [
    ...ENTRY_COMPONENTS.map((component) => ({ provide: component })),
  ],
})
/**
 * This module is included in the main bundle that gets downloaded at first page load. So it should
 * contain only the themed components that have to be available immediately for the first page load,
 * and the minimal set of imports required to make them work. Anything you can cut from it will make
 * the initial page load faster, but may cause the page to flicker as components that were already
 * rendered server side need to be lazy-loaded again client side
 *
 * Themed EntryComponents should also be added here
 */
export class EagerThemeModule {
}
