import { TestBed } from '@angular/core/testing';
import {
  of,
  throwError,
} from 'rxjs';

import { AiSummaryTitleService } from './ai-summary-title.service';
import { ItemDataService } from './host';

/** `RemoteData` só com o que os operadores desta feature leem. */
function remote(hasSucceeded: boolean, payload: unknown = null): any {
  return { hasCompleted: true, hasSucceeded, payload };
}

/** Item com só o que o serviço lê: o `dc.title`. */
function item(title: string | undefined): any {
  return { firstMetadataValue: (key: string) => key === 'dc.title' ? title : undefined };
}

describe('AiSummaryTitleService', () => {
  let service: AiSummaryTitleService;
  let itemService: jasmine.SpyObj<ItemDataService>;

  beforeEach(() => {
    itemService = jasmine.createSpyObj('ItemDataService', ['findById']);
    TestBed.configureTestingModule({
      providers: [
        AiSummaryTitleService,
        { provide: ItemDataService, useValue: itemService },
      ],
    });
    service = TestBed.inject(AiSummaryTitleService);
  });

  function titleOf(uuid: string): string {
    let result: string | undefined;
    service.title(uuid).subscribe((title: string) => result = title);
    return result;
  }

  it('traz o dc.title do item', () => {
    itemService.findById.and.returnValue(of(remote(true, item('Despesas com Educação no IRPF'))));

    expect(titleOf('uuid-1')).toBe('Despesas com Educação no IRPF');
    expect(itemService.findById).toHaveBeenCalledWith('uuid-1');
  });

  it('busca cada item uma vez só', () => {
    itemService.findById.and.returnValue(of(remote(true, item('Relatório'))));

    titleOf('uuid-1');
    titleOf('uuid-1');

    expect(itemService.findById).toHaveBeenCalledTimes(1);
  });

  it('devolve vazio quando o item não vem', () => {
    itemService.findById.and.returnValue(of(remote(false)));

    expect(titleOf('uuid-1')).toBe('');
  });

  it('devolve vazio quando o item não tem título', () => {
    itemService.findById.and.returnValue(of(remote(true, item(undefined))));

    expect(titleOf('uuid-1')).toBe('');
  });

  it('devolve vazio quando a requisição falha', () => {
    itemService.findById.and.returnValue(throwError(() => new Error('rede fora')));

    expect(titleOf('uuid-1')).toBe('');
  });
});
