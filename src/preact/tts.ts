import { useCallback, useEffect, useRef, useReducer, useState } from 'preact/hooks';

const VOICE_OPTIONS = ['af_sky'] as const;
type Voice = (typeof VOICE_OPTIONS)[number];

interface UseTextToSpeechOptions {
  voice?: Voice;
  model?: string;
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (error: Error) => void;
}

export function useTextToSpeech({
  voice = 'af_sky',
  model = 'tts-1',
  onStart,
  onEnd,
  onError,
}: UseTextToSpeechOptions = {}) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const abortController = useRef<AbortController | null>(null);

  const cleanup = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
    }
    if (abortController.current) {
      abortController.current.abort();
      abortController.current = null;
    }
  }, []);

  const stop = useCallback(() => {
    cleanup();
    onEnd?.();
  }, [cleanup, onEnd]);

  const speak = useCallback(
    async (text: string): Promise<void> => {
      cleanup();

      if (!text.trim()) {
        return Promise.resolve();
      }

      onStart?.();

      abortController.current = new AbortController();

      try {
        const response = await fetch('http://localhost:8880/v1/audio/speech', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${import.meta.env.VITE_OPENAI_API_KEY}`,
          },
          body: JSON.stringify({
            model,
            input: text,
            voice,
            response_format: 'mp3',
          }),
          signal: abortController.current.signal,
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const audioBlob = await response.blob();
        const audioUrl = URL.createObjectURL(audioBlob);

        if (!audioRef.current) {
          audioRef.current = new Audio();
        }

        const audio = audioRef.current;
        audio.src = audioUrl;

        return new Promise<void>((resolve) => {
          const handleEnded = () => {
            audio.removeEventListener('ended', handleEnded);
            audio.removeEventListener('pause', handleEnded);
            onEnd?.();
            resolve();
          };

          audio.addEventListener('ended', handleEnded);
          audio.addEventListener('pause', handleEnded);

          audio.play().catch((error) => {
            audio.removeEventListener('ended', handleEnded);
            audio.removeEventListener('pause', handleEnded);
            onError?.(error);
            resolve();
          });
        });
      } catch (error) {
        if (error instanceof Error && error.name !== 'AbortError') {
          console.error('Text-to-speech error:', error);
          onError?.(error);
        }
        return Promise.resolve();
      }
    },
    [cleanup, model, onStart, onEnd, onError, voice],
  );

  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  return {
    speak,
    stop,
  };
}
