import {
  ComponentFixture,
  TestBed,
} from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { TranslateLoaderMock } from '@dspace/core/testing/translate-loader.mock';
import {
  TranslateLoader,
  TranslateModule,
} from '@ngx-translate/core';

import { IngestionJob } from '../ingestion-stages';
import { IngestionJobCardComponent } from './ingestion-job-card.component';

describe('IngestionJobCardComponent', () => {
  let component: IngestionJobCardComponent;
  let fixture: ComponentFixture<IngestionJobCardComponent>;

  function create(job: IngestionJob): void {
    TestBed.configureTestingModule({
      imports: [
        IngestionJobCardComponent,
        TranslateModule.forRoot({
          loader: { provide: TranslateLoader, useClass: TranslateLoaderMock },
        }),
      ],
      providers: [provideRouter([])],
    });
    fixture = TestBed.createComponent(IngestionJobCardComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('job', job);
    fixture.detectChanges();
  }

  function button(label: string): HTMLButtonElement | undefined {
    return fixture.debugElement.queryAll(By.css('button'))
      .map((el) => el.nativeElement as HTMLButtonElement)
      .find((el: HTMLButtonElement) => el.textContent.includes(label));
  }

  it('pede confirmação antes de cancelar e só então emite o job_id', () => {
    create({ job_id: 'bs-1', status: 'processando', stage: 'mineru' });
    const emitted: string[] = [];
    component.cancel.subscribe((id: string) => emitted.push(id));

    button('health-page.ingestion.cancel.action').click();
    fixture.detectChanges();
    expect(emitted).toEqual([]);

    button('health-page.ingestion.cancel.confirm-yes').click();
    fixture.detectChanges();
    expect(emitted).toEqual(['bs-1']);
  });

  it('"Manter" desiste sem emitir', () => {
    create({ job_id: 'bs-1', status: 'na_fila' });
    const emitted: string[] = [];
    component.cancel.subscribe((id: string) => emitted.push(id));

    button('health-page.ingestion.cancel.action').click();
    fixture.detectChanges();
    button('health-page.ingestion.cancel.keep').click();
    fixture.detectChanges();

    expect(emitted).toEqual([]);
    expect(button('health-page.ingestion.cancel.action')).toBeDefined();
  });

  it('não oferece cancelar um job que já terminou', () => {
    create({ job_id: 'bs-1', status: 'concluido' });

    expect(button('health-page.ingestion.cancel.action')).toBeUndefined();
  });

  it('mostra o andamento e o erro vindos do pai', () => {
    create({ job_id: 'bs-1', status: 'processando' });

    fixture.componentRef.setInput('cancelState', { phase: 'loading' });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('health-page.ingestion.cancel.loading');
    expect(button('health-page.ingestion.cancel.action')).toBeUndefined();

    fixture.componentRef.setInput('cancelState', {
      phase: 'error', errorKey: 'health-page.ingestion.cancel.error.finished',
    });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('health-page.ingestion.cancel.error.finished');
    expect(button('health-page.ingestion.cancel.action')).toBeDefined();
  });
});
