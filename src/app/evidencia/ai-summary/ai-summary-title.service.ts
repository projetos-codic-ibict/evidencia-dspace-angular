import {
  inject,
  Injectable,
} from '@angular/core';
import {
  Observable,
  of,
} from 'rxjs';
import {
  catchError,
  map,
  shareReplay,
} from 'rxjs/operators';

import {
  getFirstCompletedRemoteData,
  Item,
  ItemDataService,
  RemoteData,
} from './host';

/**
 * Título da publicação de uma fonte da síntese.
 *
 * A API não devolve título de metadado, só o `document_id` do pipeline (ex.:
 * `despesas-educacao-irpf-relatorio-de-avaliacao`), que é nome de arquivo e não
 * de publicação. Ela devolve o UUID do item, então o `dc.title` vem do DSpace.
 */
@Injectable({ providedIn: 'root' })
export class AiSummaryTitleService {

  private readonly itemService = inject(ItemDataService);

  /**
   * O mesmo documento aparece em várias sínteses da mesma busca (troca de modo,
   * F5). Guarda o observable por UUID enquanto a sessão dura — título de item
   * publicado não muda no meio de uma busca.
   */
  private readonly titles = new Map<string, Observable<string>>();

  /** `dc.title` do item; `''` quando não há (item removido, sem acesso, rede fora). */
  title(uuid: string): Observable<string> {
    const cached = this.titles.get(uuid);
    if (cached !== undefined) {
      return cached;
    }

    const title$ = this.itemService.findById(uuid).pipe(
      getFirstCompletedRemoteData(),
      map((itemRd: RemoteData<Item>) => itemRd.hasSucceeded
        ? itemRd.payload?.firstMetadataValue('dc.title') ?? ''
        : ''),
      catchError(() => of('')),
      shareReplay({ bufferSize: 1, refCount: false }),
    );

    this.titles.set(uuid, title$);
    return title$;
  }
}
