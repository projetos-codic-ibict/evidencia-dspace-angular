import { DecimalPipe } from '@angular/common';
import {
  Component,
  Input,
} from '@angular/core';

/**
 * Uma categoria (area, instituicao, abrangencia, ODS) com as duas metricas de uso.
 * ni = "Nao Informado": uso de itens sem o metadado, mostrado a parte (CA05.4).
 */
export interface CategoriaUso { label: string; views: number; downloads: number; ni?: boolean; }

/**
 * Alternativa tabular de um grafico por categoria (recomendacao 4.1 / CA06), com
 * as DUAS metricas e, opcionalmente, o percentual do total. Esta SEMPRE no DOM,
 * logo apos o grafico: o leitor de tela a le sem precisar acionar nada. Para quem
 * enxerga fica escondida (sr-only) ate o icone de tabela do cabecalho do bloco
 * ligar [visivel].
 */
@Component({
  selector: 'ds-tabela-uso',
  imports: [
    DecimalPipe,
  ],
  template: `
    <div class="tabela-box" [id]="idTabela" [class.sr-only]="!visivel">
        <div class="tabela-wrap">
          <table class="tabela">
            <caption class="sr-only">{{ titulo }}</caption>
            <thead>
              <tr>
                <th scope="col">{{ rotuloCategoria }}</th>
                <th scope="col" class="num">Visualizações</th>
                <th scope="col" class="num">Downloads</th>
                @if (comPercentual) {
                  <th scope="col" class="num">% de {{ metrica === 'views' ? 'visualizações' : 'downloads' }}</th>
                }
              </tr>
            </thead>
            <tbody>
              @for (l of linhas; track l.label) {
                <tr>
                  <td>{{ l.label }}</td>
                  <td class="num">{{ l.views | number }}</td>
                  <td class="num">{{ l.downloads | number }}</td>
                  @if (comPercentual) {
                    <td class="num">{{ percentual(l) }}%</td>
                  }
                </tr>
              }
            </tbody>
          </table>
        </div>
      </div>
  `,
  styles: [`
    :host { display: block; }
    .tabela-box { margin-top: 0.5rem; }
    .tabela-wrap { max-height: 300px; overflow-y: auto; }
    .tabela {
      width: 100%; table-layout: fixed; border-collapse: collapse;
      th, td { text-align: left; padding: 0.4rem 0.7rem; border-bottom: 1px solid #eef1f6; overflow-wrap: anywhere; font-size: 0.88rem; }
      thead th { position: sticky; top: 0; background: #fff; z-index: 1; font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.05em; color: #6c757d; }
      .num { text-align: right; font-variant-numeric: tabular-nums; }
    }
    .sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0,0,0,0); white-space: nowrap; border: 0; }
  `],
})
export class TabelaUsoComponent {
  /** Id unico da tabela (aria-controls); nao se chama "id" para nao duplicar o id no elemento host. */
  @Input() idTabela = 'tabela-uso';
  @Input() titulo = '';
  @Input() rotuloCategoria = 'Categoria';
  @Input() linhas: CategoriaUso[] = [];
  /** Metrica ativa; so influencia a coluna de percentual. */
  @Input() metrica: 'views' | 'downloads' = 'views';
  /** Acrescenta a coluna de percentual do total (usada na abrangencia). */
  @Input() comPercentual = false;
  /** Visivel para quem enxerga; para o leitor de tela a tabela existe sempre. */
  @Input() visivel = false;

  percentual(l: CategoriaUso): number {
    const total = this.linhas.reduce((acc, x) => acc + x[this.metrica], 0);
    return total > 0 ? Math.round((l[this.metrica] / total) * 100) : 0;
  }
}
