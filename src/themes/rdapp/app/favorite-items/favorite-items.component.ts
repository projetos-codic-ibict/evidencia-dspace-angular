import { AsyncPipe } from '@angular/common';
import {
  Component,
  DestroyRef,
  OnInit,
  inject,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TranslateModule } from '@ngx-translate/core';
import {
  BehaviorSubject,
  combineLatest,
  from,
} from 'rxjs';
import {
  map,
  mergeMap,
  switchMap,
  toArray,
} from 'rxjs/operators';

import { followLink } from '@dspace/core/shared/follow-link-config.model';
import { Item } from '@dspace/core/shared/item.model';
import { ItemSearchResult } from '@dspace/core/shared/object-collection/item-search-result.model';
import { ViewMode } from '@dspace/core/shared/view-mode.model';

import { ItemDataService } from '../../../../app/core/data/item-data.service';
import { getFirstCompletedRemoteData } from '../../../../app/core/shared/operators';
import { ListableObjectComponentLoaderComponent } from '../../../../app/shared/object-collection/shared/listable-object/listable-object-component-loader.component';
import { FavoriteService } from './favorite.service';

/** Quantos itens carregar ao mesmo tempo, para não abrir uma requisição por favorito de uma vez. */
const LOAD_CONCURRENCY = 5;

@Component({
  selector: 'ds-favorite-items',
  imports: [
    AsyncPipe,
    TranslateModule,
    ListableObjectComponentLoaderComponent,
  ],
  templateUrl: './favorite-items.component.html',
  styleUrls: ['./favorite-items.component.scss'],
})
export class FavoriteItemsComponent implements OnInit {
  private favoriteService = inject(FavoriteService);
  private itemService = inject(ItemDataService);
  private destroyRef = inject(DestroyRef);

  isLoading$ = new BehaviorSubject<boolean>(true);
  hasError$ = new BehaviorSubject<boolean>(false);
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
    this.hasError$.next(false);
    this.favoriteService.getFavoriteIds().pipe(
      // Itens vêm do ItemDataService (e não do JSON cru) para chegarem com os links HAL,
      // que o card usa para miniatura e PDF. Item que falhar ao carregar é omitido.
      switchMap((ids) => from(ids.map((id, index) => ({ id, index }))).pipe(
        mergeMap(({ id, index }) => this.itemService.findById(id, true, true, followLink('thumbnail')).pipe(
          getFirstCompletedRemoteData(),
          map((remoteData) => ({ index, item: remoteData.hasSucceeded ? remoteData.payload : null })),
        ), LOAD_CONCURRENCY),
        toArray(),
        // As respostas chegam fora de ordem; volta para a ordem do backend (mais recente primeiro)
        map((loaded) => loaded.sort((a, b) => a.index - b.index).map(({ item }) => item)),
      )),
      takeUntilDestroyed(this.destroyRef),
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
        // Falha ao buscar os IDs não é "sem favoritos": a tela mostra o erro, não o estado vazio
        this.loadedItems$.next([]);
        this.hasError$.next(true);
        this.isLoading$.next(false);
      },
    });
  }
}
