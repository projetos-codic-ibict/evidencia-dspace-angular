import {
  Component,
  Input,
} from '@angular/core';
import {
  ComponentFixture,
  TestBed,
} from '@angular/core/testing';
import { Item } from '@dspace/core/shared/item.model';
import { TranslateModule } from '@ngx-translate/core';
import {
  BehaviorSubject,
  of,
} from 'rxjs';

import { ItemDataService } from '../../../../app/core/data/item-data.service';
import { createSuccessfulRemoteDataObject } from '../../../../app/core/utilities/remote-data.utils';
import { ListableObjectComponentLoaderComponent } from '../../../../app/shared/object-collection/shared/listable-object/listable-object-component-loader.component';
import { FavoriteItemsComponent } from './favorite-items.component';
import { FavoriteService } from './favorite.service';

@Component({ selector: 'ds-listable-object-component-loader', template: '', standalone: true })
class ListableObjectLoaderStubComponent {
  @Input() object: unknown;
  @Input() viewMode: unknown;
  @Input() context: unknown;
}

describe('FavoriteItemsComponent', () => {
  let fixture: ComponentFixture<FavoriteItemsComponent>;
  let favoriteIds$: BehaviorSubject<ReadonlySet<string> | null>;
  let favoriteService: { getFavoriteIds: jasmine.Spy; favoriteIds$: BehaviorSubject<ReadonlySet<string> | null> };
  let itemService: { findById: jasmine.Spy };

  const cards = () => fixture.nativeElement.querySelectorAll('ds-listable-object-component-loader');

  async function create(ids: string[], failing: string[] = []) {
    favoriteIds$ = new BehaviorSubject<ReadonlySet<string> | null>(null);
    favoriteService = {
      favoriteIds$,
      getFavoriteIds: jasmine.createSpy('getFavoriteIds').and.callFake(() => {
        favoriteIds$.next(new Set(ids));
        return of(ids);
      }),
    };
    itemService = {
      findById: jasmine.createSpy('findById').and.callFake((id: string) => of(
        failing.includes(id)
          ? { hasCompleted: true, hasSucceeded: false, payload: undefined }
          : createSuccessfulRemoteDataObject(Object.assign(new Item(), { uuid: id })),
      )),
    };
    await TestBed.configureTestingModule({
      imports: [FavoriteItemsComponent, TranslateModule.forRoot()],
      providers: [
        { provide: FavoriteService, useValue: favoriteService },
        { provide: ItemDataService, useValue: itemService },
      ],
    })
      .overrideComponent(FavoriteItemsComponent, {
        remove: { imports: [ListableObjectComponentLoaderComponent] },
        add: { imports: [ListableObjectLoaderStubComponent] },
      })
      .compileComponents();
    fixture = TestBed.createComponent(FavoriteItemsComponent);
    fixture.detectChanges();
  }

  it('mostra um card por favorito, na ordem que o backend devolveu', async () => {
    await create(['b', 'a']);

    expect(cards().length).toBe(2);
    expect(itemService.findById.calls.allArgs().map((args) => args[0])).toEqual(['b', 'a']);
  });

  it('mostra o estado vazio quando não há favoritos', async () => {
    await create([]);

    expect(cards().length).toBe(0);
    expect(fixture.nativeElement.querySelector('.alert-info')).not.toBeNull();
  });

  it('omite o item que não carregou', async () => {
    await create(['a', 'b'], ['b']);

    expect(cards().length).toBe(1);
  });

  it('tira o card na hora quando a estrela é desmarcada', async () => {
    await create(['a', 'b']);

    favoriteIds$.next(new Set(['b']));
    fixture.detectChanges();

    expect(cards().length).toBe(1);
  });
});
