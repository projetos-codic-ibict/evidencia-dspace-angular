import { isPlatformBrowser } from '@angular/common';
import {
  Component,
  Inject,
  Input,
  PLATFORM_ID,
} from '@angular/core';
import type { EChartsType } from 'echarts/core';

type FormatoImagem = 'png' | 'jpeg';

/**
 * Download do grafico como imagem (PNG ou JPG), parte da exportacao da HU006
 * (icones de imagem dos prototipos). Recebe a instancia do ECharts que o
 * <ds-grafico-echarts> emite em (pronto) e o nome-base do arquivo; a data e a
 * extensao sao acrescentadas na hora. Exporta com fundo branco e em dobro de
 * resolucao, para servir em documento e apresentacao.
 */
@Component({
  selector: 'ds-exportar-grafico',
  template: `
    <div class="exportar" role="group" [attr.aria-label]="'Baixar ' + rotulo + ' como imagem'">
      <button type="button" class="btn-exportar" (click)="baixar('png')" title="Baixar como PNG"
              [attr.aria-label]="'Baixar ' + rotulo + ' como PNG'">
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
          <rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="8.5" cy="9.5" r="1.5"/><path d="M21 16l-5-5-8 8"/>
        </svg>PNG
      </button>
      <button type="button" class="btn-exportar" (click)="baixar('jpeg')" title="Baixar como JPG"
              [attr.aria-label]="'Baixar ' + rotulo + ' como JPG'">
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
          <rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="8.5" cy="9.5" r="1.5"/><path d="M21 16l-5-5-8 8"/>
        </svg>JPG
      </button>
    </div>
  `,
  styles: [`
    :host { display: inline-block; }
    .exportar { display: inline-flex; align-items: center; gap: 0.35rem; }
    .btn-exportar {
      display: inline-flex; align-items: center; gap: 0.3rem;
      border: 1px solid #0B6256; border-radius: 6px; background: #fff; color: #0B6256;
      font-size: 0.74rem; font-weight: 700; padding: 0.25rem 0.5rem; cursor: pointer; min-height: 28px;
      &:hover { background: #E7F4F0; }
      &:focus-visible { outline: 2px solid #0B6256; outline-offset: 2px; }
    }
  `],
})
export class ExportarGraficoComponent {
  /** Instancia do ECharts (emitida por (pronto) do ds-grafico-echarts). */
  @Input() chart: EChartsType | null = null;
  /** Nome-base do arquivo, sem extensao; e normalizado (minusculas, sem acentos, hifens). */
  @Input() nome = 'grafico';
  /** Como o grafico e chamado no aria-label do grupo de botoes. */
  @Input() rotulo = 'o gráfico';

  private readonly isBrowser: boolean;

  constructor(@Inject(PLATFORM_ID) platformId: object) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  baixar(formato: FormatoImagem): void {
    if (!this.isBrowser || !this.chart || this.chart.isDisposed()) { return; }
    const url = this.chart.getDataURL({ type: formato, pixelRatio: 2, backgroundColor: '#fff' });
    const a = document.createElement('a');
    a.href = url;
    a.download = `${this.nomeArquivo()}.${formato === 'jpeg' ? 'jpg' : 'png'}`;
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  private nomeArquivo(): string {
    const base = this.nome
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'grafico';
    const data = new Date().toISOString().substring(0, 10);
    return `evidencia-${base}-${data}`;
  }
}
