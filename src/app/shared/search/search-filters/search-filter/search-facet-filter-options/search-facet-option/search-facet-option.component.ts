import { AsyncPipe } from '@angular/common';
import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { SearchFilterService } from '../../../search-filter.service';
import { LiveRegionService } from '../../../../../../shared/live-region/live-region.service';
import { ShortNumberPipe } from '../../../../../utils/short-number.pipe';
import { FacetValue } from '@dspace/core/shared/search/models/facet-value.model';
import { SearchFilterConfig } from '@dspace/core/shared/search/models/search-filter-config.model';
import { getFacetValueForType } from '../../../../search.utils';

@Component({
  selector: 'ds-search-facet-option',
  styleUrls: ['./search-facet-option.component.scss'],
  templateUrl: './search-facet-option.component.html',
  standalone: true,
  imports: [AsyncPipe, ShortNumberPipe, TranslateModule]
})
export class SearchFacetOptionComponent implements OnInit {
  @Input() filterValue: FacetValue;
  @Input() filterConfig: SearchFilterConfig;
  @Input() inPlaceSearch: boolean;
  
  @Input() isSelected: boolean = false;
  @Output() toggle = new EventEmitter<string>();

  isVisible: Observable<boolean>;

  constructor(
    protected filterService: SearchFilterService,
    protected liveRegionService: LiveRegionService,
    private translateService: TranslateService
  ) {}

  ngOnInit(): void {
    this.isVisible = this.isChecked().pipe(map((checked: boolean) => !checked));
  }

  isChecked(): Observable<boolean> {
    return this.filterService.isFilterActiveWithValue(this.filterConfig.paramName, this.getFacetValue());
  }

  getFacetValue(): string {
    return getFacetValueForType(this.filterValue, this.filterConfig);
  }

  onCheckboxChange() {
    this.announceFilter();
    this.toggle.emit(this.getFacetValue());
  }

  announceFilter() {
    const message = this.translateService.instant('search-facet-option.update.announcement', { filter: this.filterValue.value });
    this.liveRegionService.addMessage(message);
  }
}