import {effect, Injectable, signal, WritableSignal} from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class AssistantService {
  calendarProcessing: WritableSignal<boolean> = signal(false);
  bookingProcessing: WritableSignal<boolean> = signal(false);

  public systems = [
    {
      title: 'Google Calendar',
      key: 'calendar',
      description: 'Appointment scheduling',
      active: false,
      status: 'Idle ...',
    },
    {
      title: 'Doctor Anytime',
      description: 'Online booking platform syncing appointments.',
      key: 'booking',
      active: false,
      status: 'Idle ...',
    },
    {
      title: 'Data base',
      description: 'provides data for your needs.',
      key: '',
      active: false,
      status: 'Idle ...',
    },
  ];

  constructor() {
    effect(() => {
      const calendarIndex = this.systems.findIndex(system => system.key === 'calendar')
      this.systems[calendarIndex].active = this.calendarProcessing();

      const bookingIndex = this.systems.findIndex(system => system.key === 'booking')
      this.systems[bookingIndex].active = this.bookingProcessing();
    });
  }

}
