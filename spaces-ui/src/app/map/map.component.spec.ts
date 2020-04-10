import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { MapComponent } from './map.component';
import { MapService } from '../services/map/map.service';

describe('MapComponent', () => {
  let component: MapComponent;
  let fixture: ComponentFixture<MapComponent>;
  let mapServiceSpy: jasmine.SpyObj<MapService>;

  beforeEach(async(() => {
    const spy = jasmine.createSpyObj('MapService', ['createMap', 'refreshZones']);

    TestBed.configureTestingModule({
      declarations: [ MapComponent ],
      providers: [
        { provide: MapService, useValue: spy }
      ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(MapComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    mapServiceSpy = TestBed.inject(MapService) as jasmine.SpyObj<MapService>;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
