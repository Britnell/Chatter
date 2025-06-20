import { useCallback, useEffect, useRef, useReducer, useState } from 'preact/hooks';

export function useVoiceRecognition(enabled: boolean, onTranscript: (tx: string, final: boolean) => void) {
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if (enabled) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

      if (!SpeechRecognition) return;

      const recognition = new SpeechRecognition();
      recognitionRef.current = recognition;

      recognition.continuous = true;
      recognition.interimResults = true;

      recognition.onresult = (event: any) => {
        const current = event.resultIndex;
        const transcription = event.results[current][0].transcript;
        const final = event.results[current].isFinal;
        console.log({ final, transcription });

        if (final) {
          recognition.stop();
        }
        onTranscript(transcription, final);
      };

      recognition.onerror = (ev: any) => {
        recognition.stop();
      };

      recognition.start();
    } else {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
        recognitionRef.current = null;
      }
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
        recognitionRef.current = null;
      }
    };
  }, [enabled, onTranscript]);
}
