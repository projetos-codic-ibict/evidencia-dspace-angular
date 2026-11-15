import {
  ChangeDetectionStrategy,
  Component,
  input,
} from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';

import { HostView } from '../pipeline-status.view';
import { PipelineValueComponent } from '../value/pipeline-value.component';

/**
 * Seção "Servidor": CPU, load, uptime, memória, swap e discos da máquina onde o
 * stack roda, medidos pelo coletor docker-stats.
 */
@Component({
  selector: 'ds-pipeline-host',
  templateUrl: './pipeline-host.component.html',
  styleUrls: ['./pipeline-host.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    PipelineValueComponent,
    TranslatePipe,
  ],
})
export class PipelineHostComponent {
  readonly host = input.required<HostView>();
}
