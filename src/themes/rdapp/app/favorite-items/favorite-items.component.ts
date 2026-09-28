import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { Observable, BehaviorSubject } from 'rxjs';

import { Item } from '@dspace/core/shared/item.model';
import { AuthService } from '@dspace/core/auth/auth.service';
import { ViewMode } from '@dspace/core/shared/view-mode.model';
import { ListableObjectComponentLoaderComponent } from '../../../../app/shared/object-collection/shared/listable-object/listable-object-component-loader.component';
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
  public authService = inject(AuthService);

favoriteItems$ = new BehaviorSubject<any[] | null>(null);  isLoading$ = new BehaviorSubject<boolean>(true);
  viewMode = ViewMode.ListElement;

  ngOnInit(): void {
    this.loadFavorites();
  }

 loadFavorites(): void {
    this.isLoading$.next(true);
    this.favoriteService.getUserFavorites().subscribe({
      next: (itemsJSON: any[]) => {
        // Envelopando o JSON cru nas instâncias corretas que o DSpace espera
        const hydatedItems = itemsJSON.map(itemJson => {
            const result = new ItemSearchResult();
            // A tag listable-object procura pelas propriedades "indexableObject" ou "dso"
            result.indexableObject = Object.assign(new Item(), itemJson);
            return result;
        });

        this.favoriteItems$.next(hydatedItems);
        this.isLoading$.next(false);
      },
      error: (err) => {
        console.error('Erro ao carregar favoritos:', err);
        this.favoriteItems$.next([]);
        this.isLoading$.next(false);
      }
    });
  }
}