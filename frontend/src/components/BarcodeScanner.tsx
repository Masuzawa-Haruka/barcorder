"use client";

import { useZxing } from "react-zxing";
import { BarcodeFormat, DecodeHintType } from "@zxing/library";
import { useMemo } from "react";

export const BarcodeScanner = ({
    onResult,
    onError,
}: {
    onResult: (result: string) => void;
    onError?: (error: unknown) => void;
}) => {
    // バーコードの読み取り設定（EAN_13: JANコード, EAN_8: 短縮JANコード）
    const hints = useMemo(() => {
        const hints = new Map();
        hints.set(DecodeHintType.POSSIBLE_FORMATS, [
            BarcodeFormat.EAN_13,
            BarcodeFormat.EAN_8,
        ]);
        return hints;
    }, []);

    // カメラの設定（react-zxingのフックを使います）
    const { ref } = useZxing({
        // 読み取り成功時の処理
        onDecodeResult(result) {
            // 結果のテキストを取得して親コンポーネントに渡す
            onResult(result.getText());
        },
        // エラー発生時の処理（オプション）
        onError(error) {
            if (onError) {
                onError(error);
            }
            // 開発時のみログ出力（本番では抑制するなど制御可能）
            console.error("Barcode scan error:", error);
        },
        // 読み取りの種類を指定
        hints,
        // カメラの制約（背面カメラを優先）
        constraints: {
            video: {
                facingMode: "environment", // スマホのアウトカメラを使用
            },
        },
    });

    return (
        <div className="flex flex-col items-center">
            <div className="relative w-full max-w-sm aspect-[3/4] bg-black rounded-lg overflow-hidden shadow-xl">
                {/* ここにカメラの映像が出ます */}
                <video ref={ref} className="w-full h-full object-cover" />

                {/* ガイド枠（装飾用） */}
                <div className="absolute inset-0 border-2 border-red-500/50 m-12 rounded-lg pointer-events-none animate-pulse"></div>
                <p className="absolute bottom-4 left-0 right-0 text-center text-white text-sm bg-black/50 py-1">
                    バーコードを枠に合わせてください
                </p>
            </div>
        </div>
    );
};