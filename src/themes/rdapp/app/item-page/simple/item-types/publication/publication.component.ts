import { AsyncPipe, SlicePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  inject,
  OnDestroy,
  OnInit,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgbDropdownModule } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule } from '@ngx-translate/core';
import { catchError, combineLatest, Observable, of } from 'rxjs';

import { ItemBibliographyService } from '../../../../../../../app/core/data/bibliography-data.service';
import { Bibliography } from '../../../../../../../app/core/shared/bibliography/bibliography.model';
import { Item } from '../../../../../../../app/core/shared/item.model';
import { UsageReportDataService } from '../../../../../../../app/core/statistics/usage-report-data.service';
import { UsageReport } from '../../../../../../../app/core/statistics/models/usage-report.model';
import { Context } from '../../../../../../../app/core/shared/context.model';
import { ViewMode } from '../../../../../../../app/core/shared/view-mode.model';
import { DsoEditMenuComponent } from '../../../../../../../app/shared/dso-page/dso-edit-menu/dso-edit-menu.component';
import { listableObjectComponent } from '../../../../../../../app/shared/object-collection/shared/listable-object/listable-object.decorator';
import { ThemedResultsBackButtonComponent } from '../../../../../../../app/shared/results-back-button/themed-results-back-button.component';
import { ThemedThumbnailComponent } from '../../../../../../../app/thumbnail/themed-thumbnail.component';
import { ThemedFileSectionComponent } from '../../../../../../../app/item-page/simple/field-components/file-section/themed-file-section.component';
import { PublicationComponent as BasePublicationComponent } from '../../../../../../../app/item-page/simple/item-types/publication/publication.component';
import { RelatedPublicationsComponent } from '../../related-publications/related-publications.component';

@listableObjectComponent('Publication', ViewMode.StandalonePage, Context.Any, 'rdapp')
@Component({
  selector: 'ds-themed-publication',
  templateUrl: './publication.component.html',
  styleUrls: ['./publication.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    AsyncPipe,
    DsoEditMenuComponent,
    NgbDropdownModule,
    RelatedPublicationsComponent,
    RouterLink,
    SlicePipe,
    ThemedFileSectionComponent,
    ThemedResultsBackButtonComponent,
    ThemedThumbnailComponent,
    TranslateModule,
  ],
})
export class PublicationComponent extends BasePublicationComponent implements OnInit, OnDestroy {

  // ── CA02: resumo expansível ──────────────────────────────────────────────────
  isAbstractExpanded = false;
  private readonly abstractPreviewLength = 500;

  // ── Feedback visual do botão copiar referência ───────────────────────────────
  referenceIsCopied = false;
  private copyRefTimer: ReturnType<typeof setTimeout> | null = null;

  // ── CA07: métricas de uso ────────────────────────────────────────────────────
  reports$: Observable<UsageReport[]>;
  referenceCopiesCount: number = 0;

  // ── Referências via backend ──────────────────────────────────────────────────
  bibliographies: Bibliography[] = [];
  bibliographiesLoading = true;
  readonly abntStyleKey = 'instituto-brasileiro-de-informacao-em-ciencia-e-tecnologia-abnt';
  readonly bibtexStyleKey = 'bibtex';
  selectedStyleKey = this.abntStyleKey;

  // Nome do repositório — fixo, é o mesmo para todo item, não vem de metadado.
  private readonly repositoryName = 'Repositório Digital de Avaliação de Políticas Públicas - RDAPP';

  get selectedReference(): string {
    if (this.selectedStyleKey === this.bibtexStyleKey) {
      return this.buildBibtex();
    }
    return this.bibliographies.find(b => b.style === this.selectedStyleKey)?.value ?? '';
  }

  get isBibtexSelected(): boolean {
    return this.selectedStyleKey === this.bibtexStyleKey;
  }

