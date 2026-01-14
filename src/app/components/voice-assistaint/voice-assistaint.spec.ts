import { ComponentFixture, TestBed } from '@angular/core/testing';

import { VoiceAssistaint } from './voice-assistaint';

describe('VoiceAssistaint', () => {
  let component: VoiceAssistaint;
  let fixture: ComponentFixture<VoiceAssistaint>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VoiceAssistaint]
    })
    .compileComponents();

    fixture = TestBed.createComponent(VoiceAssistaint);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
