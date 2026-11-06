import {
  DatePipe,
  DecimalPipe,
  isPlatformBrowser,
  NgTemplateOutlet,
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
import {
  ActivatedRoute,
  Router,
  RouterLink,
} from '@angular/router';
import type { EChartsType } from 'echarts/core';
import {
  forkJoin,
  map,
  Observable,
} from 'rxjs';

import { BtnDisabledDirective } from '../../../../app/shared/btn-disabled.directive';
import {
  AlternadorMetricaComponent,
  MetricaUso,
} from './alternador-metrica.component';
import { ExportarGraficoComponent } from './exportar-grafico.component';
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
import {
  CategoriaUso,
  TabelaUsoComponent,
} from './tabela-uso.component';

interface SerieEvolucao { nome: string; dados: number[]; }

interface ItemUso { id: string; titulo: string; instituicao: string; ano: string; views: number; downloads: number; }
interface PoliticaUso { label: string; views: number; downloads: number; }
/** Celula da matriz Documento x Avaliacao pesada por uso (x = avaliacao, y = documento). */
interface CelulaUso { x: number; y: number; views: number; downloads: number; }
interface MatrizUso { docs: string[]; avals: string[]; celulas: CelulaUso[]; }
/** ODS no grafico de uso: faixa fixa 1..18 mais "Nao Informado", com cor oficial. */
interface OdsUso extends CategoriaUso { num: number; cor: string; ni: boolean; }

type Aba = 'acervo' | 'visualizacoes';
/** Blocos da aba 2 que tem alternador proprio (CA05.7); cada um guarda a sua metrica. */
type BlocoUso = 'top' | 'matriz' | 'area' | 'inst' | 'abr' | 'ods' | 'ano';

/** View-model de um bloco por categoria (area, instituicao, abrangencia), ja na metrica do bloco. */
interface CategoriaVM {
  metrica: MetricaUso;
  lista: CategoriaUso[];     // categorias com acesso, do maior para o menor
  tabela: CategoriaUso[];    // todas as categorias do recorte, para "Ver como tabela"
  poucas: boolean;           // 1 a 3 categorias: cards no lugar do grafico
  sintese: string;
  opcao: any;
  altura: number;
  legenda: { label: string; cor: string; pct: number; valor: number }[]; // so na abrangencia
}
interface TopVM { metrica: MetricaUso; itens: ItemUso[]; emCards: boolean; sintese: string; opcao: any; altura: number; }
interface MatrizVM {
  metrica: MetricaUso;
  matriz: MatrizUso;
  modo: 'heatmap' | 'simples' | 'card' | 'vazio';
  max: number;
  linhas: { doc: string; valores: number[] }[];
  legenda: { num: number; nome: string }[];
  sintese: string;
  opcao: any;
  altura: number;
}
interface OdsVM { metrica: MetricaUso; completo: OdsUso[]; cards: OdsUso[]; tabela: CategoriaUso[]; sintese: string; opcao: any; }
/** Serie acumulada de uma instituicao por ano de publicacao (recomendacao 3.5). */
interface SerieAno { nome: string; dados: number[]; total: number; ni: boolean; }
interface AnoVM {
  metrica: MetricaUso;
  modo: 'multiplos' | 'linhas' | 'vazio';
  anos: string[];
  series: SerieAno[];     // as exibidas no grafico (ate MAX_PAINEIS_ANO)
  todas: SerieAno[];      // todas, para "Ver como tabela"
  sintese: string;
  opcao: any;
  altura: number;
}

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
  12: 'Consumo e Produção Responsáveis', 13: 'Ação contra a Mudança Global do Clima',
  14: 'Vida na Água', 15: 'Vida Terrestre', 16: 'Paz, Justiça e Instituições Eficazes',
  17: 'Parcerias e Meios de Implementação', 18: 'Igualdade Étnico-Racial',
};

// Escala do heatmap da HU: vermelho (baixo) -> laranja -> amarelo -> verde (alto).
const ESCALA_HEATMAP = ['#d80000', '#f07800', '#f2c200', '#8bc34a', '#1a9850'];
// Paleta para as linhas da evolucao.
const CORES_LINHAS = ['#1f4ea3', '#0a97d9', '#1aa179', '#f0a500', '#a21942', '#6f42c1', '#fd6925'];
// Paleta da aba de visualizacoes: familia de verdes da proposta de design (secao 3).
const COR_USO = '#0B6256';           // Top 10 (Quadro 6) e valores em destaque
const ESCALA_VERDE = ['#E7F4F0', '#B9E2D5', '#82C9B4', '#4FAF96', '#0E7E6A', '#0B6256']; // heatmap (Quadro 7)
const COR_AREA_USO = '#38997F';      // dot plot de area tematica (Quadro 8)
const COR_INST_USO = '#3C9E81';      // lollipop de instituicao (Quadro 9)
const CORES_EMPILHADA = ['#0B6256', '#148F77', '#4FAF96', '#82C9B4', '#B9E2D5', '#D7EDE5']; // abrangencia (Quadro 11)
const COR_TEXTO_USO = '#4F5B66';
const COR_ROTULO_USO = '#6A6F76';
const COR_AUX_USO = '#E9EDF2';
const COR_ANO_USO = '#148F77';       // pequenos multiplos do ano de publicacao (Quadro 10)
const COR_NI = '#9aa5b1';            // "Nao Informado", mesma cor do ODS N/I
const NAO_INFORMADO = 'Não Informado';
// Pequenos multiplos: ate este numero de instituicoes no grafico; a tabela lista todas.
const MAX_PAINEIS_ANO = 12;
// Ate este numero de series, linhas no mesmo grafico, distinguidas por estilo de traco e marcador.
const POUCAS_SERIES_ANO = 3;
const ESTILOS_LINHA: { tipo: string; simbolo: string }[] = [
  { tipo: 'solid', simbolo: 'circle' }, { tipo: 'dashed', simbolo: 'rect' }, { tipo: 'dotted', simbolo: 'triangle' },
];
const TOP_N = 10;
// Ate este numero de publicacoes o Top vira cards comparativos (recomendacao 3.1).
const TOP_MAX_CARDS = 4;
// Ate este numero de categorias os demais graficos viram cards (recomendacoes 3.2 a 3.7).
const POUCAS_CATEGORIAS = 3;
// Ate este numero de celulas (2x3) a matriz de uso vira tabela simples sem cor (recomendacao 3.2).
const MATRIZ_SIMPLES_MAX = 6;

