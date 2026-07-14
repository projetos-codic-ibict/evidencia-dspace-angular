import {
  Component,
  inject,
  OnDestroy,
  ViewEncapsulation,
} from '@angular/core';
import { NgbModal, NgbModalModule } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule } from '@ngx-translate/core';

import { ItemBibliographyService } from '../../../../../../../../app/core/data/bibliography-data.service';
import { ItemPageBibliographyComponent as BaseComponent } from '../../../../../../../../app/item-page/simple/field-components/specific-field/bibliography/item-page-bibliography.component';

@Component({
  selector: 'ds-item-page-bibliography',
  templateUrl: './item-page-bibliography.component.html',
  styleUrls: ['./item-page-bibliography.component.scss'],
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [
    NgbModalModule,
    TranslateModule,
  ],
})
export class ItemPageBibliographyComponent extends BaseComponent implements OnDestroy {

  copiedStyle: string | null = null;
  private copyTimer: ReturnType<typeof setTimeout> | null = null;

  private bibliographySvc = inject(ItemBibliographyService);
  private modalSvc = inject(NgbModal);

  override openModal(content: unknown): void {
    this.loading = true;
    this.error = false;

    this.bibliographySvc.getBibliographies(this.item).subscribe({
      next: (data) => {
        this.bibliographies = data?.bibliographies ?? [];
        this.loading = false;
        this.modalSvc.open(content, {
          size: 'lg',
          ariaLabelledBy: 'rdapp-cite-modal-title',
          windowClass: 'rdapp-citation-modal',
          scrollable: true,
        });
      },
      error: (err: unknown) => {
        this.loading = false;
        this.error = true;
        console.error(err);
      },
    });
  }

  copyStyle(value: string, style: string): void {
    super.copyToClipboard(value);
    this.playSuccessSound();
    if (this.copyTimer) clearTimeout(this.copyTimer);
    this.copiedStyle = style;
    this.copyTimer = setTimeout(() => { this.copiedStyle = null; }, 2000);
  }

  private playSuccessSound(): void {
    try {
      const ctx = new AudioContext();
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.18, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
      gain.connect(ctx.destination);

      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.setValueAtTime(1100, ctx.currentTime + 0.1);
      osc.connect(gain);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.35);
      osc.onended = () => ctx.close();
    } catch {
      // Web Audio API não disponível
    }
  }

  ngOnDestroy(): void {
    if (this.copyTimer) clearTimeout(this.copyTimer);
  }
}
