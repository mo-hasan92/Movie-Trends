import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CinemaPage } from './cinema.page';

describe('CinemaPage', () => {
  let component: CinemaPage;
  let fixture: ComponentFixture<CinemaPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(CinemaPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
