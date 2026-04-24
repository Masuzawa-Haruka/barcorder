"use client";

import { BarcodeScanner } from "@/components/BarcodeScanner";
import { DrumRollDatePicker } from "@/components/DrumRollDatePicker";
import { ProductSearchResult } from "@/types";
import { formatDateForDisplay, parseLocalDate, getLocalDateString } from "@/utils/dateUtils";

type Props = {
  inputCode: string;
  setInputCode: (v: string) => void;
  loading: boolean;
  isScanning: boolean;
  setIsScanning: (v: boolean) => void;
  candidates: ProductSearchResult[];
  selectedProduct: ProductSearchResult | null;
  setSelectedProduct: (v: ProductSearchResult | null) => void;
  currentCandidates: ProductSearchResult[];
  totalPages: number;
  currentPage: number;
  setCurrentPage: (fn: (p: number) => number) => void;
  expiryDate: string;
  setExpiryDate: (v: string) => void;
  showExpiryPicker: boolean;
  setShowExpiryPicker: (v: boolean) => void;
  getFutureDate: (days: number) => string;
  onSearch: (query?: string) => void;
  onImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onScanSuccess: (result: string) => void;
  onRegister: () => void;
};

export const AddTab = ({
  inputCode, setInputCode, loading, isScanning, setIsScanning,
  candidates, selectedProduct, setSelectedProduct,
  currentCandidates, totalPages, currentPage, setCurrentPage,
  expiryDate, setExpiryDate, showExpiryPicker, setShowExpiryPicker,
  getFutureDate, onSearch, onImageUpload, onScanSuccess, onRegister,
}: Props) => (
  <div className="p-4 flex flex-col items-center animate-fade-in w-full">
    {!isScanning ? (
      <>
        <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-4">
          <p className="text-xs font-bold text-gray-400 mb-2 uppercase tracking-wider">バーコード・商品名で検索</p>
          <div className="flex gap-2 mb-3">
            <input
              type="text"
              value={inputCode}
              onChange={(e) => setInputCode(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && onSearch()}
              placeholder="バーコード / 商品名"
              className="flex-1 p-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#5B7A34]/30"
            />
            <button
              onClick={() => onSearch()}
              disabled={loading}
              className="bg-[#5B7A34] text-white px-5 rounded-full font-bold text-sm disabled:opacity-50"
            >
              {loading ? "..." : "検索"}
            </button>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setIsScanning(true)}
              className="flex-1 flex items-center justify-center gap-2 py-3 bg-[#5B7A34] text-white rounded-full font-bold text-sm"
            >
              <span>📷</span> カメラで読む
            </button>
            <label className="flex-1 flex items-center justify-center gap-2 py-3 bg-[#EEF3E6] text-[#5B7A34] rounded-full font-bold text-sm cursor-pointer border border-[#5B7A34]/20">
              <span>📁</span> 画像から
              <input type="file" accept="image/*" className="hidden" onChange={onImageUpload} />
            </label>
          </div>
        </div>

        {candidates.length > 0 && !selectedProduct && (
          <div className="w-full max-w-md animate-slide-up">
            <p className="text-xs font-bold text-gray-400 mb-2 ml-1">検索結果 {candidates.length}件</p>
            <div className="space-y-2">
              {currentCandidates.map((cand, idx) => (
                <div
                  key={idx}
                  onClick={() => setSelectedProduct(cand)}
                  className="bg-white p-3 rounded-xl shadow-sm border border-gray-100 flex items-center gap-3 cursor-pointer active:bg-[#EEF3E6] transition-colors"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={cand.image} className="w-14 h-14 object-contain bg-gray-50 rounded-lg" alt={cand.name} />
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-gray-800 text-sm line-clamp-2">{cand.name}</h3>
                    <p className="text-xs text-gray-400 mt-0.5">タップして選択</p>
                  </div>
                  <span className="text-gray-300 text-lg">›</span>
                </div>
              ))}
            </div>
            {totalPages > 1 && (
              <div className="flex justify-center items-center gap-4 mt-4">
                <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="px-4 py-2 bg-white border rounded-full text-sm disabled:opacity-30 font-bold text-gray-600">‹ 前へ</button>
                <span className="text-sm font-bold text-gray-500">{currentPage} / {totalPages}</span>
                <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="px-4 py-2 bg-white border rounded-full text-sm disabled:opacity-30 font-bold text-gray-600">次へ ›</button>
              </div>
            )}
          </div>
        )}

        {selectedProduct && (
          <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-gray-100 animate-slide-up overflow-hidden">
            <div className="flex items-center gap-3 p-4 border-b border-gray-100">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={selectedProduct.image} className="w-16 h-16 object-contain bg-gray-50 rounded-xl" alt={selectedProduct.name} />
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-gray-800 text-sm line-clamp-2">{selectedProduct.name}</h3>
              </div>
              <button onClick={() => setSelectedProduct(null)} className="text-gray-300 hover:text-gray-500 text-xl font-bold p-1">✕</button>
            </div>

            <div className="px-4 py-3 border-b border-gray-100">
              <p className="text-xs font-bold text-gray-400 mb-2">賞味期限</p>
              <div className="grid grid-cols-4 gap-1.5 mb-2">
                {[{ label: '明日', days: 1 }, { label: '3日後', days: 3 }, { label: '1週間', days: 7 }, { label: '1ヶ月', days: 30 }].map(({ label, days }) => (
                  <button
                    key={days}
                    onClick={() => setExpiryDate(getFutureDate(days))}
                    className={`py-2 rounded-full text-xs font-bold transition-colors ${expiryDate === getFutureDate(days) ? 'bg-[#5B7A34] text-white' : 'bg-[#EEF3E6] text-[#5B7A34]'}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <button
                onClick={() => setShowExpiryPicker(true)}
                className="w-full flex items-center gap-2 bg-gray-50 p-3 rounded-xl border border-gray-200"
              >
                <span>📅</span>
                <span className="flex-1 text-left text-gray-700 text-sm font-bold">
                  {expiryDate ? formatDateForDisplay(expiryDate) : '日付を選択'}
                </span>
                <span className="text-gray-300">›</span>
              </button>
            </div>

            <div className="p-4">
              <button onClick={onRegister} className="w-full bg-[#5B7A34] text-white py-3.5 rounded-full font-bold shadow-sm text-sm">
                登録する
              </button>
            </div>
          </div>
        )}
      </>
    ) : (
      <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
        <BarcodeScanner onResult={onScanSuccess} />
        <button onClick={() => setIsScanning(false)} className="mt-4 w-full py-3 text-gray-500 border border-gray-200 rounded-full font-bold text-sm">
          キャンセル
        </button>
      </div>
    )}

    {showExpiryPicker && (
      <DrumRollDatePicker
        initialDate={expiryDate ? parseLocalDate(expiryDate) : parseLocalDate(getFutureDate(7))}
        onConfirm={(date) => { setExpiryDate(getLocalDateString(date)); setShowExpiryPicker(false); }}
        onCancel={() => setShowExpiryPicker(false)}
      />
    )}
  </div>
);
