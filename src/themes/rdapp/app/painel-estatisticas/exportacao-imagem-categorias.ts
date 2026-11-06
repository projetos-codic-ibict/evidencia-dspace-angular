/**
 * Exporta categorias com seus totais como imagem PNG/JPG.
 * Util para visualizacoes em cards (1 a 3 categorias), sem ECharts.
 * Os dados recebidos devem ser os mesmos ja filtrados e exibidos no painel.
 */
export function exportarCategoriasImagem(
  dados: ReadonlyArray<{ label: string; count: number; cor?: string }>,
  titulo: string,
  nomeArquivo: string,
  formato: 'png' | 'jpeg',
): void {
  if (typeof document === 'undefined' || !dados.length) { return; }

  const largura = 900;
  const margem = 48;
  const espacoInterno = 26;
  const espacamento = 14;
  const canvas = document.createElement('canvas');
  const contexto = canvas.getContext('2d');
  if (!contexto) { return; }

  // Utiliza exatamente os rotulos completos: sem truncamento.
  function quebrarTexto(texto: string, larguraMaxima: number): string[] {
    const linhas: string[] = [];
    const palavras = texto.trim().split(/\s+/).filter(Boolean);
    let linha = '';

    for (const palavra of palavras) {
      const tentativa = linha ? `${linha} ${palavra}` : palavra;
      if (contexto!.measureText(tentativa).width <= larguraMaxima) {
        linha = tentativa;
      } else {
        if (linha) { linhas.push(linha); }
        linha = '';
        // Tambem lida com nomes muito longos sem espacos.
        for (const letra of palavra) {
          if (linha && contexto!.measureText(linha + letra).width > larguraMaxima) {
            linhas.push(linha);
            linha = '';
          }
          linha += letra;
        }
      }
    }
    if (linha) { linhas.push(linha); }
    return linhas.length ? linhas : ['Não informado'];
  }

  contexto.font = '20px Arial, sans-serif';
  const linhasPorCategoria = dados.map((d) =>
    quebrarTexto(d.label || 'Não informado', largura - 2 * margem - 2 * espacoInterno - 150),
  );
  const alturas = linhasPorCategoria.map((linhas) => Math.max(92, linhas.length * 27 + 38));
  const altura = 154 + alturas.reduce((soma, valor) => soma + valor, 0)
    + espacamento * Math.max(0, dados.length - 1) + 48;

  // Renderiza em resolucao dobrada, mantendo medidas CSS independentes do DPI.
  const escala = 2;
  canvas.width = largura * escala;
  canvas.height = altura * escala;
  contexto.scale(escala, escala);

  contexto.fillStyle = '#FFFFFF';
  contexto.fillRect(0, 0, largura, altura);
  contexto.fillStyle = '#65758B';
  contexto.font = 'bold 15px Arial, sans-serif';
  contexto.fillText('RDAPP | INDICADORES DO ACERVO', margem, 45);
  contexto.fillStyle = '#0B3A82';
  contexto.font = 'bold 30px Arial, sans-serif';
  contexto.fillText(titulo, margem, 97);
  contexto.strokeStyle = '#DCE5F1';
  contexto.beginPath();
  contexto.moveTo(margem, 119);
  contexto.lineTo(largura - margem, 119);
  contexto.stroke();

  let topo = 154;
  dados.forEach((d, indice) => {
    const alturaCard = alturas[indice];
    const linhas = linhasPorCategoria[indice];

    contexto.fillStyle = '#F4F7FC';
    contexto.fillRect(margem, topo, largura - 2 * margem, alturaCard);

    /**
 * Utiliza a cor específica da categoria quando informada.
 * Caso contrário, mantém o azul padrão do RDAPP.
 */
    contexto.fillStyle =
  d.cor && /^#[0-9a-fA-F]{6}$/.test(d.cor)
    ? d.cor
    : '#1E5CC8';

    contexto.fillRect(margem, topo, 5, alturaCard);


    contexto.fillStyle = '#253448';
    contexto.font = '20px Arial, sans-serif';
    linhas.forEach((linha, idx) => {
      contexto.fillText(linha, margem + espacoInterno, topo + 39 + idx * 27);
    });

    contexto.fillStyle = '#0B3A82';
    contexto.font = 'bold 26px Arial, sans-serif';
    contexto.textAlign = 'right';
    contexto.fillText(Number(d.count).toLocaleString('pt-BR'), largura - margem - espacoInterno, topo + 50);
    contexto.textAlign = 'left';
    topo += alturaCard + espacamento;
  });

  contexto.fillStyle = '#65758B';
  contexto.font = '14px Arial, sans-serif';
  contexto.fillText('Quantidade de avaliações · Recorte atual dos filtros', margem, altura - 21);

  const tipoMime = formato === 'png' ? 'image/png' : 'image/jpeg';
  const url = canvas.toDataURL(tipoMime, formato === 'jpeg' ? 0.94 : undefined);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${nomeArquivo}.${formato === 'jpeg' ? 'jpg' : 'png'}`;
  document.body.appendChild(link);
  link.click();
  link.remove();
}
