import { isPlatformBrowser } from '@angular/common';
import {
  Component,
  ElementRef,
  EventEmitter,
  Inject,
  Input,
  OnChanges,
  OnDestroy,
  Output,
  PLATFORM_ID,
} from '@angular/core';
import {
  BarChart,
  HeatmapChart,
  LineChart,
  ScatterChart,
  TreemapChart,
} from 'echarts/charts';
import {
  GridComponent,
  LegendComponent,
  TitleComponent,
  TooltipComponent,
  VisualMapComponent,
} from 'echarts/components';
import {
  type EChartsType,
  init,
  use,
} from 'echarts/core';
import { CanvasRenderer } from 'echarts/renderers';

// Registro unico dos modulos ECharts usados pelo painel (entry modular,
// tree-shaking). O entry classico 'echarts' expoe tipos com "export =",
// rejeitado pelo tsconfig do projeto (module es2020 sem skipLibCheck).
use([
  BarChart,
  LineChart,
  HeatmapChart,
  ScatterChart,
  TreemapChart,
  GridComponent,
  LegendComponent,
  TitleComponent,
  TooltipComponent,
  VisualMapComponent,
  CanvasRenderer,
]);

/**
 * Wrapper de apresentacao para um grafico ECharts.
 * Recebe a opcao pronta por @Input e cuida sozinho do ciclo de vida: cria a
 * instancia, aplica setOption, redimensiona (via ResizeObserver, o que cobre
 * resize de janela e troca de aba) e descarta. Emite a instancia em (pronto)
 * para casos que precisam do objeto, como o cruzamento do heatmap.
 * A altura vem da classe CSS aplicada ao elemento no template do pai (ex: .grafico).
 */
@Component({
  selector: 'ds-grafico-echarts',
  template: '',
  styles: [':host { display: block; width: 100%; }'],
})
export class GraficoEchartsComponent implements OnChanges, OnDestroy {

  @Input() opcao: any = null;
  @Output() pronto = new EventEmitter<EChartsType>();

  private chart: EChartsType | null = null;
  private ro?: ResizeObserver;
  private readonly isBrowser: boolean;

