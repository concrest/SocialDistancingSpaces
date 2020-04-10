import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';

import * as geojson from 'geojson';

import { FeatureService } from './feature.service';
import { stringify } from 'querystring';
import { ServerSideError } from './types';
import { toArray } from 'rxjs/operators';

describe('FeatureService', () => {
  let sut: FeatureService;

  let httpClient: HttpClient;
  let httpTestingController: HttpTestingController;

  beforeEach(() => {

    TestBed.configureTestingModule({
      imports: [ HttpClientTestingModule ]
    });
    sut = TestBed.inject(FeatureService);

    // Inject the http service and test controller for each test
    httpClient = TestBed.inject(HttpClient);
    httpTestingController = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTestingController.verify();
  });

  it('should be created', () => {
    expect(sut).toBeTruthy();
  });

  describe('#getFeatures', () => {
    // `done =>` style taken from  https://medium.com/angular-in-depth/how-to-test-observables-a00038c7faad
    it('should get features over http', done => {

      const expected: geojson.Feature[] = [
        createFeature("Sunny Day case 1"),
        createFeature("Sunny Day case 2")
      ];

      let index = 0;

      sut.getFeatures().subscribe( actual => {
          expect(actual).toEqual(expected[index], `should return expected feature for index ${index}`);
          index++

          if (index === expected.length) {
            done();
          }
        },
        fail
      );

      fakeHttpGet(httpTestingController, 'assets/demo/index.json', 200, {
        "files": [
          "SunnyDayCase1.json",
          "SunnyDayCase2.json"
        ]
      });

      fakeHttpGet(httpTestingController, 'assets/demo/SunnyDayCase1.json', 200, expected[0]);
      fakeHttpGet(httpTestingController, 'assets/demo/SunnyDayCase2.json', 200, expected[1]);
    });

    it('should return error if index call gets 404', done => {

      const expectedError = {
        errorMessage: 'Not Found',
        context: 'getIndex',
        statusCode: 404
      } as ServerSideError;

      sut.getFeatures().subscribe(
        fail,
        error => {
          expect(error).toEqual(expectedError);
          done();
        }
      );

      fakeHttpGet(httpTestingController, 'assets/demo/index.json', 404, 'Not Found');
    });

    it('should be ok with individual files getting 404s', done => {
      const expected: geojson.Feature[] = [
        createFeature("Feature2"),        
      ];

      let index = 0;

      sut.getFeatures().subscribe( actual => {
          expect(actual).toEqual(expected[index], `should return expected feature for index ${index}`);
          index++

          if (index === expected.length) {
            done();
          }
        },
        fail
      );

      fakeHttpGet(httpTestingController, 'assets/demo/index.json', 200, {
        "files": [
          "Feature1.json", // <-- This one will 404
          "Feature2.json"
        ]
      });

      fakeHttpGet(httpTestingController, 'assets/demo/Feature1.json', 404, 'Not Found');
      fakeHttpGet(httpTestingController, 'assets/demo/Feature2.json', 200, expected[0]);
    });
  });
});

function fakeHttpGet(
  httpTestingController: HttpTestingController,
  url: string,
  statusCode: number,
  response: any) {

  const req = httpTestingController.expectOne(url);
  expect(req.request.method).toEqual('GET');

  let options = {};
  if (statusCode != 200){
    options = {
      status: statusCode,
      statusText: "statusText"
    }
  }

  req.flush(response, options);

  return req;
}

function createFeature(description: string) : geojson.Feature {
  return {
    "type": "Feature",
    "properties": {
        "location": "Location",
        "category": "red",
        "description": description
      },
    "geometry": {
      "type": "Polygon",
      "coordinates": [
        [
          [-1.403742, 53.060705],
          [-1.403583,53.060807],
          [-1.403302,53.060915]
        ]
      ]
    }
  }
}

