import {
  Component,
} from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';

import { ThemedSearchFiltersComponent } from '../../../../../../app/shared/search/search-filters/themed-search-filters.component';
import { SearchSwitchConfigurationComponent } from '../../../../../../app/shared/search/search-switch-configuration/search-switch-configuration.component';
import { SearchSidebarComponent as BaseComponent } from '../../../../../../app/shared/search/search-sidebar/search-sidebar.component';

/**
 * Sidebar da busca sem a busca avançada e sem as configurações de ordenação, que no tema
 * ficam acima dos resultados (análise do MVP, 4.2.1 e 4.2.2).
 */
@Component({
  selector: 'ds-themed-search-sidebar',
  styleUrls: ['../../../../../../app/shared/search/search-sidebar/search-sidebar.component.scss'],
  templateUrl: './search-sidebar.component.html',
  imports: [
    SearchSwitchConfigurationComponent,
    ThemedSearchFiltersComponent,
    TranslateModule,
  ],
})
export class SearchSidebarComponent extends BaseComponent {}
