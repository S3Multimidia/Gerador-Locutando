import React, { useState, useEffect } from 'react';

interface DynamicLoadingMessageProps {
    messages: string[];
    interval?: number;
    className?: string;
}

export const DynamicLoadingMessage: React.FC<DynamicLoadingMessageProps> = ({
    messages,
    interval = 2500,
    className = ""
}) => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isVisible, setIsVisible] = useState(true);

    useEffect(() => {
        if (messages.length <= 1) return;

        const timer = setInterval(() => {
            setIsVisible(false); // Start fade out

            setTimeout(() => {
                setCurrentIndex((prev) => (prev + 1) % messages.length);
                setIsVisible(true); // Start fade in
            }, 300); // Wait for fade out to complete (matches CSS transition)

        }, interval);

        return () => clearInterval(timer);
    }, [messages, interval]);

    return (
        <div
            className={`transition-opacity duration-300 ${isVisible ? 'opacity-100' : 'opacity-0'} ${className}`}
        >
            {messages[currentIndex]}
        </div>
    );
};
