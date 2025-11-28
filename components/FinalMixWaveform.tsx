import React, { useRef, useEffect } from 'react';

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

            if (!buffer) {
                // Draw placeholder line
                ctx.beginPath();
                ctx.moveTo(0, height / 2);
                ctx.lineTo(width, height / 2);
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
                ctx.lineWidth = 2;
                ctx.stroke();
                return;
            }

            const data = buffer.getChannelData(0);
            const step = Math.ceil(data.length / width);
            const amp = height / 2;

            // Gradient for the waveform
            const gradient = ctx.createLinearGradient(0, 0, 0, height);
            gradient.addColorStop(0, '#818cf8'); // Indigo-400
            gradient.addColorStop(0.5, '#6366f1'); // Indigo-500
            gradient.addColorStop(1, '#4f46e5'); // Indigo-600

            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.moveTo(0, amp);

            for (let i = 0; i < width; i++) {
                let min = 1.0;
                let max = -1.0;
                for (let j = 0; j < step; j++) {
                    const datum = data[(i * step) + j];
                    if (datum < min) min = datum;
                    if (datum > max) max = datum;
                }
                // Draw a bar for this pixel column
                // Using a symmetric approach looks better for full mix
                const yMin = (1 + min) * amp;
                const yMax = (1 + max) * amp;

                // Draw rect for this slice
                ctx.fillRect(i, yMin, 1, Math.max(1, yMax - yMin));
            }

            // Draw Playhead
            const x = (playheadSec / buffer.duration) * width;

            // Playhead Line
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, height);
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 2;
            ctx.shadowColor = 'rgba(255, 255, 255, 0.5)';
            ctx.shadowBlur = 4;
            ctx.stroke();
            ctx.shadowBlur = 0;

            // Progress overlay (darken played part)
            ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
            ctx.fillRect(0, 0, x, height);
        };

        draw();

        // Redraw on resize
        const resizeObserver = new ResizeObserver(draw);
        resizeObserver.observe(container);
        return () => resizeObserver.disconnect();

    }, [buffer, playheadSec, height]);

    const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!buffer || !containerRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const width = rect.width;
        const time = (x / width) * buffer.duration;
        onSeek(Math.max(0, Math.min(time, buffer.duration)));
    };

    return (
        <div
            ref={containerRef}
            className="w-full relative cursor-pointer group"
            style={{ height }}
            onClick={handleClick}
        >
            <canvas ref={canvasRef} className="block" />

            {/* Hover Indicator */}
            <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
        </div>
    );
};
