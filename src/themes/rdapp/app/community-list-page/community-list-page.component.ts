import { AsyncPipe } from '@angular/common';
import {
  Component,
  OnInit,
} from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { ThemedCommunityListComponent } from '../../../../app/community-list-page/community-list/themed-community-list.component';
import { CommunityListPageComponent as BaseCommunityListPageComponent } from '../../../../app/community-list-page/community-list-page.component';
import { CommunityDataService } from '../../../../app/core/data/community-data.service';
import { getFirstSucceededRemoteDataPayload } from '../../../../app/core/shared/operators';

@Component({
  selector: 'ds-themed-community-list-page',
  templateUrl: './community-list-page.component.html',
  styleUrls: ['./community-list-page.component.scss'],
  imports: [
    AsyncPipe,
    ThemedCommunityListComponent,
    TranslateModule,
  ],
})
export class CommunityListPageComponent extends BaseCommunityListPageComponent implements OnInit {

  /** Total de comunidades de topo, exibido no contador do cabeçalho */
  communityCount$: Observable<number>;

  constructor(protected communityDataService: CommunityDataService) {
    super();
  }

  ngOnInit(): void {
    this.communityCount$ = this.communityDataService.findTop({ elementsPerPage: 1 }).pipe(
      getFirstSucceededRemoteDataPayload(),
      map((list) => list.totalElements),
    );
  }
}
