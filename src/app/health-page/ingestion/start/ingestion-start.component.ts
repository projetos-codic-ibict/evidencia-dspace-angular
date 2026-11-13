import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  inject,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TranslatePipe } from '@ngx-translate/core';
import { take } from 'rxjs/operators';

import { BtnDisabledDirective } from '../../../shared/btn-disabled.directive';
import {
  IngestItemResponse,
  IngestionService,
} from '../ingestion.service';
import { errorStatus } from '../ingestion-state';

/** UUID do DSpace (8-4-4-4-12 hex). A API valida de novo e responde 422. */
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Mensagem de erro por status HTTP; o resto cai em `unknown`. */
const START_ERROR_KEYS: Record<number, string> = {
  0: 'health-page.ingestion.start.error.offline',
  401: 'health-page.ingestion.start.error.unauthorized',
  403: 'health-page.ingestion.start.error.forbidden',
  404: 'health-page.ingestion.start.error.notfound',
  422: 'health-page.ingestion.start.error.invalid',
  429: 'health-page.ingestion.start.error.throttled',
  502: 'health-page.ingestion.start.error.dspace',
  503: 'health-page.ingestion.start.error.unavailable',
};

/** O que o template mostra depois de um envio. */
interface StartOutcome {
  response: IngestItemResponse | null;
  errorKey: string | null;
  /** `detail` devolvido pela API (ex.: "DSpace retornou HTTP 404 para o item …"). */
  errorDetail: string | null;
}

const EMPTY_OUTCOME: StartOutcome = { response: null, errorKey: null, errorDetail: null };

/**
 * Inicia a ingestão de um item do DSpace pelo UUID (POST /api/files/ingest/item/{uuid}).
 * Exige Bearer de administrador do DSpace, como o reprocessamento: o interceptor de
 * autenticação do DSpace já anexa o token. Ao enfileirar, avisa o pai (`started`)
 * para que a lista de jobs em andamento seja atualizada.
 */
@Component({
  selector: 'ds-ingestion-start',
  templateUrl: './ingestion-start.component.html',
  styleUrls: ['./ingestion-start.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    BtnDisabledDirective,
    TranslatePipe,
  ],
})
export class IngestionStartComponent {

  /** Emitido com o UUID do item quando a API aceitou o pedido (202). */
  readonly started = output<string>();

  readonly loading = signal(false);
  /** Chave i18n do erro de validação local (campo vazio ou UUID malformado). */
  readonly invalidKey = signal<string | null>(null);
  readonly force = signal(false);
  readonly outcome = signal<StartOutcome>(EMPTY_OUTCOME);

  private readonly ingestion = inject(IngestionService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly box = viewChild<ElementRef<HTMLInputElement>>('uuidBox');

  onSubmit(event: Event): void {
    event.preventDefault();
    if (this.loading()) {
      return;
    }
    const uuid = (this.box()?.nativeElement.value ?? '').trim();
    if (uuid === '') {
      this.markInvalid('health-page.ingestion.start.required');
      return;
    }
    if (!UUID_RE.test(uuid)) {
      this.markInvalid('health-page.ingestion.start.malformed');
      return;
    }

    this.invalidKey.set(null);
    this.outcome.set(EMPTY_OUTCOME);
    this.loading.set(true);
    this.ingestion.ingestItem(uuid, this.force()).pipe(
      take(1),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe({
      next: (response: IngestItemResponse) => {
        this.loading.set(false);
        this.outcome.set({ ...EMPTY_OUTCOME, response });
        this.started.emit(response.item_uuid ?? uuid);
      },
      error: (err: unknown) => {
        this.loading.set(false);
        this.outcome.set({
          ...EMPTY_OUTCOME,
          errorKey: START_ERROR_KEYS[errorStatus(err)] ?? 'health-page.ingestion.start.error.unknown',
          errorDetail: this.detailOf(err),
        });
      },
    });
  }

  toggleForce(): void {
    this.force.update((on: boolean) => !on);
  }

  /** O item ficou esperando o DSpace (ainda indisponível) em vez de ir para a fila. */
  isWaiting(response: IngestItemResponse): boolean {
    return response.status === 'aguardando_dspace';
  }

  private markInvalid(key: string): void {
    this.invalidKey.set(key);
    this.box()?.nativeElement.focus();
  }

  /** `detail` textual da resposta de erro da API, quando houver. */
  private detailOf(err: unknown): string | null {
    const detail = (err as { error?: { detail?: unknown } } | null)?.error?.detail;
    return typeof detail === 'string' && detail.trim() !== '' ? detail : null;
  }
}
