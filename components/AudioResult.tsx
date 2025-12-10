import React, { useRef, useState, useEffect } from 'react';
import { DownloadIcon, PlayIcon, PauseIcon, LoadingSpinner } from './IconComponents';
import { useGoogleDrive } from '../hooks/useGoogleDrive';
import { FinalMixWaveform } from './FinalMixWaveform';

interface AudioResultProps {
  audioBuffer: AudioBuffer;
  audioContext: AudioContext;
  setGeneratedAudio: (audio: AudioBuffer | null) => void;
  cutStartSec: number;
  cutEndSec: number;
  setCutStartSec: (v: number) => void;
  setCutEndSec: (v: number) => void;
  variant?: 'default' | 'mix';
  showCut?: boolean;
}

// LameJS is loaded from a script tag in index.html
declare var lamejs: any;

// Helper function to convert an AudioBuffer to a MP3 file Blob
async function audioBufferToMp3(buffer: AudioBuffer, startSec: number = 0, endSec: number = buffer.duration): Promise<Blob> {
  const targetSampleRate = 44100;

  const duration = Math.max(0, endSec - startSec);
  const offlineCtx = new OfflineAudioContext(2, duration * targetSampleRate, targetSampleRate);
  const source = offlineCtx.createBufferSource();
  source.buffer = buffer;
  source.connect(offlineCtx.destination);
  source.start(0, startSec, duration);
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


export const AudioResult: React.FC<AudioResultProps> = ({ audioBuffer, audioContext, setGeneratedAudio, cutStartSec, cutEndSec, setCutStartSec, setCutEndSec, variant = 'default', showCut = true }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string>('');
  const [isEncoding, setIsEncoding] = useState<boolean>(false);
  const startSec = cutStartSec;
  const endSec = cutEndSec;
  const setStartSec = setCutStartSec;
  const setEndSec = setCutEndSec;
  const [playheadSec, setPlayheadSec] = useState<number>(0);
  const playStartRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);

  // Google Drive Integration
  const { login, uploadFile, isAuthenticated, isInitialized } = useGoogleDrive();
  const [autoSaveDrive, setAutoSaveDrive] = useState<boolean>(() => localStorage.getItem('autoSaveDrive') === 'true');
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const mp3BlobRef = useRef<Blob | null>(null); // To store the generated blob for potential re-uploads

  useEffect(() => {
    localStorage.setItem('autoSaveDrive', String(autoSaveDrive));
  }, [autoSaveDrive]);

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
      if (!endSec || endSec <= 0) setEndSec(audioBuffer.duration);

      setIsEncoding(true);
      setDownloadUrl('');
      setUploadStatus('idle'); // Reset upload status on new generation

      try {
        const s = showCut ? startSec : 0;
        const e = showCut ? (endSec || audioBuffer.duration) : audioBuffer.duration;
        const mp3Blob = await audioBufferToMp3(audioBuffer, s, e);
        mp3BlobRef.current = mp3Blob; // Store the blob
        if (isMounted) {
          objectUrl = URL.createObjectURL(mp3Blob);
          setDownloadUrl(objectUrl);

          // Auto-save logic
          if (autoSaveDrive && isAuthenticated) {
            setUploadStatus('uploading');
            const filename = 'locucao_' + new Date().toISOString().replace(/[:.]/g, '-') + '.mp3';
            uploadFile(mp3Blob, filename)
              .then(() => {
                if (isMounted) setUploadStatus('success');
              })
              .catch((err) => {
                console.error("Drive upload failed", err);
                if (isMounted) setUploadStatus('error');
              });
          }
        }
      } catch (e) {
        console.error("Error encoding MP3:", e);
      } finally {
        if (isMounted) {
          setIsEncoding(false);
        }
      }
    };

    if (showCut) {
      setStartSec(0);
      setEndSec(audioBuffer.duration);
    }

    createDownload();

    return () => {
      isMounted = false;
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [audioBuffer, showCut, startSec, endSec]); // Removed isAuthenticated and autoSaveDrive from here to avoid re-encoding.

  // Effect to handle auto-upload when isAuthenticated or autoSaveDrive changes, if a blob is already available
  useEffect(() => {
    if (autoSaveDrive && isAuthenticated && mp3BlobRef.current && downloadUrl && uploadStatus !== 'uploading' && uploadStatus !== 'success') {
      setUploadStatus('uploading');
      const filename = 'locucao_' + new Date().toISOString().replace(/[:.]/g, '-') + '.mp3';
      uploadFile(mp3BlobRef.current, filename)
        .then(() => {
          setUploadStatus('success');
        })
        .catch((err) => {
          console.error("Drive upload failed", err);
          setUploadStatus('error');
        });
    }
  }, [autoSaveDrive, isAuthenticated, downloadUrl, uploadFile, uploadStatus]);


  const togglePlayPause = () => {
    if (isPlaying) {
      if (sourceRef.current) {
        sourceRef.current.onended = null;
        try { sourceRef.current.stop(); } catch { }
        sourceRef.current = null;
      }
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      setIsPlaying(false);
    } else {
      if (audioContext.state === 'suspended') {
        audioContext.resume();
      }
      const source = audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContext.destination);

      const s = playheadSec; // Start from current playhead
      const duration = audioBuffer.duration;

      playStartRef.current = audioContext.currentTime - s; // Adjust start time to match playhead

      const tick = () => {
        if (!playStartRef.current) return;
        const elapsed = audioContext.currentTime - playStartRef.current;

        if (elapsed >= duration) {
          setPlayheadSec(0);
          setIsPlaying(false);
          if (rafRef.current) cancelAnimationFrame(rafRef.current);
          return;
        }

        setPlayheadSec(elapsed);
        if (sourceRef.current) rafRef.current = requestAnimationFrame(tick);
      };

      source.onended = () => {
        setIsPlaying(false);
        sourceRef.current = null;
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
        // Don't reset playhead here to allow pausing and resuming, 
        // but if it reached the end, tick will handle it.
      };

      source.start(0, s);
      sourceRef.current = source;
      setIsPlaying(true);
      rafRef.current = requestAnimationFrame(tick);
    }
  };

  const handleSeek = (time: number) => {
    setPlayheadSec(time);
    if (isPlaying) {
      // Restart playback from new time
      if (sourceRef.current) {
        sourceRef.current.onended = null;
        try { sourceRef.current.stop(); } catch { }
        sourceRef.current = null;
      }
      if (rafRef.current) cancelAnimationFrame(rafRef.current);

      const source = audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContext.destination);

      playStartRef.current = audioContext.currentTime - time;

      const tick = () => {
        if (!playStartRef.current) return;
        const elapsed = audioContext.currentTime - playStartRef.current;
        if (elapsed >= audioBuffer.duration) {
          setPlayheadSec(0);
          setIsPlaying(false);
          if (rafRef.current) cancelAnimationFrame(rafRef.current);
          return;
        }
        setPlayheadSec(elapsed);
        if (sourceRef.current) rafRef.current = requestAnimationFrame(tick);
      };

      source.onended = () => {
        setIsPlaying(false);
        sourceRef.current = null;
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
      };

      source.start(0, time);
      sourceRef.current = source;
      rafRef.current = requestAnimationFrame(tick);
    }
  };


  return (
    <div className="flex flex-col gap-4 w-full">
      {/* Waveform Visualization */}
      <div className="bg-slate-900/50 rounded-xl p-4 border border-slate-700 shadow-inner">
        <FinalMixWaveform
          buffer={audioBuffer}
          playheadSec={playheadSec}
          isPlaying={isPlaying}
          onSeek={handleSeek}
          height={128}
        />
      </div>

      {/* Google Drive Controls */}
      <div className="flex items-center justify-between p-3 bg-slate-800 rounded-lg border border-slate-700">
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="auto-save-drive"
            checked={autoSaveDrive}
            onChange={(e) => setAutoSaveDrive(e.target.checked)}
            className="w-4 h-4 text-red-600 bg-gray-700 border-gray-600 rounded focus:ring-red-500"
          />
          <label htmlFor="auto-save-drive" className="text-sm text-slate-300">
            Salvar automaticamente no Google Drive
          </label>
        </div>
        <div>
          {!isAuthenticated ? (
            <button onClick={login} className="text-xs px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors">
              Conectar Drive
            </button>
          ) : (
            <span className="text-xs text-green-400 flex items-center gap-1">
              ● Conectado
              {uploadStatus === 'uploading' && <span className="text-yellow-400 ml-2">(Enviando...)</span>}
              {uploadStatus === 'success' && <span className="text-green-400 ml-2">(Salvo!)</span>}
              {uploadStatus === 'error' && <span className="text-red-400 ml-2">(Erro ao salvar)</span>}
            </span>
          )}
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
          className={`w-full flex items-center justify-center p-3 bg-slate-700 text-white font-bold rounded-lg shadow-md hover:bg-slate-600 transition-all transform hover:scale-105 focus-ring ${isEncoding || !downloadUrl ? 'opacity-50 cursor-not-allowed' : ''}`}
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
    </div >
  );
};