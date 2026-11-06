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
      <span class="exportar-titulo" aria-hidden="true">Baixar imagem:</span>
      <button type="button" class="btn-exportar" (click)="baixar('png')">PNG</button>
      <button type="button" class="btn-exportar" (click)="baixar('jpeg')">JPG</button>
    </div>
  `,
  styles: [`
    :host { display: block; }
    .exportar { display: inline-flex; align-items: center; gap: 0.5rem; margin: 0.25rem 0 0.5rem; font-size: 0.85rem; color: #6c757d; }
    .btn-exportar {
      border: 1px solid #0B6256; border-radius: 6px; background: #fff; color: #0B6256;
      font-size: 0.78rem; font-weight: 600; padding: 0.2rem 0.6rem; cursor: pointer; min-height: 24px;
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
