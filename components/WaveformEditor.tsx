import React, { useRef, useEffect, useState } from 'react';

interface WaveformEditorProps {
    buffer: AudioBuffer | null;
    height?: number;
    color?: string;
    selectionStart: number | null;
    selectionEnd: number | null;
    onSelectionChange: (start: number | null, end: number | null) => void;
}

export const WaveformEditor: React.FC<WaveformEditorProps> = ({
    buffer,
    height = 96,
    color = '#6366f1',
    selectionStart,
    selectionEnd,
    onSelectionChange
}) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [isDragging, setIsDragging] = useState(false);
    const dragStartRef = useRef<number | null>(null);

    // Draw Waveform & Selection
    useEffect(() => {
        const canvas = canvasRef.current;
        const container = containerRef.current;
        if (!canvas || !container) return;

        const draw = () => {
            const ctx = canvas.getContext('2d');
            if (!ctx) return;

            const width = container.clientWidth;
            const dpr = window.devicePixelRatio || 1;

            canvas.width = width * dpr;
            canvas.height = height * dpr;
            ctx.scale(dpr, dpr);
            canvas.style.width = `${width}px`;
            canvas.style.height = `${height}px`;

            ctx.clearRect(0, 0, width, height);

            // Draw Background
            ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
            ctx.fillRect(0, 0, width, height);

            if (!buffer) return;

            // Draw Waveform
            const data = buffer.getChannelData(0);
            const step = Math.ceil(data.length / width);
            const amp = height / 2;

            ctx.fillStyle = color;
            ctx.beginPath();

            for (let i = 0; i < width; i++) {
                let min = 1.0;
                let max = -1.0;
                for (let j = 0; j < step; j++) {
                    const datum = data[(i * step) + j];
                    if (datum < min) min = datum;
                    if (datum > max) max = datum;
                }
                const yMin = (1 + min) * amp;
                const yMax = (1 + max) * amp;
                ctx.fillRect(i, yMin, 1, Math.max(1, yMax - yMin));
            }

            // Draw Selection Overlay
            if (selectionStart !== null && selectionEnd !== null) {
                const startX = (selectionStart / buffer.duration) * width;
                const endX = (selectionEnd / buffer.duration) * width;
                const selWidth = endX - startX;

                ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
                ctx.fillRect(startX, 0, selWidth, height);

                // Selection Borders
                ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
                ctx.fillRect(startX, 0, 1, height);
                ctx.fillRect(endX, 0, 1, height);
            }
        };

        draw();
        const resizeObserver = new ResizeObserver(draw);
        resizeObserver.observe(container);
        return () => resizeObserver.disconnect();
    }, [buffer, height, color, selectionStart, selectionEnd]);

    // Mouse Events for Selection
    const getTimestampFromEvent = (e: React.MouseEvent) => {
        if (!buffer || !containerRef.current) return 0;
        const rect = containerRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const width = rect.width;
        const time = (x / width) * buffer.duration;
        return Math.max(0, Math.min(time, buffer.duration));
    };

    const handleMouseDown = (e: React.MouseEvent) => {
        if (!buffer) return;
        setIsDragging(true);
        const time = getTimestampFromEvent(e);
        dragStartRef.current = time;
        onSelectionChange(time, time);
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!isDragging || !buffer || dragStartRef.current === null) return;
        const currentTime = getTimestampFromEvent(e);
        const start = Math.min(dragStartRef.current, currentTime);
        const end = Math.max(dragStartRef.current, currentTime);
        onSelectionChange(start, end);
    };

    const handleMouseUp = () => {
        setIsDragging(false);
        dragStartRef.current = null;
    };

    return (
        <div
            ref={containerRef}
            className="relative w-full cursor-text select-none"
            style={{ height }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
        >
            <canvas ref={canvasRef} className="block rounded-lg" />
        </div>
    );
};