  /**
   * Monta o BibTeX manualmente a partir dos metadados do item, em vez de usar a
   * saída do citeproc-java (que sai numa linha só e não tem howpublished/organization/
   * address — esses não são variáveis CSL, são exclusivos do BibTeX).
   */
  private buildBibtex(): string {
    const item = this.object as Item;
    if (!item) {
      return '';
    }

    const authors = item.allMetadataValues('dc.contributor.author') ?? [];
    const title = item.firstMetadataValue('dc.title') ?? '';
    const issued = item.firstMetadataValue('dc.date.issued') ?? '';
    const year = issued.slice(0, 4);
    const organization = item.firstMetadataValue('local.instituicao')
      ?? item.firstMetadataValue('dc.publisher')
      ?? '';
    const cidade = item.firstMetadataValue('local.cidade') ?? '';
    const uf = item.firstMetadataValue('local.uf') ?? '';
    const address = cidade && uf ? `${cidade}/${uf}` : (cidade || uf);

    const fields: Array<[string, string]> = [];
    if (authors.length > 0) {
      fields.push(['author', authors.join(' and ')]);
    }
    if (title) {
      fields.push(['title', title]);
    }
    fields.push(['howpublished', this.repositoryName]);
    if (organization) {
      fields.push(['organization', organization]);
    }
    if (address) {
      fields.push(['address', address]);
    }
    if (year) {
      fields.push(['year', year]);
    }

    const key = this.buildBibtexKey(authors[0], year);
    const labelWidth = fields.reduce((max, [name]) => Math.max(max, name.length), 0);
    const lines = fields.map(([name, value], index) => {
      const separator = index < fields.length - 1 ? ',' : '';
      return `  ${name.padEnd(labelWidth)} = {${value}}${separator}`;
    });

    return [`@misc{${key},`, ...lines, '}'].join('\n');
  }

  private buildBibtexKey(firstAuthor: string | undefined, year: string): string {
    const namePart = firstAuthor?.includes(',')
      ? firstAuthor.split(',')[0]
      : (firstAuthor?.trim().split(/\s+/).pop() ?? '');
    const slug = (namePart ?? '')
      .normalize('NFD')
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '');
    return `${slug}${year}`;
  }

  selectStyle(key: string): void {
    this.selectedStyleKey = key;
    this.referenceIsCopied = false;
    this.cd.markForCheck();
  }

  private usageReportService = inject(UsageReportDataService);
  private bibliographySvc = inject(ItemBibliographyService);
  private cd = inject(ChangeDetectorRef);

  override ngOnInit(): void {
    super.ngOnInit();
    this.reports$ = combineLatest(
      ['TotalVisits', 'TotalVisitsPerMonth', 'TotalDownloads'].map(type =>
        this.usageReportService.getStatistic((this.object as Item).id, type).pipe(
          catchError(() => of({ reportType: type, points: [] } as unknown as UsageReport)),
        )
      ),
    );
    this.loadBibliographies();
  }

  getReportTotal(reports: UsageReport[], type: string): number {
    const report = reports.find(r => r.reportType === type);
    if (!report?.points?.length) return 0;
    return report.points.reduce(
      (sum, p) => sum + ((p.values as unknown as Record<string, number>)?.['views'] ?? 0), 0,
    );
  }

  getLastMonthViews(reports: UsageReport[]): number {
    const report = reports.find(r => r.reportType === 'TotalVisitsPerMonth');
    if (!report?.points?.length) return 0;
    return (report.points[report.points.length - 1].values as unknown as Record<string, number>)?.['views'] ?? 0;
  }

  // ── CA02: abstract ───────────────────────────────────────────────────────────
  get abstractDisplay(): string {
    const text = this.object?.firstMetadataValue('dc.description.abstract') ?? '';
    if (this.isAbstractExpanded || text.length <= this.abstractPreviewLength) {
      return text;
    }
    return text.slice(0, this.abstractPreviewLength) + '…';
  }

  get abstractIsTruncatable(): boolean {
    return (this.object?.firstMetadataValue('dc.description.abstract') ?? '').length > this.abstractPreviewLength;
  }

  toggleAbstract(): void {
    this.isAbstractExpanded = !this.isAbstractExpanded;
  }

  private loadBibliographies(): void {
    if (!(this.object as Item)?._links?.bibliography?.href) {
      this.bibliographiesLoading = false;
      return;
    }
    this.bibliographySvc.getBibliographies(this.object as Item).pipe(
      catchError(() => of(null)),
    ).subscribe(data => {
      this.bibliographies = data?.bibliographies ?? [];
      this.bibliographiesLoading = false;
      this.cd.markForCheck();
    });
  }

  copyReference(): void {
    navigator.clipboard?.writeText(this.selectedReference).catch(() => {});
    if (this.copyRefTimer) clearTimeout(this.copyRefTimer);
    this.referenceIsCopied = true;
    this.cd.markForCheck();
    this.copyRefTimer = setTimeout(() => {
      this.referenceIsCopied = false;
      this.cd.markForCheck();
    }, 2000);
  }

  ngOnDestroy(): void {
    if (this.copyRefTimer) clearTimeout(this.copyRefTimer);
  }
}