  constructor(
    private el: ElementRef<HTMLElement>,
    @Inject(PLATFORM_ID) platformId: object,
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  ngOnChanges(): void {
    if (!this.isBrowser) { return; }
    if (this.opcao == null) {
      this.destruir();
      return;
    }
    if (!this.chart) {
      this.chart = init(this.el.nativeElement);
      this.observarResize();
      this.pronto.emit(this.chart);
    }
    // notMerge = true: substitui a opcao por inteiro, evitando series antigas
    // quando os dados encolhem apos um filtro. Sem animacao quando o sistema
    // pede menos movimento (CA06: nada depende de animacao automatica).
    this.chart.setOption(this.reduzirMovimento() ? { ...this.opcao, animation: false } : this.opcao, true);
  }

  /**

/**
 * Exporta o gráfico com seu título em PNG ou JPG.
 * Preserva a imagem original e acrescenta um cabeçalho.
 */
  exportarImagem(
    formato: 'png' | 'jpeg',
    nomeArquivo: string,
  ): void {
    if (!this.isBrowser || !this.chart) {
      return;
    }

    const titulos: Record<string, string> = {
      'rdapp-instituicao': 'Instituição',
      'rdapp-tipo-documento': 'Tipo de Documento',
      'rdapp-area-tematica': 'Área Temática',
      'rdapp-abrangencia-territorial': 'Abrangência Territorial',
    };

    const titulo = titulos[nomeArquivo] || nomeArquivo;

    const imagem = new Image();

    imagem.onload = () => {
      const alturaCabecalho = 115;

      const canvas = document.createElement('canvas');
      canvas.width = imagem.naturalWidth;
      canvas.height = imagem.naturalHeight + alturaCabecalho;

      const contexto = canvas.getContext('2d');
      if (!contexto) {
        return;
      }

      // Fundo branco.
      contexto.fillStyle = '#FFFFFF';
      contexto.fillRect(
        0, 0,
        canvas.width,
        canvas.height,
      );

      // Título centralizado.
      contexto.fillStyle = '#0B3A82';
      contexto.font = 'bold 36px Arial, sans-serif';
      contexto.textAlign = 'center';
      contexto.textBaseline = 'middle';

      contexto.fillText(
        titulo,
        canvas.width / 2,
        alturaCabecalho / 2,
        canvas.width - 80,
      );

      // Gráfico original abaixo do título.
      contexto.drawImage(
        imagem,
        0,
        alturaCabecalho,
      );

      // Download da imagem completa.
      const mime =
      formato === 'jpeg' ? 'image/jpeg' : 'image/png';

      const extensao =
      formato === 'jpeg' ? 'jpg' : 'png';

      const link = document.createElement('a');
      link.href = canvas.toDataURL(mime, 0.95);
      link.download = `${nomeArquivo}.${extensao}`;

      document.body.appendChild(link);
      link.click();
      link.remove();
    };

    imagem.onerror = () => {
      console.error(
        'Não foi possível preparar a imagem do gráfico.',
      );
    };

    imagem.src = this.chart.getDataURL({
      type: 'png',
      pixelRatio: 2,
      backgroundColor: '#FFFFFF',
    });
  }



  /**
 * Exporta um gráfico com título e legenda externa.
 * Utilizado inicialmente no gráfico dos ODS.
 */

  exportarImagemComLegenda(
    formato: 'png' | 'jpeg',
    nomeArquivo: string,
    titulo: string,
    legenda: ReadonlyArray<{ label: string; cor: string }>,
    tituloLegenda: string = 'Legenda dos Objetivos',
  ): void {

    if (!this.isBrowser || !this.chart) {
      return;
    }

    const imagem = new Image();

    imagem.onload = () => {
      const largura = Math.max(1200, imagem.naturalWidth + 80);
      const margem = 40;
      const topoGrafico = 100;
      const topoLegenda = topoGrafico + imagem.naturalHeight + 55;
      const altura = topoLegenda + 75 + legenda.length * 44 + 55;

      const canvas = document.createElement('canvas');
      canvas.width = largura;
      canvas.height = altura;

      const contexto = canvas.getContext('2d');
      if (!contexto) {
        return;
      }

      // Fundo branco.
      contexto.fillStyle = '#FFFFFF';
      contexto.fillRect(0, 0, largura, altura);

      // Título da visualização.
      contexto.fillStyle = '#0B3A82';
      contexto.font = 'bold 30px Arial, sans-serif';
      contexto.fillText(titulo, margem, 60, largura - 2 * margem);

      // Imagem original do gráfico ECharts.
      contexto.drawImage(
        imagem,
        (largura - imagem.naturalWidth) / 2,
        topoGrafico,
      );

      // Título da legenda.
      contexto.font = 'bold 25px Arial, sans-serif';
      contexto.fillText(
        tituloLegenda,
        margem,
        topoLegenda,
      );

      // Legenda com os nomes e cores de todos os ODS.
      contexto.font = '22px Arial, sans-serif';

      legenda.forEach((item, indice) => {
        const y = topoLegenda + 53 + indice * 44;

        contexto.fillStyle =
        /^#[0-9a-fA-F]{6}$/.test(item.cor)
          ? item.cor
          : '#9AA5B1';

        contexto.fillRect(margem, y - 18, 18, 18);

        contexto.fillStyle = '#333333';
        contexto.fillText(
          item.label,
          margem + 32,
          y,
          largura - 2 * margem - 40,
        );
      });

      // Download.
      const extensao = formato === 'jpeg' ? 'jpg' : 'png';

      const link = document.createElement('a');
      link.href = canvas.toDataURL(
        formato === 'jpeg' ? 'image/jpeg' : 'image/png',
        0.95,
      );
      link.download = `${nomeArquivo}.${extensao}`;

      document.body.appendChild(link);
      link.click();
      link.remove();
    };

    imagem.onerror = () => {
      console.error('Não foi possível preparar a imagem do gráfico.');
    };

    // Captura o gráfico em alta resolução.
    imagem.src = this.chart.getDataURL({
      type: 'png',
      pixelRatio: 2,
      backgroundColor: '#FFFFFF',
    });
  }


  ngOnDestroy(): void { this.destruir(); }

  private reduzirMovimento(): boolean {
    return typeof window !== 'undefined' && typeof window.matchMedia === 'function'
      && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  private observarResize(): void {
    if (typeof ResizeObserver === 'undefined') { return; }
    this.ro = new ResizeObserver(() => this.chart?.resize());
    this.ro.observe(this.el.nativeElement);
  }

  private destruir(): void {
    this.ro?.disconnect();
    this.ro = undefined;
    this.chart?.dispose();
    this.chart = null;
  }
}
