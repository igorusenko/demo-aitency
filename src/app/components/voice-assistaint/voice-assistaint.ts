import {Component, ElementRef, inject, ViewChild} from '@angular/core';
import {AssistantService} from '../../core/services/assistant.service';

type MessageWho = 'assistant' | 'user';

interface ChatMessage {
  text: string;
  who: MessageWho;
}

@Component({
  selector: 'app-voice-assistaint',
  imports: [],
  templateUrl: './voice-assistaint.html',
  styleUrl: './voice-assistaint.scss',
})
export class VoiceAssistaint {
  @ViewChild('player', { static: true }) player!: ElementRef<HTMLAudioElement>;
  private assistantService = inject(AssistantService);

  showEmptyState = true;
  isRecording = false;
  messages: ChatMessage[] = [];

  private readonly REMOTE_WS_URL = 'wss://voice-116.aitency.net/realtime';
  private readonly LOCAL_WS_URL = 'ws://localhost:3000/realtime';
  private ws!: WebSocket;

  private audioContext: AudioContext | null = null;
  private audioSource: MediaStreamAudioSourceNode | null = null;
  private audioProcessor: ScriptProcessorNode | null = null;
  private micStream: MediaStream | null = null;

  private playbackContext: AudioContext | null = null;
  private audioQueue: ArrayBuffer[] = [];
  private isPlaying = false;
  private playbackTime = 0;
  private currentAudioSources: AudioBufferSourceNode[] = [];
  private playbackStartTime = 0;
  private lastResponseItemId: string | null = null;

  private sessionId!: string;
  private streamingServerUrl!: string;

  ngOnInit(): void {
    this.sessionId = this.resolveSessionId();
    this.streamingServerUrl = this.resolveWsUrl();
    console.log('WS URL:', this.streamingServerUrl);
  }

  ngOnDestroy(): void {
    this.stopRecording();
    this.stopAllPlayback();
    this.ws?.close();
  }

  private resolveWsUrl(): string {
    const params = new URLSearchParams(window.location.search);
    const urlOverride = params.get('ws');
    const modeOverride = params.get('backend');
    const savedMode = localStorage.getItem('backendMode');

    if (urlOverride) return urlOverride;

    const mode = modeOverride || savedMode;
    if (mode === 'local') return this.LOCAL_WS_URL;
    if (mode === 'remote') return this.REMOTE_WS_URL;
    console.log(location.hostname)
    return location.hostname === 'localhost' || location.hostname === '127.0.0.1' ? this.LOCAL_WS_URL :  this.REMOTE_WS_URL;
  }

