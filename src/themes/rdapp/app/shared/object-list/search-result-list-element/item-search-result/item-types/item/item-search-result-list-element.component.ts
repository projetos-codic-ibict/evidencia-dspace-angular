import {
  AsyncPipe,
  NgClass,
} from '@angular/common';
import {
  Component,
  inject,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { Observable, of } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

import { getBitstreamDownloadRoute } from '@dspace/core/router/utils/dso-route.utils';
import { BitstreamDataService } from '../../../../../../../../../app/core/data/bitstream-data.service';
import { Bitstream } from '../../../../../../../../../app/core/shared/bitstream.model';
import { getFirstSucceededRemoteListPayload } from '../../../../../../../../../app/core/shared/operators';
import { Context } from '../../../../../../../../../app/core/shared/context.model';
import { ViewMode } from '../../../../../../../../../app/core/shared/view-mode.model';
import { ItemSearchResult } from '@dspace/core/shared/object-collection/item-search-result.model';
import { NotificationsService } from '@dspace/core/notification-system/notifications.service';
import { AuthService } from '../../../../../../../../../app/core/auth/auth.service';
import { FavoriteService } from '../../../../../../favorite-items/favorite.service';
import { listableObjectComponent } from '../../../../../../../../../app/shared/object-collection/shared/listable-object/listable-object.decorator';
import { TruncatableComponent } from '../../../../../../../../../app/shared/truncatable/truncatable.component';
import { TruncatablePartComponent } from '../../../../../../../../../app/shared/truncatable/truncatable-part/truncatable-part.component';
import { ThemedThumbnailComponent } from '../../../../../../../../../app/thumbnail/themed-thumbnail.component';
import { DocumentMoreResultsComponent } from '../../../../../../item-page/simple/document-more-results/document-more-results.component';
import { ItemSearchResultListElementComponent as BaseComponent } from '../../../../../../../../../app/shared/object-list/search-result-list-element/item-search-result/item-types/item/item-search-result-list-element.component';
import { BehaviorSubject } from 'rxjs';
import { ActivatedRoute } from '@angular/router';

@listableObjectComponent('PublicationSearchResult', ViewMode.ListElement, Context.Any, 'rdapp')
@listableObjectComponent(ItemSearchResult, ViewMode.ListElement, Context.Any, 'rdapp')
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
export class ItemSearchResultListElementComponent extends BaseComponent {

  pdfDownloadRoute$: Observable<string | null>;

  isAuthenticated$: Observable<boolean>;
  isFavorite$: Observable<boolean>;

  private bitstreamDataService = inject(BitstreamDataService);
  private authService = inject(AuthService);
  private favoriteService = inject(FavoriteService);
  private notificationsService = inject(NotificationsService);
  private translateService = inject(TranslateService);

  selected$ = new BehaviorSubject<boolean>(false);

  toggleSelection() {
    const estadoAtual = this.selected$.getValue();
    this.selected$.next(!estadoAtual);
  }

  toggleFavorite(event: Event, isFavorite: boolean): void {
    event.preventDefault();
    event.stopPropagation();

    if (!this.dso?.id) {
      return;
    }

    // O serviço atualiza o cache na hora e desfaz sozinho se a requisição falhar
    this.favoriteService.setFavorite(this.dso.id, !isFavorite).subscribe({
      error: () => this.notificationsService.error(this.translateService.instant('evidencia.favorites.error')),
    });
  }

  /** Ícones dos ODS do item (até 4), na ordem em que estão no metadado. Valores sem número 1 a 17 são ignorados. */
  get odsIcons(): { number: number; label: string; src: string }[] {
    const values: string[] = this.dso?.allMetadataValues('local.ods') ?? [];
    return values
      .map((ods) => ({ number: Number(this.getOdsNumber(ods)), label: ods }))
      .filter((ods) => ods.number >= 1 && ods.number <= 17)
      .slice(0, 4)
      .map((ods) => ({
        ...ods,
        src: `assets/rdapp/images/ods/ods-${String(ods.number).padStart(2, '0')}.svg`,
      }));
  }

  override ngOnInit(): void {
    super.ngOnInit();
    this.pdfDownloadRoute$ = this.resolvePdfDownloadRoute();

    this.isAuthenticated$ = this.authService.isAuthenticated();
    this.isFavorite$ = this.isAuthenticated$.pipe(
      switchMap((isAuth) => isAuth && this.dso?.id ? this.favoriteService.isFavorite(this.dso.id) : of(false)),
    );
  }

  getOdsNumber(ods: string): string {
    return ods?.match(/^(\d+)/)?.[1] ?? '';
  }

  private resolvePdfDownloadRoute(): Observable<string | null> {
    return this.bitstreamDataService.findAllByItemAndBundleName(
      this.dso,
      'ORIGINAL',
      { elementsPerPage: 10 },
    ).pipe(
      getFirstSucceededRemoteListPayload(),
      map((bitstreams: Bitstream[]) => {
        const pdf = (bitstreams ?? []).find(
          (b) => b?.name?.toLowerCase().endsWith('.pdf'),
        );
        return pdf ? getBitstreamDownloadRoute(pdf) : null;
      }),
      catchError(() => of(null)),
    );
  }
}
