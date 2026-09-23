/**
 * Padrão de teclado de abas do WAI-ARIA: setas direita e esquerda circulam entre as abas, Home e End
 * vão às pontas. Devolve o índice da aba que deve receber o foco, ou null para qualquer outra tecla.
 * O componente cuida de ativar a aba e de chamar focus() no botão (com tabindex itinerante).
 */
export function proximoIndiceAba(tecla: string, atual: number, total: number): number | null {
  switch (tecla) {
    case 'ArrowRight':
      return (atual + 1) % total;
    case 'ArrowLeft':
      return (atual - 1 + total) % total;
    case 'Home':
      return 0;
    case 'End':
      return total - 1;
    default:
      return null;
  }
}
