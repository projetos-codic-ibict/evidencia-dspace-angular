import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { AuthService } from '@dspace/core/auth/auth.service';
import {
  BehaviorSubject,
  of,
} from 'rxjs';

import { environment } from '../../../../environments/environment';
import { FavoriteService } from './favorite.service';

describe('FavoriteService', () => {
  let service: FavoriteService;
  let http: HttpTestingController;
  let authenticated$: BehaviorSubject<boolean>;
  const apiUrl = `${environment.rest.baseUrl}/api/favorites`;

  beforeEach(() => {
    authenticated$ = new BehaviorSubject<boolean>(true);
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: { isAuthenticated: () => authenticated$.asObservable() } },
      ],
    });
    service = TestBed.inject(FavoriteService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('carrega os IDs uma única vez para vários cards', () => {
    const results: boolean[] = [];
    service.isFavorite('a').subscribe((v) => results.push(v));
    service.isFavorite('b').subscribe((v) => results.push(v));

    http.expectOne(`${apiUrl}/ids`).flush(['a']);

    expect(results).toEqual([true, false]);
  });

  it('tenta carregar os IDs de novo depois de uma falha', () => {
    service.isFavorite('a').subscribe();
    http.expectOne(`${apiUrl}/ids`).flush('erro', { status: 500, statusText: 'Server Error' });

    const results: boolean[] = [];
    service.isFavorite('a').subscribe((v) => results.push(v));
    http.expectOne(`${apiUrl}/ids`).flush(['a']);

    expect(results).toEqual([true]);
  });

  it('marca na hora e mantém o cache quando o POST dá certo', () => {
    let ids: ReadonlySet<string> | null = null;
    service.favoriteIds$.subscribe((v) => ids = v);

    service.setFavorite('x', true).subscribe();
    expect(ids!.has('x')).toBeTrue();

    http.expectOne({ method: 'POST', url: `${apiUrl}/x` }).flush(null);
    expect(ids!.has('x')).toBeTrue();
  });

  it('desfaz a marcação quando o POST falha', () => {
    let ids: ReadonlySet<string> | null = null;
    service.favoriteIds$.subscribe((v) => ids = v);
    let failed = false;

    service.setFavorite('x', true).subscribe({ error: () => failed = true });
    http.expectOne({ method: 'POST', url: `${apiUrl}/x` }).flush('erro', { status: 500, statusText: 'Server Error' });

    expect(failed).toBeTrue();
    expect(ids!.has('x')).toBeFalse();
  });

  it('desmarca com DELETE e atualiza o cache', () => {
    service.getFavoriteIds().subscribe();
    http.expectOne(`${apiUrl}/ids`).flush(['x', 'y']);
    let ids: ReadonlySet<string> | null = null;
    service.favoriteIds$.subscribe((v) => ids = v);

    service.setFavorite('x', false).subscribe();

    http.expectOne({ method: 'DELETE', url: `${apiUrl}/x` }).flush(null);
    expect([...ids!]).toEqual(['y']);
  });

  it('zera o cache quando o usuário sai', () => {
    service.getFavoriteIds().subscribe();
    http.expectOne(`${apiUrl}/ids`).flush(['x']);
    let ids: ReadonlySet<string> | null | undefined;
    service.favoriteIds$.subscribe((v) => ids = v);
    expect(ids).not.toBeNull();

    authenticated$.next(false);

    expect(ids).toBeNull();
  });
});
