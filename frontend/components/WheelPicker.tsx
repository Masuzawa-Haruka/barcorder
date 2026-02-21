"use client";

import { useEffect, useRef, useState } from "react";

interface WheelPickerProps {
    items: number[];
    value: number;
    onChange: (value: number) => void;
    label: string;
    unit?: string;
}

export function WheelPicker({ items, value, onChange, label, unit = "" }: WheelPickerProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [isScrolling, setIsScrolling] = useState(false);
    const scrollTimeoutRef = useRef<ReturnType<typeof setTimeout>>();

    useEffect(() => {
        if (containerRef.current) {
            const index = items.indexOf(value);
            if (index !== -1) {
                const itemHeight = 40;
                containerRef.current.scrollTop = index * itemHeight;
            }
        }
    }, [value, items]);

    const handleScroll = () => {
        if (!containerRef.current) return;

        setIsScrolling(true);

        if (scrollTimeoutRef.current) {
            clearTimeout(scrollTimeoutRef.current);
        }

        scrollTimeoutRef.current = setTimeout(() => {
            if (!containerRef.current) return;

            const itemHeight = 40;
            const scrollTop = containerRef.current.scrollTop;
            const index = Math.round(scrollTop / itemHeight);
            const clampedIndex = Math.max(0, Math.min(index, items.length - 1));

            onChange(items[clampedIndex]);
            containerRef.current.scrollTop = clampedIndex * itemHeight;
            setIsScrolling(false);
        }, 100);
    };

    return (
        <div className="flex flex-col items-center">
            <p className="text-xs text-gray-500 mb-1 font-bold">{label}</p>
            <div className="relative w-20 h-40 overflow-hidden">
                {/* 選択エリアのハイライト */}
                <div className="absolute top-1/2 left-0 right-0 h-10 -translate-y-1/2 bg-blue-100 border-y-2 border-blue-300 pointer-events-none z-10" />

                {/* スクロール可能なリスト */}
                <div
                    ref={containerRef}
                    onScroll={handleScroll}
                    className="h-full overflow-y-scroll scrollbar-hide snap-y snap-mandatory"
                    style={{
                        scrollSnapType: 'y mandatory',
                        WebkitOverflowScrolling: 'touch'
                    }}
                >
                    {/* 上部のパディング */}
                    <div className="h-20" />

                    {items.map((item) => (
                        <div
                            key={item}
                            className="h-10 flex items-center justify-center text-lg font-bold snap-start"
                            style={{
                                opacity: item === value && !isScrolling ? 1 : 0.3,
                                transition: 'opacity 0.2s'
                            }}
                        >
                            {item}{unit}
                        </div>
                    ))}

                    {/* 下部のパディング */}
                    <div className="h-20" />
                </div>
            </div>
        </div>
    );
}
