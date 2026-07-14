import { AsyncPipe } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';

import { FilterInputSuggestionsComponent } from '../../../../../../../../app/shared/input-suggestions/filter-suggestions/filter-input-suggestions.component';
import { facetLoad } from '../../../../../../../../app/shared/search/search-filters/search-filter/search-facet-filter/search-facet-filter.component';
import { SearchFacetSelectedOptionComponent } from '../../../../../../../../app/shared/search/search-filters/search-filter/search-facet-filter-options/search-facet-selected-option/search-facet-selected-option.component';
import { SearchFacetOptionComponent } from '../../../../../../../../app/shared/search/search-filters/search-filter/search-facet-filter-options/search-facet-option/search-facet-option.component';
import { SearchTextFilterComponent as BaseComponent } from '../../../../../../../../app/shared/search/search-filters/search-filter/search-text-filter/search-text-filter.component';

@Component({
  selector: 'ds-search-text-filter',
  templateUrl: './search-text-filter.component.html',
  animations: [facetLoad],
  imports: [
    AsyncPipe,
    FilterInputSuggestionsComponent,
    FormsModule,
    SearchFacetOptionComponent,
    SearchFacetSelectedOptionComponent,
    TranslateModule,
  ],
})
export class RdappSearchTextFilterComponent extends BaseComponent implements OnInit {}
