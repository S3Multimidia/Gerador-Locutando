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

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const container = canvas.parentElement;
        if (!container) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const dpr = window.devicePixelRatio || 1;
        const rect = canvas.getBoundingClientRect();
        const containerHeight = container.clientHeight;
        const displayWidth = width || rect.width;
        const displayHeight = height || containerHeight || 200;

        canvas.width = displayWidth * dpr;
        canvas.height = displayHeight * dpr;

        ctx.scale(dpr, dpr);
        ctx.clearRect(0, 0, displayWidth, displayHeight);

        if (!buffer) {
            ctx.beginPath();
            ctx.moveTo(0, displayHeight / 2);
            ctx.lineTo(displayWidth, displayHeight / 2);
            ctx.strokeStyle = '#e2e8f0';
            ctx.lineWidth = 2;
            ctx.stroke();
            return;
        }

        const duration = buffer.duration;
        const visibleDuration = duration / zoom;
        const viewEnd = viewStart + visibleDuration;

        // Draw Waveform
        const data = buffer.getChannelData(0);
        const totalSamples = data.length;

        // Calculate start and end samples for the visible view
        const startSample = Math.floor((viewStart / duration) * totalSamples);
        const endSample = Math.floor((viewEnd / duration) * totalSamples);
        const visibleSamples = endSample - startSample;

        if (visibleSamples <= 0) return;

        const step = Math.ceil(visibleSamples / displayWidth);
        const amp = displayHeight / 2;

        ctx.fillStyle = color;
        ctx.beginPath();

        for (let i = 0; i < displayWidth; i++) {
            let min = 1.0;
            let max = -1.0;

            const sampleIndexStart = startSample + (i * step);

            for (let j = 0; j < step; j++) {
                const idx = sampleIndexStart + j;
                if (idx >= 0 && idx < totalSamples) {
                    const datum = data[idx];
                    if (datum < min) min = datum;
                    if (datum > max) max = datum;
                }
            }

            // If no data found in this step (e.g. zoomed out too much or edge cases), just draw a line
            if (min > max) {
                min = 0; max = 0;
            }

            // Apply amplitude scaling (volume visualization)
            min *= amplitudeScale;
            max *= amplitudeScale;

            const yMin = (1 + min) * amp;
            const yMax = (1 + max) * amp;
            ctx.fillRect(i, yMin, 1, Math.max(1, yMax - yMin));
        }

        // Helper to convert time to X position
        const timeToX = (time: number) => {
            return ((time - viewStart) / visibleDuration) * displayWidth;
        };

        // Draw Selection Overlay
        if (selection) {
            // Only draw if selection is visible
            if (selection.end > viewStart && selection.start < viewEnd) {
                const startX = Math.max(0, timeToX(selection.start));
                const endX = Math.min(displayWidth, timeToX(selection.end));
                const widthX = Math.max(1, endX - startX);

                ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
                ctx.fillRect(startX, 0, widthX, displayHeight);

                ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
                ctx.lineWidth = 1;
                ctx.strokeRect(startX, 0, widthX, displayHeight);
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

            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, displayHeight);
            ctx.strokeStyle = isPlaying ? '#f59e0b' : '#94a3b8';
            ctx.lineWidth = 2;
            ctx.stroke();

            // Draw triangle at top
            ctx.fillStyle = isPlaying ? '#f59e0b' : '#94a3b8';
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x - 4, -8);
            ctx.lineTo(x + 4, -8);
            ctx.closePath();
            ctx.fill();
        }

    }, [buffer, color, height, width, selection, markers, playheadPosition, isPlaying, zoom, viewStart, amplitudeScale]);

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

        // Start/Reset selection on mouse down
        if (buffer && onSelectionChange) {
            const time = xToTime(x, rect.width);
            onSelectionChange(time, time);
        }
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!isDragging.current || !buffer || !onSelectionChange) return;

        const rect = e.currentTarget.getBoundingClientRect();
        let x = e.clientX - rect.left;

        // Clamp x to be within the canvas
        x = Math.max(0, Math.min(x, rect.width));

        // Consider it a drag if moved more than a few pixels
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

        // If it was a click (not a drag) and onSeek is available, trigger seek
        if (!hasDragged.current && onSeek && buffer) {
            const rect = e.currentTarget.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const time = xToTime(x, rect.width);
            const position = time / buffer.duration;
            onSeek(position);
        }
    };

    const handleMouseLeave = () => {
        isDragging.current = false;
    };

    return (
        <canvas
            ref={canvasRef}
            className={`w-full h-full cursor-crosshair ${className}`}
            style={{ height: height, width: width ? width : '100%' }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseLeave}
        />
    );
};
