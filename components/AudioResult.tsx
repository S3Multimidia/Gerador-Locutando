import React, { useRef, useState, useEffect } from 'react';
import { DownloadIcon, PlayIcon, PauseIcon, LoadingSpinner } from './IconComponents';
import { useGoogleDrive } from '../hooks/useGoogleDrive';

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
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const draggingRef = useRef<boolean>(false);
  const dragTargetRef = useRef<'start' | 'end' | null>(null);
  const playStartRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);
  const [zoom, setZoom] = useState<number>(1);
  const [viewCenter, setViewCenter] = useState<number>(0);
  const [zoomHint, setZoomHint] = useState<string>('');
  const [zoomEnabled, setZoomEnabled] = useState<boolean>(false);
  const hoverTimerRef = useRef<number | null>(null);

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
            const filename = `locucao_${new Date().toISOString().replace(/[:.]/g, '-')}.mp3`;
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
      setViewCenter(audioBuffer.duration / 2);
      setZoom(1);
    }

    createDownload();

    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        const w = canvas.width;
        const h = canvas.height;
        ctx.clearRect(0, 0, w, h);
        const data = audioBuffer.getChannelData(0);
        const step = Math.ceil(data.length / w);
        ctx.strokeStyle = '#10b981';
        ctx.beginPath();
        for (let i = 0; i < w; i++) {
          let min = 1;
          let max = -1;
          const start = i * step;
          for (let j = 0; j < step && start + j < data.length; j++) {
            const v = data[start + j];
            if (v < min) min = v;
            if (v > max) max = v;
          }
          const y = (1 - max) * h * 0.5;
          if (i === 0) ctx.moveTo(i, y); else ctx.lineTo(i, y);
        }
        ctx.stroke();
      }
    }

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
      const filename = `locucao_${new Date().toISOString().replace(/[:.]/g, '-')}.mp3`;
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


  useEffect(() => {
    const c = canvasRef.current;
    const setSize = () => { if (c) { c.width = c.clientWidth; c.height = 160; } };
    setSize();
    window.addEventListener('resize', setSize);
    return () => { window.removeEventListener('resize', setSize); };
  }, []);

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
      const s = showCut ? Math.max(0, Math.min(startSec, audioBuffer.duration)) : 0;
      const e = showCut ? Math.max(s, Math.min(endSec || audioBuffer.duration, audioBuffer.duration)) : audioBuffer.duration;
      playStartRef.current = audioContext.currentTime;
      setPlayheadSec(s);
      const tick = () => {
        if (!playStartRef.current) return;
        const elapsed = audioContext.currentTime - playStartRef.current;
        const current = Math.min(e, s + elapsed);
        setPlayheadSec(current);
        if (sourceRef.current) rafRef.current = requestAnimationFrame(tick);
      };
      source.onended = () => {
        setIsPlaying(false);
        sourceRef.current = null;
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
        setPlayheadSec(s);
      };
      source.start(0, s, e - s);
      sourceRef.current = source;
      setIsPlaying(true);
      rafRef.current = requestAnimationFrame(tick);
    }
  };

  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!showCut) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const w = canvas.width;
    const sX = (startSec / audioBuffer.duration) * w;
    const eX = ((endSec || audioBuffer.duration) / audioBuffer.duration) * w;
    const near = 8;
    if (Math.abs(x - sX) < near) {
      dragTargetRef.current = 'start';
      draggingRef.current = true;
    } else if (Math.abs(x - eX) < near) {
      dragTargetRef.current = 'end';
      draggingRef.current = true;
    } else {
      dragTargetRef.current = 'end';
      draggingRef.current = true;
      const span = Math.min(audioBuffer.duration, audioBuffer.duration / Math.max(1, zoom));
      const startView = Math.max(0, Math.min(audioBuffer.duration - span, viewCenter - span / 2));
      const t = Math.max(0, Math.min(audioBuffer.duration, startView + (x / w) * span));
      setStartSec(t);
    }
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const w = canvas.width;

    if (showCut && draggingRef.current) {
      const span = Math.min(audioBuffer.duration, audioBuffer.duration / Math.max(1, zoom));
      const startView = Math.max(0, Math.min(audioBuffer.duration - span, viewCenter - span / 2));
      const t = Math.max(0, Math.min(audioBuffer.duration, startView + (x / w) * span));
      if (dragTargetRef.current === 'start') {
        setStartSec(Math.min(t, endSec || audioBuffer.duration));
      } else if (dragTargetRef.current === 'end') {
        setEndSec(Math.max(t, startSec));
      }
    }
  };

  const handleCanvasMouseUp = () => {
    draggingRef.current = false;
    dragTargetRef.current = null;
    if (hoverTimerRef.current) { window.clearTimeout(hoverTimerRef.current); hoverTimerRef.current = null; }
    setZoomEnabled(false);
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const w = canvas.width;
    const h = canvas.height;
    const mid = h / 2;
    const data = audioBuffer.getChannelData(0);

    const span = Math.min(audioBuffer.duration, audioBuffer.duration / Math.max(1, zoom));
    const startView = Math.max(0, Math.min(audioBuffer.duration - span, viewCenter - span / 2));
    const startIdx = Math.floor(startView / audioBuffer.duration * data.length);
    const visibleLen = Math.floor(span / audioBuffer.duration * data.length);
    const step = Math.max(1, Math.ceil(visibleLen / w));

    ctx.clearRect(0, 0, w, h);
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    if (variant === 'mix') { grad.addColorStop(0, '#111827'); grad.addColorStop(1, '#1f2937'); }
    else { grad.addColorStop(0, '#0f172a'); grad.addColorStop(1, '#1e293b'); }
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    const top: number[] = new Array(w);
    const bottom: number[] = new Array(w);
    for (let i = 0; i < w; i++) {
      let min = 1, max = -1;
      const start = startIdx + i * step;
      for (let j = 0; j < step && start + j < startIdx + visibleLen; j++) {
        const v = data[start + j];
        if (v < min) min = v;
        if (v > max) max = v;
      }
      const amp = mid - 2;
      top[i] = mid - (max * amp);
      bottom[i] = mid - (min * amp);
    }

    ctx.beginPath();
    ctx.moveTo(0, top[0]);
    for (let i = 1; i < w; i++) ctx.lineTo(i, top[i]);
    for (let i = w - 1; i >= 0; i--) ctx.lineTo(i, bottom[i]);
    ctx.closePath();
    ctx.fillStyle = variant === 'mix' ? '#6366f1' : '#10b981';
    ctx.globalAlpha = 0.85;
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.strokeStyle = variant === 'mix' ? '#4f46e5' : '#059669';
    ctx.lineWidth = 1;
    ctx.stroke();

    if (showCut) {
      const sX = ((startSec - startView) / span) * w;
      const eX = (((endSec || audioBuffer.duration) - startView) / span) * w;
      const sClamped = Math.max(0, Math.min(w, sX));
      const eClamped = Math.max(0, Math.min(w, eX));
      ctx.fillStyle = 'rgba(239, 68, 68, 0.12)';
      ctx.fillRect(Math.min(sClamped, eClamped), 0, Math.max(0, Math.abs(eClamped - sClamped)), h);
      ctx.fillStyle = '#ef4444';
      if (sX >= 0 && sX <= w) ctx.fillRect(sX - 1, 0, 2, h);
      if (eX >= 0 && eX <= w) ctx.fillRect(eX - 1, 0, 2, h);
    }

    const headX = ((playheadSec - startView) / span) * w;
    ctx.fillStyle = '#ffffff';
    ctx.globalAlpha = 0.9;
    if (headX >= 0 && headX <= w) ctx.fillRect(headX - 1, 0, 2, h);
    ctx.globalAlpha = 1;
  }, [audioBuffer, startSec, endSec, playheadSec, zoom, viewCenter]);

  const handleDeleteSelection = () => {
    const sr = audioContext.sampleRate;
    const s = Math.max(0, Math.min(startSec, audioBuffer.duration));
    const e = Math.max(s, Math.min(endSec || audioBuffer.duration, audioBuffer.duration));
    if (e - s <= 0.0005) return;
    const sIdx = Math.floor(s * sr);
    const eIdx = Math.floor(e * sr);
    const total = audioBuffer.length;
    const channels = audioBuffer.numberOfChannels;
    const out = audioContext.createBuffer(channels, sIdx + (total - eIdx), sr);
    for (let ch = 0; ch < channels; ch++) {
      const src = audioBuffer.getChannelData(ch);
      const dst = out.getChannelData(ch);
      dst.set(src.subarray(0, sIdx), 0);
      dst.set(src.subarray(eIdx), sIdx);
    }
    if (isPlaying && sourceRef.current) {
      try { sourceRef.current.stop(); } catch { }
      sourceRef.current = null;
    }
    setIsPlaying(false);
    setGeneratedAudio(out);
    setStartSec(0);
    setEndSec(out.duration);
    setPlayheadSec(0);
  };

  const handleZoomSliderChange = (value: number) => {
    const nz = Math.max(1, Math.min(8, value));
    setZoom(nz);
    const s = startSec;
    const e = (endSec || audioBuffer.duration);
    const hasSelection = showCut && e > s && (e - s) > 0.001;
    const center = hasSelection ? (s + e) / 2 : (audioBuffer.duration / 2);
    setViewCenter(Math.max(0, Math.min(audioBuffer.duration, center)));
  };

  const handleCanvasWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    if (!zoomEnabled) return;
    e.preventDefault();
    const dir = e.deltaY > 0 ? -1 : 1;
    const nz = Math.max(1, Math.min(8, zoom + dir * 0.2));
    setZoom(nz);
    const canvas = canvasRef.current;
    if (canvas) {
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const w = canvas.width;
      const span = Math.min(audioBuffer.duration, audioBuffer.duration / Math.max(1, nz));
      const startView = Math.max(0, Math.min(audioBuffer.duration - span, viewCenter - span / 2));
      const anchor = Math.max(0, Math.min(audioBuffer.duration, startView + (x / w) * span));
      setViewCenter(anchor);
    }
    setZoomHint(dir > 0 ? 'Zoom +' : 'Zoom -');
    window.setTimeout(() => setZoomHint(''), 700);
  };

  return (
    <div className="space-y-4">
      <div className="bg-slate-900 rounded-lg p-3 relative border border-slate-700" style={{ overscrollBehavior: 'contain' }}>
        <canvas ref={canvasRef} className="w-full h-32" onMouseDown={handleCanvasMouseDown} onMouseMove={handleCanvasMouseMove} onMouseUp={handleCanvasMouseUp} onMouseLeave={handleCanvasMouseUp}></canvas>
        {showCut && (
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 whitespace-nowrap">Início</span>
              <input type="range" min={0} max={audioBuffer.duration} step={0.01} value={startSec} onChange={(e) => setStartSec(parseFloat(e.target.value))} className="flex-1 h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-red-500" />
              <span className="text-xs text-slate-300 w-16 text-right">{startSec.toFixed(2)}s</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 whitespace-nowrap">Fim</span>
              <input type="range" min={0} max={audioBuffer.duration} step={0.01} value={endSec || audioBuffer.duration} onChange={(e) => setEndSec(parseFloat(e.target.value))} className="flex-1 h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-red-500" />
              <span className="text-xs text-slate-300 w-16 text-right">{(endSec || audioBuffer.duration).toFixed(2)}s</span>
            </div>
          </div>
        )}
        <div className="mt-3 flex items-center gap-2">
          <span className="text-xs text-slate-400">Zoom</span>
          <input type="range" min={1} max={8} step={0.1} value={zoom} onChange={(e) => handleZoomSliderChange(parseFloat(e.target.value))} className="flex-1 h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-red-500" />
          <span className="text-xs text-slate-300 w-12 text-right">{zoom.toFixed(1)}x</span>
        </div>
        <div className="mt-2 text-xs text-slate-500">Duração total: {audioBuffer.duration.toFixed(2)}s</div>
      </div>
      {showCut && (
        <div className="flex">
          <button onClick={handleDeleteSelection} className="w-full p-3 bg-red-900/20 text-red-400 font-bold rounded-lg border border-red-900/50 shadow-sm hover:bg-red-900/40 transition-all focus-ring">
            Cortar Seleção
          </button>
        </div>
      )}

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
    </div>
  );
};