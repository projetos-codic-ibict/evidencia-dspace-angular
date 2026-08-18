import { CommonModule } from '@angular/common';
import {
  HttpClient,
  HttpParams,
} from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  Input,
  OnChanges,
  SimpleChanges,
} from '@angular/core';
import {
  ActivatedRoute,
  Router,
} from '@angular/router';
import { hasValue } from '@dspace/shared/utils/empty.util';
import { TranslateModule } from '@ngx-translate/core';
import {
  catchError,
  map,
  of,
  take,
} from 'rxjs';

import { BitstreamDataService } from '../../../core/data/bitstream-data.service';
import { Bitstream } from '../../../core/shared/bitstream.model';
import { Item } from '../../../core/shared/item.model';
import { getFirstSucceededRemoteListPayload } from '../../../core/shared/operators';

interface SemanticApiResult {
  doc_id: string;
  doc_path: string;
  section: string;
  page: number;
  snippet: string;
  score: number;
  type: string;
  item_uuid: string;
}

interface DocumentOccurrence {
  trecho: string;
  secao: string;
  pagina: number;
}

@Component({
  selector: 'ds-document-more-results',
  imports: [
    CommonModule,
    TranslateModule,
  ],
  templateUrl: './document-more-results.component.html',
  styleUrls: ['./document-more-results.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DocumentMoreResultsComponent implements OnChanges {

  @Input() item: Item;
  @Input() semanticText = '';
  @Input() apiBaseUrl = 'https://api.rdapp.comais.uft.edu.br';
  @Input() endpointPath = '/api/search/semantic';
  @Input() pageSize = 3;

  isOpen = false;
  currentPage = 1;
  totalPages = 1;
  isLoading = false;
  hasLoadedFromApi = false;
  hasError = false;

  occurrences: DocumentOccurrence[] = [];

  constructor(
    private http: HttpClient,
    private route: ActivatedRoute,
    private router: Router,
    private bitstreamDataService: BitstreamDataService,
    private cdr: ChangeDetectorRef,
  ) {
    this.updatePagination();
  }

  ngOnChanges(changes: SimpleChanges): void {
    const contextChanged = hasValue(changes.item)
      || hasValue(changes.semanticText);

    if (contextChanged) {
      this.hasLoadedFromApi = false;
      this.hasError = false;
      this.occurrences = [];
      this.currentPage = 1;
      this.updatePagination();

      if (this.isOpen) {
        this.loadOccurrencesFromApi();
      }
    }
  }

  get pagedOccurrences(): DocumentOccurrence[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.occurrences.slice(start, start + this.pageSize);
  }

  toggleOpen(): void {
    this.isOpen = !this.isOpen;

    if (this.isOpen && !this.hasLoadedFromApi) {
      this.loadOccurrencesFromApi();
    }
  }

  goToFirstPage(): void {
    if (this.currentPage > 1) {
      this.currentPage = 1;
    }
  }

  goToPreviousPage(): void {
    if (this.currentPage > 1) {
      this.currentPage -= 1;
    }
  }

  goToNextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage += 1;
    }
  }

  goToLastPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage = this.totalPages;
    }
  }

  navigateToPDFPage(pageNumber: number): void {
    const safePage = Number.isFinite(pageNumber) && pageNumber > 0 ? Math.floor(pageNumber) : 1;

    this.resolvePdfDownloadRoute().pipe(
      take(1),
    ).subscribe((downloadRoute) => {
      if (this.hasNonBlankValue(downloadRoute) && typeof window !== 'undefined') {
        window.open(`${downloadRoute}#page=${safePage}`, '_blank', 'noopener');
        return;
      }

      if (hasValue(this.item?.uuid)) {
        void this.router.navigate(
          ['/items', this.item.uuid],
          { queryParams: { page: safePage } },
        );
      }
    });
  }

  private loadOccurrencesFromApi(): void {
    const query = this.resolveQueryText();

    if (!this.hasNonBlankValue(query)) {
      this.hasLoadedFromApi = true;
      return;
    }

    this.isLoading = true;
    this.hasError = false;

    const endpointUrl = this.resolveApiEndpointUrl();
    const itemUuid = this.resolveItemUuid();

    if (!this.hasNonBlankValue(itemUuid)) {
      this.isLoading = false;
      this.hasLoadedFromApi = true;
      this.cdr.markForCheck();
      return;
    }

    const params = new HttpParams()
      .set('q', query)
      .set('limit', '50')
      .set('uuid', itemUuid);

    this.http.get<SemanticApiResult[]>(endpointUrl, { params }).pipe(
      take(1),
      map((results) => this.mapApiResultsToOccurrences(results, itemUuid)),
      catchError(() => {
        this.hasError = true;
        return of([]);
      }),
    ).subscribe((occurrences) => {
      this.occurrences = occurrences;
      this.currentPage = 1;
      this.updatePagination();
      this.isLoading = false;
      this.hasLoadedFromApi = true;
      this.cdr.markForCheck();
    });
  }

  private resolveItemUuid(): string {
    return this.item?.uuid ?? '';
  }

  private resolvePdfDownloadRoute() {
    if (!hasValue(this.item)) {
      return of('');
    }

    return this.bitstreamDataService.findAllByItemAndBundleName(
      this.item,
      'ORIGINAL',
      { elementsPerPage: 50 },
    ).pipe(
      getFirstSucceededRemoteListPayload(),
      map((bitstreams: Bitstream[]) => {
        const selected = this.selectPdfBitstream(bitstreams ?? []);

        if (!hasValue(selected)) {
          return '';
        }

        return selected._links.content.href;
      }),
      catchError(() => of('')),
    );
  }

  private selectPdfBitstream(bitstreams: Bitstream[]): Bitstream | undefined {
    for (const bitstream of bitstreams) {
      const bitstreamName = (bitstream?.name ?? '').trim();
      if (!this.isPdfBitstreamName(bitstreamName)) {
        continue;
      }

      return bitstream;
    }

    return undefined;
  }

  private isPdfBitstreamName(value: string): boolean {
    return this.hasNonBlankValue(value) && value.toLowerCase().endsWith('.pdf');
  }

  private mapApiResultsToOccurrences(results: SemanticApiResult[], itemUuid: string): DocumentOccurrence[] {
    if (!Array.isArray(results)) {
      return [];
    }

    const normalizedItemUuid = itemUuid.trim().toLowerCase();

    return results
      .filter((result) => {
        if (!hasValue(result?.item_uuid)) {
          return false;
        }
        return result.item_uuid.trim().toLowerCase() === normalizedItemUuid;
      })
      .map((result) => ({
        trecho: result.snippet,
        secao: result.section,
        pagina: Number.isFinite(result.page) ? result.page : 1,
      }))
      .filter((occurrence) => hasValue(occurrence.trecho));
  }

  private resolveQueryText(): string {
    if (this.hasNonBlankValue(this.semanticText)) {
      return this.semanticText.trim();
    }

    const routeQuery = this.route.snapshot.queryParamMap.get('semanticQuery')
      || this.route.snapshot.queryParamMap.get('query')
      || this.route.snapshot.queryParamMap.get('q');
    if (this.hasNonBlankValue(routeQuery)) {
      return routeQuery.trim();
    }

    return '';
  }

  private updatePagination(): void {
    this.totalPages = Math.max(1, Math.ceil(this.occurrences.length / this.pageSize));

    if (this.currentPage > this.totalPages) {
      this.currentPage = this.totalPages;
    }
  }

  private resolveApiBaseUrl(): string {
    const explicitBaseUrl = (this.apiBaseUrl ?? '').trim();
    if (this.hasNonBlankValue(explicitBaseUrl)) {
      return this.ensureSemanticApiPort(explicitBaseUrl);
    }

    return 'https://api.rdapp.comais.uft.edu.br';
  }

  private resolveApiEndpointUrl(): string {
    const baseUrl = this.resolveApiBaseUrl();
    try {
      return new URL(this.endpointPath, `${baseUrl}/`).toString();
    } catch {
      return `${baseUrl}${this.endpointPath}`;
    }
  }

  private ensureSemanticApiPort(baseUrl: string): string {
    if (!/^https?:\/\//i.test(baseUrl)) {
      return 'https://api.rdapp.comais.uft.edu.br';
    }

    try {
      const parsed = new URL(baseUrl);
      return `${parsed.protocol}//${parsed.host}`;
    } catch {
      return 'https://api.rdapp.comais.uft.edu.br';
    }
  }

  private hasNonBlankValue(value?: string): boolean {
    return hasValue(value) && value.trim().length > 0;
  }


}
