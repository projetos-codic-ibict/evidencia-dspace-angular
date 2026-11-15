import {
  ChangeDetectionStrategy,
  Component,
  input,
} from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';

import { ContainerView } from '../pipeline-status.view';
import { PipelineValueComponent } from '../value/pipeline-value.component';

/**
 * `docker stats` de uma lista de contêineres: uma linha por contêiner com estado,
 * CPU, memória, rede, I/O de disco e PIDs. Usado dentro do cartão de cada
 * componente e na seção de contêineres avulsos (api, proxy…).
 */
@Component({
  selector: 'ds-pipeline-containers',
  templateUrl: './pipeline-containers.component.html',
  styleUrls: ['./pipeline-containers.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    PipelineValueComponent,
    TranslatePipe,
  ],
})
export class PipelineContainersComponent {
  readonly containers = input.required<ContainerView[]>();
}
