import {
  AsyncPipe,
  NgTemplateOutlet,
} from '@angular/common';
import {
  Component,
  Inject,
  OnInit,
} from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import {
  APP_CONFIG,
  AppConfig,
} from '@dspace/config/app-config.interface';
import { ConfigurationDataService } from '@dspace/core/data/configuration-data.service';
import { RemoteData } from '@dspace/core/data/remote-data';
import { LocaleService } from '@dspace/core/locale/locale.service';
import { ConfigurationProperty } from '@dspace/core/shared/configuration-property.model';
import { getFirstCompletedRemoteData } from '@dspace/core/shared/operators';
import { Site } from '@dspace/core/shared/site.model';
import { TranslateModule } from '@ngx-translate/core';
import {
  combineLatest,
  Observable,
} from 'rxjs';
import {
  map,
  take,
} from 'rxjs/operators';

import { SuggestionsPopupComponent } from '../notifications/suggestions/popup/suggestions-popup.component';
import { ThemedConfigurationSearchPageComponent } from '../search-page/themed-configuration-search-page.component';
import { MarkdownViewerComponent } from '../shared/markdown-viewer/markdown-viewer.component';
import { ThemedSearchFormComponent } from '../shared/search-form/themed-search-form.component';
import { HomeCoarComponent } from './home-coar/home-coar.component';
import { ThemedHomeNewsComponent } from './home-news/themed-home-news.component';
import { RecentItemListComponent } from './recent-item-list/recent-item-list.component';
import { ThemedTopLevelCommunityListComponent } from './top-level-community-list/themed-top-level-community-list.component';

@Component({
  selector: 'ds-base-home-page',
  styleUrls: ['./home-page.component.scss'],
  templateUrl: './home-page.component.html',
  imports: [
    AsyncPipe,
    HomeCoarComponent,
    MarkdownViewerComponent,
    NgTemplateOutlet,
    RecentItemListComponent,
    SuggestionsPopupComponent,
    ThemedConfigurationSearchPageComponent,
    ThemedHomeNewsComponent,
    ThemedSearchFormComponent,
    ThemedTopLevelCommunityListComponent,
    TranslateModule,
  ],
})
export class HomePageComponent implements OnInit {

  site$: Observable<Site>;
  recentSubmissionspageSize: number;
  showDiscoverFilters: boolean;
  homeHeaderMetadataValue$: Observable<string>;
  semanticSearchEnabled$: Observable<boolean>;

  constructor(
    @Inject(APP_CONFIG) protected appConfig: AppConfig,
    protected route: ActivatedRoute,
    protected configurationDataService: ConfigurationDataService,
    private locale: LocaleService,
  ) {
    this.recentSubmissionspageSize = this.appConfig.homePage.recentSubmissions.pageSize;
    this.showDiscoverFilters = this.appConfig.homePage.showDiscoverFilters;
  }

  ngOnInit(): void {
    this.site$ = this.route.data.pipe(
      map((data) => data.site as Site),
    );

    this.homeHeaderMetadataValue$ = combineLatest({
      site: this.site$,
      language: this.locale.getCurrentLanguageCode(),
    }).pipe(
      take(1),
      map(({ site, language }) => site?.firstMetadataValue('dspace.cms.home-header', { language })),
    );

    this.semanticSearchEnabled$ = this.configurationDataService.findByPropertyName('semantic.search.enabled').pipe(
      getFirstCompletedRemoteData(),
      map((response: RemoteData<ConfigurationProperty>) => this.isPropertyEnabled(response)),
    );
  }

  private isPropertyEnabled(property: RemoteData<ConfigurationProperty>): boolean {
    return property.hasSucceeded && property.payload.values.length > 0 && property.payload.values[0] === 'true';
  }

}
