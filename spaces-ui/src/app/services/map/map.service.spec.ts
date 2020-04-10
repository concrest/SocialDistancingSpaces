import { TestBed } from '@angular/core/testing';

import { MapService } from './map.service';
import { FeatureService } from '../feature/feature.service';

describe('MapService', () => {
  let service: MapService;
  let mapServiceSpy: jasmine.SpyObj<FeatureService>;

  beforeEach(() => {
    const spy = jasmine.createSpyObj('FeatureService', ['getFeatures']);

    TestBed.configureTestingModule({
      providers: [
        { provide: FeatureService, useValue: spy }
      ]
    });
    service = TestBed.inject(MapService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
