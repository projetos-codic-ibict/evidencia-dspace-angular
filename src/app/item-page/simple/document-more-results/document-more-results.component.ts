import {
  CommonModule,
} from '@angular/common';
import {
  HttpClient,
  HttpParams,
} from '@angular/common/http';
import { TranslateModule } from '@ngx-translate/core';
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
import {
  catchError,
  map,
  of,
  switchMap,
  take,
} from 'rxjs';

import { getBitstreamDownloadRoute } from '@dspace/core/router/utils/dso-route.utils';
import { BitstreamDataService } from '../../../core/data/bitstream-data.service';
import { Bitstream } from '../../../core/shared/bitstream.model';
import { Item } from '../../../core/shared/item.model';
import { getFirstSucceededRemoteListPayload } from '../../../core/shared/operators';
import { hasValue } from '@dspace/shared/utils/empty.util';

interface SemanticApiResult {
  doc_id: string;
  doc_path: string;
  section: string;
  page: number;
  snippet: string;
  score: number;
  type: string;
}

interface DocumentOccurrence {
  trecho: string;
  secao: string;
  pagina: number;
}

@Component({
  selector: 'ds-document-more-results',
  standalone: true,
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
  @Input() docName = '';
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
      || hasValue(changes.semanticText)
      || hasValue(changes.docName);

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
        this.router.navigate(
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

    this.resolveDocIdForApi().pipe(
      take(1),
      switchMap((docId) => {
        if (!this.hasNonBlankValue(docId)) {
          return of([]);
        }

        const params = new HttpParams()
          .set('q', query)
          .set('limit', '50')
          .set('doc_id', docId);

        return this.http.get<SemanticApiResult[]>(endpointUrl, { params }).pipe(
          take(1),
          map((results) => this.mapApiResultsToOccurrences(results, docId)),
        );
      }),
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

  private resolveDocIdForApi() {
    const fromMetadata = this.resolveDocName();
    if (this.hasNonBlankValue(fromMetadata)) {
      return of(fromMetadata);
    }

    if (!hasValue(this.item)) {
      return of('');
    }

    return this.bitstreamDataService.findAllByItemAndBundleName(
      this.item,
      'ORIGINAL',
      { elementsPerPage: 10 },
    ).pipe(
      getFirstSucceededRemoteListPayload(),
      map((bitstreams) => {
        for (const bitstream of bitstreams ?? []) {
          const bitstreamName = (bitstream?.name ?? '').trim();
          const extracted = this.extractPdfFileNames(bitstreamName);
          if (extracted.length > 0) {
            return extracted[0];
          }
        }
        return '';
      }),
      catchError(() => of('')),
    );
  }

  private resolvePdfDownloadRoute() {
    if (!hasValue(this.item)) {
      return of('');
    }

    const normalizedPreferredDocName = this.normalizeDocName(this.resolveDocName());

    return this.bitstreamDataService.findAllByItemAndBundleName(
      this.item,
      'ORIGINAL',
      { elementsPerPage: 50 },
    ).pipe(
      getFirstSucceededRemoteListPayload(),
      map((bitstreams: Bitstream[]) => {
        const selected = this.selectPdfBitstream(bitstreams ?? [], normalizedPreferredDocName);
        
        if (!hasValue(selected)) {
          return '';
        }

        return selected._links.content.href;
      }),
      catchError(() => of('')),
    );
  }

  private selectPdfBitstream(bitstreams: Bitstream[], normalizedPreferredDocName: string): Bitstream | undefined {
    let firstPdf: Bitstream | undefined;

    for (const bitstream of bitstreams) {
      const bitstreamName = (bitstream?.name ?? '').trim();
      if (!this.isPdfBitstreamName(bitstreamName)) {
        continue;
      }

      if (!hasValue(firstPdf)) {
        firstPdf = bitstream;
      }

      if (this.hasNonBlankValue(normalizedPreferredDocName)) {
        const normalizedBitstreamName = this.normalizeDocName(bitstreamName);
        if (normalizedBitstreamName === normalizedPreferredDocName) {
          return bitstream;
        }
      }
    }

    return firstPdf;
  }

  private isPdfBitstreamName(fileName: string): boolean {
    return this.hasNonBlankValue(fileName) && fileName.toLowerCase().endsWith('.pdf');
  }

  private mapApiResultsToOccurrences(results: SemanticApiResult[], docId: string): DocumentOccurrence[] {
    if (!Array.isArray(results)) {
      return [];
    }

    const normalizedDocId = this.normalizeDocName(docId);

    return results
      .filter((result) => {
        if (!hasValue(result?.doc_id)) {
          return false;
        }
        const normalized = this.normalizeDocName(result.doc_id);
        return normalized === normalizedDocId;
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

  private resolveDocName(): string {
    if (this.hasNonBlankValue(this.docName)) {
      return this.docName.trim();
    }

    const docNameCandidates = this.resolveItemDocNameCandidates();
    return docNameCandidates[0] || '';
  }

  private resolveItemDocNameCandidates(): string[] {
    const values = new Set<string>();

    if (hasValue(this.item?.metadata)) {
      Object.keys(this.item.metadata).forEach((key) => {
        const metadataValues = this.item.metadata[key] ?? [];
        metadataValues.forEach((metadataValue) => {
          const raw = (metadataValue?.value ?? '').trim();
          if (!this.hasNonBlankValue(raw)) {
            return;
          }

          this.extractPdfFileNames(raw).forEach((fileName) => {
            values.add(fileName);
            values.add(this.extractBaseName(fileName));
          });
        });
      });
    }

    const preferredFileName = this.item?.firstMetadataValue('dc.identifier.filename');
    if (this.hasNonBlankValue(preferredFileName)) {
      this.extractPdfFileNames(preferredFileName).forEach((fileName) => {
        values.add(fileName);
        values.add(this.extractBaseName(fileName));
      });
    }

    return Array.from(values)
      .map((value) => value.trim())
      .filter((value) => this.hasNonBlankValue(value));
  }

  private extractPdfFileNames(value: string): string[] {
    const candidates = new Set<string>();
    const decoded = this.safeDecodeURIComponent(value.trim());

    // Direct value or path-like value.
    const baseName = this.extractBaseName(decoded);
    if (baseName.toLowerCase().endsWith('.pdf')) {
      candidates.add(baseName);
    }

    // Values such as filename=documento.pdf or text containing documento.pdf.
    const regex = /([\w\-. ]+\.pdf)/ig;
    let match: RegExpExecArray | null = regex.exec(decoded);
    while (match !== null) {
      const fileName = (match[1] ?? '').trim();
      if (this.hasNonBlankValue(fileName)) {
        candidates.add(fileName);
      }
      match = regex.exec(decoded);
    }

    return Array.from(candidates)
      .map((fileName) => fileName.trim())
      .filter((fileName) => this.hasNonBlankValue(fileName));
  }

  private safeDecodeURIComponent(value: string): string {
    try {
      return decodeURIComponent(value);
    } catch {
      return value;
    }
  }

  private normalizeDocName(value: string): string {
    return this.extractBaseName(value).trim().toLowerCase();
  }

  private extractBaseName(value: string): string {
    const normalized = value.replace(/\\/g, '/');
    const parts = normalized.split('/');
    return parts[parts.length - 1] || value;
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
