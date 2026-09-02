import { Injectable } from '@angular/core';
import { RemoteDataBuildService } from '@dspace/core/cache/builders/remote-data-build.service';
import { RequestParam } from '@dspace/core/cache/models/request-param.model';
import { ObjectCacheService } from '@dspace/core/cache/object-cache.service';
import { SearchDataImpl } from '@dspace/core/data/base/search-data';
import { DefaultChangeAnalyzer } from '@dspace/core/data/default-change-analyzer.service';
import { FindListOptions } from '@dspace/core/data/find-list-options.model';
import { PaginatedList } from '@dspace/core/data/paginated-list.model';
import { RemoteData } from '@dspace/core/data/remote-data';
import { RequestService } from '@dspace/core/data/request.service';
import { EPersonDataService } from '@dspace/core/eperson/eperson-data.service';
import { GroupDataService } from '@dspace/core/eperson/group-data.service';
import { NotificationsService } from '@dspace/core/notification-system/notifications.service';
import { ResourcePolicy } from '@dspace/core/resource-policy/models/resource-policy.model';
import { ResourcePolicyDataService } from '@dspace/core/resource-policy/resource-policy-data.service';
import { FollowLinkConfig } from '@dspace/core/shared/follow-link-config.model';
import { HALEndpointService } from '@dspace/core/shared/hal-endpoint.service';
import { isNotEmpty } from '@dspace/shared/utils/empty.util';
import { Observable } from 'rxjs';

/**
 * Estende {@link ResourcePolicyDataService} só pra expor paginação real em searchByGroup().
 *
 * O método base não aceita FindListOptions, sempre usa o tamanho de página padrão do
 * SearchDataImpl interno, que é `private` na classe base (não dá pra repassar currentPage/
 * elementsPerPage sem reconstruir esse componente aqui). Os campos que o SearchDataImpl
 * precisa (linkPath, requestService, rdbService, objectCache, halService, responseMsToLive)
 * são `protected` em BaseDataService, herdados sem precisar tocar em nenhum arquivo base.
 *
 * Usado pelo CA08 (tela de governança, lista paginada de verdade) e pelo CA01c (contagem de
 * permissões por grupo na listagem, via elementsPerPage: 1 pra pegar só o pageInfo.totalElements
 * sem baixar a página inteira de políticas).
 */
@Injectable({ providedIn: 'root' })
export class GroupResourcePolicyDataService extends ResourcePolicyDataService {

  private groupSearchData: SearchDataImpl<ResourcePolicy>;

  constructor(
    protected requestService: RequestService,
    protected rdbService: RemoteDataBuildService,
    protected objectCache: ObjectCacheService,
    protected halService: HALEndpointService,
    protected notificationsService: NotificationsService,
    protected comparator: DefaultChangeAnalyzer<ResourcePolicy>,
    protected ePersonService: EPersonDataService,
    protected groupService: GroupDataService,
  ) {
    super(requestService, rdbService, objectCache, halService, notificationsService, comparator, ePersonService, groupService);
    this.groupSearchData = new SearchDataImpl(this.linkPath, requestService, rdbService, objectCache, halService, this.responseMsToLive);
  }

  /**
   * Igual a {@link ResourcePolicyDataService#searchByGroup}, mas repassa currentPage/
   * elementsPerPage (e demais campos de {@link FindListOptions}) pro request em vez de ignorá-los.
   *
   * @param UUID                        UUID do {@link Group}
   * @param findListOptions             Opções de paginação/ordenação da busca
   * @param resourceUUID                Limita as políticas retornadas a um DSO específico
   * @param useCachedVersionIfAvailable Se true, só envia o request se não houver versão em cache válida
   * @param reRequestOnStale            Se o request deve ser refeito automaticamente quando a resposta ficar stale
   * @param linksToFollow               HALLinks a resolver automaticamente
   */
  searchByGroupPaginated(
    UUID: string,
    findListOptions: FindListOptions = {},
    resourceUUID?: string,
    useCachedVersionIfAvailable = true,
    reRequestOnStale = true,
    ...linksToFollow: FollowLinkConfig<ResourcePolicy>[]
  ): Observable<RemoteData<PaginatedList<ResourcePolicy>>> {
    const options = Object.assign(new FindListOptions(), findListOptions);
    options.searchParams = [new RequestParam('uuid', UUID)];
    if (isNotEmpty(resourceUUID)) {
      options.searchParams.push(new RequestParam('resource', resourceUUID));
    }
    return this.groupSearchData.searchBy(this.searchByGroupMethod, options, useCachedVersionIfAvailable, reRequestOnStale, ...linksToFollow);
  }
}
