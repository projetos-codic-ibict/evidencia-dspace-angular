import { AsyncPipe } from '@angular/common';
import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';

import { ShortNumberPipe } from '../../../../../../../../../app/shared/utils/short-number.pipe';
import { SearchFacetOptionComponent as BaseComponent } from '../../../../../../../../../app/shared/search/search-filters/search-filter/search-facet-filter-options/search-facet-option/search-facet-option.component';

/**
 * Opção de faceta que não recolhe os filtros abertos ao ser clicada, conforme a análise do MVP (4.2.1).
 * Não há wrapper themed para este componente: os filtros do tema (texto e hierarquia) o usam direto.
 */
@Component({
  selector: 'ds-rdapp-search-facet-option',
  styleUrls: ['../../../../../../../../../app/shared/search/search-filters/search-filter/search-facet-filter-options/search-facet-option/search-facet-option.component.scss'],
  templateUrl: './search-facet-option.component.html',
  imports: [
    AsyncPipe,
    RouterLink,
    ShortNumberPipe,
    TranslateModule,
  ],
})
export class RdappSearchFacetOptionComponent extends BaseComponent {}
