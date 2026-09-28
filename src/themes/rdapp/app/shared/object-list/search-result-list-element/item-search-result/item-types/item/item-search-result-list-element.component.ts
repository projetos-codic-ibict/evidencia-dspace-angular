import { AsyncPipe, NgClass } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Observable, of, BehaviorSubject } from 'rxjs';
import { catchError, map, take } from 'rxjs/operators';
import { TranslateModule } from '@ngx-translate/core';

import { getBitstreamDownloadRoute } from '@dspace/core/router/utils/dso-route.utils';
import { BitstreamDataService } from '../../../../../../../../../app/core/data/bitstream-data.service';
import { Bitstream } from '../../../../../../../../../app/core/shared/bitstream.model';
import { getFirstSucceededRemoteListPayload } from '../../../../../../../../../app/core/shared/operators';
import { Context } from '../../../../../../../../../app/core/shared/context.model';
import { ViewMode } from '../../../../../../../../../app/core/shared/view-mode.model';
import { ItemSearchResult } from '@dspace/core/shared/object-collection/item-search-result.model';
import { listableObjectComponent } from '../../../../../../../../../app/shared/object-collection/shared/listable-object/listable-object.decorator';
import { TruncatableComponent } from '../../../../../../../../../app/shared/truncatable/truncatable.component';
import { TruncatablePartComponent } from '../../../../../../../../../app/shared/truncatable/truncatable-part/truncatable-part.component';
import { ThemedThumbnailComponent } from '../../../../../../../../../app/thumbnail/themed-thumbnail.component';
import { DocumentMoreResultsComponent } from '../../../../../../item-page/simple/document-more-results/document-more-results.component';
import { ItemSearchResultListElementComponent as BaseComponent } from '../../../../../../../../../app/shared/object-list/search-result-list-element/item-search-result/item-types/item/item-search-result-list-element.component';
import { AuthService } from '../../../../../../../../../app/core/auth/auth.service';

import { FavoriteService } from '../../../../../../favorite-items/favorite.service';

@listableObjectComponent(
  'PublicationSearchResult',
  ViewMode.ListElement,
  Context.Any,
  'rdapp',
)
@listableObjectComponent(
  ItemSearchResult,
  ViewMode.ListElement,
  Context.Any,
  'rdapp',
)
@Component({
  selector: 'ds-item-search-result-list-element',
  templateUrl: './item-search-result-list-element.component.html',
  styleUrls: ['./item-search-result-list-element.component.scss'],
  imports: [
    AsyncPipe,
    DocumentMoreResultsComponent,
    NgClass,
    RouterLink,
    ThemedThumbnailComponent,
    TranslateModule,
    TruncatableComponent,
    TruncatablePartComponent,
  ],
})
export class ItemSearchResultListElementComponent
  extends BaseComponent
  implements OnInit
{
  pdfDownloadRoute$: Observable<string | null>;
  odsExpanded = false;

  isAuthenticated$: Observable<boolean>;
  isFavorite$ = new BehaviorSubject<boolean>(false);

  private bitstreamDataService = inject(BitstreamDataService);
  private authService = inject(AuthService);
  private favoriteService = inject(FavoriteService);
  selected$ = new BehaviorSubject<boolean>(false);

  override ngOnInit(): void {
    super.ngOnInit();
    this.pdfDownloadRoute$ = this.resolvePdfDownloadRoute();

    this.isAuthenticated$ = this.authService.isAuthenticated();

    this.isAuthenticated$.subscribe((isAuth) => {
      if (isAuth && this.dso?.id) {
        this.favoriteService.checkIsFavorite(this.dso.id).subscribe({
          next: (isFav) => this.isFavorite$.next(isFav),
          error: (err) => console.error('Erro ao checar favorito', err),
        });
      }
    });
  }

  toggleSelection() {
    const estadoAtual = this.selected$.getValue();
    this.selected$.next(!estadoAtual);
  }

  toggleFavorite(event: Event) {
    event.preventDefault();
    event.stopPropagation();

    if (!this.dso?.id) return;

    const itemId = this.dso.id;
    const currentState = this.isFavorite$.getValue();

    this.isFavorite$.next(!currentState);

    if (!currentState) {
      this.favoriteService.addFavorite(itemId).subscribe({
        error: (err) => {
          console.error('Erro ao favoritar', err);
          this.isFavorite$.next(false);
        },
      });
    } else {
      this.favoriteService.removeFavorite(itemId).subscribe({
        error: (err) => {
          console.error('Erro ao remover favorito', err);
          this.isFavorite$.next(true);
        },
      });
    }
  }

  get odsAll(): string[] {
    return this.dso?.allMetadataValues('local.ods') ?? [];
  }

  toggleOdsExpanded(): void {
    this.odsExpanded = !this.odsExpanded;
  }

  getOdsNumber(ods: string): string {
    return ods?.match(/^(\d+)/)?.[1] ?? '';
  }

  getOdsLabel(ods: string): string {
    return ods?.replace(/^\d+\s*-\s*/, '').trim() ?? ods;
  }

  getOdsBg(ods: string): string {
    if (!ods) {
      return '#6c757d';
    }
    const clean = ods
      .replace(/^\d+\s*-\s*/, '')
      .toLowerCase()
      .trim();
    let hash = 0;
    for (let i = 0; i < clean.length; i++) {
      hash = clean.charCodeAt(i) + ((hash << 5) - hash);
    }
    return `hsl(${Math.abs(hash) % 360}, 70%, 40%)`;
  }

  private resolvePdfDownloadRoute(): Observable<string | null> {
    return this.bitstreamDataService
      .findAllByItemAndBundleName(this.dso, 'ORIGINAL', { elementsPerPage: 10 })
      .pipe(
        getFirstSucceededRemoteListPayload(),
        map((bitstreams: Bitstream[]) => {
          const pdf = (bitstreams ?? []).find((b) =>
            b?.name?.toLowerCase().endsWith('.pdf'),
          );
          return pdf ? getBitstreamDownloadRoute(pdf) : null;
        }),
        catchError(() => of(null)),
      );
  }
}
