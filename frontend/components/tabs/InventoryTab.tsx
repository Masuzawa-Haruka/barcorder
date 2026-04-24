"use client";

import { DateRangePicker } from "@/components/DateRangePicker";
import { InventoryItem } from "@/types";
import { formatDateForDisplay } from "@/utils/dateUtils";
import { getDaysRemaining, getDaysBadge } from "@/utils/expiry";

type InventoryItemWithParsedDates = InventoryItem & { _expiryTime: number; _createdTime: number };

type Props = {
  displayItems: InventoryItemWithParsedDates[];
  inventorySearch: string;
  setInventorySearch: (v: string) => void;
  filterOption: 'all' | 'expired' | 'unexpired';
  setFilterOption: (v: 'all' | 'expired' | 'unexpired') => void;
  sortOption: 'expiry_asc' | 'created_desc' | 'created_asc' | 'name_asc';
  setSortOption: (v: 'expiry_asc' | 'created_desc' | 'created_asc' | 'name_asc') => void;
  dateRangeStart: string;
  dateRangeEnd: string;
  setDateRangeStart: (v: string) => void;
  setDateRangeEnd: (v: string) => void;
  showDatePicker: boolean;
  setShowDatePicker: (v: boolean) => void;
  updateStatus: (id: string, status: string) => void;
  updateExpiryDate: (id: string, date: string) => void;
};

export const InventoryTab = ({
  displayItems, inventorySearch, setInventorySearch,
  filterOption, setFilterOption, sortOption, setSortOption,
  dateRangeStart, dateRangeEnd, setDateRangeStart, setDateRangeEnd,
  showDatePicker, setShowDatePicker, updateStatus, updateExpiryDate,
}: Props) => (
  <div className="p-4 flex flex-col items-center animate-fade-in w-full">
    <div className="w-full max-w-md mb-3 space-y-2">
      <div className="flex gap-2">
        <input
          type="text"
          value={inventorySearch}
          onChange={(e) => setInventorySearch(e.target.value)}
          placeholder="キーワード検索..."
          className="flex-1 p-3 border border-gray-200 bg-white rounded-full text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-[#5B7A34]/30"
        />
        <button
          onClick={() => setShowDatePicker(true)}
          className={`flex items-center gap-1 px-4 py-2 rounded-full text-sm font-bold border shadow-sm ${(dateRangeStart || dateRangeEnd) ? 'bg-[#5B7A34] text-white border-[#5B7A34]' : 'bg-white text-gray-600 border-gray-200'}`}
        >
          📅{(dateRangeStart || dateRangeEnd) && <span className="text-[10px]">●</span>}
        </button>
      </div>

      <div className="flex gap-2">
        <select
          aria-label="在庫の絞り込み"
          value={filterOption}
          onChange={(e) => setFilterOption(e.target.value as 'all' | 'expired' | 'unexpired')}
          className="flex-1 p-2 border border-gray-200 rounded-full bg-white text-sm text-gray-700 font-bold focus:outline-none"
        >
          <option value="all">すべて</option>
          <option value="expired">期限切れのみ</option>
          <option value="unexpired">期限内のみ</option>
        </select>
        <select
          aria-label="在庫の並べ替え"
          value={sortOption}
          onChange={(e) => setSortOption(e.target.value as 'expiry_asc' | 'created_desc' | 'created_asc' | 'name_asc')}
          className="flex-1 p-2 border border-gray-200 rounded-full bg-white text-sm text-gray-700 font-bold focus:outline-none"
        >
          <option value="expiry_asc">期限が近い順</option>
          <option value="created_desc">登録が新しい順</option>
          <option value="created_asc">登録が古い順</option>
          <option value="name_asc">名前順</option>
        </select>
      </div>

      {(dateRangeStart || dateRangeEnd) && (
        <div className="text-xs text-[#5B7A34] bg-[#EEF3E6] px-3 py-2 rounded-full flex items-center justify-between">
          <span>
            {dateRangeStart && !dateRangeEnd && `${formatDateForDisplay(dateRangeStart)} 以降`}
            {!dateRangeStart && dateRangeEnd && `${formatDateForDisplay(dateRangeEnd)} 以前`}
            {dateRangeStart && dateRangeEnd && `${formatDateForDisplay(dateRangeStart)} 〜 ${formatDateForDisplay(dateRangeEnd)}`}
          </span>
          <button onClick={() => { setDateRangeStart(""); setDateRangeEnd(""); }} className="text-red-400 font-bold ml-2">✕</button>
        </div>
      )}
    </div>

    <div className="w-full max-w-md sm:max-w-2xl lg:max-w-5xl">
      {displayItems.length === 0 ? (
        <div className="text-center py-16 text-gray-400 text-sm">
          {inventorySearch ? "検索条件に一致する在庫がありません" : "在庫がありません"}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {displayItems.map((item) => {
            const badge = getDaysBadge(getDaysRemaining(item.expiry_date));
            return (
              <div key={item.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
                <div className="relative bg-gray-50 aspect-square overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={item.image_url || "https://placehold.co/200x200?text=No+Image"}
                    className="absolute inset-0 w-full h-full object-cover"
                    alt={item.name}
                  />
                  <span className={`absolute top-2 left-2 ${badge.bgClass} ${badge.textClass} text-[10px] font-bold px-2 py-0.5 rounded-full`}>
                    {badge.label}
                  </span>
                </div>
                <div className="p-2 flex-1">
                  <h3 className="font-bold text-xs text-gray-800 line-clamp-2 leading-tight">{item.name}</h3>
                  <input
                    type="date"
                    value={item.expiry_date}
                    onChange={(e) => updateExpiryDate(item.id, e.target.value)}
                    aria-label={`${item.name}の賞味期限を編集`}
                    className="mt-1 text-[11px] text-gray-400 bg-transparent cursor-pointer w-full"
                  />
                </div>
                <div className="flex border-t border-gray-100">
                  <button onClick={() => updateStatus(item.id, 'consumed')} className="flex-1 py-2 text-[11px] text-[#5B7A34] font-bold hover:bg-[#EEF3E6] transition-colors">完食</button>
                  <button onClick={() => updateStatus(item.id, 'discarded')} className="flex-1 py-2 text-[11px] text-red-400 font-bold border-l border-gray-100 hover:bg-red-50 transition-colors">廃棄</button>
                  <button onClick={() => updateStatus(item.id, 'delete')} className="w-9 flex items-center justify-center text-gray-300 hover:text-red-400 border-l border-gray-100 transition-colors" aria-label="削除">🗑️</button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>

    {showDatePicker && (
      <DateRangePicker
        startDate={dateRangeStart}
        endDate={dateRangeEnd}
        onStartDateChange={setDateRangeStart}
        onEndDateChange={setDateRangeEnd}
        onClose={() => setShowDatePicker(false)}
      />
    )}
  </div>
);
