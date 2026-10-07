import { Injectable } from '@angular/core';
import {
  BehaviorSubject,
  Observable,
} from 'rxjs';
import { map } from 'rxjs/operators';

/**
 * Guarda, por filtro, os valores que o "Selecionar todos" aplicou. Fica fora do componente porque o filtro
 * pode ser recriado quando os resultados recarregam, e o checkbox precisa continuar marcado depois disso.
 */
@Injectable({ providedIn: 'root' })
export class FacetSelectAllStateService {
  private state$ = new BehaviorSubject<Record<string, string[]>>({});

  /** Valores (sem operador) aplicados pelo "Selecionar todos" neste filtro, vazio se não está valendo */
  get(filterName: string): Observable<string[]> {
    return this.state$.pipe(map((state) => state[filterName] ?? []));
  }

  set(filterName: string, values: string[]): void {
    this.state$.next({ ...this.state$.value, [filterName]: values });
  }
}
