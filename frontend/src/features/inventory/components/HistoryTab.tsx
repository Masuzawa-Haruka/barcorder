"use client";

import { InventoryItem } from "@/types";
import { formatDateForDisplay } from "@/lib/dateUtils";

type Props = {
  historyItems: InventoryItem[];
  historySearch: string;
  setHistorySearch: (v: string) => void;
  historyFilter: 'all' | 'consumed' | 'discarded';
  setHistoryFilter: (v: 'all' | 'consumed' | 'discarded') => void;
  updateStatus: (id: string, status: string) => void;
};

const FILTER_OPTIONS = [
  { value: 'all', label: 'すべて' },
  { value: 'consumed', label: '完食' },
  { value: 'discarded', label: '廃棄' },
] as const;

export const HistoryTab = ({
  historyItems, historySearch, setHistorySearch,
  historyFilter, setHistoryFilter, updateStatus,
}: Props) => (
  <div className="p-4 flex flex-col items-center animate-fade-in w-full">
    <div className="w-full max-w-md mb-3 space-y-2">
      <input
        type="text"
        value={historySearch}
        onChange={(e) => setHistorySearch(e.target.value)}
        placeholder="キーワード検索..."
        className="w-full p-3 border border-gray-200 bg-white rounded-full text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-[#5B7A34]/30"
      />
      <div className="flex gap-1 bg-white rounded-full border border-gray-200 p-1 shadow-sm">
        {FILTER_OPTIONS.map(({ value, label }) => (
          <button
            key={value}
            onClick={() => setHistoryFilter(value)}
            className={`flex-1 py-1.5 rounded-full text-xs font-bold transition-colors ${historyFilter === value ? 'bg-[#5B7A34] text-white' : 'text-gray-400'}`}
          >
            {label}
          </button>
        ))}
      </div>
    </div>

    <div className="w-full max-w-md space-y-2">
      {historyItems.length === 0 ? (
        <div className="text-center py-16 text-gray-400 text-sm">
          {historySearch ? "検索条件に一致する履歴がありません" : "履歴がありません"}
        </div>
      ) : (
        historyItems.map((item) => (
          <div key={item.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 flex items-center gap-3 p-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={item.image_url || "https://placehold.co/80x80?text=No+Image"}
              className="w-14 h-14 object-cover rounded-xl bg-gray-50 shrink-0"
              alt={item.name}
            />
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-sm text-gray-800 line-clamp-1">{item.name}</h3>
              <p className="text-xs text-gray-400 mt-0.5">賞味期限: {formatDateForDisplay(item.expiry_date)}</p>
              <span className={`inline-block mt-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${item.status === 'consumed' ? 'bg-[#EEF3E6] text-[#5B7A34]' : 'bg-red-50 text-red-400'}`}>
                {item.status === 'consumed' ? '完食' : '廃棄'}
              </span>
            </div>
            <div className="flex flex-col gap-1 shrink-0">
              <button onClick={() => updateStatus(item.id, 'active')} className="text-[11px] font-bold text-[#5B7A34] bg-[#EEF3E6] px-3 py-1.5 rounded-full">戻す</button>
              <button onClick={() => updateStatus(item.id, 'delete')} className="text-[11px] font-bold text-gray-300 hover:text-red-400 px-3 py-1.5 rounded-full text-center transition-colors" aria-label="完全に削除">削除</button>
            </div>
          </div>
        ))
      )}
    </div>
  </div>
);
