import { AsyncPipe, SlicePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
} from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';

import { Item } from '../../../../../../../app/core/shared/item.model';
import { Context } from '../../../../../../../app/core/shared/context.model';
import { ViewMode } from '../../../../../../../app/core/shared/view-mode.model';
import { DsoEditMenuComponent } from '../../../../../../../app/shared/dso-page/dso-edit-menu/dso-edit-menu.component';
import { listableObjectComponent } from '../../../../../../../app/shared/object-collection/shared/listable-object/listable-object.decorator';
import { ThemedResultsBackButtonComponent } from '../../../../../../../app/shared/results-back-button/themed-results-back-button.component';
import { ThemedThumbnailComponent } from '../../../../../../../app/thumbnail/themed-thumbnail.component';
import { RouterLink } from '@angular/router';
import { NgbDropdownModule } from '@ng-bootstrap/ng-bootstrap';
import { ThemedFileSectionComponent } from '../../../../../../../app/item-page/simple/field-components/file-section/themed-file-section.component';
import { PublicationComponent } from '../publication/publication.component';
import { RelatedPublicationsComponent } from '../../related-publications/related-publications.component';

@listableObjectComponent(Item, ViewMode.StandalonePage, Context.Any, 'rdapp')
@Component({
  selector: 'ds-themed-untyped-item',
  templateUrl: '../publication/publication.component.html',
  styleUrls: ['../publication/publication.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    AsyncPipe,
    DsoEditMenuComponent,
    NgbDropdownModule,
    RelatedPublicationsComponent,
    RouterLink,
    SlicePipe,
    ThemedFileSectionComponent,
    ThemedResultsBackButtonComponent,
    ThemedThumbnailComponent,
    TranslateModule,
  ],
})
export class UntypedItemComponent extends PublicationComponent {}
