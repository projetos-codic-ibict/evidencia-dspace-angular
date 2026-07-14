import {
  autoserialize,
  deserialize,
} from 'cerialize';
import { typedObject } from 'src/app/core/cache/builders/build-decorators';
import { DSpaceObject } from 'src/app/core/shared/dspace-object.model';
import { HALLink } from 'src/app/core/shared/hal-link.model';
import { ResourceType } from 'src/app/core/shared/resource-type';
import { excludeFromEquals } from 'src/app/core/utilities/equals.decorators';

import { Bibliography } from './bibliography.model';
import { BIBLIOGRAPHY } from './bibliography.resource-type';

/**
 * Class representing bibliography data for a DSpace Item
 */
@typedObject
export class BibliographyData extends DSpaceObject {
  static type = BIBLIOGRAPHY;

  @excludeFromEquals
  @autoserialize
  type: ResourceType;

  @autoserialize
  bibliographies: Bibliography[];

  @deserialize
  _links: {
    self: HALLink;
  };
}
