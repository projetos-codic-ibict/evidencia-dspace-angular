import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';

import { ReprocessState } from '../ingestion-reprocess';
import {
  IngestionJob,
  isCancellableJob,
  statusBadgeClass,
  statusLabelKey,
} from '../ingestion-stages';
import { IngestionStepperComponent } from '../stepper/ingestion-stepper.component';

/**
 * Card de um job em andamento. Mostra o mínimo necessário — situação, arquivo,
 * estágio e o momento da última mudança — com as ações abrir o item e cancelar o
 * job. O identificador completo fica acessível pelo `title`, sem esticar o card.
 *
 * Cancelar não tem volta (só reprocessando), então pede confirmação no próprio
 * card; a chamada à API fica com o componente pai, que devolve a fase em
 * `cancelState`.
 */
@Component({
  selector: 'ds-ingestion-job-card',
  templateUrl: './ingestion-job-card.component.html',
  styleUrls: ['./ingestion-job-card.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DatePipe,
    IngestionStepperComponent,
    RouterLink,
    TranslatePipe,
  ],
})
export class IngestionJobCardComponent {

  readonly job = input.required<IngestionJob>();
  /** Fase do cancelamento deste job, mantida pelo pai. */
  readonly cancelState = input<ReprocessState>({ phase: 'idle' });

  /** Pedido de cancelamento já confirmado (emite o `job_id`). */
  readonly cancel = output<string>();

  /** Aguardando a confirmação do cancelamento. */
  readonly confirming = signal(false);

  readonly cancellable = computed(() => isCancellableJob(this.job()));

  readonly badgeClass = computed(() => statusBadgeClass(this.job().status));
  readonly statusKey = computed(() => statusLabelKey(this.job().status));
  readonly title = computed(() => this.job().filename ?? this.job().job_id);

  askCancel(): void {
    this.confirming.set(true);
  }

  keepJob(): void {
    this.confirming.set(false);
  }

  confirmCancel(): void {
    this.confirming.set(false);
    this.cancel.emit(this.job().job_id);
  }
}
