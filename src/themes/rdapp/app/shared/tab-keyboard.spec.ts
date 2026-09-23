import { proximoIndiceAba } from './tab-keyboard';

describe('proximoIndiceAba', () => {
  it('seta para a direita avança uma aba', () => {
    expect(proximoIndiceAba('ArrowRight', 0, 3)).toBe(1);
  });

  it('seta para a direita na última aba volta para a primeira', () => {
    expect(proximoIndiceAba('ArrowRight', 2, 3)).toBe(0);
  });

  it('seta para a esquerda recua uma aba', () => {
    expect(proximoIndiceAba('ArrowLeft', 2, 3)).toBe(1);
  });

  it('seta para a esquerda na primeira aba vai para a última', () => {
    expect(proximoIndiceAba('ArrowLeft', 0, 3)).toBe(2);
  });

  it('Home vai para a primeira aba', () => {
    expect(proximoIndiceAba('Home', 2, 3)).toBe(0);
  });

  it('End vai para a última aba', () => {
    expect(proximoIndiceAba('End', 0, 3)).toBe(2);
  });

  it('outras teclas devolvem null', () => {
    expect(proximoIndiceAba('Tab', 1, 3)).toBeNull();
    expect(proximoIndiceAba('Enter', 1, 3)).toBeNull();
    expect(proximoIndiceAba('ArrowDown', 1, 3)).toBeNull();
  });
});
