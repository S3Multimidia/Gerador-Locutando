import React, { useRef, useState, useEffect } from 'react';
import { DownloadIcon, PlayIcon, PauseIcon, LoadingSpinner, TrashIcon } from './IconComponents';

interface FinalResultCardProps {
  audioBuffer: AudioBuffer;
  audioContext: AudioContext;
  onDiscard: () => void;
}

declare var lamejs: any;

// Helper to convert an AudioBuffer to a MP3 file Blob
async function audioBufferToMp3(buffer: AudioBuffer): Promise<Blob> {
  const targetSampleRate = 44100;
  const offlineCtx = new OfflineAudioContext(2, buffer.duration * targetSampleRate, targetSampleRate);
  const source = offlineCtx.createBufferSource();
  source.buffer = buffer;
  source.connect(offlineCtx.destination);
  source.start(0);
  const resampledBuffer = await offlineCtx.startRendering();

  const leftFloat = resampledBuffer.getChannelData(0);
  const rightFloat = resampledBuffer.getChannelData(1);

  const convert = (floatArray: Float32Array) => {
    const int16Array = new Int16Array(floatArray.length);
    for (let i = 0; i < floatArray.length; i++) {
      const sample = Math.max(-1, Math.min(1, floatArray[i]));
      int16Array[i] = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
    }
    return int16Array;
  };
  const leftInt16 = convert(leftFloat);
  const rightInt16 = convert(rightFloat);

  const mp3encoder = new lamejs.Mp3Encoder(2, targetSampleRate, 128);
  const mp3Data: Uint8Array[] = [];
  const sampleBlockSize = 1152;

  for (let i = 0; i < leftInt16.length; i += sampleBlockSize) {
    const leftChunk = leftInt16.subarray(i, i + sampleBlockSize);
    const rightChunk = rightInt16.subarray(i, i + sampleBlockSize);
    const mp3buf = mp3encoder.encodeBuffer(leftChunk, rightChunk);
    if (mp3buf.length > 0) mp3Data.push(mp3buf);
  }
  const mp3buf = mp3encoder.flush();
  if (mp3buf.length > 0) mp3Data.push(mp3buf);

  return new Blob(mp3Data, { type: 'audio/mpeg' });
}

export const FinalResultCard: React.FC<FinalResultCardProps> = ({ audioBuffer, audioContext, onDiscard }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string>('');
  const [isEncoding, setIsEncoding] = useState<boolean>(true);

  useEffect(() => {
    if (sourceRef.current) {
      sourceRef.current.onended = null;
      sourceRef.current.stop();
      sourceRef.current = null;
      setIsPlaying(false);
    }

    let isMounted = true;
    let objectUrl: string | null = null;

    const createDownload = async () => {
      if (!audioBuffer) return;
      setIsEncoding(true);
      setDownloadUrl('');
      try {
        const mp3Blob = await audioBufferToMp3(audioBuffer);
        if (isMounted) {
          objectUrl = URL.createObjectURL(mp3Blob);
          setDownloadUrl(objectUrl);
        }
      } catch (e) {
        console.error("Error encoding MP3:", e);
      } finally {
        if (isMounted) setIsEncoding(false);
      }
    };

    createDownload();

    return () => {
      isMounted = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [audioBuffer]);

  const togglePlayPause = () => {
    if (isPlaying) {
      if (sourceRef.current) {
        sourceRef.current.onended = null;
        sourceRef.current.stop();
        sourceRef.current = null;
        setIsPlaying(false);
      }
    } else {
      if (audioContext.state === 'suspended') audioContext.resume();
      const source = audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContext.destination);
      source.onended = () => {
        setIsPlaying(false);
        sourceRef.current = null;
      };
      source.start();
      sourceRef.current = source;
      setIsPlaying(true);
    }
  };

  return (
    <div className="space-y-4">
      <div className="h-16 bg-slate-900 rounded-lg flex items-center justify-center px-4 border border-slate-700">
        <div className="w-full h-1 bg-slate-700 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-300 ease-in-out ${isPlaying ? 'w-full animate-shimmer bg-indigo-500' : 'w-0 bg-indigo-500'
              }`}
            style={{
              transitionDuration: isPlaying ? `${audioBuffer.duration}s` : '0s',
              transitionTimingFunction: 'linear'
            }}
          />
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <button onClick={togglePlayPause} className="w-full flex items-center justify-center p-3 bg-red-600 text-white font-bold rounded-lg shadow-md hover:bg-red-700 transition-all transform hover:scale-105 focus-ring" aria-label={isPlaying ? 'Parar' : 'Ouvir'}>
          {isPlaying ? (
            <><PauseIcon className="w-5 h-5 mr-2" />Parar</>
          ) : (
            <><PlayIcon className="w-5 h-5 mr-2" />Ouvir</>
          )}
        </button>
        <a href={isEncoding ? undefined : downloadUrl} download="locucao_turbo.mp3" onClick={(e) => (isEncoding || !downloadUrl) && e.preventDefault()} className={`w-full flex items-center justify-center p-3 bg-slate-700 text-white font-bold rounded-lg shadow-md hover:bg-slate-600 transition-all transform hover:scale-105 focus-ring ${isEncoding || !downloadUrl ? 'opacity-50 cursor-not-allowed' : ''}`} aria-disabled={isEncoding || !downloadUrl}>
          {isEncoding ? (
            <><LoadingSpinner className="w-5 h-5 mr-2" />Codificando...</>
          ) : (
            <><DownloadIcon className="w-5 h-5 mr-2" />Baixar (.mp3)</>
          )}
        </a>
        <button onClick={onDiscard} className="w-full flex items-center justify-center p-3 bg-slate-800 text-slate-300 font-bold rounded-lg shadow-md hover:bg-slate-700 border border-slate-600 transition-all transform hover:scale-105 focus-ring" aria-label="Descartar">
          <TrashIcon className="w-5 h-5 mr-2" />
          Descartar
        </button>
      </div>
    </div>
  );
};