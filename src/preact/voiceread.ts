import { useCallback, useEffect, useRef, useReducer, useState } from 'preact/hooks';
import { useTextToSpeech } from './tts';

export const useVoiceReader = (onComplete: () => void) => {
  const reading = useRef(false);
  const readingPos = useRef(0);
  const streamComplete = useRef(false);
  const readText = useRef('');

  const { speak, stop: stopTTS } = useTextToSpeech();

  const restart = () => {
    readingPos.current = 0;
    reading.current = false;
    streamComplete.current = false;
    readText.current = '';
    stopTTS();
  };

  const endOfStream = () => {
    streamComplete.current = true;
  };

  const stopReading = () => {
    reading.current = false;
    stopTTS();
  };

  const readStream = (text: string) => {
    readText.current = text;

    if (!reading.current) {
      readLoop();
    }
  };

  const readLoop = async () => {
    reading.current = true;

    const pos = readingPos.current;
    const text = readText.current;

    if (streamComplete.current) {
      if (pos >= text.length) {
        reading.current = false;
        onComplete(); // Call completion callback
        return;
      }

      const remainingText = text.slice(pos);
      try {
        await speak(remainingText);
        readingPos.current = text.length;
      } finally {
        reading.current = false;
        onComplete(); // Call completion callback
      }
      return;
    }

    const endOfSentence = findEndOfLastSentence(text, pos);

    // If no sentence ending found or no progress made, stop reading
    if (endOfSentence === -1 || endOfSentence <= pos) {
      reading.current = false;
      return;
    }

    // read until then, update readingpos, set reading = true
    const textToRead = text.slice(pos, endOfSentence);

    try {
      // when speak() promise resolves, repeat readLoop
      await speak(textToRead);
      readingPos.current = endOfSentence;

      // Only continue if we're still supposed to be reading and haven't been stopped
      if (reading.current) {
        await readLoop();
      }
    } catch (error) {
      reading.current = false;
      console.log(error);
    }
  };

  return {
    reading,
    readStream,
    restart,
    endOfStream: endOfStream,
    stopReading,
  };
};

export const findEndOfNextParagraph = (text: string, startPos: number): number => {
  if (startPos >= text.length) return text.length;

  const paragraphBreakRegex = /\n+/g;
  paragraphBreakRegex.lastIndex = startPos;

  const match = paragraphBreakRegex.exec(text);

  if (!match) {
    return text.length;
  }

  return match.index;
};

export const findEndOfLastSentence = (text: string, startPos: number): number => {
  if (startPos >= text.length) return text.length;

  const sentenceEndRegex = /[.!?]+(?=\s|$)/g;

  sentenceEndRegex.lastIndex = startPos;

  let lastMatch = -1;
  let match;

  while ((match = sentenceEndRegex.exec(text)) !== null) {
    lastMatch = match.index + 1;
  }

  if (lastMatch === -1) {
    return startPos;
  }

  return lastMatch;
};
