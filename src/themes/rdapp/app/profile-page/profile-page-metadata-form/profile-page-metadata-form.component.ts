import { Component } from '@angular/core';
import { EPersonDataService } from '@dspace/core/eperson/eperson-data.service';
import { NotificationsService } from '@dspace/core/notification-system/notifications.service';
import { getFirstSucceededRemoteListPayload } from '@dspace/core/shared/operators';
import { PageInfo } from '@dspace/core/shared/page-info.model';
import { VocabularyOptions } from '@dspace/core/submission/vocabularies/models/vocabulary-options.model';
import { VocabularyService } from '@dspace/core/submission/vocabularies/vocabulary.service';
import { DynamicSelectModel } from '@ng-dynamic-forms/core';
import { TranslateService } from '@ngx-translate/core';

import { FormBuilderService } from '../../../../../app/shared/form/builder/form-builder.service';
import { FormComponent } from '../../../../../app/shared/form/form.component';
import { ProfilePageMetadataFormComponent as BaseComponent } from '../../../../../app/profile-page/profile-page-metadata-form/profile-page-metadata-form.component';

/**
 * Override rdapp: soma o campo "Instituição" (eperson.institution) ao formulário de perfil
 * (HU013 CA09). As opções vêm do vocabulário rdapp-instituicoes, o mesmo já usado pelo campo
 * local.instituicao do item — evita manter a lista duplicada em dois lugares.
 */
@Component({
  selector: 'ds-themed-profile-page-metadata-form',
  templateUrl: '../../../../../app/profile-page/profile-page-metadata-form/profile-page-metadata-form.component.html',
  imports: [
    FormComponent,
  ],
})
export class ProfilePageMetadataFormComponent extends BaseComponent {

  constructor(
    formBuilderService: FormBuilderService,
    translate: TranslateService,
    epersonService: EPersonDataService,
    notificationsService: NotificationsService,
    protected vocabularyService: VocabularyService,
  ) {
    super(formBuilderService, translate, epersonService, notificationsService);
  }

  override ngOnInit(): void {
    this.vocabularyService.getVocabularyEntries(
      new VocabularyOptions('rdapp-instituicoes', 'local.instituicao', null, true),
      new PageInfo(),
    ).pipe(
      getFirstSucceededRemoteListPayload(),
    ).subscribe((entries) => {
      this.formModel.push(new DynamicSelectModel<string>({
        id: 'institution',
        name: 'eperson.institution',
        required: true,
        validators: {
          required: null,
        },
        options: entries.map((entry) => ({ value: entry.value, label: entry.display })),
      }));

      super.ngOnInit();
    });
  }
}
