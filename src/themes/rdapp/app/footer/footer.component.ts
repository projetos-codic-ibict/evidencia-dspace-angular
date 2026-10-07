import { Component } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';

import { FooterComponent as BaseFooterComponent } from '../../../../app/footer/footer.component';

@Component({
  selector: 'ds-themed-footer',
  styleUrls: ['footer.component.scss'],
  templateUrl: 'footer.component.html',
  imports: [
    TranslateModule,
  ],
})
export class FooterComponent extends BaseFooterComponent {}
