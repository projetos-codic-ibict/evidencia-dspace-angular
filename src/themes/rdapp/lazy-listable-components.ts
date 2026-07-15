/**
 * Add components that use the @listableObjectComponent decorator here.
 * This will ensure that the decorators get picked up when the app loads
 */
import { PublicationComponent } from './app/item-page/simple/item-types/publication/publication.component';
import { UntypedItemComponent } from './app/item-page/simple/item-types/untyped-item/untyped-item.component';
import { ItemSearchResultListElementComponent } from './app/shared/object-list/search-result-list-element/item-search-result/item-types/item/item-search-result-list-element.component';

export const LISTABLE_COMPONENTS = [
  PublicationComponent,
  UntypedItemComponent,
  ItemSearchResultListElementComponent,
];
