import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';

import { TypeBadgeComponent as BaseTypeBadgeComponent } from '../../../../../../../../app/shared/object-collection/shared/badges/type-badge/type-badge.component';
import { DSpaceObject } from '../../../../../../../../app/core/shared/dspace-object.model';

@Component({
  selector: 'ds-base-type-badge',
  templateUrl: './type-badge.component.html',
  styleUrls: ['./type-badge.component.scss'],
  standalone: true,
  imports: [TranslateModule, CommonModule],
})
export class TypeBadgeComponent extends BaseTypeBadgeComponent {

  documentType: string;
  odsValues: string[] = [];

  // Sem @Input() aqui — o decorator já está no base; colocar nos dois causa conflito
  override set object(object: DSpaceObject) {
    super.object = object;

    if (object) {
      const rawTipo = object.firstMetadataValue('local.tipodocumento');
      this.documentType = rawTipo ? rawTipo.trim() : null;
      this.odsValues = object.allMetadataValues('local.ods') || [];
    }
  }

  override get object(): DSpaceObject {
    return super.object;
  }

  getOdsNumber(ods: string): string {
    const match = ods?.match(/^(\d+)/);
    return match ? match[1] : '';
  }

  getOdsLabel(ods: string): string {
    return ods?.replace(/^\d+\s*-\s*/, '').trim() ?? ods;
  }

  getOdsBg(ods: string): string {
    if (!ods) { return '#6c757d'; }
    const cleanText = ods.replace(/^\d+\s*-\s*/, '').toLowerCase().trim();
    return this.generateColorFromText(cleanText);
  }

  private generateColorFromText(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const hue = Math.abs(hash) % 360;
    return `hsl(${hue}, 70%, 40%)`;
  }
}