@Component({
  selector: 'ds-painel-estatisticas',
  templateUrl: './painel-estatisticas.component.html',
  styleUrls: ['./painel-estatisticas.component.scss'],
  imports: [
    AlternadorMetricaComponent,
    BtnDisabledDirective,
    DatePipe,
    DecimalPipe,
    ExportarGraficoComponent,
    FiltrosSidebarComponent,
    GraficoEchartsComponent,
    NgTemplateOutlet,
    NuvemPalavrasComponent,
    RouterLink,
    TabelaUsoComponent,
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
  matrizDocs: string[] = [];
  matrizAvals: string[] = [];
  matrizData: number[][] = [];
  matrizMax = 0;

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
  // Metrica de cada bloco (CA05.7): cada alternador e independente dos demais.
  metricas: { [b in BlocoUso]: MetricaUso } = {
    top: 'views', matriz: 'views', area: 'views', inst: 'views', abr: 'views', ods: 'views', ano: 'views',
  };
  // Dados agregados do recorte, com as DUAS metricas; os view-models abaixo sao
  // derivados deles na metrica do bloco, e so o bloco afetado e recalculado.
  itensUso: ItemUso[] = [];
  politicaUso: PoliticaUso[] = [];
  private areaUso: CategoriaUso[] = [];
  private instUso: CategoriaUso[] = [];
  private abrUso: CategoriaUso[] = [];
  private odsUso: CategoriaUso[] = [];
  private odsNaoInformadoUso: CategoriaUso = { label: 'Não Informado', views: 0, downloads: 0 };
  // Pares "documento||avaliacao" com o uso somado; a matriz e montada por metrica.
  private matrizParesUso: { [k: string]: CategoriaUso } = {};
  // Uso por instituicao e ano de publicacao, para o acumulado (bloco 2.6).
  private anoUso: { [inst: string]: { [ano: string]: UsoItem } } = {};
  // Termos digitados na busca do repositorio (eventos de busca do core statistics); contagem global.
  termosBuscados: FacetValue[] = [];
  vmTop: TopVM = { metrica: 'views', itens: [], emCards: false, sintese: '', opcao: null, altura: 0 };
  vmMatriz: MatrizVM = {
    metrica: 'views', matriz: { docs: [], avals: [], celulas: [] }, modo: 'vazio', max: 0,
    linhas: [], legenda: [], sintese: '', opcao: null, altura: 0,
  };
  vmArea: CategoriaVM = this.vmVazio();
  vmInst: CategoriaVM = this.vmVazio();
  vmAbr: CategoriaVM = this.vmVazio();
  vmOds: OdsVM = { metrica: 'views', completo: [], cards: [], tabela: [], sintese: '', opcao: null };
  vmAno: AnoVM = { metrica: 'views', modo: 'vazio', anos: [], series: [], todas: [], sintese: '', opcao: null, altura: 0 };
  mostrarTabelaTop = false;
  mostrarTabelaMatrizUso = false;
  mostrarTabelaAno = false;
  // Instancias do ECharts de cada bloco da aba 2, para o download como imagem.
  // Chegam por (pronto) e sao renovadas sempre que o grafico e recriado.
  charts: { [bloco in BlocoUso]?: EChartsType } = {};
  // Anuncio para leitores de tela apos "Atualizar" (regiao viva no template).
  anuncio = '';

  constructor(
    private cdr: ChangeDetectorRef,
    private stats: PainelEstatisticasService,
    private route: ActivatedRoute,
    private router: Router,
    @Inject(PLATFORM_ID) platformId: object,
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  ngOnInit(): void {
    if (!this.isBrowser) { return; }
    // A aba vive na URL (?aba=visualizacoes) para sobreviver a F5, link copiado e "voltar".
    this.route.queryParamMap.subscribe((q) => {
      const aba = q.get('aba');
      this.aba = aba === 'visualizacoes' ? 'visualizacoes' : 'acervo';
    });
    this.carregar();
  }

  private vmVazio(): CategoriaVM {
    return { metrica: 'views', lista: [], tabela: [], poucas: false, sintese: '', opcao: null, altura: 0, legenda: [] };
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
        if (this.recarregando) { this.anuncio = 'Indicadores atualizados.'; }
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

  trocarAba(aba: Aba): void {
    this.aba = aba;
    // Aba 1 e o padrao e fica sem parametro, para a URL padrao continuar limpa.
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { aba: aba === 'visualizacoes' ? aba : null },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  /** Botao "Atualizar": refaz a carga por vontade do usuario (CA10 sem atualizacao automatica). */
  atualizar(): void {
    this.anuncio = '';
    this.recarregar();
  }

  private recomputarGraficos(): void {
    this.opcaoOdsVM = this.opcaoOds();
    this.opcaoAreaVM = this.opcaoBarras(this.areaTematica, '#2f6fd1');
    this.opcaoInstVM = this.opcaoTreemap(this.instituicao);
    this.opcaoAbrVM = this.opcaoBarras(this.abrangencia, '#f0a500');
    this.opcaoTipoVM = this.opcaoBarras(this.tipoDocumento, '#1f4ea3');
    this.opcaoAnoVM = this.opcaoLinhaTempo();
    this.opcaoMatrizVM = this.opcaoMatriz();
    this.recomputarGraficosUso();
  }

  /** View-models da aba 2: recalculados quando os dados do recorte mudam. */
  private recomputarGraficosUso(): void {
    (['top', 'matriz', 'area', 'inst', 'abr', 'ods', 'ano'] as BlocoUso[]).forEach((b) => this.recomputarBloco(b));
  }

  /** Alternador de um bloco (CA05.7): troca a metrica e recalcula SO aquele bloco. */
  trocarMetrica(bloco: BlocoUso, m: MetricaUso): void {
    if (this.metricas[bloco] === m) { return; }
    this.metricas[bloco] = m;
    this.recomputarBloco(bloco);
  }

  private recomputarBloco(bloco: BlocoUso): void {
    const m = this.metricas[bloco];
    switch (bloco) {
      case 'top': this.vmTop = this.montarTop(m); break;
      case 'matriz': this.vmMatriz = this.montarMatrizVM(m); break;
      case 'area': this.vmArea = this.montarCategoriaVM(m, this.areaUso, 'Área temática', 'sem área temática informada', 'dot'); break;
      case 'inst': this.vmInst = this.montarCategoriaVM(m, this.instUso, 'Instituição', 'sem instituição informada', 'lollipop'); break;
      case 'abr': this.vmAbr = this.montarCategoriaVM(m, this.abrUso, 'Abrangência', 'sem abrangência informada', 'empilhada'); break;
      case 'ods': this.vmOds = this.montarOdsVM(m); break;
      case 'ano': this.vmAno = this.montarAnoVM(m); break;
    }
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
   * por item do endpoint. Daqui saem os cards, o Top 10, a tabela de politicas e
   * as agregacoes por categoria (area, instituicao, abrangencia, ODS e a matriz),
   * todas com as DUAS metricas, para que trocar o alternador nao recalcule nada.
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
      this.areaUso = [];
      this.instUso = [];
      this.abrUso = [];
      this.odsUso = [];
      this.odsNaoInformadoUso = { label: NAO_INFORMADO, views: 0, downloads: 0 };
      this.matrizParesUso = {};
      this.anoUso = {};
      this.termosBuscados = [];
      return;
    }
    this.usoGeradoEm = uso.geradoEm;
    const zero: UsoItem = { views: 0, downloads: 0 };
    const porPolitica: { [k: string]: CategoriaUso } = {};
    const porArea: { [k: string]: CategoriaUso } = {};
    const porInst: { [k: string]: CategoriaUso } = {};
    const porAbr: { [k: string]: CategoriaUso } = {};
    const porOds: { [k: string]: CategoriaUso } = {};
    // "Nao Informado" de cada categoria: uso dos itens sem o metadado (CA05.4, estendido ao painel todo).
    const semArea: CategoriaUso = { label: NAO_INFORMADO, views: 0, downloads: 0, ni: true };
    const semInst: CategoriaUso = { label: NAO_INFORMADO, views: 0, downloads: 0, ni: true };
    const semAbr: CategoriaUso = { label: NAO_INFORMADO, views: 0, downloads: 0, ni: true };
    const semOds: CategoriaUso = { label: NAO_INFORMADO, views: 0, downloads: 0, ni: true };
    const pares: { [k: string]: CategoriaUso } = {};
    const porInstAno: { [inst: string]: { [ano: string]: UsoItem } } = {};
    let somaViews = 0;
    let somaDownloads = 0;

    this.itensUso = itens.map((it) => {
      const id: string = it?.uuid ?? it?.id ?? '';
      const u = uso.porItem.get(id) ?? zero;
      somaViews += u.views;
      somaDownloads += u.downloads;
      this.somarPorCampo(porPolitica, it, 'local.politicapublica', u);
      if (!this.somarPorCampo(porArea, it, 'local.areatematica', u)) { this.somarEm(semArea, u); }
      if (!this.somarPorCampo(porInst, it, 'local.instituicao', u)) { this.somarEm(semInst, u); }
      if (!this.somarPorCampo(porAbr, it, 'local.abrangencia', u)) { this.somarEm(semAbr, u); }
      if (!this.somarPorCampo(porOds, it, 'local.ods', u)) { this.somarEm(semOds, u); }
      // Acumulado por ano de publicacao: primeiro ano valido do item, uma serie por instituicao.
      const ano = this.valores(it, 'dc.date.issued').map((v) => v.substring(0, 4)).find((a) => /^\d{4}$/.test(a));
      if (ano) {
        const insts = this.valores(it, 'local.instituicao');
        (insts.length ? insts : [NAO_INFORMADO]).forEach((inst) => {
          porInstAno[inst] = porInstAno[inst] ?? {};
          porInstAno[inst][ano] = porInstAno[inst][ano] ?? { views: 0, downloads: 0 };
          porInstAno[inst][ano].views += u.views;
          porInstAno[inst][ano].downloads += u.downloads;
        });
      }
      // Matriz: cada par (documento, avaliacao) do item recebe o uso do item.
      const docs = this.valores(it, 'local.tipodocumento');
      const avals = this.valores(it, 'local.tipoavaliacao');
      docs.forEach((d) => avals.forEach((a) => this.somar(pares, `${d}||${a}`, u)));
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
    this.areaUso = [...Object.values(porArea), semArea];
    this.instUso = [...Object.values(porInst), semInst];
    this.abrUso = [...Object.values(porAbr), semAbr];
    this.odsUso = Object.values(porOds);
    this.odsNaoInformadoUso = semOds;
    this.matrizParesUso = pares;
    this.anoUso = porInstAno;
    this.termosBuscados = uso.termosBuscados;
  }

  private somarEm(c: CategoriaUso, u: UsoItem): void {
    c.views += u.views;
    c.downloads += u.downloads;
  }

  /** Valores (sem espacos nas pontas, nao vazios) de um campo de metadado do item. */
  private valores(it: any, campo: string): string[] {
    return (it?.metadata?.[campo] ?? [])
      .map((v: any) => (v?.value ?? '').trim())
      .filter((v: string) => !!v);
  }

  private somar(mapa: { [k: string]: CategoriaUso }, chave: string, u: UsoItem): void {
    if (!mapa[chave]) {
      mapa[chave] = { label: chave, views: 0, downloads: 0 };
    }
    mapa[chave].views += u.views;
    mapa[chave].downloads += u.downloads;
  }

  /** Soma o uso do item em cada valor do campo. Devolve false se o item nao tem o campo. */
  private somarPorCampo(mapa: { [k: string]: CategoriaUso }, it: any, campo: string, u: UsoItem): boolean {
    const vals = this.valores(it, campo);
    vals.forEach((v) => this.somar(mapa, v, u));
    return vals.length > 0;
  }

  /**
   * Matriz Documento x Avaliacao pesada pela METRICA ATIVA, eixos do maior para o
   * menor (CA05.1). Mesma orientacao da aba 1: documentos de maior total no topo
   * (Y ascendente) e avaliacoes de maior total a esquerda.
   */
  private montarMatrizUso(m: MetricaUso): MatrizUso {
    const totalDoc: { [d: string]: number } = {};
    const totalAval: { [a: string]: number } = {};
    Object.keys(this.matrizParesUso).forEach((k) => {
      const [d, a] = k.split('||');
      const v = this.matrizParesUso[k][m];
      totalDoc[d] = (totalDoc[d] || 0) + v;
      totalAval[a] = (totalAval[a] || 0) + v;
    });
    const docs = Object.keys(totalDoc).sort((a, b) => totalDoc[a] - totalDoc[b]);
    const avals = Object.keys(totalAval).sort((a, b) => totalAval[b] - totalAval[a]);
    const celulas: CelulaUso[] = [];
    docs.forEach((d, y) => avals.forEach((a, x) => {
      const c = this.matrizParesUso[`${d}||${a}`];
      celulas.push({ x, y, views: c?.views ?? 0, downloads: c?.downloads ?? 0 });
    }));
    return { docs, avals, celulas };
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

  /** Rotulo de uma metrica no plural (titulos, eixos, sinteses). */
  rotulo(m: MetricaUso): string {
    return m === 'views' ? 'visualizações' : 'downloads';
  }

  /** Contracao "de + artigo" concordando em genero: "das visualizações", "dos downloads". */
  private artigoDe(m: MetricaUso): string {
    return m === 'views' ? 'das' : 'dos';
  }

  /** Unidade concordando em numero: "1 visualização", "2 visualizações", "1 download". */
  unidade(m: MetricaUso, n: number): string {
    if (m === 'views') { return n === 1 ? 'visualização' : 'visualizações'; }
    return n === 1 ? 'download' : 'downloads';
  }

  /** Valor da categoria na metrica do bloco (usado nos cards do template). */
  valor(m: MetricaUso, c: CategoriaUso): number {
    return c[m];
  }

  private pct(v: number, total: number): number {
    return total > 0 ? Math.round((v / total) * 100) : 0;
  }

  private fmt(n: number): string {
    return n.toLocaleString('pt-BR');
  }

  private capitalizar(t: string): string {
    return t.charAt(0).toUpperCase() + t.slice(1);
  }

  alternarTabelaTop(): void {
    this.mostrarTabelaTop = !this.mostrarTabelaTop;
  }

  alternarTabelaMatrizUso(): void {
    this.mostrarTabelaMatrizUso = !this.mostrarTabelaMatrizUso;
  }

  // ---- Top 10 -------------------------------------------------------------

  private montarTop(m: MetricaUso): TopVM {
    // Top N pela metrica do bloco, maior primeiro; ignora itens sem uso.
    const itens = this.itensUso
      .filter((i) => i[m] > 0)
      .sort((a, b) => b[m] - a[m] || a.titulo.localeCompare(b.titulo, 'pt-BR'))
      .slice(0, TOP_N);
    // Com poucas publicacoes (1 a 4) o ranking vira cards comparativos (recomendacao 3.1).
    const emCards = itens.length > 0 && itens.length <= TOP_MAX_CARDS;
    return {
      metrica: m,
      itens,
      emCards,
      sintese: this.sinteseTop(m, itens),
      opcao: emCards ? null : this.opcaoTop(m, itens),
      // Altura proporcional ao numero de barras, para nao sobrar espaco vazio.
      altura: 56 + 44 * itens.length,
    };
  }

  /** Sintese textual do ranking (recomendacao 4.1): quem lidera e quanto o Top representa. */
  private sinteseTop(m: MetricaUso, top: ItemUso[]): string {
    if (!top.length) { return ''; }
    const soma = top.reduce((acc, i) => acc + i[m], 0);
    const total = m === 'views' ? this.totalDocsViews : this.totalDownloads;
    const lider = `«${top[0].titulo}» lidera com ${this.fmt(top[0][m])} ${this.unidade(m, top[0][m])}`;
    if (top.length === 1) { return `${lider}.`; }
    return `${lider}; as ${top.length} publicações listadas somam ${this.fmt(soma)} (${this.pct(soma, total)}% ${this.artigoDe(m)} ${this.rotulo(m)} nos documentos).`;
  }

  // ---- Blocos por categoria (area, instituicao, abrangencia) -----------------

  /** Categorias do maior para o menor na metrica (CA05.1); sem comZeros, so as com acesso. */
  private ordenarUso(m: MetricaUso, lista: CategoriaUso[], comZeros = false): CategoriaUso[] {
    const visiveis = lista.filter((c) => comZeros || c[m] > 0);
    const informados = visiveis.filter((c) => !c.ni)
      .sort((a, b) => b[m] - a[m] || a.label.localeCompare(b.label, 'pt-BR'));
    // "Nao Informado" sempre por ultimo, independentemente do valor, como no ODS.
    return [...informados, ...visiveis.filter((c) => c.ni)];
  }

  private montarCategoriaVM(
    m: MetricaUso, dados: CategoriaUso[], tipo: string, semRotulo: string, grafico: 'dot' | 'lollipop' | 'empilhada',
  ): CategoriaVM {
    const lista = this.ordenarUso(m, dados);
    // Poucas categorias (1 a 3) trocam o grafico por cards comparativos.
    const poucas = lista.length > 0 && lista.length <= POUCAS_CATEGORIAS;
    let opcao: any = null;
    if (lista.length && !poucas) {
      if (grafico === 'dot') { opcao = this.opcaoDotPlot(m, lista, COR_AREA_USO); }
      if (grafico === 'lollipop') { opcao = this.opcaoLollipop(m, lista, COR_INST_USO); }
      if (grafico === 'empilhada') { opcao = this.opcaoEmpilhada(m, lista); }
    }
    return {
      metrica: m,
      lista,
      tabela: this.ordenarUso(m, dados, true),
      poucas,
      sintese: this.sinteseCategoria(m, lista, tipo, semRotulo),
      opcao,
      altura: 64 + 44 * lista.length,
      legenda: grafico === 'empilhada' ? this.legendaEmpilhada(m, lista) : [],
    };
  }

  /** Participacao da categoria no total da lista (abrangencia). */
  participacao(m: MetricaUso, c: CategoriaUso, lista: CategoriaUso[]): number {
    const total = lista.reduce((acc, x) => acc + x[m], 0);
    return this.pct(c[m], total);
  }

  /** Diferenca para a lider, explicitada nos cards de instituicao (recomendacao 3.4). */
  diferencaLider(m: MetricaUso, c: CategoriaUso, lista: CategoriaUso[]): string {
    const informadas = lista.filter((x) => !x.ni);
    if (c.ni) { return 'avaliações sem instituição informada'; }
    if (!informadas.length || c === informadas[0]) { return 'maior volume do recorte'; }
    const dif = informadas[0][m] - c[m];
    return dif === 0 ? 'empatada com a líder' : `${this.fmt(dif)} a menos que «${informadas[0].label}»`;
  }

  /** Legenda da barra empilhada: cor, nome, percentual e valor de cada abrangencia. */
  private legendaEmpilhada(m: MetricaUso, lista: CategoriaUso[]): { label: string; cor: string; pct: number; valor: number }[] {
    return lista.map((c, i) => ({
      label: c.label,
      cor: c.ni ? COR_NI : CORES_EMPILHADA[i % CORES_EMPILHADA.length],
      pct: this.participacao(m, c, lista),
      valor: c[m],
    }));
  }

  /** Lider e percentual so entre as categorias informadas; o "Nao Informado" vira frase a parte. */
  private sinteseCategoria(m: MetricaUso, lista: CategoriaUso[], tipo: string, semRotulo: string): string {
    const informadas = lista.filter((c) => !c.ni);
    const semInfo = lista.find((c) => c.ni)?.[m] ?? 0;
    const partes: string[] = [];
    if (informadas.length) {
      const total = informadas.reduce((acc, c) => acc + c[m], 0);
      const lider = informadas[0];
      partes.push(`${tipo} com mais ${this.rotulo(m)}: «${lider.label}», com ${this.fmt(lider[m])} (${this.pct(lider[m], total)}% das informadas)`);
      if (informadas.length > 1) { partes.push(`${informadas.length} categorias com acesso`); }
    }
    if (semInfo > 0) { partes.push(`${this.fmt(semInfo)} ${this.unidade(m, semInfo)} em avaliações ${semRotulo}`); }
    return partes.length ? `${partes.join('; ')}.` : '';
  }

  // ---- ODS por uso ------------------------------------------------------------

  private montarOdsVM(m: MetricaUso): OdsVM {
    const completo = this.odsUsoCompleto();
    const temDados = completo.some((o) => o[m] > 0);
    return {
      metrica: m,
      completo,
      cards: this.odsUsoCards(completo),
      tabela: completo.map((o) => ({ label: o.label, views: o.views, downloads: o.downloads })),
      sintese: this.sinteseOds(m, completo),
      opcao: temDados ? this.opcaoOdsUso(m, completo) : null,
    };
  }

  /** ODS 1..18 sempre presentes (zero nos ausentes) mais "Nao Informado" ao final (CA05.1/CA05.4). */
  private odsUsoCompleto(): OdsUso[] {
    const porNum: { [n: number]: CategoriaUso } = {};
    this.odsUso.forEach((c) => { porNum[this.numeroOds(c.label)] = c; });
    const arr: OdsUso[] = [];
    for (let n = 1; n <= 18; n++) {
      const c = porNum[n];
      arr.push({
        num: n,
        label: c ? c.label : `${n} - ${NOMES_ODS[n] ?? 'ODS ' + n}`,
        views: c?.views ?? 0,
        downloads: c?.downloads ?? 0,
        cor: CORES_ODS[n] ?? '#999999',
        ni: false,
      });
    }
    arr.push({ num: 19, ...this.odsNaoInformadoUso, cor: '#9aa5b1', ni: true });
    return arr;
  }

  /** Com 1 a 3 ODS selecionados no filtro, o grafico vira cards identificadores (recomendacao 3.7). */
  private odsUsoCards(completo: OdsUso[]): OdsUso[] {
    const sel = this.selecionados.ods;
    if (!sel || sel.size === 0 || sel.size > POUCAS_CATEGORIAS) { return []; }
    const nums = new Set([...sel].map((l) => this.numeroOds(l)));
    return completo.filter((o) => nums.has(o.num));
  }

  /** Lider e percentual so entre os ODS informados; o "Nao Informado" entra como frase a parte. */
  private sinteseOds(m: MetricaUso, completo: OdsUso[]): string {
    const informados = completo.filter((o) => !o.ni && o[m] > 0).sort((a, b) => b[m] - a[m]);
    const semOds = completo.find((o) => o.ni)?.[m] ?? 0;
    const partes: string[] = [];
    if (informados.length) {
      const lider = informados[0];
      const total = informados.reduce((acc, o) => acc + o[m], 0);
      partes.push(`ODS com mais ${this.rotulo(m)}: «${lider.label}», com ${this.fmt(lider[m])} (${this.pct(lider[m], total)}% dos acessos com ODS informado)`);
      partes.push(`${informados.length} ${informados.length === 1 ? 'objetivo' : 'objetivos'} com acesso`);
    }
    if (semOds > 0) {
      partes.push(`${this.fmt(semOds)} ${this.unidade(m, semOds)} em avaliações sem ODS informado`);
    }
    return partes.length ? `${partes.join('; ')}.` : '';
  }

  // ---- Ano de publicacao (acumulado) ------------------------------------------

  /**
   * Acumulado da metrica por ano de publicacao, uma serie por instituicao
   * (CA04 2.6). Com 4+ instituicoes, pequenos multiplos; ate 3, linhas no mesmo
   * grafico (recomendacao 3.5). "Nao Informado" e a ultima serie.
   */
  private montarAnoVM(m: MetricaUso): AnoVM {
    const anos = this.anos;
    const todas: SerieAno[] = Object.keys(this.anoUso).map((inst) => {
      let acumulado = 0;
      const dados = anos.map((a) => { acumulado += this.anoUso[inst][a]?.[m] ?? 0; return acumulado; });
      return { nome: inst, dados, total: acumulado, ni: inst === NAO_INFORMADO };
    })
      .filter((sr) => sr.total > 0)
      .sort((a, b) => Number(a.ni) - Number(b.ni) || b.total - a.total || a.nome.localeCompare(b.nome, 'pt-BR'));
    const series = todas.slice(0, MAX_PAINEIS_ANO);
    let modo: AnoVM['modo'] = 'multiplos';
    if (!anos.length || !series.length) { modo = 'vazio'; } else if (series.length <= POUCAS_SERIES_ANO) { modo = 'linhas'; }
    const linhas = Math.ceil(series.length / 3);
    return {
      metrica: m,
      modo,
      anos,
      series,
      todas,
      sintese: this.sinteseAno(m, anos, todas),
      opcao: modo === 'vazio' ? null : modo === 'linhas' ? this.opcaoAnoLinhas(m, anos, series) : this.opcaoAnoMultiplos(m, anos, series),
      altura: modo === 'linhas' ? 320 : 52 + 185 * linhas,
    };
  }

  private sinteseAno(m: MetricaUso, anos: string[], todas: SerieAno[]): string {
    const informadas = todas.filter((sr) => !sr.ni);
    const semInfo = todas.find((sr) => sr.ni)?.total ?? 0;
    const partes: string[] = [];
    if (informadas.length) {
      const lider = informadas[0];
      partes.push(`«${lider.nome}» acumula ${this.fmt(lider.total)} ${this.unidade(m, lider.total)} nas avaliações publicadas de ${anos[0]} a ${anos[anos.length - 1]}`);
      if (informadas.length > 1) {
        partes.push(`${informadas.length} instituições${informadas.length > MAX_PAINEIS_ANO ? `, as ${MAX_PAINEIS_ANO} mais acessadas no gráfico` : ''}`);
      }
    }
    if (semInfo > 0) { partes.push(`${this.fmt(semInfo)} ${this.unidade(m, semInfo)} em avaliações sem instituição informada`); }
    return partes.length ? `${partes.join('; ')}.` : '';
  }

  private eixoAno(anos: string[], gridIndex = 0): any {
    return {
      type: 'category', data: anos, gridIndex, boundaryGap: false,
      axisLabel: { color: COR_ROTULO_USO, fontSize: 10 }, axisLine: { lineStyle: { color: COR_AUX_USO } }, axisTick: { show: false },
    };
  }

  /** Ate 3 series no mesmo grafico: rotulo na ponta, traco e marcador distintos por serie. */
  private opcaoAnoLinhas(m: MetricaUso, anos: string[], series: SerieAno[]): any {
    return {
      tooltip: { trigger: 'axis', valueFormatter: (v: number) => `${this.fmt(v)} ${this.unidade(m, v)}` },
      grid: { left: 8, right: 180, top: 16, bottom: 8, containLabel: true },
      xAxis: this.eixoAno(anos),
      yAxis: {
        type: 'value', minInterval: 1, name: this.capitalizar(this.rotulo(m)),
        nameTextStyle: { color: COR_ROTULO_USO, fontSize: 11, align: 'left' },
        axisLabel: { color: COR_ROTULO_USO }, splitLine: { lineStyle: { color: COR_AUX_USO } },
      },
      series: series.map((sr, i) => ({
        name: sr.nome, type: 'line', data: sr.dados,
        symbol: ESTILOS_LINHA[i].simbolo, symbolSize: 7,
        lineStyle: { width: 2, type: ESTILOS_LINHA[i].tipo, color: sr.ni ? COR_NI : COR_ANO_USO },
        itemStyle: { color: sr.ni ? COR_NI : COR_ANO_USO },
        endLabel: { show: true, color: COR_USO, fontSize: 11, width: 170, overflow: 'truncate', formatter: (p: any) => `${p.seriesName}: ${this.fmt(p.value)}` },
        emphasis: { focus: 'series' },
      })),
    };
  }

  /** Pequenos multiplos: um painel por instituicao, 3 por linha, mesma escala em todos. */
  private opcaoAnoMultiplos(m: MetricaUso, anos: string[], series: SerieAno[]): any {
    const colunas = 3;
    const max = series.reduce((acc, sr) => Math.max(acc, sr.total), 0);
    const grids: any[] = [];
    const titulos: any[] = [];
    const xAxes: any[] = [];
    const yAxes: any[] = [];
    const sers: any[] = [];
    series.forEach((sr, i) => {
      const col = i % colunas;
      const lin = Math.floor(i / colunas);
      const left = `${4 + col * 32}%`;
      const top = 48 + lin * 185;
      grids.push({ left, top, width: '27%', height: 96 });
      // Titulo em ate duas linhas: nomes com o mesmo prefixo (as duas SMA) continuam distinguiveis.
      titulos.push({
        text: sr.nome, left, top: top - 42,
        textStyle: { fontSize: 11, fontWeight: 600, lineHeight: 14, color: sr.ni ? COR_ROTULO_USO : COR_TEXTO_USO, width: 240, overflow: 'break' },
      });
      xAxes.push(this.eixoAno(anos, i));
      yAxes.push({
        type: 'value', gridIndex: i, min: 0, max, minInterval: 1,
        axisLabel: { color: COR_ROTULO_USO, fontSize: 10 }, splitLine: { lineStyle: { color: COR_AUX_USO } },
      });
      const ultimo = sr.dados.length - 1;
      sers.push({
        name: sr.nome, type: 'line', xAxisIndex: i, yAxisIndex: i,
        data: sr.dados.map((v, j) => (j === ultimo
          ? { value: v, label: { show: true, position: 'top', color: COR_USO, fontWeight: 600, fontSize: 11, formatter: () => this.fmt(v) } }
          : v)),
        symbol: 'circle', symbolSize: 5,
        lineStyle: { width: 2, color: sr.ni ? COR_NI : COR_ANO_USO },
        itemStyle: { color: sr.ni ? COR_NI : COR_ANO_USO },
      });
    });
    return {
      tooltip: { trigger: 'axis', valueFormatter: (v: number) => `${this.fmt(v)} ${this.unidade(m, v)}` },
      title: titulos,
      grid: grids,
      xAxis: xAxes,
      yAxis: yAxes,
      series: sers,
    };
  }

  // ---- Matriz de uso ----------------------------------------------------------

  private montarMatrizVM(m: MetricaUso): MatrizVM {
    const matriz = this.montarMatrizUso(m);
    const { docs, avals, celulas } = matriz;
    const max = celulas.reduce((acc, c) => Math.max(acc, c[m]), 0);
    const n = docs.length * avals.length;
    // heatmap: matriz cheia; simples: ate 2x3, so numeros; card: uma combinacao; vazio: sem acesso.
    let modo: MatrizVM['modo'] = 'heatmap';
    if (n === 0 || max === 0) { modo = 'vazio'; } else if (n === 1) { modo = 'card'; } else if (n <= MATRIZ_SIMPLES_MAX) { modo = 'simples'; }
    return {
      metrica: m,
      matriz,
      modo,
      max,
      // Linhas da tabela: documentos do maior para o menor (ordem de leitura).
      linhas: docs
        .map((doc, y) => ({ doc, valores: avals.map((_a, x) => celulas[y * avals.length + x][m]) }))
        .reverse(),
      legenda: avals.map((a, i) => ({ num: i + 1, nome: a })),
      sintese: this.sinteseMatrizUso(m, matriz, max),
      opcao: modo === 'heatmap' ? this.opcaoMatrizUso(m, matriz, max) : null,
      altura: 120 + 40 * docs.length,
    };
  }

  private sinteseMatrizUso(m: MetricaUso, matriz: MatrizUso, max: number): string {
    if (!max) { return ''; }
    const c = matriz.celulas.find((x) => x[m] === max);
    if (!c) { return ''; }
    return `Maior concentração: «${matriz.docs[c.y]}» × «${matriz.avals[c.x]}», com ${this.fmt(max)} ${this.unidade(m, max)}.`;
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
      grid: { left: 40, right: 16, top: 16, bottom: 40 },
      xAxis: { type: 'category', data: dados.map((o) => (o.ni ? 'N/I' : String(o.num))), axisLabel: { interval: 0 } },
      yAxis: { type: 'value' },
      series: [{
        type: 'bar',
        data: dados.map((o) => ({ value: o.count, name: o.label, itemStyle: { color: o.cor } })),
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
  private opcaoTop(m: MetricaUso, top: ItemUso[]): any {
    if (!top.length) { return null; }
    const invertido = [...top].reverse();
    return {
      tooltip: {
        trigger: 'axis', axisPointer: { type: 'shadow' },
        formatter: (params: any) => {
          const i = invertido[params[0].dataIndex];
          return `${i.titulo}<br/><b>${this.fmt(i[m])}</b> ${this.unidade(m, i[m])}`;
        },
      },
      grid: { left: 8, right: 48, top: 8, bottom: 28, containLabel: true },
      xAxis: this.eixoValorUso(m),
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

  /** Eixo de valor padrao da aba 2: titulo com a metrica (CA05.6), inteiros, linhas auxiliares suaves. */
  private eixoValorUso(m: MetricaUso): any {
    return {
      type: 'value', minInterval: 1,
      name: this.capitalizar(this.rotulo(m)),
      nameLocation: 'middle', nameGap: 22, nameTextStyle: { color: COR_ROTULO_USO, fontSize: 11 },
      axisLabel: { color: COR_ROTULO_USO },
      splitLine: { lineStyle: { color: COR_AUX_USO } },
    };
  }

  /** Eixo de categorias da aba 2: nomes a esquerda, sem tracos, com guias horizontais suaves. */
  private eixoCategoriaUso(rotulos: string[]): any {
    return {
      type: 'category', data: rotulos,
      // Nomes longos (instituicoes) quebram em ate duas linhas em vez de truncar,
      // para que "Controladoria-Geral da União (CGU)" e "... (CGU) e IPEA" se distingam.
      axisLabel: { width: 280, overflow: 'break', lineHeight: 14, fontSize: 11, color: COR_TEXTO_USO },
      axisTick: { show: false }, axisLine: { show: false },
      splitLine: { show: true, lineStyle: { color: COR_AUX_USO } },
    };
  }

  /**
   * Dot plot horizontal (recomendacao 3.3): um ponto por categoria numa escala
   * comum, valor ao lado do ponto, ordenado do maior para o menor.
   */
  private opcaoDotPlot(m: MetricaUso, dados: CategoriaUso[], cor: string): any {
    if (!dados.length) { return null; }
    const inv = [...dados].reverse();
    return {
      tooltip: {
        trigger: 'item',
        formatter: (p: any) => `${p.name}<br/><b>${this.fmt(p.value[0])}</b> ${this.unidade(m, p.value[0])}`,
      },
      grid: { left: 8, right: 56, top: 8, bottom: 32, containLabel: true },
      xAxis: this.eixoValorUso(m),
      yAxis: this.eixoCategoriaUso(inv.map((c) => c.label)),
      series: [{
        type: 'scatter', symbolSize: 14,
        data: inv.map((c) => ({ name: c.label, value: [c[m], c.label], itemStyle: { color: c.ni ? COR_NI : cor } })),
        label: {
          show: true, position: 'right', color: COR_USO, fontWeight: 600,
          formatter: (p: any) => this.fmt(p.value[0]),
        },
        emphasis: { scale: 1.3 },
      }],
    };
  }

  /**
   * Lollipop horizontal (recomendacao 3.4): haste fina + ponto, valor junto ao
   * ponto. A haste e uma serie de barras estreitas sob a serie de pontos.
   */
  private opcaoLollipop(m: MetricaUso, dados: CategoriaUso[], cor: string): any {
    if (!dados.length) { return null; }
    const inv = [...dados].reverse();
    return {
      tooltip: {
        trigger: 'item',
        formatter: (p: any) => `${p.name}<br/><b>${this.fmt(p.value[0])}</b> ${this.unidade(m, p.value[0])}`,
      },
      grid: { left: 8, right: 56, top: 8, bottom: 32, containLabel: true },
      xAxis: this.eixoValorUso(m),
      yAxis: this.eixoCategoriaUso(inv.map((c) => c.label)),
      series: [
        {
          type: 'bar', barWidth: 3, silent: true, z: 1,
          data: inv.map((c) => ({ value: c[m], itemStyle: { color: c.ni ? COR_NI : cor } })),
        },
        {
          type: 'scatter', symbolSize: 14, z: 3,
          data: inv.map((c) => ({ name: c.label, value: [c[m], c.label], itemStyle: { color: c.ni ? COR_NI : cor } })),
          label: {
            show: true, position: 'right', color: COR_USO, fontWeight: 600,
            formatter: (p: any) => this.fmt(p.value[0]),
          },
          emphasis: { scale: 1.3 },
        },
      ],
    };
  }

  /**
   * Barra horizontal empilhada de 100% (recomendacao 3.6): cada segmento e uma
   * abrangencia; nome e percentual dentro do segmento quando ha espaco (>= 10%),
   * e todos os segmentos na lista abaixo do grafico (nome, percentual, valor).
   */
  private opcaoEmpilhada(m: MetricaUso, dados: CategoriaUso[]): any {
    if (!dados.length) { return null; }
    const total = dados.reduce((acc, c) => acc + c[m], 0);
    return {
      tooltip: {
        trigger: 'item',
        formatter: (p: any) => `${p.seriesName}<br/><b>${this.pct(p.value, total)}%</b> · ${this.fmt(p.value)} ${this.unidade(m, p.value)}`,
      },
      grid: { left: 0, right: 0, top: 4, bottom: 4 },
      xAxis: { type: 'value', max: total, show: false },
      yAxis: { type: 'category', data: [this.rotulo(m)], show: false },
      series: dados.map((c, i) => ({
        name: c.label, type: 'bar', stack: 'total', barWidth: 44,
        data: [c[m]],
        itemStyle: { color: c.ni ? COR_NI : CORES_EMPILHADA[i % CORES_EMPILHADA.length], borderColor: '#fff', borderWidth: 2 },
        label: {
          show: c[m] / total >= 0.1, position: 'inside', fontSize: 12,
          color: i < 3 && !c.ni ? '#fff' : COR_TEXTO_USO,
          formatter: () => `${c.label} ${this.pct(c[m], total)}%`,
        },
        emphasis: { focus: 'none' },
      })),
    };
  }

  /**
   * ODS por uso (recomendacao 3.7): colunas nas cores oficiais, numero do ODS no
   * eixo, valor sobre a barra, nome completo no tooltip; ordem 1..18 + N/I (CA05.1).
   */
  private opcaoOdsUso(m: MetricaUso, dados: OdsUso[]): any {
    if (!dados.some((o) => o[m] > 0)) { return null; }
    return {
      tooltip: {
        trigger: 'axis', axisPointer: { type: 'shadow' },
        formatter: (params: any) => {
          const o = dados[params[0].dataIndex];
          return `${o.label}<br/><b>${this.fmt(o[m])}</b> ${this.unidade(m, o[m])}`;
        },
      },
      grid: { left: 40, right: 16, top: 28, bottom: 40, containLabel: true },
      xAxis: {
        type: 'category', data: dados.map((o) => (o.ni ? 'N/I' : String(o.num))),
        axisLabel: { interval: 0, color: COR_TEXTO_USO },
        name: 'ODS', nameLocation: 'middle', nameGap: 24, nameTextStyle: { color: COR_ROTULO_USO, fontSize: 11 },
      },
      yAxis: {
        type: 'value', minInterval: 1,
        name: this.capitalizar(this.rotulo(m)),
        nameTextStyle: { color: COR_ROTULO_USO, fontSize: 11, align: 'left' },
        axisLabel: { color: COR_ROTULO_USO },
        splitLine: { lineStyle: { color: COR_AUX_USO } },
      },
      series: [{
        type: 'bar',
        data: dados.map((o) => ({ value: o[m], name: o.label, itemStyle: { color: o.cor } })),
        label: {
          show: true, position: 'top', fontSize: 11, color: COR_TEXTO_USO,
          formatter: (p: any) => (p.value > 0 ? this.fmt(p.value) : ''),
        },
      }],
    };
  }

  /**
   * Heatmap de uso (recomendacao 3.2): escala sequencial de verde, valor em TODAS
   * as celulas (texto claro nas escuras), borda branca para delimitar os tons
   * claros; colunas numeradas, com legenda no template.
   */
  private opcaoMatrizUso(m: MetricaUso, matriz: MatrizUso, max: number): any {
    const { docs, avals, celulas } = matriz;
    if (!celulas.length || !max) { return null; }
    return {
      tooltip: { trigger: 'item', showContent: false, transitionDuration: 0 },
      axisPointer: { animation: false },
      grid: { left: 8, right: 64, top: 8, bottom: 40, containLabel: true },
      xAxis: {
        type: 'category', data: avals, splitArea: { show: false },
        axisPointer: { show: true, type: 'line', label: { show: true, margin: 4 }, animation: false, triggerEmphasis: false, lineStyle: { width: 0, opacity: 0 } },
        axisLabel: { interval: 0, fontSize: 11, color: COR_TEXTO_USO, formatter: (_v: string, i: number) => String(i + 1) },
      },
      yAxis: {
        type: 'category', data: docs, splitArea: { show: false },
        axisPointer: { show: true, type: 'line', label: { show: true, margin: 4 }, animation: false, triggerEmphasis: false, lineStyle: { width: 0, opacity: 0 } },
        axisLabel: { width: 200, overflow: 'break', color: COR_TEXTO_USO },
      },
      visualMap: {
        min: 0, max, calculable: false,
        orient: 'vertical', right: 8, top: 'center', itemWidth: 12, itemHeight: 150,
        text: [this.fmt(max), '0'], textStyle: { fontSize: 11, color: COR_ROTULO_USO },
        inRange: { color: ESCALA_VERDE },
      },
      series: [{
        type: 'heatmap',
        data: celulas.map((c) => ({
          value: [c.x, c.y, c[m]],
          // Contraste do numero: claro sobre os dois tons mais escuros da escala.
          label: { color: c[m] / max > 0.6 ? '#fff' : COR_TEXTO_USO },
        })),
        label: { show: true, fontSize: 11 },
        stateAnimation: { duration: 0 },
        emphasis: { focus: 'none', itemStyle: { borderColor: '#0B6256', borderWidth: 2 } },
        itemStyle: { borderColor: '#fff', borderWidth: 2 },
      }],
    };
  }

  private opcaoTreemap(dados: FacetValue[]): any {
    if (!dados.length) { return null; }
    return {
      tooltip: { formatter: (info: any) => `${info.name}<br/>${info.value} avaliações` },
      series: [{
        type: 'treemap', roam: false, breadcrumb: { show: false },
        label: { show: true, formatter: '{b}\n{c}' },
        data: dados.map((v) => ({ name: v.label, value: v.count })),
      }],
    };
  }

  /** Linha do tempo: uma linha por instituicao (ordem cronologica no eixo X). */
  private opcaoLinhaTempo(): any {
    if (!this.anos.length) { return null; }
    return {
      tooltip: { trigger: 'axis' },
      legend: { type: 'scroll', top: 0, textStyle: { fontSize: 11 } },
      grid: { left: 8, right: 24, top: 44, bottom: 8, containLabel: true },
      xAxis: { type: 'category', data: this.anos, boundaryGap: false },
      yAxis: { type: 'value' },
      series: this.evolucaoSeries.map((s, i) => ({
        name: this.sigla(s.nome),
        type: 'line',
        smooth: true,
        showSymbol: false,
        data: s.dados,
        lineStyle: { width: 2, color: CORES_LINHAS[i % CORES_LINHAS.length] },
        itemStyle: { color: CORES_LINHAS[i % CORES_LINHAS.length] },
      })),
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
    this.ligarCruz(chart, () => [this.matrizAvals.length, this.matrizDocs.length]);
  }

  ligarCruzMatrizUso(chart: EChartsType): void {
    this.charts.matriz = chart;
    this.ligarCruz(chart, () => [this.vmMatriz.matriz.avals.length, this.vmMatriz.matriz.docs.length]);
  }

  /**
   * As dimensoes sao lidas a cada evento (nao na ligacao), porque a instancia do
   * grafico sobrevive a recargas por filtro, que mudam o tamanho da matriz.
   * Aceita celulas em array ([x, y, v]) ou em objeto ({ value: [x, y, v] }).
   */
  private ligarCruz(chart: EChartsType, dimensoes: () => [number, number]): void {
    chart.on('mouseover', (p: any) => {
      if (p.componentType !== 'series') { return; }
      const dado = Array.isArray(p.data) ? p.data : p.data?.value;
      if (!Array.isArray(dado)) { return; }
      const [larg, alt] = dimensoes();
      const hx = dado[0];
      const hy = dado[1];
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

  /** Legenda do heatmap: numero do eixo X -> nome completo da avaliacao. */
  get legendaMatriz(): { num: number; nome: string }[] {
    return this.matrizAvals.map((a, i) => ({ num: i + 1, nome: a }));
  }

  /**
   * ODS completo para o grafico e a legenda: faixa fixa de 1 a 18 (zero nos ausentes,
   * com o nome oficial de fallback) mais a coluna "Nao Informado" ao final.
   */
  get odsCompleto(): { num: number; label: string; count: number; cor: string; ni: boolean }[] {
    const porNum: { [n: number]: FacetValue } = {};
    this.ods.forEach((v) => { porNum[this.numeroOds(v.label)] = v; });
    const arr: { num: number; label: string; count: number; cor: string; ni: boolean }[] = [];
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
    arr.push({ num: 19, label: 'Não Informado', count: this.odsNaoInformado, cor: '#9aa5b1', ni: true });
    return arr;
  }

  /** Legenda dos ODS: 1 a 18 mais "Nao Informado", cada um com sua cor. */
  get legendaOds(): { num: number; label: string; cor: string }[] {
    return this.odsCompleto.map((o) => ({ num: o.num, label: o.label, cor: o.cor }));
  }
}
