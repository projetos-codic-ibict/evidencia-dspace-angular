import { Component } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { TranslateService } from '@ngx-translate/core';
import { ResultsBackButtonComponent as BaseComponent } from '../../../../../app/shared/results-back-button/results-back-button.component';

@Component({
  selector: 'ds-base-results-back-button',
  templateUrl: './results-back-button.component.html',
  styleUrls: ['./results-back-button.component.scss'],
  imports: [AsyncPipe],
})
export class ResultsBackButtonComponent extends BaseComponent {
  constructor(private translate: TranslateService) {
    super(translate);
  }

  override ngOnInit(): void {
    if (!this.buttonLabel) {
      this.buttonLabel = this.translate.get('rdapp.item.back');
    }
  }
}
