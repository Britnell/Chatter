import { useCallback, useEffect, useRef, useReducer, useState } from 'preact/hooks';

export function useVoiceRecognition(enabled: boolean, onTranscript: (tx: string, final: boolean) => void) {
  const recognitionRef = useRef<any>(null);
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(false);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setIsListening(false);
  }, []);

  const startListening = useCallback(() => {
    if (!enabled || !isSupported || isListening) return;

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;

    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onresult = (event: any) => {
      const current = event.resultIndex;
      const transcription = event.results[current][0].transcript;
      const final = event.results[current].isFinal;

      if (final) {
        recognition.stop();
      }
      onTranscript(transcription, final);
    };

    recognition.onerror = (ev: any) => {
      console.error('Speech recognition error:', ev.error);
      
      // If it's a no-speech error and we're still enabled, restart recognition
      if (ev.error === 'no-speech' && enabled) {
        console.log('No speech detected, restarting recognition...');
        recognition.stop();
        // Restart after a brief delay to avoid rapid restarts
        setTimeout(() => {
          if (enabled && !isListening) {
            startListening();
          }
        }, 1000);
      } else {
        recognition.stop();
      }
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.start();
  }, [enabled, isSupported, isListening, onTranscript]);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    setIsSupported(!!SpeechRecognition);
  }, []);

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
        recognitionRef.current = null;
      }
    };
  }, []);

  return {
    isListening,
    isSupported,
    startListening,
    stopListening,
  };
}
