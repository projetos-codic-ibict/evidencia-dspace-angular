import { CommonModule } from '@angular/common';
import {
  Component,
  ElementRef,
  QueryList,
  ViewChildren,
} from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';

import { proximoIndiceAba } from '../shared/tab-keyboard';

type AboutTab = 'apresentacao' | 'acervo' | 'quemsomos';

@Component({
  selector: 'ds-about-rdapp-page',
  templateUrl: './about-rdapp-page.component.html',
  styleUrls: ['./about-rdapp-page.component.scss'],
  imports: [
    CommonModule,
    TranslateModule,
  ],
})
export class AboutRdappPageComponent {

  readonly tabs: AboutTab[] = ['apresentacao', 'acervo', 'quemsomos'];

  activeTab: AboutTab = 'apresentacao';

  @ViewChildren('tabBtn') tabButtons?: QueryList<ElementRef<HTMLButtonElement>>;

  setTab(tab: AboutTab): void {
    this.activeTab = tab;
  }

  /** Setas, Home e End movem o foco entre as abas e ativam a nova (só a aba ativa entra no Tab). */
  onTabKeydown(event: KeyboardEvent): void {
    const next = proximoIndiceAba(event.key, this.tabs.indexOf(this.activeTab), this.tabs.length);
    if (next === null) {
      return;
    }
    event.preventDefault();
    this.setTab(this.tabs[next]);
    this.tabButtons?.get(next)?.nativeElement.focus();
  }
}
