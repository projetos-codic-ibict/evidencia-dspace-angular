import { HttpErrorResponse } from '@angular/common/http';
import {
  ComponentFixture,
  TestBed,
} from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { TranslateLoaderMock } from '@dspace/core/testing/translate-loader.mock';
import {
  TranslateLoader,
  TranslateModule,
} from '@ngx-translate/core';
import {
  of,
  throwError,
} from 'rxjs';

import {
  IngestItemResponse,
  IngestionService,
} from '../ingestion.service';
import { IngestionStartComponent } from './ingestion-start.component';

const UUID = '0f1e2d3c-4b5a-6978-8a9b-0c1d2e3f4a5b';
const QUEUED: IngestItemResponse = {
  status: 'na_fila',
  item_uuid: UUID,
  jobs: [{ job_id: 'bs-1', filename: 'relatorio.pdf' }],
};

describe('IngestionStartComponent', () => {
  let component: IngestionStartComponent;
  let fixture: ComponentFixture<IngestionStartComponent>;
  let ingestion: jasmine.SpyObj<IngestionService>;

  beforeEach(() => {
    ingestion = jasmine.createSpyObj('IngestionService', ['ingestItem']);
    ingestion.ingestItem.and.returnValue(of(QUEUED));

    TestBed.configureTestingModule({
      imports: [
        IngestionStartComponent,
        TranslateModule.forRoot({
          loader: { provide: TranslateLoader, useClass: TranslateLoaderMock },
        }),
      ],
      providers: [{ provide: IngestionService, useValue: ingestion }],
    });

    fixture = TestBed.createComponent(IngestionStartComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  function submit(value: string): void {
    const box = fixture.debugElement.query(By.css('#ingestion-item-uuid')).nativeElement as HTMLInputElement;
    box.value = value;
    fixture.debugElement.query(By.css('form')).triggerEventHandler('submit', new Event('submit'));
    fixture.detectChanges();
  }

  it('não chama a API com o campo vazio', () => {
    submit('   ');

    expect(ingestion.ingestItem).not.toHaveBeenCalled();
    expect(component.invalidKey()).toBe('health-page.ingestion.start.required');
  });

  it('não chama a API com um UUID malformado', () => {
    submit('item-123');

    expect(ingestion.ingestItem).not.toHaveBeenCalled();
    expect(component.invalidKey()).toBe('health-page.ingestion.start.malformed');
  });

  it('envia o UUID sem espaços e avisa o pai', () => {
    const started: string[] = [];
    component.started.subscribe((uuid: string) => started.push(uuid));

    submit(`  ${UUID}  `);

    expect(ingestion.ingestItem).toHaveBeenCalledWith(UUID, false);
    expect(started).toEqual([UUID]);
    expect(component.outcome().response).toEqual(QUEUED);
    expect(fixture.nativeElement.textContent).toContain('relatorio.pdf');
  });

  it('repassa o force quando marcado', () => {
    component.toggleForce();
    submit(UUID);

    expect(ingestion.ingestItem).toHaveBeenCalledWith(UUID, true);
  });

  it('mostra a espera quando o item ainda não está no DSpace', () => {
    ingestion.ingestItem.and.returnValue(of({
      status: 'aguardando_dspace', item_uuid: UUID, job_id: `item:${UUID}`, jobs: [],
    }));

    submit(UUID);

    expect(fixture.nativeElement.textContent).toContain(`item:${UUID}`);
  });

  [
    [401, 'health-page.ingestion.start.error.unauthorized'],
    [403, 'health-page.ingestion.start.error.forbidden'],
    [502, 'health-page.ingestion.start.error.dspace'],
    [500, 'health-page.ingestion.start.error.unknown'],
  ].forEach(([status, key]: [number, string]) => {
    it(`traduz o erro ${status} sem avisar o pai`, () => {
      const started: string[] = [];
      component.started.subscribe((uuid: string) => started.push(uuid));
      ingestion.ingestItem.and.returnValue(throwError(() => new HttpErrorResponse({
        status, error: { detail: 'DSpace retornou HTTP 404 para o item.' },
      })));

      submit(UUID);

      expect(component.outcome().errorKey).toBe(key);
      expect(component.outcome().errorDetail).toBe('DSpace retornou HTTP 404 para o item.');
      expect(component.loading()).toBeFalse();
      expect(started).toEqual([]);
    });
  });
});
