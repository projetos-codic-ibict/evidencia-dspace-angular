import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { BehaviorSubject, combineLatest, forkJoin, of } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';

import { followLink } from '@dspace/core/shared/follow-link-config.model';
import { Item } from '@dspace/core/shared/item.model';
import { AuthService } from '@dspace/core/auth/auth.service';
import { ViewMode } from '@dspace/core/shared/view-mode.model';
import { ListableObjectComponentLoaderComponent } from '../../../../app/shared/object-collection/shared/listable-object/listable-object-component-loader.component';
import { ItemDataService } from '../../../../app/core/data/item-data.service';
import { getFirstCompletedRemoteData } from '../../../../app/core/shared/operators';
import { FavoriteService } from './favorite.service';
import { ItemSearchResult } from '@dspace/core/shared/object-collection/item-search-result.model';
@Component({
  selector: 'ds-favorite-items',
  standalone: true,
  imports: [
    CommonModule,
    TranslateModule,
    ListableObjectComponentLoaderComponent,

  ],
  templateUrl: './favorite-items.component.html',
  styleUrls: ['./favorite-items.component.scss']
})
export class FavoriteItemsComponent implements OnInit {
  private favoriteService = inject(FavoriteService);
  private itemService = inject(ItemDataService);
  public authService = inject(AuthService);

  isLoading$ = new BehaviorSubject<boolean>(true);
  viewMode = ViewMode.ListElement;

  private loadedItems$ = new BehaviorSubject<ItemSearchResult[]>([]);

  /**
   * Lista carregada filtrada pelo cache de favoritos: desmarcar a estrela num card
   * tira o card da tela na hora.
   */
  favoriteItems$ = combineLatest([this.loadedItems$, this.favoriteService.favoriteIds$]).pipe(
    map(([items, ids]) => (ids ? items.filter((item) => ids.has(item.indexableObject.uuid)) : items)),
  );

  ngOnInit(): void {
    this.loadFavorites();
  }

  loadFavorites(): void {
    this.isLoading$.next(true);
    this.favoriteService.getFavoriteIds().pipe(
      // Itens vêm do ItemDataService (e não do JSON cru) para chegarem com os links HAL,
      // que o card usa para miniatura e PDF. Item que falhar ao carregar é omitido.
      switchMap((ids) => ids.length === 0 ? of([]) : forkJoin(ids.map((id) =>
        this.itemService.findById(id, true, true, followLink('thumbnail')).pipe(
          getFirstCompletedRemoteData(),
          map((remoteData) => (remoteData.hasSucceeded ? remoteData.payload : null)),
        ),
      ))),
    ).subscribe({
      next: (items) => {
        this.loadedItems$.next(items
          .filter((item): item is Item => item !== null)
          .map((item) => {
            const result = new ItemSearchResult();
            result.indexableObject = item;
            return result;
          }));
        this.isLoading$.next(false);
      },
      error: () => {
        this.loadedItems$.next([]);
        this.isLoading$.next(false);
      },
    });
  }
}
