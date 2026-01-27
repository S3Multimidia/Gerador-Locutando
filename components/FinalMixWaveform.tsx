import React, { useRef, useEffect, useState } from 'react';

interface FinalMixWaveformProps {
    buffer: AudioBuffer | null;
    playheadSec: number;
    isPlaying: boolean;
    onSeek: (time: number) => void;
    height?: number;
}

export const FinalMixWaveform: React.FC<FinalMixWaveformProps> = ({
    buffer,
    playheadSec,
    isPlaying,
    onSeek,
    height = 128
}) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // Zoom & View State
    const [zoom, setZoom] = useState(1);
    const [viewStart, setViewStart] = useState(0);
    const [hoverTime, setHoverTime] = useState<number | null>(null);
    const isDragging = useRef(false);

    // Auto-scroll logic: prevent playhead from going off-screen during playback
    useEffect(() => {
        if (!buffer || !isPlaying) return;

        const visibleDuration = buffer.duration / zoom;
        const viewEnd = viewStart + visibleDuration;

        // If playhead is near the end of view, scroll forward
        if (playheadSec > viewEnd - (visibleDuration * 0.1)) { // 10% buffer
            let newStart = playheadSec - (visibleDuration * 0.1);
            newStart = Math.min(newStart, buffer.duration - visibleDuration);
            setViewStart(Math.max(0, newStart));
        } else if (playheadSec < viewStart) {
            // If playhead jumped back (loop or manual seek)
            setViewStart(Math.max(0, playheadSec - (visibleDuration * 0.1)));
        }
    }, [playheadSec, isPlaying, zoom, buffer, viewStart]);


    // Drawing Logic
    const draw = () => {
        const canvas = canvasRef.current;
        const container = containerRef.current;
        if (!canvas || !container) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const dpr = window.devicePixelRatio || 1;
        const rect = container.getBoundingClientRect();
        const displayWidth = rect.width;
        const displayHeight = height;

        // Resize if needed
        if (canvas.width !== displayWidth * dpr || canvas.height !== displayHeight * dpr) {
            canvas.width = displayWidth * dpr;
            canvas.height = displayHeight * dpr;
            ctx.scale(dpr, dpr);
        } else {
            ctx.clearRect(0, 0, displayWidth, displayHeight);
        }

        // Background
        ctx.fillStyle = '#1e293b'; // Slate-800
        ctx.fillRect(0, 0, displayWidth, displayHeight);

        if (!buffer) {
            // Placeholder
            ctx.beginPath();
            ctx.moveTo(0, displayHeight / 2);
            ctx.lineTo(displayWidth, displayHeight / 2);
            ctx.strokeStyle = '#334155';
            ctx.lineWidth = 1;
            ctx.stroke();
            return;
        }

        const duration = buffer.duration;
        const visibleDuration = duration / zoom;

        // Helper: Time -> X
        const timeToX = (time: number) => ((time - viewStart) / visibleDuration) * displayWidth;

        // Waveform Data
        const data = buffer.getChannelData(0);
        const totalSamples = data.length;
        const startSample = Math.floor((viewStart / duration) * totalSamples);
        const endSample = Math.floor(((viewStart + visibleDuration) / duration) * totalSamples);
        const visibleSamples = endSample - startSample;

        if (visibleSamples <= 0) return;

        const step = Math.ceil(visibleSamples / displayWidth);
        const amp = displayHeight / 2;

        // Gradient
        const gradient = ctx.createLinearGradient(0, 0, 0, displayHeight);
        gradient.addColorStop(0, '#a5b4fc'); // Indigo-300
        gradient.addColorStop(0.5, '#6366f1'); // Indigo-500
        gradient.addColorStop(1, '#4338ca'); // Indigo-700
        ctx.fillStyle = gradient;

        ctx.beginPath();

        // Optimize drawing: only iterate visible pixels
        for (let i = 0; i < displayWidth; i++) {
            let min = 1.0;
            let max = -1.0;

            const sampleIdxStart = startSample + (i * step);
            const safeStep = Math.max(1, step);

            for (let j = 0; j < safeStep; j++) {
                const idx = sampleIdxStart + j;
                if (idx >= 0 && idx < totalSamples) {
                    const val = data[idx];
                    if (val < min) min = val;
                    if (val > max) max = val;
                }
            }

            if (min > max) { min = 0; max = 0; }

            // Normalize volume roughly
            const yMin = (1 + min) * amp;
            const yMax = (1 + max) * amp;

            ctx.fillRect(i, yMin, 1, Math.max(1, yMax - yMin));
        }

        // Draw Playhead
        if (playheadSec >= viewStart && playheadSec <= viewStart + visibleDuration) {
            const x = timeToX(playheadSec);

            ctx.shadowColor = '#fbbf24'; // Amber Glow
            ctx.shadowBlur = 8;

            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, displayHeight);
            ctx.strokeStyle = '#fbbf24';
            ctx.lineWidth = 2;
            ctx.stroke();

            ctx.shadowBlur = 0;

            // Head
            ctx.fillStyle = '#fbbf24';
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x - 5, 0);
            ctx.lineTo(x, 6);
            ctx.lineTo(x + 5, 0);
            ctx.fill();
        }

        // Draw Hover Time
        if (hoverTime !== null && hoverTime >= viewStart && hoverTime <= viewStart + visibleDuration) {
            const hx = timeToX(hoverTime);

            ctx.beginPath();
            ctx.moveTo(hx, 0);
            ctx.lineTo(hx, displayHeight);
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
            ctx.lineWidth = 1;
            ctx.stroke();

            ctx.fillStyle = 'rgba(0,0,0,0.8)';
            ctx.fillRect(hx + 4, displayHeight - 20, 50, 16);
            ctx.fillStyle = '#fff';
            ctx.font = '10px monospace';
            ctx.fillText(hoverTime.toFixed(2) + 's', hx + 6, displayHeight - 8);
        }
    };

    // Render loop
    useEffect(() => {
        draw();
    }, [buffer, playheadSec, height, zoom, viewStart, hoverTime]);

    // Re-draw on resize
    useEffect(() => {
        const resizeObserver = new ResizeObserver(() => draw());
        if (containerRef.current) resizeObserver.observe(containerRef.current);
        return () => resizeObserver.disconnect();
    }, []);


    // Interaction Handlers
    const xToTime = (x: number, width: number) => {
        if (!buffer) return 0;
        const visibleDuration = buffer.duration / zoom;
        const time = viewStart + (x / width) * visibleDuration;
        return Math.max(0, Math.min(buffer.duration, time));
    };

    const handleWheel = (e: React.WheelEvent) => {
        if (!buffer) return;
        // e.preventDefault(); // Passive event issue in React, handled by styling usually

        const delta = -e.deltaY;
        const zoomFactor = 0.1;
        const newZoom = Math.max(1, Math.min(50, zoom + (delta > 0 ? zoomFactor * zoom : -zoomFactor * zoom)));

        // Zoom towards mouse pointer
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const mouseTime = xToTime(x, rect.width);

        setZoom(newZoom);

        // Adjust ViewStart to keep mouseTime under the cursor
        const newVisibleDuration = buffer.duration / newZoom;
        const mouseRatio = x / rect.width;
        let newViewStart = mouseTime - (newVisibleDuration * mouseRatio);
        newViewStart = Math.max(0, Math.min(buffer.duration - newVisibleDuration, newViewStart));

        setViewStart(newViewStart);
    };

    const handleMouseDown = (e: React.MouseEvent) => {
        isDragging.current = true;
        handleMouseMove(e); // Seek immediately on click
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left;

        // Hover update
        setHoverTime(xToTime(x, rect.width));

        if (isDragging.current && buffer) {
            const time = xToTime(x, rect.width);
            onSeek(time);
        }
    };

    const handleMouseUp = () => {
        isDragging.current = false;
    };

    const handleMouseLeave = () => {
        isDragging.current = false;
        setHoverTime(null);
    };

    return (
        <div
            ref={containerRef}
            className="w-full h-full relative group bg-slate-800"
            onWheel={handleWheel}
        >
            <canvas
                ref={canvasRef}
                className="w-full h-full cursor-crosshair touch-none block"
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseLeave}
            />
            {/* Zoom Indicator Overlay */}
            <div className="absolute top-2 right-2 bg-black/60 px-2 py-1 rounded text-[10px] text-slate-300 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
                Zoom: {zoom.toFixed(1)}x
            </div>

            {/* Hover Indicator Overlay (Global) */}
            <div className="absolute inset-x-0 bottom-0 h-1 bg-white/5 opacity-0 group-hover:opacity-100 pointer-events-none" />
        </div>
    );
};
