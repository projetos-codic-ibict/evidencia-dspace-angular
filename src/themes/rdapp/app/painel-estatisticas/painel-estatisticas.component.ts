import {
  DatePipe,
  DecimalPipe,
  isPlatformBrowser,
} from '@angular/common';
import {
  AfterViewChecked,
  ChangeDetectorRef,
  Component,
  ElementRef,
  Inject,
  OnInit,
  PLATFORM_ID,
  ViewChild,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import type { EChartsType } from 'echarts/core';
import {
  forkJoin,
  map,
  Observable,
} from 'rxjs';

import {
  FiltrosSidebarComponent,
  GrupoFiltro,
  OpcaoFiltro,
} from './filtros-sidebar.component';
import { GraficoEchartsComponent } from './grafico-echarts.component';
import { NuvemPalavrasComponent } from './nuvem-palavras.component';
import {
  FacetValue,
  PainelEstatisticasService,
  PainelUso,
  UsoItem,
} from './painel-estatisticas.service';

import { exportarCategoriasImagem } from './exportacao-imagem-categorias';

interface SerieEvolucao { nome: string; dados: number[]; }

interface SparklineVM {
  nome: string;
  valorFinal: number;
  opcao: any;
}

/** Metrica exibida no Top 10 da aba de visualizacoes. */
type MetricaUso = 'views' | 'downloads';
interface ItemUso { id: string; titulo: string; instituicao: string; ano: string; views: number; downloads: number; }
interface PoliticaUso { label: string; views: number; downloads: number; }

/**
 * FONTE UNICA da composicao da barra de filtros (CA18 da padronizacao):
 * ordem das secoes (item 4.1 do documento), sub-rotulo "Buscar por..." (CA05/
 * CA06, caixa de sentenca preservando siglas) e placeholder do campo de busca.
 * "Tipo de Avaliacao" entra na 5a posicao quando a decisao D2 for tomada.
 */
interface DefGrupoFiltro { nome: string; titulo: string; buscarPor: string; placeholder: string; }
const GRUPOS_FILTRO: DefGrupoFiltro[] = [
  { nome: 'instituicao', titulo: 'Instituição', buscarPor: 'Buscar por instituição', placeholder: 'Instituição' },
  { nome: 'dateIssued', titulo: 'Ano de Publicação', buscarPor: 'Buscar por ano de publicação', placeholder: 'Ano de publicação' },
  { nome: 'areaTematica', titulo: 'Área Temática', buscarPor: 'Buscar por área temática', placeholder: 'Área temática' },
  { nome: 'politicaPublica', titulo: 'Política Pública', buscarPor: 'Buscar por política pública', placeholder: 'Política pública' },
  { nome: 'tipoDocumento', titulo: 'Tipo de Documento', buscarPor: 'Buscar por tipo de documento', placeholder: 'Tipo de documento' },
  { nome: 'abrangencia', titulo: 'Abrangência Territorial', buscarPor: 'Buscar por abrangência territorial', placeholder: 'Abrangência territorial' },
  { nome: 'ods', titulo: 'ODS', buscarPor: 'Buscar por ODS', placeholder: 'ODS' },
];

const CORES_ODS: { [n: number]: string } = {
  1: '#E5243B', 2: '#DDA63A', 3: '#4C9F38', 4: '#C5192D', 5: '#FF3A21',
  6: '#26BDE2', 7: '#FCC30B', 8: '#A21942', 9: '#FD6925', 10: '#DD1367',
  11: '#FD9D24', 12: '#BF8B2E', 13: '#3F7E44', 14: '#0A97D9', 15: '#56C02B',
  16: '#00689D', 17: '#19486A', 18: '#8b5cf6',
};

// Nomes oficiais dos ODS (inclui o 18 - Igualdade Etnico-Racial, adotado no Brasil).
// Usados como fallback quando o ODS nao aparece nos dados (barra zerada).
const NOMES_ODS: { [n: number]: string } = {
  1: 'Erradicação da Pobreza', 2: 'Fome Zero e Agricultura Sustentável',
  3: 'Saúde e Bem-Estar', 4: 'Educação de Qualidade', 5: 'Igualdade de Gênero',
  6: 'Água Potável e Saneamento', 7: 'Energia Limpa e Acessível',
  8: 'Trabalho Decente e Crescimento Econômico', 9: 'Indústria, Inovação e Infraestrutura',
  10: 'Redução das Desigualdades', 11: 'Cidades e Comunidades Sustentáveis',
  12: 'Consumo e Produção Responsáveis', 13: 'Ação Contra a Mudança Global do Clima',
  14: 'Vida na Água', 15: 'Vida Terrestre', 16: 'Paz, Justiça e Instituições Eficazes',
  17: 'Parcerias e Meios de Implementação', 18: 'Igualdade Étnico-Racial',
};

// Escala sequencial em tons de azul para o heatmap de Indicadores do Acervo.
// Valores menores: tons claros; valores maiores: tons escuros.
const ESCALA_HEATMAP = [
  '#E9EDF2',
  '#A9C4E8',
  '#7FA7D8',
  '#4E739C',
  '#1E5CC8',
  '#0B3A82',
];
// Paleta para as linhas da evolucao.
// eu tirei as cores (joao)
// Cor unica da aba de visualizacoes (barras do Top 10), conforme a proposta de design.
const COR_USO = '#0B6256';
const TOP_N = 10;
// Ate este numero de publicacoes o Top vira cards comparativos (recomendacao 3.1).
const TOP_MAX_CARDS = 4;

@Component({
  selector: 'ds-painel-estatisticas',
  templateUrl: './painel-estatisticas.component.html',
  styleUrls: ['./painel-estatisticas.component.scss'],
  imports: [
    DatePipe,
    DecimalPipe,
    FiltrosSidebarComponent,
    GraficoEchartsComponent,
    NuvemPalavrasComponent,
    RouterLink,
  ],
  providers: [PainelEstatisticasService],
})
export class PainelEstatisticasComponent implements AfterViewChecked, OnInit {

  private isBrowser: boolean;

  // Fade da tabela de politica publica: visivel so enquanto ha conteudo
  // abaixo do ponto de rolagem (some no fim e quando nao ha rolagem).
  @ViewChild('tabelaWrap') tabelaWrap?: ElementRef<HTMLElement>;
  fadeTabela = false;

  loading = true;
  recarregando = false;
  erro: string | null = null;
  aba: 'acervo' | 'visualizacoes' = 'acervo';

  grupos: GrupoFiltro[] = [];
  selecionados: { [nome: string]: Set<string> } = {};

  totalAvaliacoes = 0;
  totalInstituicoes = 0;

  ods: FacetValue[] = [];
  odsNaoInformado = 0;
  areaTematica: FacetValue[] = [];
  instituicao: FacetValue[] = [];
  tipoDocumento: FacetValue[] = [];
  abrangencia: FacetValue[] = [];
  politicaPublica: FacetValue[] = [];
  palavrasChave: FacetValue[] = [];

  anos: string[] = [];
  evolucaoSeries: SerieEvolucao[] = [];
  sparklinesVM: SparklineVM[] = [];
  matrizDocs: string[] = [];
  matrizAvals: string[] = [];
  matrizData: number[][] = [];
  mostrarTabelaMatriz = false;
  exportandoMatrizXlsx = false;
  erroExportacaoMatriz: string | null = null;
  matrizMax = 0;

/**
 * Ajusta a altura do heatmap conforme a quantidade
 * de tipos de documento apresentados.
 */
get alturaMatriz(): number {
  const alturaPorLinha = 58;
  const espacoAdicional = 100;

  return Math.max(
    210,
    Math.min(
      560,
      espacoAdicional + this.matrizDocs.length * alturaPorLinha
    )
  );
}

/**
 * Identifica quando a matriz pode ser apresentada
 * diretamente como tabela simplificada.
 */
get matrizPoucasCategorias(): boolean {
  return (
    this.matrizDocs.length > 0 &&
    this.matrizAvals.length > 0 &&
    this.matrizDocs.length <= 3 &&
    this.matrizAvals.length <= 3
  );
}

/**
 * Prepara as linhas da tabela acessível do heatmap.
 * Mantém os mesmos valores e a mesma ordenação visual.
 */
get linhasMatrizTabela(): {
  nome: string;
  valores: number[];
}[] {
  const totalColunas = this.matrizAvals.length;

  if (!totalColunas) {
    return [];
  }

  return this.matrizDocs
    .map((nome, y) => ({
      nome,
      valores: this.matrizAvals.map(
        (_avaliacao, x) =>
          this.matrizData[y * totalColunas + x]?.[2] ?? 0
      ),
    }))
    .reverse();
}

/** Exibe ou oculta a alternativa tabular do heatmap. */
alternarTabelaMatriz(): void {
  this.mostrarTabelaMatriz = !this.mostrarTabelaMatriz;
}


/**
 * Exporta a matriz Documento x Avaliação em CSV.
 * Utiliza os dados do recorte atual dos filtros.
 */
exportarMatrizCSV(): void {
  if (!this.isBrowser || !this.matrizData.length) {
    return;
  }

  // Protege campos textuais contra fórmulas em planilhas.
  const escapar = (valor: string | number): string => {
    if (typeof valor === 'number') {
      return String(valor);
    }

    const seguro = /^[\s]*[=+\-@]/.test(valor)
      ? `'${valor}`
      : valor;

    return `"${seguro.replace(/"/g, '""')}"`;
  };

  // Cabeçalhos com os nomes completos das avaliações.
  const linhas: (string | number)[][] = [
    ['Tipo de Documento', ...this.matrizAvals],
    ...this.linhasMatrizTabela.map(linha => [
      linha.nome,
      ...linha.valores,
    ]),
  ];

  const csv = '\uFEFF' + linhas
    .map(linha => linha.map(escapar).join(';'))
    .join('\r\n');

  const blob = new Blob([csv], {
    type: 'text/csv;charset=utf-8;',
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = url;
  link.download = 'rdapp-documento-avaliacao.csv';

  document.body.appendChild(link);
  link.click();
  link.remove();

  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Exporta Documento x Avaliação em formato Excel (.xlsx).
 * Preserva o recorte atual dos filtros e os valores numéricos.
 */
async exportarMatrizXLSX(): Promise<void> {
  if (!this.isBrowser || !this.matrizData.length ||
      this.exportandoMatrizXlsx) {
    return;
  }

  this.exportandoMatrizXlsx = true;
  this.erroExportacaoMatriz = null;

  try {
    // Carregamento apenas quando o usuário solicita a exportação.
    const { default: writeExcelFile } =
      await import('write-excel-file/browser');

    // Evita interpretar conteúdos externos como fórmulas.
    const textoSeguro = (valor: string): string =>
      /^\s*[=+\-@]/.test(valor)
        ? `'${valor}`
        : valor;

    // Cabeçalho com os nomes completos das avaliações.
    const cabecalho = [
      'Tipo de Documento',
      ...this.matrizAvals,
    ].map((nome) => ({
      value: textoSeguro(nome),
      fontWeight: 'bold' as const,
      backgroundColor: '#E9EDF2',
      textColor: '#0B3A82',
      wrap: true,
    }));

    // Dados da mesma matriz já utilizada na exportação CSV.
    const linhas = this.linhasMatrizTabela.map((linha) => [
      {
        value: textoSeguro(linha.nome),
        wrap: true,
      },
      ...linha.valores.map((valor) => ({
        value: valor,
      })),
    ]);

    const dados = [cabecalho, ...linhas];
    const colunas = [
      { width: 42 },
      ...this.matrizAvals.map(() => ({ width: 28 })),
    ];

    await writeExcelFile(dados, {
      sheet: 'Documento x Avaliacao',
      columns: colunas,
      stickyRowsCount: 1,
      stickyColumnsCount: 1,
    }).toFile('rdapp-documento-avaliacao.xlsx');

  } catch (erro) {
    console.error('Erro ao exportar XLSX:', erro);
    this.erroExportacaoMatriz =
      'Não foi possível gerar a planilha Excel.';
  } finally {
    this.exportandoMatrizXlsx = false;
  }
}


  // Exportação reutilizável para tabelas da aba Indicadores do Acervo.
  // O conteúdo é extraído dos dados apresentados, respeitando os filtros ativos.
  exportandoTabelaXlsx = false;
  erroExportacaoTabela: string | null = null;
arquivoErroExportacaoTabela: string | null = null;
  get linhasPoliticasExportacao(): (string | number)[][] {
    return this.politicaPublica.map((politica) => [politica.label, politica.count]);
  }


/**
 * Prepara os dados das instituições para CSV e XLSX.
 * Mantém os nomes completos e as quantidades do recorte atual.
 */
get linhasInstituicoesExportacao(): (string | number)[][] {
  return this.instituicao.map((item) => [
    item.label,
    item.count,
  ]);
}


/**
 * Prepara os dados de indicadores categóricos para CSV e XLSX.
 * Preserva os nomes completos, os valores numéricos
 * e os filtros atualmente aplicados no painel.
 */
linhasCategoriasExportacao(
  dados: FacetValue[]
): (string | number)[][] {
  return dados.map((item) => [
    item.label,
    item.count,
  ]);
}


/**
 * Prepara os dados dos ODS para exportação CSV e XLSX.
 *
 * Inclui os 18 objetivos, inclusive os que possuem
 * zero avaliações, e a categoria "Não informado".
 *
 * Mantém os valores numéricos e respeita os filtros
 * atualmente aplicados no painel.
 */
get linhasOdsExportacao(): (string | number)[][] {
  return this.odsCompleto.map((ods) => [
    ods.ni ? '—' : ods.num,
    ods.ni
      ? 'Não informado'
      : (NOMES_ODS[ods.num] ?? ods.label),
    ods.count,
  ]);
}


  /** Cabecalhos da exportacao de Ano de Publicacao (recorte atual). */
  get cabecalhosAnoExportacao(): string[] {
    return ['Instituição', ...this.anos];
  }

  /** Linhas exportadas: uma instituicao por linha, uma coluna por ano. */
  get linhasAnoExportacao(): (string | number)[][] {
    return this.evolucaoSeries.map((serie) => [serie.nome, ...serie.dados]);
  }

  exportarTabelaCSV(
    nomeArquivo: string,
    cabecalhos: string[],
    linhas: (string | number)[][],
  ): void {
    if (!this.isBrowser || !linhas.length) { return; }

    const escapar = (valor: string | number): string => {
      if (typeof valor === 'number') { return String(valor); }
      const seguro = /^\s*[=+\-@]/.test(valor) ? `'${valor}` : valor;
      return `"${seguro.replace(/"/g, '""')}"`;
    };

    const conteudo = [cabecalhos, ...linhas]
      .map((linha) => linha.map(escapar).join(';'))
      .join('\r\n');
    const blob = new Blob(['\uFEFF', conteudo], {
      type: 'text/csv;charset=utf-8;',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${nomeArquivo}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  async exportarTabelaXLSX(
    nomeArquivo: string,
    nomeAba: string,
    cabecalhos: string[],
    linhas: (string | number)[][],
  ): Promise<void> {
    if (!this.isBrowser || !linhas.length || this.exportandoTabelaXlsx) {
      return;
    }

    this.exportandoTabelaXlsx = true;
    this.erroExportacaoTabela = null;
    this.arquivoErroExportacaoTabela = null;
    try {
      const { default: writeExcelFile } =
        await import('write-excel-file/browser');
      const textoSeguro = (valor: string): string =>
        /^\s*[=+\-@]/.test(valor) ? `'${valor}` : valor;

      const cabecalho = cabecalhos.map((nome) => ({
        value: textoSeguro(nome),
        fontWeight: 'bold' as const,
        backgroundColor: '#E9EDF2',
        textColor: '#0B3A82',
        wrap: true,
      }));
      const conteudo = linhas.map((linha) =>
        linha.map((valor) => ({
          value: typeof valor === 'number' ? valor : textoSeguro(valor),
          wrap: typeof valor === 'string',
        })),
      );

      await writeExcelFile([cabecalho, ...conteudo], {
        sheet: nomeAba,
        columns: cabecalhos.map((_nome, indice) => ({
          width: indice === 0 ? 52 : 24,
        })),
        stickyRowsCount: 1,
      }).toFile(`${nomeArquivo}.xlsx`);

} catch (erro) {
  console.error('Erro ao exportar tabela em XLSX:', erro);

  this.arquivoErroExportacaoTabela = nomeArquivo;

  this.erroExportacaoTabela =
    'Não foi possível gerar a planilha Excel. Tente novamente.';

} finally {
  this.exportandoTabelaXlsx = false;
}

  }

  // Opcoes ECharts calculadas apos cada carga; ligadas aos <ds-grafico-echarts>.
  opcaoOdsVM: any = null;
  opcaoAreaVM: any = null;
  opcaoInstVM: any = null;
  opcaoAbrVM: any = null;
  opcaoTipoVM: any = null;
  opcaoAnoVM: any = null;
  opcaoMatrizVM: any = null;

  // ---- Aba 2: Total de Visualizacoes --------------------------------------
  // Fonte: GET /api/statistics/painel/uso (core statistics do Solr), cruzado com
  // os itens do recorte. usoIndisponivel = endpoint nao respondeu.
  usoIndisponivel = false;
  usoGeradoEm: string | null = null;
  totalSite = 0;
  totalDocsViews = 0;
  totalDownloads = 0;
  metricaTop: MetricaUso = 'views';
  itensUso: ItemUso[] = [];
  politicaUso: PoliticaUso[] = [];
  opcaoTopVM: any = null;
  mostrarTabelaTop = false;
  mostrarTabelaAno = false;

  constructor(
    private cdr: ChangeDetectorRef,
    private stats: PainelEstatisticasService,
    @Inject(PLATFORM_ID) platformId: object,
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  ngOnInit(): void {
    if (!this.isBrowser) { return; }
    this.carregar();
  }

  /**
   * Reavalia o fade sempre que a view muda (tabela aparece, dados trocam por
   * causa de filtro, etc). O guard de igualdade evita loop de deteccao.
   */
  ngAfterViewChecked(): void {
    const fade = this.calcularFadeTabela();
    if (fade !== this.fadeTabela) {
      this.fadeTabela = fade;
      this.cdr.detectChanges();
    }
  }

  atualizarFadeTabela(): void {
    this.fadeTabela = this.calcularFadeTabela();
  }

  private calcularFadeTabela(): boolean {
    const el = this.tabelaWrap?.nativeElement;
    if (!el) { return false; }
    // margem de 4px absorve arredondamento de zoom/subpixel
    return el.scrollHeight - el.scrollTop - el.clientHeight > 4;
  }


/**
 * Exporta os cards de Abrangência Territorial.
 */
exportarCardsAbrangencia(
  formato: 'png' | 'jpeg'
): void {
  exportarCategoriasImagem(
    this.abrangencia,
    'Abrangência Territorial',
    'rdapp-abrangencia-territorial',
    formato
  );
}


/**
 * Exporta os cards de Área Temática em PNG ou JPG.
 * Utiliza os dados filtrados exibidos no painel.
 */
exportarCardsAreaTematica(
  formato: 'png' | 'jpeg'
): void {
  exportarCategoriasImagem(
    this.areaTematica,
    'Área Temática',
    'rdapp-area-tematica',
    formato
  );
}


/**
 * Exporta a apresentação simplificada de Instituição.
 * Utilizada quando existem de 1 a 3 instituições.
 */
exportarCardsInstituicao(
  formato: 'png' | 'jpeg'
): void {
  exportarCategoriasImagem(
    this.instituicao,
    'Instituição',
    'rdapp-instituicao',
    formato
  );
}

/**
 * Exporta Documento x Avaliação quando a matriz
 * aparece como valor único ou tabela simplificada.
 */
exportarMatrizSimplificadaImagem(
  formato: 'png' | 'jpeg'
): void {
  if (!this.matrizPoucasCategorias) {
    return;
  }

  const dados = this.linhasMatrizTabela.flatMap((linha) =>
    linha.valores.map((valor, coluna) => ({
      label:
        `Documento: ${linha.nome} | ` +
        `Avaliação: ${this.matrizAvals[coluna]}`,
      count: valor,
    }))
  );

  exportarCategoriasImagem(
    dados,
    'Documento × Avaliação',
    'rdapp-documento-avaliacao',
    formato
  );
}


/**
 * Exporta os cards dos ODS em PNG ou JPG.
 * Mantém os números, nomes e cores dos objetivos.
 */
exportarCardsOds(
  formato: 'png' | 'jpeg'
): void {

  const dados = this.odsComDados.map((ods) => ({
    label: `ODS ${ods.num} — ${ods.nome}`,
    count: ods.count,
    cor: ods.cor,
  }));

  // Inclui avaliações sem ODS informado.
  if (this.odsNaoInformado > 0) {
    dados.push({
      label: 'Não informado',
      count: this.odsNaoInformado,
      cor: '#9AA5B1',
    });
  }

  if (!dados.length) {
    return;
  }

  exportarCategoriasImagem(
    dados,
    'Objetivos de Desenvolvimento Sustentável',
    'rdapp-ods',
    formato
  );
}


/**
 * Exporta todas as sparklines de Ano de Publicação
 * em uma imagem consolidada.
 */
exportarSparklinesImagem(formato: 'png' | 'jpeg'): void {
  if (!this.isBrowser ||
      !this.anos.length ||
      this.evolucaoSeries.length <= 3) {
    return;
  }

  const largura = 1400;
  const canvas = document.createElement('canvas');
  canvas.width = largura;
  canvas.height = 200;

  const ctx = canvas.getContext('2d');
  if (!ctx) { return; }

  // Divide nomes longos em várias linhas.
  ctx.font = '20px Arial';

  const quebrarTexto = (texto: string): string[] => {
    const linhas: string[] = [];
    let atual = '';

    texto.split(/\s+/).forEach((palavra) => {
      const teste = atual ? `${atual} ${palavra}` : palavra;

      if (atual && ctx.measureText(teste).width > 500) {
        linhas.push(atual);
        atual = palavra;
      } else {
        atual = teste;
      }
    });

    if (atual) { linhas.push(atual); }
    return linhas;
  };

  const registros = this.evolucaoSeries.map((serie) => ({
    serie,
    linhasNome: quebrarTexto(serie.nome),
  }));

  const alturas = registros.map((r) =>
    Math.max(145, r.linhasNome.length * 27 + 48)
  );

  const altura = 145 + alturas.reduce(
    (total, valor) => total + valor, 0
  ) + 65;

  canvas.height = altura;

  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, largura, altura);

  // Cabeçalho.
  ctx.fillStyle = '#0B3A82';
  ctx.font = 'bold 32px Arial';
  ctx.fillText('Ano de Publicação', 45, 65);

  ctx.fillStyle = '#555555';
  ctx.font = '19px Arial';
  ctx.fillText(
    'Evolução por instituição — dados do recorte selecionado',
    45, 100
  );

  const maximo = Math.max(
    1,
    ...this.evolucaoSeries.flatMap((s) => s.dados)
  );

  const inicioX = 640;
  const larguraGrafico = 570;
  const alturaGrafico = 65;

  let topo = 145;

  registros.forEach((registro, indice) => {
    const serie = registro.serie;
    const alturaLinha = alturas[indice];

    // Fundo alternado para facilitar a leitura.
    if (indice % 2 === 0) {
      ctx.fillStyle = '#F4F7FB';
      ctx.fillRect(30, topo, largura - 60, alturaLinha);
    }

    // Nome completo da instituição.
    ctx.fillStyle = '#223344';
    ctx.font = '20px Arial';

    registro.linhasNome.forEach((linha, i) => {
      ctx.fillText(linha, 48, topo + 35 + i * 27);
    });

    const baseY = topo + 103;

    // Linha de referência.
    ctx.strokeStyle = '#D2DCE8';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(inicioX, baseY);
    ctx.lineTo(inicioX + larguraGrafico, baseY);
    ctx.stroke();

    // Evolução dos dados.
    ctx.strokeStyle = '#5B84B1';
    ctx.lineWidth = 4;
    ctx.lineJoin = 'round';
    ctx.beginPath();

    serie.dados.forEach((valor, i) => {
      const x = this.anos.length === 1
        ? inicioX + larguraGrafico / 2
        : inicioX + i * larguraGrafico /
          (this.anos.length - 1);

      const y = baseY -
        (valor / maximo) * alturaGrafico;

      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });

    ctx.stroke();

    // Indica o último valor da série.
    const ultimo = serie.dados[serie.dados.length - 1] ?? 0;

    ctx.fillStyle = '#0B3A82';
    ctx.font = 'bold 24px Arial';
    ctx.fillText(
      ultimo.toLocaleString('pt-BR'),
      1260,
      topo + 67
    );

    ctx.fillStyle = '#555555';
    ctx.font = '15px Arial';
    ctx.fillText('avaliações', 1260, topo + 89);

    // Anos de início e término.
    ctx.font = '15px Arial';
    ctx.fillText(this.anos[0], inicioX, topo + 126);

    if (this.anos.length > 1) {
      ctx.fillText(
        this.anos[this.anos.length - 1],
        inicioX + larguraGrafico - 45,
        topo + 126
      );
    }

    topo += alturaLinha;
  });

  // Gera o arquivo.
  const extensao = formato === 'jpeg' ? 'jpg' : 'png';

  const link = document.createElement('a');
  link.href = canvas.toDataURL(
    formato === 'jpeg' ? 'image/jpeg' : 'image/png',
    0.95
  );
  link.download = `rdapp-ano-publicacao.${extensao}`;

  document.body.appendChild(link);
  link.click();
  link.remove();
}


  // ---- Filtros -----------------------------------------------------------

  toggleFiltro(nome: string, valor: string): void {
    const conj = this.selecionados[nome] ?? new Set<string>();
    if (conj.has(valor)) {
      conj.delete(valor);
    } else {
      conj.add(valor);
    }
    this.selecionados[nome] = conj;
    this.recarregar();
  }
  limparFiltros(): void {
    // O botao "Redefinir filtros" agora e permanente (CA10); sem selecao ativa
    // o clique nao dispara recarga.
    const temSelecao = Object.values(this.selecionados).some((s) => s.size > 0);
    if (!temSelecao) { return; }
    Object.keys(this.selecionados).forEach((k) => this.selecionados[k].clear());
    this.recarregar();
  }
  private recarregar(): void { this.recarregando = true; this.carregar(); }

  private paramsFiltro(excluir?: string): string {
    let p = '';
    Object.keys(this.selecionados).forEach((nome) => {
      if (nome === excluir || this.selecionados[nome].size === 0) { return; }
      if (nome === 'dateIssued') {
        const anos = [...this.selecionados[nome]].sort();
        const intervalo = `[${anos[0]} TO ${anos[anos.length - 1]}]`;
        p += `&f.dateIssued=${encodeURIComponent(intervalo)},equals`;
      } else {
        this.selecionados[nome].forEach((valor) => {
          p += `&f.${nome}=${encodeURIComponent(valor)},equals`;
        });
      }
    });
    return p;
  }

  // ---- Carregamento ------------------------------------------------------

  /**
   * Busca uma faceta em DOIS escopos:
   * - grafico: com TODOS os filtros ativos (o endpoint de facets aplica o
   *   filtro do proprio campo — verificado na instancia com curl);
   * - sidebar: excluindo o proprio grupo, para as demais opcoes continuarem
   *   visiveis e selecionaveis em conjunto (multi-selecao).
   * Sem selecao no grupo os escopos sao identicos e ha UMA requisicao.
   */
  private fetchFacetDupla(nome: string): Observable<{ grafico: FacetValue[]; sidebar: FacetValue[] }> {
    const grafico$ = this.stats.fetchFacet(nome, this.paramsFiltro());
    if ((this.selecionados[nome]?.size ?? 0) === 0) {
      return grafico$.pipe(map((v) => ({ grafico: v, sidebar: v })));
    }
    return forkJoin({ grafico: grafico$, sidebar: this.stats.fetchFacet(nome, this.paramsFiltro(nome)) });
  }

  /**
   * Cinto de seguranca do GRAFICO: com selecao ativa no grupo, garante que so
   * os valores selecionados aparecam, mesmo que o operador "equals" do DSpace
   * case por token e traga valores parecidos (ou que alguma versao do backend
   * exclua o filtro do proprio campo no facet). Sem selecao, retorna tudo.
   */
  private paraGrafico(nome: string, facet: FacetValue[]): FacetValue[] {
    const sel = this.selecionados[nome];
    if (!sel || sel.size === 0) { return facet; }
    return facet.filter((v) => sel.has(v.label));
  }

  private carregar(): void {
    forkJoin({
      total: this.stats.fetchTotalItens(this.paramsFiltro()),
      comOds: this.stats.fetchComOds(this.paramsFiltro()),
      ods: this.fetchFacetDupla('ods'),
      areaTematica: this.fetchFacetDupla('areaTematica'),
      instituicao: this.fetchFacetDupla('instituicao'),
      tipoDocumento: this.fetchFacetDupla('tipoDocumento'),
      abrangencia: this.fetchFacetDupla('abrangencia'),
      politicaPublica: this.fetchFacetDupla('politicaPublica'),
      itens: this.stats.fetchItens(this.paramsFiltro()),
      itensAno: this.stats.fetchItens(this.paramsFiltro('dateIssued')),
      uso: this.stats.fetchUso(),
    }).subscribe({
      next: (r) => {
        this.totalAvaliacoes = r.total;
        // Graficos: escopo completo + intersecao com a selecao do grupo.
        this.ods = this.paraGrafico('ods', r.ods.grafico);
        // Avaliacoes sem nenhum ODS (Nao Informado), no mesmo escopo do grafico:
        // total com todos os filtros menos as que tem ao menos um ODS. Calculado
        // no servidor; independe do teto de paginacao de fetchItens.
        this.odsNaoInformado = Math.max(0, r.total - r.comOds);
        this.areaTematica = this.paraGrafico('areaTematica', r.areaTematica.grafico);
        this.instituicao = this.paraGrafico('instituicao', r.instituicao.grafico);
        this.tipoDocumento = this.paraGrafico('tipoDocumento', r.tipoDocumento.grafico);
        this.abrangencia = this.paraGrafico('abrangencia', r.abrangencia.grafico);
        this.politicaPublica = this.paraGrafico('politicaPublica', r.politicaPublica.grafico);
        this.totalInstituicoes = this.instituicao.length;

        this.agregarEvolucao(r.itens);
        this.agregarMatriz(r.itens);
        this.agregarPalavras(r.itens);
        this.agregarUso(r.itens, r.uso);
        this.construirOpcoes(r);

        this.recomputarGraficos();
        this.loading = false;
        this.recarregando = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.erro = 'Nao foi possivel carregar os indicadores. Verifique se o backend esta no ar em ' + this.stats.apiBase;
        this.loading = false;
        this.recarregando = false;
      },
    });
  }

  private construirOpcoes(r: any): void {
    const anoOpcoes: OpcaoFiltro[] = this.contarAnos(r.itensAno ?? [])
      .map((a) => ({ rotulo: a.ano, valor: a.ano, count: a.count }))
      .reverse();

    // Opcoes da sidebar no escopo que EXCLUI o proprio grupo (multi-selecao).
    const opcoesPorNome: { [nome: string]: OpcaoFiltro[] } = {
      dateIssued: anoOpcoes,
      instituicao: this.paraOpcoes(r.instituicao.sidebar),
      areaTematica: this.paraOpcoes(r.areaTematica.sidebar),
      politicaPublica: this.paraOpcoes(r.politicaPublica.sidebar),
      tipoDocumento: this.paraOpcoes(r.tipoDocumento.sidebar),
      abrangencia: this.paraOpcoes(r.abrangencia.sidebar),
      ods: this.paraOpcoesOds(r.ods.sidebar),
    };
    // Ordem e textos vem da fonte unica GRUPOS_FILTRO (item 4.1 / CA18).
    this.grupos = GRUPOS_FILTRO.map((d) => ({
      nome: d.nome,
      titulo: d.titulo,
      buscarPor: d.buscarPor,
      placeholder: d.placeholder,
      opcoes: opcoesPorNome[d.nome] ?? [],
    }));
    this.grupos.forEach((g) => {
      if (!this.selecionados[g.nome]) { this.selecionados[g.nome] = new Set<string>(); }
    });
  }

  private paraOpcoes(dados: FacetValue[]): OpcaoFiltro[] {
    return dados
      .map((v) => ({ rotulo: v.label, valor: v.label, count: v.count }))
      .sort((a, b) => a.rotulo.localeCompare(b.rotulo, 'pt-BR', { sensitivity: 'base' }));
  }

  private paraOpcoesOds(dados: FacetValue[]): OpcaoFiltro[] {
    return dados
      .map((v) => ({ rotulo: v.label, valor: v.label, count: v.count }))
      .sort((a, b) => this.numeroOds(a.rotulo) - this.numeroOds(b.rotulo));
  }

  private contarAnos(itens: any[]): { ano: string; count: number }[] {
    const porAno: { [ano: string]: number } = {};
    itens.forEach((it) => {
      (it?.metadata?.['dc.date.issued'] ?? []).forEach((v: any) => {
        const ano = (v?.value ?? '').substring(0, 4);
        if (/^\d{4}$/.test(ano)) { porAno[ano] = (porAno[ano] || 0) + 1; }
      });
    });
    return Object.keys(porAno).sort().map((ano) => ({ ano, count: porAno[ano] }));
  }

  // ---- Render ------------------------------------------------------------

  trocarAba(aba: 'acervo' | 'visualizacoes'): void {
    this.aba = aba;
  }

  private recomputarGraficos(): void {
    this.opcaoOdsVM = this.opcaoOds();
    this.opcaoAreaVM = this.opcaoBarras(this.areaTematica, '#1E5CC8');
    this.opcaoInstVM = this.opcaoDotPlot(this.instituicao);
    this.opcaoAbrVM = this.opcaoLollipop(this.abrangencia);
    this.opcaoTipoVM = this.opcaoBarras(this.tipoDocumento, '#1f4ea3');
    this.opcaoAnoVM = this.opcaoLinhaTempo();
    this.sparklinesVM = this.construirSparklines();
    this.opcaoMatrizVM = this.opcaoMatriz();
    this.opcaoTopVM = this.opcaoTop();
  }

  // ---- Agregacoes --------------------------------------------------------

  /** Evolucao por ano, uma serie (linha) por instituicao. */
  private agregarEvolucao(itens: any[]): void {
    const porInst: { [inst: string]: { [ano: string]: number } } = {};
    const totalInst: { [inst: string]: number } = {};
    const anosSet = new Set<string>();

    itens.forEach((it) => {
      const anos = (it?.metadata?.['dc.date.issued'] ?? [])
        .map((v: any) => (v?.value ?? '').substring(0, 4))
        .filter((a: string) => /^\d{4}$/.test(a));
      if (!anos.length) { return; }
      const ano = anos[0];
      anosSet.add(ano);
      const insts = (it?.metadata?.['local.instituicao'] ?? []).map((v: any) => v.value);
      (insts.length ? insts : ['Não informado']).forEach((inst: string) => {
        porInst[inst] = porInst[inst] || {};
        porInst[inst][ano] = (porInst[inst][ano] || 0) + 1;
        totalInst[inst] = (totalInst[inst] || 0) + 1;
      });
    });

    this.anos = [...anosSet].sort();
    const insts = Object.keys(totalInst).sort((a, b) => totalInst[b] - totalInst[a]);
    this.evolucaoSeries = insts.map((inst) => ({
      nome: inst,
      dados: this.anos.map((a) => porInst[inst][a] || 0),
    }));
  }

  /** Matriz Tipo de Documento x Tipo de Avaliacao, eixos ordenados por total. */
  private agregarMatriz(itens: any[]): void {
    const pares: { [k: string]: number } = {};
    const totalDoc: { [d: string]: number } = {};
    const totalAval: { [a: string]: number } = {};
    itens.forEach((it) => {
      const td = (it?.metadata?.['local.tipodocumento'] ?? []).map((v: any) => v.value);
      const ta = (it?.metadata?.['local.tipoavaliacao'] ?? []).map((v: any) => v.value);
      td.forEach((d: string) => ta.forEach((a: string) => {
        pares[`${d}||${a}`] = (pares[`${d}||${a}`] || 0) + 1;
        totalDoc[d] = (totalDoc[d] || 0) + 1;
        totalAval[a] = (totalAval[a] || 0) + 1;
      }));
    });
    // Documentos de maior total no TOPO (Y ascendente: maior no fim do array = topo).
    // Avaliacoes de maior total a ESQUERDA (X descendente: maior no inicio = esquerda).
    // Resultado: as celulas mais quentes se concentram no canto superior ESQUERDO.
    this.matrizDocs = Object.keys(totalDoc).sort((a, b) => totalDoc[a] - totalDoc[b]);
    this.matrizAvals = Object.keys(totalAval).sort((a, b) => totalAval[b] - totalAval[a]);
    this.matrizData = [];
    this.matrizMax = 0;
    this.matrizDocs.forEach((d, y) => {
      this.matrizAvals.forEach((a, x) => {
        const v = pares[`${d}||${a}`] || 0;
        this.matrizMax = Math.max(this.matrizMax, v);
        this.matrizData.push([x, y, v]);
      });
    });
  }

  /** Nuvem por FREQUENCIA: conta dc.subject nos itens e pega os mais frequentes. */
  private agregarPalavras(itens: any[]): void {
    const cont: { [t: string]: number } = {};
    itens.forEach((it) => {
      (it?.metadata?.['dc.subject'] ?? []).forEach((v: any) => {
        const t = (v?.value ?? '').trim();
        if (t) { cont[t] = (cont[t] || 0) + 1; }
      });
    });
    this.palavrasChave = Object.keys(cont)
      .map((t) => ({ label: t, count: cont[t] } as FacetValue))
      .sort((a, b) => b.count - a.count)
      .slice(0, 40);
  }

  /**
   * Cruza os itens do recorte (ja filtrados pela sidebar) com as contagens de uso
   * por item do endpoint. Daqui saem os cards, o Top 10 e a tabela de politicas.
   * Sem filtro ativo, os cards mostram os totais do backend (fonte da verdade,
   * cobrem todo o acervo); com filtro, a soma dos itens do recorte.
   */
  private agregarUso(itens: any[], uso: PainelUso | null): void {
    this.usoIndisponivel = uso == null;
    if (!uso) {
      this.usoGeradoEm = null;
      this.totalSite = 0;
      this.totalDocsViews = 0;
      this.totalDownloads = 0;
      this.itensUso = [];
      this.politicaUso = [];
      return;
    }
    this.usoGeradoEm = uso.geradoEm;
    const zero: UsoItem = { views: 0, downloads: 0 };
    const porPolitica: { [p: string]: PoliticaUso } = {};
    let somaViews = 0;
    let somaDownloads = 0;

    this.itensUso = itens.map((it) => {
      const id: string = it?.uuid ?? it?.id ?? '';
      const u = uso.porItem.get(id) ?? zero;
      somaViews += u.views;
      somaDownloads += u.downloads;
      (it?.metadata?.['local.politicapublica'] ?? []).forEach((v: any) => {
        const nome = (v?.value ?? '').trim();
        if (!nome) { return; }
        porPolitica[nome] = porPolitica[nome] ?? { label: nome, views: 0, downloads: 0 };
        porPolitica[nome].views += u.views;
        porPolitica[nome].downloads += u.downloads;
      });
      return {
        id,
        titulo: this.tituloItem(it),
        instituicao: this.sigla(this.primeiroValor(it, 'local.instituicao')),
        ano: this.primeiroValor(it, 'dc.date.issued').substring(0, 4),
        views: u.views,
        downloads: u.downloads,
      };
    });

    this.totalSite = uso.totais.site;
    if (this.temFiltroAtivo) {
      this.totalDocsViews = somaViews;
      this.totalDownloads = somaDownloads;
    } else {
      this.totalDocsViews = uso.totais.documentos;
      this.totalDownloads = uso.totais.downloads;
    }
    this.politicaUso = Object.values(porPolitica)
      .sort((a, b) => b.views - a.views || b.downloads - a.downloads || a.label.localeCompare(b.label, 'pt-BR'));
  }

  private tituloItem(it: any): string {
    return this.primeiroValor(it, 'dc.title') || 'Sem título';
  }

  private primeiroValor(it: any, campo: string): string {
    return ((it?.metadata?.[campo] ?? [])[0]?.value ?? '').trim();
  }

  get temFiltroAtivo(): boolean {
    return Object.values(this.selecionados).some((sel) => sel.size > 0);
  }

  /**
   * Ha visualizacoes de documento ou downloads (no acervo ou no recorte)? Controla o
   * estado vazio da aba 2: so esses eventos alimentam o Top 10 e a tabela; o total
   * do site (home, colecoes) aparece no card mesmo sem eles.
   */
  get temEventosUso(): boolean {
    return this.totalDocsViews > 0 || this.totalDownloads > 0;
  }

  get rotuloMetricaTop(): string {
    return this.metricaTop === 'views' ? 'visualizações' : 'downloads';
  }

  /** Top N itens pela metrica selecionada, maior primeiro; ignora itens sem uso. */
  get topItens(): ItemUso[] {
    const m = this.metricaTop;
    return this.itensUso
      .filter((i) => i[m] > 0)
      .sort((a, b) => b[m] - a[m] || a.titulo.localeCompare(b.titulo, 'pt-BR'))
      .slice(0, TOP_N);
  }

  /** Com poucas publicacoes (1 a 4) o ranking vira cards comparativos (recomendacao 3.1). */
  get topEmCards(): boolean {
    const n = this.topItens.length;
    return n > 0 && n <= TOP_MAX_CARDS;
  }

  /** Altura do grafico proporcional ao numero de barras, para nao sobrar espaco vazio. */
  get alturaTop(): number {
    return 56 + 44 * this.topItens.length;
  }

  /** Sintese textual do ranking (recomendacao 4.1): quem lidera e quanto o Top representa. */
  get sinteseTop(): string {
    const top = this.topItens;
    if (!top.length) { return ''; }
    const m = this.metricaTop;
    const soma = top.reduce((acc, i) => acc + i[m], 0);
    const total = m === 'views' ? this.totalDocsViews : this.totalDownloads;
    const lider = `«${top[0].titulo}» lidera com ${this.fmt(top[0][m])} ${this.rotuloMetricaTop}`;
    if (top.length === 1) { return `${lider}.`; }
    const pct = total > 0 ? Math.round((soma / total) * 100) : 0;
    return `${lider}; as ${top.length} publicações listadas somam ${this.fmt(soma)} (${pct}% das ${this.rotuloMetricaTop} nos documentos).`;
  }

  private fmt(n: number): string {
    return n.toLocaleString('pt-BR');
  }

  trocarMetricaTop(m: MetricaUso): void {
    if (m === this.metricaTop) { return; }
    this.metricaTop = m;
    this.opcaoTopVM = this.opcaoTop();
  }

  alternarTabelaTop(): void {
    this.mostrarTabelaTop = !this.mostrarTabelaTop;
  }

  /** Exibe ou oculta a alternativa tabular do Ano de Publicação. */
alternarTabelaAno(): void {
  this.mostrarTabelaAno = !this.mostrarTabelaAno;
}

  /** Sigla curta de uma instituicao ("... - CMAP" -> "CMAP"). */
  private sigla(nome: string): string {
    const partes = nome.split(' - ');
    return partes.length > 1 ? partes[partes.length - 1] : nome;
  }

  // ---- Opcoes de cada grafico -------------------------------------------

  private opcaoOds(): any {
    if (!this.totalAvaliacoes) { return null; }
    const dados = this.odsCompleto;
    return {
      tooltip: {
        trigger: 'axis', axisPointer: { type: 'shadow' },
        formatter: (params: any) => {
          const o = dados[params[0].dataIndex];
          return `${o.label}<br/><b>${o.count}</b> avaliações`;
        },
      },
      grid: { left: 40, right: 16, top: 36, bottom: 40 },
      xAxis: { type: 'category', data: dados.map((o) => (o.ni ? 'N/I' : String(o.num))), axisLabel: { interval: 0 } },
      yAxis: { type: 'value' },
series: [{
  type: 'bar',

  data: dados.map((o) => ({
    value: o.count,
    name: o.label,
    itemStyle: {
      color: o.cor,
    },
  })),

  label: {
    show: true,
    position: 'top',
    distance: 5,

    color: '#4F5B66',
    fontSize: 11,
    fontWeight: 600,

    formatter: (params: any) => {
      const valor = Number(params.value);

      return valor > 0
        ? valor.toLocaleString('pt-BR')
        : '';
    },
  },
}],

    };
  }

  private opcaoBarras(dados: FacetValue[], cor: string): any {
    if (!dados.length) { return null; }
    const invertido = [...dados].reverse();
    return {
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
      grid: { left: 8, right: 24, top: 8, bottom: 8, containLabel: true },
      xAxis: { type: 'value' },
      yAxis: { type: 'category', data: invertido.map((v) => v.label), axisLabel: { width: 220, overflow: 'truncate' } },
      series: [{
        type: 'bar',
        data: invertido.map((v) => v.count),
        itemStyle: { color: cor, borderRadius: [0, 4, 4, 0] },
        label: { show: true, position: 'right' },
      }],
    };
  }

  /** Top 10 em barras horizontais: titulo truncado no eixo, valor na ponta da barra. */
  private opcaoTop(): any {
    const top = this.topItens;
    if (!top.length) { return null; }
    const m = this.metricaTop;
    const invertido = [...top].reverse();
    return {
      tooltip: {
        trigger: 'axis', axisPointer: { type: 'shadow' },
        formatter: (params: any) => {
          const i = invertido[params[0].dataIndex];
          return `${i.titulo}<br/><b>${i[m]}</b> ${this.rotuloMetricaTop}`;
        },
      },
      grid: { left: 8, right: 48, top: 8, bottom: 8, containLabel: true },
      xAxis: { type: 'value', minInterval: 1 },
      yAxis: {
        type: 'category',
        data: invertido.map((i) => i.titulo),
        axisLabel: { width: 260, overflow: 'truncate' },
      },
      series: [{
        type: 'bar',
        data: invertido.map((i) => i[m]),
        itemStyle: { color: COR_USO, borderRadius: [0, 4, 4, 0] },
        label: { show: true, position: 'right' },
      }],
    };
}
/**
 * Lollipop horizontal para Abrangência Territorial.
 * Quantidades absolutas de avaliações (sem percentuais).
 */
private opcaoLollipop(dados: FacetValue[]): any {
  if (!dados.length) { return null; }

  // A ordem é invertida porque a primeira categoria fica na base do eixo Y.
  const ordenados = [...dados].sort((a, b) => a.count - b.count);
  const maiorValor = Math.max(1, ...ordenados.map((d) => d.count));

  return {
    animation: false,
    tooltip: {
      trigger: 'item',
      renderMode: 'richText',
      formatter: (p: any) => {
        const quantidade = Array.isArray(p.value) ? p.value[0] : p.value;
        return `${p.name}\n${Number(quantidade).toLocaleString('pt-BR')} avaliações`;
      },
    },
    grid: { left: 235, right: 65, top: 20, bottom: 40, containLabel: false },
    xAxis: {
      type: 'value',
      min: 0,
      max: Math.ceil(maiorValor * 1.2),
      minInterval: 1,
      name: 'Número de avaliações',
      nameLocation: 'middle',
      nameGap: 30,
      axisLabel: { color: '#6A6F76' },
      splitLine: { lineStyle: { color: '#E9EDF2' } },
    },
    yAxis: {
      type: 'category',
      data: ordenados.map((d) => d.label),
      axisLabel: { color: '#6A6F76', width: 205, overflow: 'break', lineHeight: 17, fontSize: 12 },
      axisLine: { show: false },
      axisTick: { show: false },
    },
    series: [
      {
        name: 'Hastes',
        type: 'bar',
        barWidth: 2,
        silent: true,
        data: ordenados.map((d) => ({ name: d.label, value: d.count })),
        itemStyle: { color: '#5F8CC4' },
      },
      {
        name: 'Avaliações',
        type: 'scatter',
        symbol: 'circle',
        symbolSize: 15,
        data: ordenados.map((d) => ({ name: d.label, value: [d.count, d.label] })),
        itemStyle: { color: '#5F8CC4' },
        label: {
          show: true,
          position: 'right',
          distance: 8,
          color: '#0B3A82',
          fontWeight: 'bold',
          fontSize: 12,
          formatter: (p: any) => Number(p.value[0]).toLocaleString('pt-BR'),
        },
        emphasis: { scale: 1.3 },
      },
    ],
  };
}

/**
 * Dot plot horizontal para comparar o número de avaliações por instituição.
 */
private opcaoDotPlot(dados: FacetValue[]): any {
  if (!dados.length) { return null; }

  const ordenados = [...dados].sort((a, b) => a.count - b.count);
  return {
    tooltip: {
      trigger: 'item',
      formatter: (p: any) => {
        const d = ordenados[p.dataIndex];
        return `${d.label}<br/><b>${d.count.toLocaleString('pt-BR')}</b> avaliações`;
      },
    },
    grid: { left: 330, right: 85, top: 15, bottom: 30, containLabel: false },
    xAxis: {
      type: 'value',
      min: 0,
      minInterval: 1,
      axisLabel: { color: '#6A6F76' },
      splitLine: { lineStyle: { color: '#E9EDF2' } },
    },
    yAxis: {
      type: 'category',
      data: ordenados.map((d) => d.label),
      axisLabel: {
        color: '#6A6F76', width: 290, overflow: 'break',
        lineHeight: 16, fontSize: 12, margin: 12, align: 'right',
      },
      axisLine: { show: false },
      axisTick: { show: false },
    },
    series: [{
      type: 'scatter',
      symbolSize: 14,
      data: ordenados.map((d, indice) => ({ name: d.label, value: [d.count, indice] })),
      itemStyle: { color: '#0B3A82' },
      label: {
        show: true,
        position: 'right',
        color: '#4F5B66',
        formatter: (p: any) => Number(p.value[0]).toLocaleString('pt-BR'),
      },
      emphasis: { scale: 1.3 },
    }],
  };
}

/**
 * Cria uma sparkline para cada instituição.
 * Todas usam o mesmo intervalo temporal e a mesma escala.
 */
private construirSparklines(): SparklineVM[] {
  if (!this.anos.length || !this.evolucaoSeries.length) {
    return [];
  }

  const maximo = Math.max(
    1,
    ...this.evolucaoSeries.flatMap((s) => s.dados)
  );

  return this.evolucaoSeries.map((serie) => ({
    nome: serie.nome,
    valorFinal: serie.dados[serie.dados.length - 1] ?? 0,

    opcao: {
      animation: false,

      tooltip: {
        trigger: 'axis',
      },

      grid: {
        left: 8,
        right: 8,
        top: 5,
        bottom: 5,
      },

      xAxis: {
        type: 'category',
        data: this.anos,
        boundaryGap: false,
        show: false,
      },

      yAxis: {
        type: 'value',
        min: 0,
        max: maximo,
        show: false,
      },

      series: [{
        name: serie.nome,
        type: 'line',
        data: serie.dados,
        smooth: false,
        showSymbol: false,

        lineStyle: {
          color: '#5B84B1',
          width: 2.5,
        },

        itemStyle: {
          color: '#5B84B1',
        },
      }],
    },
  }));
}



/**
 * Gráfico de linhas convencional para até 3 instituições.
 * Usa uma única tonalidade de azul, com marcadores e
 * estilos de linha distintos para acessibilidade.
 */
private opcaoLinhaTempo(): any {
  if (!this.anos.length || !this.evolucaoSeries.length) {
    return null;
  }

  const corLinha = '#5B84B1';
  const simbolos = ['circle', 'diamond', 'triangle'];
  const estilos = ['solid', 'dashed', 'dotted'];

  return {
    animation: false,

    tooltip: {
      trigger: 'axis',
    },

    legend: {
      show: false,
    },

    grid: {
      left: 48,
      right: 220,
      top: 24,
      bottom: 40,
    },

    xAxis: {
      type: 'category',
      data: this.anos,
      boundaryGap: false,
      axisLabel: {
        color: '#6A6F76',
      },
    },

    yAxis: {
      type: 'value',
      min: 0,
      minInterval: 1,
      axisLabel: {
        color: '#6A6F76',
      },
      splitLine: {
        lineStyle: {
          color: '#E9EDF2',
        },
      },
    },

    series: this.evolucaoSeries.map((serie, i) => {
      const ultimoValor =
        serie.dados[serie.dados.length - 1] ?? 0;

      return {
        name: serie.nome,
        type: 'line',

        data: serie.dados,
        smooth: false,

        showSymbol: true,
        symbol: simbolos[i % simbolos.length],
        symbolSize: 7,

        lineStyle: {
          color: corLinha,
          width: 2.5,
          type: estilos[i % estilos.length],
        },

        itemStyle: {
          color: corLinha,
        },


endLabel: {
  show: true,

  formatter: () => {
    const nome = serie.nome;

    // Identifica siglas entre parênteses.
    const siglaFinal = nome.match(/\(([^()]+)\)\s*$/);
    const quantidadeSiglas = (nome.match(/\(/g) ?? []).length;

    // Só utiliza a sigla isoladamente quando não há
    // várias instituições identificadas no mesmo nome.
    const rotulo = siglaFinal && quantidadeSiglas === 1
      ? siglaFinal[1]
      : this.sigla(nome);

    return `${rotulo}: ${ultimoValor.toLocaleString('pt-BR')}`;
  },

  color: '#0B3A82',
  fontSize: 12,
  fontWeight: 600,
  distance: 8,
  width: 200,
  overflow: 'break',
},

      };
    }),
  };
}


  /** Heatmap em tons de uma unica cor, eixos ja ordenados por quantidade. */
  private opcaoMatriz(): any {
    if (!this.matrizData.length) { return null; }
    return {
      // showContent:false esconde o balao mas mantem o ponteiro, que rotula em cada
      // eixo o documento e a avaliacao da celula. transitionDuration:0 remove a
      // transicao de movimento da etiqueta, que era a real origem da piscada.
      tooltip: { trigger: 'item', showContent: false, transitionDuration: 0 },
      axisPointer: { animation: false },
      grid: { left: 8, right: 64, top: 8, bottom: 40, containLabel: true },
      xAxis: {
        type: 'category', data: this.matrizAvals, splitArea: { show: false },
        axisPointer: { show: true, type: 'line', label: { show: true, margin: 4 }, animation: false, triggerEmphasis: false, lineStyle: { width: 0, opacity: 0 } },
        axisLabel: { interval: 0, fontSize: 11, formatter: (_v: string, i: number) => String(i + 1) },
      },
      yAxis: {
        type: 'category', data: this.matrizDocs, splitArea: { show: false },
        axisPointer: { show: true, type: 'line', label: { show: true, margin: 4 }, animation: false, triggerEmphasis: false, lineStyle: { width: 0, opacity: 0 } },
        axisLabel: { width: 200, overflow: 'break' },
      },
      // Escala na lateral direita, vertical e sem alcas arrastaveis, para nao encostar no eixo X.
      visualMap: {
        min: 0, max: this.matrizMax || 1, calculable: false,
        orient: 'vertical', right: 8, top: 'center', itemWidth: 12, itemHeight: 150,
        text: [String(this.matrizMax || 1), '0'], textStyle: { fontSize: 11, color: '#6c757d' },
        inRange: { color: ESCALA_HEATMAP },
      },
      series: [{
        // Todas as celulas sao exibidas, inclusive as zeradas. Como 0 e o menor valor,
        // caem na ponta vermelha da escala, como na matriz totalmente preenchida da HU.
        type: 'heatmap',
        data: this.matrizData,
        label: { show: true, fontSize: 11 },
        stateAnimation: { duration: 0 },
        emphasis: { focus: 'none', itemStyle: { borderColor: '#102a54', borderWidth: 2 } },
        itemStyle: { borderColor: '#fff', borderWidth: 1 },
      }],
    };
  }

  /**
   * Ao passar o mouse numa celula, destaca a LINHA e a COLUNA inteiras (a cruz de
   * celulas que liga aos eixos), usando dispatchAction (leve, sem redesenhar).
   */
  ligarCruzMatriz(chart: EChartsType): void {
    const larg = this.matrizAvals.length;
    const alt = this.matrizDocs.length;
    chart.on('mouseover', (p: any) => {
      if (p.componentType !== 'series' || !Array.isArray(p.data)) { return; }
      const hx = p.data[0];
      const hy = p.data[1];
      const indices: number[] = [];
      for (let x = 0; x < larg; x++) { indices.push(hy * larg + x); }
      for (let y = 0; y < alt; y++) { if (y !== hy) { indices.push(y * larg + hx); } }
      chart.dispatchAction({ type: 'downplay', seriesIndex: 0 });
      chart.dispatchAction({ type: 'highlight', seriesIndex: 0, dataIndex: indices });
    });
    chart.on('globalout', () => {
      chart.dispatchAction({ type: 'downplay', seriesIndex: 0 });
    });
  }

  private numeroOds(label: string): number {
    const m = label.match(/^\s*(\d+)/);
    return m ? parseInt(m[1], 10) : 0;
  }


/**
 * Legenda para exportação do gráfico de Ano de Publicação.
 * Mantém os nomes completos das instituições.
 */
get legendaAnoExportacao(): {
  label: string;
  cor: string;
}[] {
  return this.evolucaoSeries.map((serie) => ({
    label: serie.nome,
    cor: '#5B84B1',
  }));
}


  /** Legenda do heatmap: numero do eixo X -> nome completo da avaliacao. */
  get legendaMatriz(): { num: number; nome: string }[] {
    return this.matrizAvals.map((a, i) => ({ num: i + 1, nome: a }));
  }

/**
 * Legenda completa para exportação do heatmap.
 * Relaciona os números do eixo X aos nomes
 * completos dos tipos de avaliação.
 */
get legendaMatrizExportacao(): {
  label: string;
  cor: string;
}[] {
  return this.legendaMatriz.map((item) => ({
    label: `${item.num} - ${item.nome}`,
    cor: '#9AA5B1',
  }));
}

  /**
   * ODS completo para o grafico e a legenda: faixa fixa de 1 a 18 (zero nos ausentes,
   * com o nome oficial de fallback) mais a coluna "Nao Informado" ao final.
   */

  get odsCompleto(): {
    num: number;
    label: string;
    count: number;
    cor: string;
    ni: boolean;
  }[] {
    const porNum: { [n: number]: FacetValue } = {};

    this.ods.forEach((v) => {
      porNum[this.numeroOds(v.label)] = v;
    });

    const arr: {
      num: number;
      label: string;
      count: number;
      cor: string;
      ni: boolean;
    }[] = [];

    for (let n = 1; n <= 18; n++) {
      const fv = porNum[n];

      arr.push({
        num: n,
        label: fv ? fv.label : `${n} - ${NOMES_ODS[n] ?? 'ODS ' + n}`,
        count: fv ? fv.count : 0,
        cor: CORES_ODS[n] ?? '#999999',
        ni: false,
      });
    }

    arr.push({
      num: 19,
      label: 'Não Informado',
      count: this.odsNaoInformado,
      cor: '#9aa5b1',
      ni: true,
    });

    return arr;
  }

  /**
   * ODS que possuem avaliações no recorte atual.
   * Exclui valores zerados e a categoria Não Informado.
   */
  get odsComDados(): {
    num: number;
    nome: string;
    count: number;
    cor: string;
    icone: string | null;
  }[] {
    return this.odsCompleto
      .filter((o) => !o.ni && o.count > 0)
      .map((o) => ({
        num: o.num,
        nome: NOMES_ODS[o.num] ?? o.label,
        count: o.count,
        cor: o.cor,
        icone: o.num <= 17
          ? `assets/rdapp/images/ods/ods-${String(o.num).padStart(2, '0')}.svg`
          : null,
      }));
  }

  /**
   * Legenda dos ODS, incluindo Não Informado.
   */
  get legendaOds(): {
    num: number;
    label: string;
    cor: string;
  }[] {
    return this.odsCompleto.map((o) => ({
      num: o.num,
      label: o.label,
      cor: o.cor,
    }));
  }
}
