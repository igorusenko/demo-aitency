import {Component, inject} from '@angular/core';
import {VoiceAssistaint} from '../../components/voice-assistaint/voice-assistaint';
import {AssistantService} from '../../core/services/assistant.service';

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
  public assistantService = inject(AssistantService);

}
