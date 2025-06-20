import { useCallback, useEffect, useRef, useReducer, useState } from 'preact/hooks';
import { useTextToSpeech } from './tts';

export const useStreamingReader = () => {
  const [buffer, setBuffer] = useState('');
  const [isReading, setIsReading] = useState(false);
  const isComplete = useRef(false);

  const { speak, stop: stopTTS } = useTextToSpeech();

  const readStream = (steamString: string) => {
    // cumulative string from stream, not in chunks
  };

  const resetStream = () => {
    //
  };

  return {
    readStream,
    resetStream,
  };
};
