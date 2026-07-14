import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'ds-about-rdapp-page',
  templateUrl: './about-rdapp-page.component.html',
  styleUrls: ['./about-rdapp-page.component.scss'],
  standalone: true,
  imports: [CommonModule, TranslateModule],
})
export class AboutRdappPageComponent {

  activeTab: 'apresentacao' | 'acervo' | 'quemsomos' = 'apresentacao';

  setTab(tab: 'apresentacao' | 'acervo' | 'quemsomos'): void {
    this.activeTab = tab;
  }
}
