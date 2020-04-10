import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';

import { FeatureService } from './feature.service';

describe('FeatureService', () => {
  let service: FeatureService;

  beforeEach(() => {

    TestBed.configureTestingModule({
      imports: [ HttpClientTestingModule ]
    });
    service = TestBed.inject(FeatureService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
