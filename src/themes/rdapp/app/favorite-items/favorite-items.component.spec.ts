import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FavoriteItemsComponent } from './favorite-items.component';

describe('FavoriteItemsComponent', () => {
  let component: FavoriteItemsComponent;
  let fixture: ComponentFixture<FavoriteItemsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FavoriteItemsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FavoriteItemsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
