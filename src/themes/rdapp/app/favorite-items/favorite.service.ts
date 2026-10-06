import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import {
  BehaviorSubject,
  Observable,
  defer,
  throwError,
} from 'rxjs';
import {
  catchError,
  distinctUntilChanged,
  filter,
  map,
  tap,
} from 'rxjs/operators';

import { AuthService } from '@dspace/core/auth/auth.service';

import { environment } from '../../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class FavoriteService {
  private http = inject(HttpClient);
  private authService = inject(AuthService);

  private apiUrl = `${environment.rest.baseUrl}/api/favorites`;

  /** IDs dos itens favoritos do usuário logado. `null` até a primeira carga. */
  private favoriteIds = new BehaviorSubject<ReadonlySet<string> | null>(null);
  private idsRequested = false;

  /** Cache de IDs, para os cards da busca não fazerem uma requisição por item. */
  readonly favoriteIds$: Observable<ReadonlySet<string> | null> = this.favoriteIds.asObservable();

  constructor() {
    this.authService.isAuthenticated().pipe(
      distinctUntilChanged(),
      filter((isAuthenticated) => !isAuthenticated),
    ).subscribe(() => {
      this.favoriteIds.next(null);
      this.idsRequested = false;
    });
  }

  /** IDs dos favoritos, do mais recente para o mais antigo. Aproveita para preencher o cache. */
  getFavoriteIds(): Observable<string[]> {
    return this.http.get<string[]>(`${this.apiUrl}/ids`).pipe(
      tap({
        next: (ids) => {
          this.favoriteIds.next(new Set(ids));
          this.idsRequested = true;
        },
        // Falhou: o cache continua vazio e a próxima tela tenta de novo
        error: () => {
          this.idsRequested = false;
        },
      }),
    );
  }

  /** Emite se o item é favorito; a primeira chamada dispara a única requisição de IDs. */
  isFavorite(itemId: string): Observable<boolean> {
    this.loadIds();
    return this.favoriteIds.pipe(
      filter((ids): ids is ReadonlySet<string> => ids !== null),
      map((ids) => ids.has(itemId)),
      distinctUntilChanged(),
    );
  }

  /**
   * Marca ou desmarca o item. O cache é atualizado na hora (a estrela responde sem esperar)
   * e revertido se a requisição falhar.
   * @param itemId UUID do Item
   */
  setFavorite(itemId: string, favorite: boolean): Observable<unknown> {
    return defer(() => {
      this.updateCache(itemId, favorite);
      const request = favorite
        ? this.http.post(`${this.apiUrl}/${itemId}`, null)
        : this.http.delete(`${this.apiUrl}/${itemId}`);
      return request.pipe(
        catchError((error) => {
          this.updateCache(itemId, !favorite);
          return throwError(() => error);
        }),
      );
    });
  }

  private loadIds(): void {
    if (this.idsRequested) {
      return;
    }
    this.idsRequested = true;
    this.getFavoriteIds().subscribe({ error: () => undefined });
  }

  private updateCache(itemId: string, favorite: boolean): void {
    const ids = new Set(this.favoriteIds.value ?? []);
    if (favorite) {
      ids.add(itemId);
    } else {
      ids.delete(itemId);
    }
    this.favoriteIds.next(ids);
  }
}