  private resolveSessionId(): string {
    let id = localStorage.getItem('sessionId');
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem('sessionId', id);
    }
    return id;
  }

  private addMessage(text: string, who: MessageWho): void {
    this.showEmptyState = false;
    this.messages.push({ text, who });
  }

  async toggleRecording(): Promise<void> {
    this.ensureWebSocket();
    this.initPlaybackContext();

    if (this.isRecording) {
      this.stopRecording();
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      this.micStream = stream;

      this.audioContext ??= new AudioContext();
      const source = this.audioContext.createMediaStreamSource(stream);
      const processor = this.audioContext.createScriptProcessor(4096, 1, 1);

      processor.onaudioprocess = e => {
        if (!this.isRecording || this.ws.readyState !== WebSocket.OPEN) return;
        const input = e.inputBuffer.getChannelData(0);
        const pcm = this.floatTo16BitPCM(input, this.audioContext!.sampleRate);
        this.ws.send(pcm);
      };

      source.connect(processor);
      processor.connect(this.audioContext.destination);

      this.audioSource = source;
      this.audioProcessor = processor;
      this.isRecording = true;

    } catch (err) {
      console.error(err);
      this.addMessage('❌ Ошибка доступа к микрофону', 'assistant');
    }
  }

  private stopRecording(): void {
    this.isRecording = false;
    this.stopAllPlayback();

    this.audioSource?.disconnect();
    this.audioProcessor?.disconnect();
    this.micStream?.getTracks().forEach(t => t.stop());
  }

  private ensureWebSocket(): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) return;

    this.ws = new WebSocket(this.streamingServerUrl);
    this.ws.binaryType = 'arraybuffer';

    // Накопление текущего ответа ассистента
    let currentAssistantDelta = '';
    // Флаг, чтобы знать, создавали ли мы уже сообщение для текущего ответа
    let currentAssistantMessageIndex: number | null = null;

    this.ws.onmessage = e => {
      if (e.data instanceof ArrayBuffer) {
        this.enqueueAudioChunk(e.data);
        return;
      }

      try {
        const msg = JSON.parse(e.data);

        if (msg.type === 'agent.step') {
          const systemIndex = this.assistantService.systems.findIndex(system => system.key === msg.key);
          this.assistantService.systems[systemIndex] = {
            ...this.assistantService.systems[systemIndex],
            active: true,
            status: msg.step,
          }
        }

        if (msg.type === 'response.audio_transcript.delta') {
          this.showEmptyState = false;
          currentAssistantDelta += msg.delta;

          if (currentAssistantMessageIndex === null) {
            // создаём новое сообщение ассистента и сохраняем индекс
            this.messages.push({ text: currentAssistantDelta, who: 'assistant' });
            currentAssistantMessageIndex = this.messages.length - 1;
          } else {
            // обновляем существующее сообщение ассистента
            this.messages[currentAssistantMessageIndex].text = currentAssistantDelta;
          }
        }

        if (msg.type === 'response.audio_transcript.done') {
          currentAssistantDelta = '';
          currentAssistantMessageIndex = null; // готовимся к следующему сообщению ассистента
        }

        if (msg.type === 'response.created') {
          this.stopAllPlayback();
          this.lastResponseItemId = msg.response?.id ?? null;
        }

        if (msg.type === 'agent.response') {
          if (msg.payload.actions.some((action: any) => action.type === 'CALENDAR_CHECK'))
            this.triggerCalendarProcess();
          if (msg.payload.actions.some((action: any) => action.type === 'CALENDAR_BOOK'))
            this.triggerBookingProcess();
        }

      } catch {
        console.warn('Non JSON message');
      }
    };
  }

  triggerCalendarProcess(): void {
    this.assistantService.calendarProcessing.set(true);
  }

  triggerBookingProcess(): void {
    this.assistantService.bookingProcessing.set(true);
  }

  private initPlaybackContext(): void {
    this.playbackContext ??= new AudioContext({ sampleRate: 24000 });
    if (this.playbackContext.state === 'suspended') {
      this.playbackContext.resume();
    }
  }

  private stopAllPlayback(): void {
    this.currentAudioSources.forEach(s => s.stop());
    this.currentAudioSources = [];
    this.audioQueue = [];
    this.isPlaying = false;
    this.playbackTime = 0;
  }

  private enqueueAudioChunk(buffer: ArrayBuffer): void {
    if (!buffer || buffer.byteLength < 100 || buffer.byteLength % 2 !== 0) return;

    this.initPlaybackContext();
    this.audioQueue.push(buffer);

    if (!this.isPlaying) {
      this.playbackTime = this.playbackContext!.currentTime;
      this.playNextChunk();
    }
  }

  private playNextChunk(): void {
    if (!this.audioQueue.length) {
      this.isPlaying = false;
      return;
    }

    this.isPlaying = true;
    const chunk = this.audioQueue.shift()!;
    const view = new DataView(chunk);
    const samples = chunk.byteLength / 2;
    const float32 = new Float32Array(samples);

    for (let i = 0; i < samples; i++) {
      float32[i] = view.getInt16(i * 2, true) / 32768;
    }

    const buffer = this.playbackContext!.createBuffer(1, samples, 24000);
    buffer.copyToChannel(float32, 0);

    const source = this.playbackContext!.createBufferSource();
    source.buffer = buffer;
    source.connect(this.playbackContext!.destination);

    this.currentAudioSources.push(source);

    const startAt = Math.max(this.playbackTime, this.playbackContext!.currentTime);
    source.start(startAt);
    this.playbackTime = startAt + buffer.duration;

    source.onended = () => this.playNextChunk();
  }

  private floatTo16BitPCM(input: Float32Array, rate: number): ArrayBuffer {
    let data = input;

    if (rate === 48000) {
      const down = new Float32Array(input.length / 2);
      for (let i = 0, j = 0; j < down.length; i += 2, j++) {
        down[j] = input[i];
      }
      data = down;
    }

    const buffer = new ArrayBuffer(data.length * 2);
    const view = new DataView(buffer);

    data.forEach((v, i) => {
      const s = Math.max(-1, Math.min(1, v));
      view.setInt16(i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    });

    return buffer;
  }

}
