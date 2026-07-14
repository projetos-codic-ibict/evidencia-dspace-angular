import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'ds-faq-page',
  templateUrl: './faq-page.component.html',
  styleUrls: ['./faq-page.component.scss'],
  standalone: true,
  imports: [CommonModule, TranslateModule],
})
export class FaqPageComponent {

  readonly faqIndices = [0, 1, 2, 3, 4, 5, 6, 7];
  opens: boolean[] = new Array(8).fill(false);

  toggle(index: number): void {
    const isOpen = this.opens[index];
    this.opens = new Array(8).fill(false);
    if (!isOpen) { this.opens[index] = true; }
  }
}
