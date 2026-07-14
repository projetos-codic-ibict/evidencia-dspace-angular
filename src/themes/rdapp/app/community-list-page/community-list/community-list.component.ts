import { CdkTreeModule } from '@angular/cdk/tree';
import { AsyncPipe } from '@angular/common';
import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import {
  EMPTY,
  Observable,
} from 'rxjs';
import {
  filter,
  map,
  shareReplay,
} from 'rxjs/operators';

import { CommunityListComponent as BaseCommunityListComponent } from '../../../../../app/community-list-page/community-list/community-list.component';
import { CommunityListService } from '../../../../../app/community-list-page/community-list-service';
import { FlatNode } from '../../../../../app/community-list-page/flat-node.model';
import { DSONameService } from '../../../../../app/core/breadcrumbs/dso-name.service';
import { CollectionDataService } from '../../../../../app/core/data/collection-data.service';
import { Community } from '../../../../../app/core/shared/community.model';
import { getFirstSucceededRemoteDataPayload } from '../../../../../app/core/shared/operators';
import { ThemedLoadingComponent } from '../../../../../app/shared/loading/themed-loading.component';

@Component({
  selector: 'ds-themed-community-list',
  templateUrl: './community-list.component.html',
  styleUrls: ['./community-list.component.scss'],
  imports: [
    AsyncPipe,
    CdkTreeModule,
    RouterLink,
    ThemedLoadingComponent,
    TranslateModule,
  ],
})
export class CommunityListComponent extends BaseCommunityListComponent {

  /** Cache de contadores de coleções por comunidade (UUID → total), evita refazer a request a cada change detection. */
  private collectionCountCache = new Map<string, Observable<number>>();

  /** Garante que o auto-expand das comunidades raiz só roda uma vez (não reabre o que o usuário fechou). */
  private autoExpanded = false;

  constructor(
    protected communityListService: CommunityListService,
    public dsoNameService: DSONameService,
    protected collectionDataService: CollectionDataService,
  ) {
    super(communityListService, dsoNameService);
  }

  override ngOnInit() {
    // carrega todas as coleções/comunidades de uma vez (sem "ver mais"),
    // permitindo o card já aberto como na referência
    this.paginationConfig.elementsPerPage = 50;
    super.ngOnInit();

    // auto-expande comunidades de nível raiz uma única vez, ancorado na lista real de
    // nós (não na corrida do loading$). Depois disso o usuário pode fechar/abrir à vontade.
    this.dataSource.connect({ viewChange: EMPTY }).pipe(
      filter((nodes: FlatNode[]) => nodes.length > 0),
    ).subscribe((nodes: FlatNode[]) => {
      if (this.autoExpanded) {
        return;
      }
      const roots = nodes.filter(n => n.level === 0 && !n.isShowMoreNode);
      if (roots.length === 0) {
        return;
      }
      this.autoExpanded = true;
      roots.filter(n => !n.isExpanded).forEach(node => this.toggleExpanded(node));
    });
  }

  /**
   * Total de coleções diretas de uma comunidade, lido do `totalElements` da resposta
   * paginada da API — mesma lógica do contador de resultados da tela de busca.
   * Independe de quantos nós já foram carregados na árvore. Cacheado por UUID.
   */
  collectionCount$(node: FlatNode): Observable<number> {
    const uuid = (node.payload as Community).uuid ?? node.id;
    if (!this.collectionCountCache.has(uuid)) {
      this.collectionCountCache.set(
        uuid,
        this.collectionDataService.findByParent(uuid, { elementsPerPage: 1 }).pipe(
          getFirstSucceededRemoteDataPayload(),
          map((list) => list?.totalElements ?? 0),
          shareReplay({ bufferSize: 1, refCount: false }),
        ),
      );
    }
    return this.collectionCountCache.get(uuid);
  }
}
