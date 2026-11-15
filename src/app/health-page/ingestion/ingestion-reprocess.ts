/**
 * Fase de uma ação sobre um job (reprocessar uma falha, cancelar um job em
 * andamento), por job. O mesmo formato serve às duas ações.
 */
export type ReprocessPhase = 'idle' | 'loading' | 'done' | 'error';

export interface ReprocessState {
  phase: ReprocessPhase;
  /** Chave i18n do erro quando `phase === 'error'`. */
  errorKey?: string;
}
