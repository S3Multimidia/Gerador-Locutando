import React, { useEffect, useRef } from 'react';

interface WaveformProps {
    buffer: AudioBuffer | null;
    color?: string;
    height?: number;
    width?: number;
    className?: string;
    selection?: { start: number; end: number } | null;
    onSelectionChange?: (start: number, end: number) => void;
    markers?: { time: number; color: string; label?: string }[];
    playheadPosition?: number; // 0-1 representing position
    isPlaying?: boolean;
    onSeek?: (position: number) => void;
    zoom?: number;
    viewStart?: number;
    amplitudeScale?: number;
}

export const Waveform: React.FC<WaveformProps> = ({
    buffer,
    color = '#6366f1',
    height = 120,
    width,
    className = '',
    selection,
    onSelectionChange,
    markers = [],
    playheadPosition = 0,
    isPlaying = false,
    onSeek,
    zoom = 1,
    viewStart = 0,
    amplitudeScale = 1
}) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const isDragging = useRef(false);
    const dragStartX = useRef(0);

    const [hoverTime, setHoverTime] = React.useState<number | null>(null);

    // Resize Observer to handle flexible layouts
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const resizeObserver = new ResizeObserver(() => {
            // Trigger re-render by forcing update (or rely on parent resize causing prop change)
            // Ideally, we just re-run the drawing logic.
            // Since draw logic is in useEffect dependent on buffer/zoom, we can just setState to force render?
            // Actually, let's just use a ref to track if we need to redraw, but the simple way is relying on React re-render.
            // But canvas size changing doesn't trigger React render unless state changes.
            if (canvas.parentElement) {
                // Determine new dimensions
                const rect = canvas.parentElement.getBoundingClientRect();
                if (canvas.width !== rect.width * (window.devicePixelRatio || 1)) {
                    // Force update
                    drawWaveform();
                }
            }
        });

        if (canvas.parentElement) {
            resizeObserver.observe(canvas.parentElement);
        }

        return () => resizeObserver.disconnect();
    }, []);

    // Extract drawing logic to reused function
    const drawWaveform = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const container = canvas.parentElement;
        if (!container) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const dpr = window.devicePixelRatio || 1;
        // Always measure container for accurate sizing
        const rect = container.getBoundingClientRect();

        const displayWidth = width || rect.width;
        const displayHeight = height || rect.height || 200;

        // Only resize canvas buffer if dimensions changed to avoid flickering
        if (canvas.width !== displayWidth * dpr || canvas.height !== displayHeight * dpr) {
            canvas.width = displayWidth * dpr;
            canvas.height = displayHeight * dpr;
            ctx.scale(dpr, dpr);
        } else {
            // Just clear if size matches
            ctx.clearRect(0, 0, displayWidth, displayHeight);
        }

        // Reset transform to ensure clean drawing if we didn't resize
        // Actually, if we didn't resize (and didn't context.scale), we need to check.
        // Good practice: Always reset transform and clear using logical coords?
        // Let's stick to the resize logic: if resized, scale is set. If not, scale persists.
        // To be safe:
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, displayWidth, displayHeight);


        if (!buffer) {
            ctx.beginPath();
            ctx.moveTo(0, displayHeight / 2);
            ctx.lineTo(displayWidth, displayHeight / 2);
            ctx.strokeStyle = '#334155'; // Slate-700
            ctx.lineWidth = 1;
            ctx.stroke();
            return;
        }

        const duration = buffer.duration;
        const visibleDuration = duration / zoom;
        const viewEnd = viewStart + visibleDuration;

        // Helper to convert time to X position
        const timeToX = (time: number) => {
            return ((time - viewStart) / visibleDuration) * displayWidth;
        };

        // Draw Waveform
        const data = buffer.getChannelData(0);
        const totalSamples = data.length;

        const startSample = Math.floor((viewStart / duration) * totalSamples);
        const endSample = Math.floor((viewEnd / duration) * totalSamples);
        const visibleSamples = endSample - startSample;

        if (visibleSamples <= 0) return;

        const step = Math.ceil(visibleSamples / displayWidth);
        const amp = displayHeight / 2;

        ctx.fillStyle = color;
        ctx.beginPath();

        // Optimized drawing loop
        for (let i = 0; i < displayWidth; i++) {
            let min = 1.0;
            let max = -1.0;

            // Map pixel i to sample index range
            // current time for pixel i = viewStart + (i/width)*visibleDuration
            // sample index = (time/duration) * totalSamples

            const pixelTimeStart = viewStart + (i / displayWidth) * visibleDuration;
            const pixelTimeEnd = viewStart + ((i + 1) / displayWidth) * visibleDuration;

            const idxStart = Math.floor((pixelTimeStart / duration) * totalSamples);
            const idxEnd = Math.floor((pixelTimeEnd / duration) * totalSamples);

            // Skip out of bounds
            if (idxEnd < 0 || idxStart >= totalSamples) continue;

            const safeStart = Math.max(0, idxStart);
            const safeEnd = Math.min(totalSamples, idxEnd);

            // If the step is huge (zoomed out), we can skip samples to optimize performance
            // But standard step loop is usually fine for < 4k pixels width
            // Let's us simple step logic from original code but refined

            // Original code use fixed step based on total visible samples / width
            // That works well.
            const sampleIndexStart = startSample + (i * step);

            // Safety measure: if zoomed in super close, step might be 0 or 1
            const effectiveStep = Math.max(1, step);

            for (let j = 0; j < effectiveStep; j++) {
                const idx = sampleIndexStart + j;
                if (idx >= 0 && idx < totalSamples) {
                    const datum = data[idx];
                    if (datum < min) min = datum;
                    if (datum > max) max = datum;
                }
            }

            if (min > max) { min = 0; max = 0; }

            min *= amplitudeScale;
            max *= amplitudeScale;

            const yMin = (1 + min) * amp;
            const yMax = (1 + max) * amp;
            ctx.fillRect(i, yMin, 1, Math.max(1, yMax - yMin));
        }


        // Draw Selection Overlay
        if (selection) {
            if (selection.end > viewStart && selection.start < viewEnd) {
                const startX = Math.max(0, timeToX(selection.start));
                const endX = Math.min(displayWidth, timeToX(selection.end));
                const widthX = Math.max(1, endX - startX);

                ctx.fillStyle = 'rgba(99, 102, 241, 0.2)'; // Indigo-500 optimized opacity
                ctx.fillRect(startX, 0, widthX, displayHeight);

                ctx.strokeStyle = 'rgba(99, 102, 241, 0.8)';
                ctx.lineWidth = 1;
                ctx.strokeRect(startX, 0, widthX, displayHeight);

                // Selection Handles/Lines
                ctx.beginPath();
                ctx.moveTo(startX, 0); ctx.lineTo(startX, displayHeight);
                ctx.moveTo(endX, 0); ctx.lineTo(endX, displayHeight);
                ctx.stroke();
            }
        }

        // Draw Markers
        if (markers.length > 0) {
            markers.forEach(marker => {
                if (marker.time >= viewStart && marker.time <= viewEnd) {
                    const x = timeToX(marker.time);

                    ctx.beginPath();
                    ctx.moveTo(x, 0);
                    ctx.lineTo(x, displayHeight);
                    ctx.strokeStyle = marker.color;
                    ctx.lineWidth = 2;
                    ctx.setLineDash([4, 2]);
                    ctx.stroke();
                    ctx.setLineDash([]);

                    if (marker.label) {
                        ctx.fillStyle = marker.color;
                        ctx.font = '10px sans-serif';
                        ctx.fillText(marker.label, x + 4, 12);
                    }
                }
            });
        }

        // Draw Playback Needle
        const currentTime = playheadPosition * duration;
        if (currentTime >= viewStart && currentTime <= viewEnd) {
            const x = timeToX(currentTime);

            // Glow/Blur
            ctx.shadowColor = '#fbbf24';
            ctx.shadowBlur = 4;

            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, displayHeight);
            ctx.strokeStyle = isPlaying ? '#fbbf24' : '#94a3b8'; // Amber-400 : Slate-400
            ctx.lineWidth = 2;
            ctx.stroke();

            ctx.shadowBlur = 0; // Reset

            // Head
            ctx.fillStyle = isPlaying ? '#fbbf24' : '#94a3b8';
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x - 5, 0);
            ctx.lineTo(x, 8);
            ctx.lineTo(x + 5, 0);
            ctx.closePath();
            ctx.fill();
        }

        // Draw Hover Line (Crosshair)
        if (hoverTime !== null && hoverTime >= viewStart && hoverTime <= viewEnd) {
            const hx = timeToX(hoverTime);

            ctx.beginPath();
            ctx.moveTo(hx, 0);
            ctx.lineTo(hx, displayHeight);
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
            ctx.lineWidth = 1;
            ctx.stroke();

            // Time label
            ctx.fillStyle = 'rgba(0,0,0,0.8)';
            ctx.fillRect(hx + 4, displayHeight - 20, 45, 16);
            ctx.fillStyle = '#fff';
            ctx.font = '10px monospace';
            ctx.fillText(hoverTime.toFixed(2) + 's', hx + 6, displayHeight - 8);
        }
    };

    // Draw whenever dependencies change
    useEffect(() => {
        drawWaveform();
    }, [buffer, color, height, width, selection, markers, playheadPosition, isPlaying, zoom, viewStart, amplitudeScale, hoverTime]);

    const hasDragged = useRef(false);

    // Helper to convert X position to time
    const xToTime = (x: number, rectWidth: number) => {
        if (!buffer) return 0;
        const duration = buffer.duration;
        const visibleDuration = duration / zoom;
        const time = viewStart + (x / rectWidth) * visibleDuration;
        return Math.max(0, Math.min(duration, time));
    };

    const handleMouseDown = (e: React.MouseEvent) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left;

        isDragging.current = true;
        dragStartX.current = x;
        hasDragged.current = false;

        if (buffer && onSelectionChange) {
            const time = xToTime(x, rect.width);
            onSelectionChange(time, time);
        }
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        const rect = e.currentTarget.getBoundingClientRect();
        let x = e.clientX - rect.left;

        // Update Hover Time
        if (buffer) {
            setHoverTime(xToTime(x, rect.width));
        }

        if (!isDragging.current || !buffer || !onSelectionChange) return;

        // Clamp x
        x = Math.max(0, Math.min(x, rect.width));

        if (Math.abs(x - dragStartX.current) > 3) {
            hasDragged.current = true;
        }

        if (hasDragged.current) {
            const startTime = xToTime(Math.max(0, Math.min(dragStartX.current, rect.width)), rect.width);
            const endTime = xToTime(x, rect.width);
            onSelectionChange(Math.min(startTime, endTime), Math.max(startTime, endTime));
        }
    };

    const handleMouseUp = (e: React.MouseEvent) => {
        isDragging.current = false;

        if (!hasDragged.current && onSeek && buffer) {
            const rect = e.currentTarget.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const time = xToTime(x, rect.width);
            const position = time / buffer.duration;
            onSeek(position);
        }

        // Don't clear hover time on up, keeps it useful
    };

    const handleMouseLeave = () => {
        isDragging.current = false;
        setHoverTime(null);
    };

    return (
        <canvas
            ref={canvasRef}
            className={`w-full h-full cursor-crosshair touch-none ${className}`} // touch-none for better gesture handling
            style={{ height: '100%', width: '100%', display: 'block' }} // Force block to avoid inline canvas weirdness inside flex
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseLeave}
        />
    );
};
