import { Component } from '@angular/core';
import {VoiceAssistaint} from '../../components/voice-assistaint/voice-assistaint';

interface ChatMessage {
  author: 'ai' | 'user';
  text: string;
}

@Component({
  selector: 'app-home',
  imports: [
    VoiceAssistaint
  ],
  templateUrl: './home.html',
  styleUrl: './home.scss',
})
export class Home {
  currentYear = new Date().getFullYear();

  chatMessages: ChatMessage[] = [];

  systems = [
    {
      title: 'Filemaker 19',
      description: 'Main CRM with patient data',
      active: false,
    },
    {
      title: 'Google Calendar',
      description: 'Appointment scheduling',
      active: false,
    },
    {
      title: 'SMS / WhatsApp',
      description: 'Automated messaging',
      active: false,
    },
  ];

  runBooking() {
    this.activateSystem('Filemaker 19');
    this.addAiMessage('Sure! Let me check available slots for you.');
  }

  runRecall() {
    this.activateSystem('SMS / WhatsApp');
    this.addAiMessage('We are reminding you about your recall visit.');
  }

  runCall() {
    this.activateSystem('Google Calendar');
    this.addAiMessage('Incoming call handled by AI agent.');
  }

  pause() {
    this.systems.forEach(s => (s.active = false));
  }

  newBookingMessage() {
    this.addUserMessage('I want to book an appointment');
  }

  newRecallMessage() {
    this.addUserMessage('I received a recall reminder');
  }

  resetChat() {
    this.chatMessages = [];
  }

  private addAiMessage(text: string) {
    this.chatMessages.push({ author: 'ai', text });
  }

  private addUserMessage(text: string) {
    this.chatMessages.push({ author: 'user', text });
  }

  private activateSystem(title: string) {
    this.systems.forEach(s => (s.active = s.title === title));
  }
}
