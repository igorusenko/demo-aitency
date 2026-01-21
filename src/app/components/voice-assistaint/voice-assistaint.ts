import {Component, ElementRef, inject, OnDestroy, OnInit, ViewChild} from '@angular/core';
import {AssistantService} from '../../core/services/assistant.service';
import { Observable, from, defer, Subject } from 'rxjs';
import { switchMap, tap, takeUntil, shareReplay } from 'rxjs/operators';
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
export class VoiceAssistaint implements OnInit, OnDestroy{
  @ViewChild('player', { static: true }) player!: ElementRef<HTMLAudioElement>;
  private assistantService = inject(AssistantService);
  private destroy$ = new Subject<void>();
  private wsReady$?: Observable<void>;
  showEmptyState = true;
  isRecording = false;
  messages: ChatMessage[] = [];
  isAssistantSpeaking = false;

  private readonly REMOTE_WS_URL = 'wss://voice-116.aitency.net/realtime';
  private readonly LOCAL_WS_URL = 'ws://localhost:3000/realtime';
  private ws!: WebSocket;

  private audioContext: AudioContext | null = null;
  private audioSource: MediaStreamAudioSourceNode | null = null;
  private audioProcessor: ScriptProcessorNode | null = null;
  private micStream: MediaStream | null = null;
  private audioLevelCheckCounter = 0;

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
    this.initAssistant();
  }

  private getUserMedia$(): Observable<MediaStream> {
    return from(
      navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      })
    );
  }

  initAssistant(): void {
    this.sessionId = this.resolveSessionId();
    this.streamingServerUrl = this.resolveWsUrl();
  }

  private resolveWsUrl(): string {
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

  toggleRecording(): void {
    this.initPlaybackContext();

    if (this.isRecording) {
      this.stopRecording();
      return;
    }

    this.ensureWebSocket$()
      .pipe(
        switchMap(() => this.getUserMedia$()),
        takeUntil(this.destroy$)
      )
      .subscribe({
        next: stream => {
          this.startRecording(stream)
        },
        error: err => {
          console.error(err);
          this.addMessage('❌ Ошибка доступа к микрофону', 'assistant');
        }
      });
  }

  private startRecording(stream: MediaStream): void {
    this.micStream = stream;
    this.audioContext ??= new AudioContext();

    const ws = this.ws; // 🔒 фиксируем ссылку
    if (!ws) return;

    const source = this.audioContext.createMediaStreamSource(stream);
    const processor = this.audioContext.createScriptProcessor(4096, 1, 1);

    processor.onaudioprocess = e => {
      if (!this.isRecording) return;
      if (ws.readyState !== WebSocket.OPEN) return;

      const input = e.inputBuffer.getChannelData(0);

      let sum = 0;
      for (const v of input) sum += Math.abs(v);
      if (sum / input.length < 0.005) return;

      const pcm = this.floatTo16BitPCM(input, this.audioContext!.sampleRate);

      ws.send(JSON.stringify({
        type: 'input_audio_buffer.append',
        audio: this.arrayBufferToBase64(pcm)
      }));
    };

    source.connect(processor);
    processor.connect(this.audioContext.destination);

    this.audioSource = source;
    this.audioProcessor = processor;
    this.isRecording = true;
  }

  private addMessage(text: string, who: MessageWho): void {
    this.showEmptyState = false;
    this.messages.push({ text, who });
  }

  private stopRecording(): void {
    this.isRecording = false;
    this.stopAllPlayback();

    this.audioSource?.disconnect();
    this.audioProcessor?.disconnect();
    this.micStream?.getTracks().forEach(t => t.stop());
  }

  private ensureWebSocket$(): Observable<void> {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      return defer(() => new Observable<void>(o => {
        o.next();
        o.complete();
      }));
    }

    if (!this.wsReady$) {
      this.wsReady$ = new Observable<void>(observer => {
        this.ws = new WebSocket(this.streamingServerUrl);
        this.ws.binaryType = 'arraybuffer';

        let currentAssistantDelta = '';
        let currentAssistantMessageIndex: number | null = null;

        this.ws.onopen = () => {
          console.log('[WebSocket] connected');
          observer.next();
          observer.complete();
        };

        this.ws.onerror = err => observer.error(err);

        this.ws.onmessage = e => {
          if (e.data instanceof ArrayBuffer) {
            this.enqueueAudioChunk(e.data);
            return;
          }

          try {
            const msg = JSON.parse(e.data);

            if (msg.type === 'agent.step') {
              const i = this.assistantService.systems
                .findIndex(s => s.key === msg.key);

              if (i !== -1) {
                this.assistantService.systems[i] = {
                  ...this.assistantService.systems[i],
                  active: true,
                  status: msg.step
                };
              }
            }

            if (msg.type === 'response.audio_transcript.delta') {
              this.showEmptyState = false;
              currentAssistantDelta += msg.delta;

              if (currentAssistantMessageIndex === null) {
                this.messages.push({ text: currentAssistantDelta, who: 'assistant' });
                currentAssistantMessageIndex = this.messages.length - 1;
              } else {
                this.messages[currentAssistantMessageIndex].text = currentAssistantDelta;
              }
            }

            if (msg.type === 'response.audio_transcript.done') {
              currentAssistantDelta = '';
              currentAssistantMessageIndex = null;
            }

            if (msg.type === 'response.created') {
              this.stopAllPlayback();
              this.lastResponseItemId = msg.response?.id ?? null;
            }

          } catch {
            console.warn('[WebSocket] non json');
          }
        };

        return () => {
          // this.ws?.close();
          // this.ws = null!;
          // this.wsReady$ = undefined;
        };
      }).pipe(
        shareReplay(1)
      );
    }

    return this.wsReady$;
  }

  private initPlaybackContext(): void {
    this.playbackContext ??= new AudioContext({ sampleRate: 48000 });
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
    this.isAssistantSpeaking = false;
  }

  private enqueueAudioChunk(buffer: ArrayBuffer): void {
    if (!buffer || buffer.byteLength < 100 || buffer.byteLength % 2 !== 0) return;

    this.initPlaybackContext();
    this.audioQueue.push(buffer);
    this.isAssistantSpeaking = true;

    if (!this.isPlaying) {
      this.playbackTime = this.playbackContext!.currentTime;
      this.playNextChunk();
    }
  }

  private playNextChunk(): void {
    if (!this.audioQueue.length) {
      this.isPlaying = false;
      this.isAssistantSpeaking = false;
      console.log('[PLAYBACK] Воспроизведение завершено, можно записывать');
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

  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const chunkSize = 0x8000;

    for (let i = 0; i < bytes.length; i += chunkSize) {
      const chunk = bytes.subarray(i, i + chunkSize);
      binary += String.fromCharCode.apply(null, Array.from(chunk));
    }

    return btoa(binary);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.stopRecording();
    this.stopAllPlayback();
    this.ws?.close();
  }

}
