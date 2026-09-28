import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';
import { Item } from '@dspace/core/shared/item.model';

@Injectable({
  providedIn: 'root',
})
export class FavoriteService {
  private http = inject(HttpClient);

  private apiUrl = `${environment.rest.baseUrl}/api/favorites`;

  getUserFavorites(): Observable<Item[]> {
    return this.http
      .get<any>(this.apiUrl)
      .pipe(map((response) => response?._embedded?.favorites || []));
  }

  /**
   *
   * @param itemId UUID do Item
   */
  addFavorite(itemId: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/${itemId}`, null);
  }

  /**
   *
   * @param itemId UUID do Item
   */
  removeFavorite(itemId: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${itemId}`);
  }

  /**
   *
   * @param itemId UUID do Item
   */
  checkIsFavorite(itemId: string): Observable<boolean> {
    return this.http.get<boolean>(`${this.apiUrl}/check/${itemId}`);
  }
}
