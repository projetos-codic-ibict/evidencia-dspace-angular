import { isPlatformBrowser } from '@angular/common';
import {
  Component,
  HostListener,
  Inject,
  PLATFORM_ID,
} from '@angular/core';

@Component({
  selector: 'ds-scroll-to-top',
  templateUrl: './scroll-to-top.component.html',
  styleUrls: ['./scroll-to-top.component.scss'],
})
export class ScrollToTopComponent {
  visible = false;

  constructor(@Inject(PLATFORM_ID) private platformId: object) {}

  @HostListener('window:scroll')
  onScroll(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.visible = window.scrollY > 50;
    }
  }

  scrollToTop(): void {
    if (isPlatformBrowser(this.platformId)) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      // O botão some no topo (visibility: hidden) e o foco se perderia com ele. Leva o foco para o
      // conteúdo principal, como o skip link do base, sem interromper a rolagem suave.
      const conteudo = document.getElementById('main-content');
      if (conteudo) {
        conteudo.tabIndex = -1;
        conteudo.focus({ preventScroll: true });
      }
    }
  }
}
