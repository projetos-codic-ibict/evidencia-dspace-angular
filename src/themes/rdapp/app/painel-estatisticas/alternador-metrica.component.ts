import {
  Component,
  EventEmitter,
  Input,
  Output,
} from '@angular/core';

/** Metrica de uso exibida nos graficos da aba "Total de Visualizacoes". */
export type MetricaUso = 'views' | 'downloads';

/**
 * Botao-slider Visualizacoes/Downloads (CA05.7). Cada bloco da aba 2 tem o seu,
 * mas todos refletem o MESMO estado do componente pai: trocar em um troca em
 * todos, para que os graficos nunca fiquem em metricas diferentes sem aviso.
 * O estado ativo e indicado por cor E por aria-pressed (texto para leitores de
 * tela), nunca so pela cor (recomendacao 3.1).
 */
@Component({
  selector: 'ds-alternador-metrica',
  template: `
    <div class="alternador-metrica" role="group" [attr.aria-label]="rotulo">
      <button type="button" [attr.aria-pressed]="metrica === 'views'"
              (click)="trocar.emit('views')">Visualizações</button>
      <button type="button" [attr.aria-pressed]="metrica === 'downloads'"
              (click)="trocar.emit('downloads')">Downloads</button>
    </div>
  `,
  styles: [`
    :host { display: inline-block; }
    .alternador-metrica {
      display: inline-flex; border: 1px solid #0B6256; border-radius: 999px; overflow: hidden;
      button {
        border: 0; background: #fff; color: #0B6256; font-size: 0.8rem; font-weight: 600;
        padding: 0.35rem 0.9rem; cursor: pointer; min-height: 24px;
        &[aria-pressed='true'] { background: #0B6256; color: #fff; }
        &:focus-visible { outline: 2px solid #0B6256; outline-offset: -2px; }
      }
    }
  `],
})
export class AlternadorMetricaComponent {
  @Input() metrica: MetricaUso = 'views';
  @Input() rotulo = 'Métrica do gráfico';
  @Output() trocar = new EventEmitter<MetricaUso>();
}
