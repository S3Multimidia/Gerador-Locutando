import React, { useRef, useState, useEffect } from 'react';
import { DownloadIcon, PlayIcon, PauseIcon, LoadingSpinner } from './IconComponents';

interface AudioResultProps {
  audioBuffer: AudioBuffer;
  audioContext: AudioContext;
}

// LameJS is loaded from a script tag in index.html
declare var lamejs: any;

// Helper function to convert an AudioBuffer to a MP3 file Blob
async function audioBufferToMp3(buffer: AudioBuffer): Promise<Blob> {
    const targetSampleRate = 44100;

    // 1. Resample and ensure stereo using OfflineAudioContext
    const offlineCtx = new OfflineAudioContext(2, buffer.duration * targetSampleRate, targetSampleRate);
    const source = offlineCtx.createBufferSource();
    source.buffer = buffer;
    source.connect(offlineCtx.destination);
    source.start(0);
    const resampledBuffer = await offlineCtx.startRendering();

    // 2. Get separate channel data
    const leftFloat = resampledBuffer.getChannelData(0);
    const rightFloat = resampledBuffer.getChannelData(1);

    // 3. Convert to 16-bit PCM
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

    // 4. Encode with LameJS
    const mp3encoder = new lamejs.Mp3Encoder(2, targetSampleRate, 128); // Stereo, 44.1kHz, 128kbps
    const mp3Data: Uint8Array[] = [];
    const sampleBlockSize = 1152;

    for (let i = 0; i < leftInt16.length; i += sampleBlockSize) {
        const leftChunk = leftInt16.subarray(i, i + sampleBlockSize);
        const rightChunk = rightInt16.subarray(i, i + sampleBlockSize);
        const mp3buf = mp3encoder.encodeBuffer(leftChunk, rightChunk);
        if (mp3buf.length > 0) {
            mp3Data.push(mp3buf);
        }
    }

    const mp3buf = mp3encoder.flush();
    if (mp3buf.length > 0) {
        mp3Data.push(mp3buf);
    }

    return new Blob(mp3Data, { type: 'audio/mpeg' });
}


export const AudioResult: React.FC<AudioResultProps> = ({ audioBuffer, audioContext }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string>('');
  const [isEncoding, setIsEncoding] = useState<boolean>(false);

  useEffect(() => {
    // Stop any playing audio when the buffer changes
    if (sourceRef.current) {
      sourceRef.current.onended = null; // Prevent state update on manual stop
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
          if (isMounted) {
              setIsEncoding(false);
          }
      }
    };
    
    createDownload();

    // Cleanup function to revoke the URL when component unmounts or buffer changes
    return () => {
      isMounted = false;
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
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
      if (audioContext.state === 'suspended') {
        audioContext.resume();
      }
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
      <div className="h-16 bg-gray-100 rounded-lg flex items-center justify-center px-4">
        <div className="w-full h-1 bg-gray-300 rounded-full overflow-hidden">
           <div 
             className={`h-full rounded-full transition-all duration-300 ease-in-out ${
                isPlaying ? 'w-full animate-shimmer' : 'w-0 bg-red-500'
              }`}
             style={{
                transitionDuration: isPlaying ? `${audioBuffer.duration}s` : '0s',
                transitionTimingFunction: 'linear'
             }}
            />
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <button
          onClick={togglePlayPause}
          className="w-full flex items-center justify-center p-3 bg-red-600 text-white font-bold rounded-lg shadow-md hover:bg-red-700 transition-all transform hover:scale-105 focus-ring"
          aria-label={isPlaying ? 'Parar reprodução' : 'Ouvir locução'}
        >
          {isPlaying ? (
            <>
              <PauseIcon className="w-5 h-5 mr-2" />
              Parar
            </>
          ) : (
            <>
              <PlayIcon className="w-5 h-5 mr-2" />
              Ouvir
            </>
          )}
        </button>
        <a
          href={isEncoding ? undefined : downloadUrl}
          download="locucao.mp3"
          onClick={(e) => (isEncoding || !downloadUrl) && e.preventDefault()}
          className={`w-full flex items-center justify-center p-3 bg-gray-700 text-white font-bold rounded-lg shadow-md hover:bg-gray-800 transition-all transform hover:scale-105 focus-ring ${isEncoding || !downloadUrl ? 'opacity-50 cursor-not-allowed' : ''}`}
          aria-disabled={isEncoding || !downloadUrl}
        >
          {isEncoding ? (
            <>
                <LoadingSpinner className="w-5 h-5 mr-2" />
                Codificando...
            </>
          ) : (
            <>
                <DownloadIcon className="w-5 h-5 mr-2" />
                Baixar (.mp3)
            </>
          )}
        </a>
      </div>
    </div>
  );
};