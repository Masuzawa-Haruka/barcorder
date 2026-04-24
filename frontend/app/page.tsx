
"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { ProductSearchResult, InventoryItem } from "@/types";
import { Html5Qrcode } from "html5-qrcode";
import { BarcodeScanner } from "@/components/BarcodeScanner";
import { DateRangePicker } from "@/components/DateRangePicker";
import { DrumRollDatePicker } from "@/components/DrumRollDatePicker";
import { parseLocalDate, formatDateForDisplay, getLocalDateString } from "@/utils/dateUtils";
import Image from 'next/image';

type InventoryItemWithParsedDates = InventoryItem & {
  _expiryTime: number;
  _createdTime: number;
};

const getDaysRemaining = (expiryDate: string): number => {
  if (!expiryDate) return NaN;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry = parseLocalDate(expiryDate);
  if (isNaN(expiry.getTime())) return NaN;
  return Math.floor((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
};

const getDaysBadge = (days: number): { label: string; bgClass: string; textClass: string } => {
  if (isNaN(days)) return { label: '不明', bgClass: 'bg-gray-400', textClass: 'text-white' };
  if (days < 0) return { label: '期限切れ', bgClass: 'bg-red-500', textClass: 'text-white' };
  if (days === 0) return { label: '今日まで', bgClass: 'bg-red-400', textClass: 'text-white' };
  if (days <= 3) return { label: `あと${days}日`, bgClass: 'bg-orange-400', textClass: 'text-white' };
  if (days <= 7) return { label: `あと${days}日`, bgClass: 'bg-yellow-400', textClass: 'text-gray-800' };
  return { label: `あと${days}日`, bgClass: 'bg-[#5B7A34]', textClass: 'text-white' };
};

export default function Home() {
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

  const [activeTab, setActiveTab] = useState<'add' | 'inventory'>('add');
  const [items, setItems] = useState<InventoryItem[]>([]);

  const [inputCode, setInputCode] = useState("");
  const [inventorySearch, setInventorySearch] = useState("");

  const [dateRangeStart, setDateRangeStart] = useState<string>("");
  const [dateRangeEnd, setDateRangeEnd] = useState<string>("");
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showExpiryPicker, setShowExpiryPicker] = useState(false);

  const [filterOption, setFilterOption] = useState<'all' | 'expired' | 'unexpired'>('all');
  const [sortOption, setSortOption] = useState<'expiry_asc' | 'created_desc' | 'created_asc' | 'name_asc'>('expiry_asc');

  const [candidates, setCandidates] = useState<ProductSearchResult[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<ProductSearchResult | null>(null);
  const [expiryDate, setExpiryDate] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [loading, setLoading] = useState(false);
  const [isScanning, setIsScanning] = useState(false);

  const getFutureDate = (days: number) => {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return date.toISOString().split('T')[0];
  };

  const refreshData = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/items`);
      if (res.ok) setItems(await res.json());
    } catch (err) { console.error(err); }
  }, [API_URL]);

  useEffect(() => { refreshData(); }, [activeTab, refreshData]);

  useEffect(() => {
    if (selectedProduct) setExpiryDate(getFutureDate(7));
  }, [selectedProduct]);

  const searchProduct = async (codeOverride?: string) => {
    const targetCode = typeof codeOverride === 'string' ? codeOverride : inputCode;
    if (!targetCode) return;
    setLoading(true);
    setCandidates([]);
    setSelectedProduct(null);
    setCurrentPage(1);
    if (targetCode !== inputCode) setInputCode(targetCode);

    try {
      const res = await fetch(`${API_URL}/api/product?code=${encodeURIComponent(targetCode)}`);
      if (!res.ok) { alert("商品が見つかりませんでした"); return; }

      const results: ProductSearchResult[] = await res.json();
      const uniqueItems: ProductSearchResult[] = [];
      const seenCodes = new Set();
      const seenNames = new Set();

      results.forEach((item) => {
        if (item.code) {
          if (!seenCodes.has(item.code)) { seenCodes.add(item.code); uniqueItems.push(item); }
        } else {
          if (!seenNames.has(item.name)) { seenNames.add(item.name); uniqueItems.push(item); }
        }
      });

      if (uniqueItems.length === 0) alert("商品が見つかりませんでした");
      else setCandidates(uniqueItems);
    } catch (error) {
      console.error(error);
      alert("検索エラーが発生しました");
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    setLoading(true);
    try {
      const html5QrCode = new Html5Qrcode("reader-hidden");
      const result = await html5QrCode.scanFileV2(file, true);
      if (result && result.decodedText) searchProduct(result.decodedText);
      else alert("バーコードを検出できませんでした");
    } catch { alert("読み取り失敗"); }
    finally { setLoading(false); e.target.value = ""; }
  };

  const handleScanSuccess = (result: string) => {
    setIsScanning(false);
    setTimeout(() => searchProduct(result), 300);
  };

  const registerItem = async () => {
    if (!selectedProduct) return;
    const finalDate = expiryDate || getFutureDate(7);

    try {
      const res = await fetch(`${API_URL}/api/items`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: selectedProduct.name, barcode: selectedProduct.code || "unknown",
          image: selectedProduct.image, expiry_date: finalDate
        }),
      });

      if (!res.ok) {
        let errorMsg = "もう一度お試しください。";
        let text = "";
        let trimmed = "";
        try {
          text = await res.text();
          trimmed = text.trim();
          if (trimmed) {
            if (trimmed.toLowerCase().startsWith("<!doctype") || trimmed.toLowerCase().startsWith("<html")) {
              errorMsg = "サーバーから予期しないレスポンスが返されました。";
            } else {
              const errData = JSON.parse(trimmed) as { error?: string };
              if (errData && errData.error) errorMsg = `原因: ${errData.error}`;
            }
          }
        } catch (e) {
          if (e instanceof SyntaxError) errorMsg = "サーバーから無効な形式のレスポンスが返されました。";
          else errorMsg = "サーバーのエラーレスポンス処理中にエラーが発生しました。";
        }
        alert(`登録に失敗しました。\n${errorMsg}`);
        return;
      }

      alert(`「${selectedProduct.name}」を追加しました！`);
      setCandidates([]);
      setSelectedProduct(null);
      setInputCode("");
      refreshData();
    } catch (error) {
      console.error(error);
      alert("ネットワークエラーが発生しました。");
    }
  };

  const updateStatus = async (id: string, newStatus: string) => {
    if (newStatus === 'delete' && !confirm("完全に削除しますか?")) return;
    try {
      const method = newStatus === 'delete' ? 'DELETE' : 'PATCH';
      const res = await fetch(`${API_URL}/api/items/${id}`, {
        method, headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) { alert("更新に失敗しました。もう一度お試しください。"); return; }
      refreshData();
    } catch (error) {
      console.error(error);
      alert("ネットワークエラーが発生しました。");
    }
  };

  const updateExpiryDate = async (id: string, newDate: string) => {
    if (!newDate) return;
    try {
      const res = await fetch(`${API_URL}/api/items/${id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ expiry_date: newDate }),
      });
      if (!res.ok) { alert("期限の更新に失敗しました。"); return; }
      refreshData();
    } catch (e) {
      console.error(e);
      alert("ネットワークエラーが発生しました。");
    }
  };

  const displayItems = useMemo(() => {
    let filtered: InventoryItemWithParsedDates[] = items
      .filter(item => item.status === 'active')
      .map(item => ({
        ...item,
        _expiryTime: parseLocalDate(item.expiry_date).getTime(),
        _createdTime: new Date(item.created_at).getTime()
      }));

    const todayTime = new Date().setHours(0, 0, 0, 0);

    const warnInvalidDate = (item: InventoryItemWithParsedDates, context: string) => {
      console.warn(`不正な有効期限のためアイテムを${context}から除外しました`, { id: item.id, expiry_date: item.expiry_date });
    };

    if (inventorySearch) {
      filtered = filtered.filter(item => item.name.toLowerCase().includes(inventorySearch.toLowerCase()));
    }

    if (dateRangeStart || dateRangeEnd) {
      let start: Date | null = null;
      let end: Date | null = null;
      if (dateRangeStart) { start = new Date(dateRangeStart); if (isNaN(start.getTime())) start = null; else start.setHours(0, 0, 0, 0); }
      if (dateRangeEnd) { end = new Date(dateRangeEnd); if (isNaN(end.getTime())) end = null; else end.setHours(23, 59, 59, 999); }
      if (start && end && start > end) {
        console.warn("日付範囲が不正なためフィルタリングをスキップします", { start, end });
      } else if (start || end) {
        filtered = filtered.filter(item => {
          if (isNaN(item._expiryTime)) { warnInvalidDate(item, "日付範囲検索"); return false; }
          if (start && item._expiryTime < start.getTime()) return false;
          if (end && item._expiryTime > end.getTime()) return false;
          return true;
        });
      }
    }

    if (filterOption === 'expired') {
      filtered = filtered.filter(item => { if (isNaN(item._expiryTime)) { warnInvalidDate(item, "期限切れフィルター"); return false; } return item._expiryTime < todayTime; });
    } else if (filterOption === 'unexpired') {
      filtered = filtered.filter(item => { if (isNaN(item._expiryTime)) { warnInvalidDate(item, "期限内フィルター"); return false; } return item._expiryTime >= todayTime; });
    }

    return filtered.sort((a, b) => {
      if (sortOption === 'expiry_asc') {
        const isInvalidA = isNaN(a._expiryTime), isInvalidB = isNaN(b._expiryTime);
        if (isInvalidA && isInvalidB) return 0;
        if (isInvalidA) return 1;
        if (isInvalidB) return -1;
        return a._expiryTime - b._expiryTime;
      } else if (sortOption === 'created_desc') {
        const isInvalidA = isNaN(a._createdTime), isInvalidB = isNaN(b._createdTime);
        if (isInvalidA && isInvalidB) return 0; if (isInvalidA) return 1; if (isInvalidB) return -1;
        return b._createdTime - a._createdTime;
      } else if (sortOption === 'created_asc') {
        const isInvalidA = isNaN(a._createdTime), isInvalidB = isNaN(b._createdTime);
        if (isInvalidA && isInvalidB) return 0; if (isInvalidA) return 1; if (isInvalidB) return -1;
        return a._createdTime - b._createdTime;
      } else if (sortOption === 'name_asc') {
        return a.name.localeCompare(b.name, 'ja');
      }
      return 0;
    });
  }, [inventorySearch, items, dateRangeStart, dateRangeEnd, filterOption, sortOption]);

  const currentCandidates = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return candidates.slice(start, start + itemsPerPage);
  }, [candidates, currentPage]);

  const totalPages = Math.ceil(candidates.length / itemsPerPage);

  return (
    <main className="flex flex-col min-h-screen bg-[#F5F2EC] pt-14 pb-20">
      {/* ヘッダー */}
      <header className="w-full bg-white flex items-center px-4 py-2 fixed top-0 z-30 border-b border-gray-200">
        <Image
          src="/icon.png"
          alt="BarCorder"
          width={40}
          height={40}
          className="w-auto h-10 object-contain"
          priority
        />
        <span className="ml-2 font-bold text-[#5B7A34] text-lg tracking-tight">BarCorder</span>
      </header>

      <div id="reader-hidden" className="hidden"></div>

      {/* TAB 1: 商品追加 */}
      {activeTab === 'add' && (
        <div className="p-4 flex flex-col items-center animate-fade-in w-full">

          {!isScanning ? (
            <>
              {/* 検索エリア */}
              <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-4">
                <p className="text-xs font-bold text-gray-400 mb-2 uppercase tracking-wider">バーコード・商品名で検索</p>
                <div className="flex gap-2 mb-3">
                  <input
                    type="text"
                    value={inputCode}
                    onChange={(e) => setInputCode(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && searchProduct()}
                    placeholder="バーコード / 商品名"
                    className="flex-1 p-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#5B7A34]/30"
                  />
                  <button
                    onClick={() => searchProduct()}
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
                    <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                  </label>
                </div>
              </div>

              {/* 検索候補リスト */}
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

              {/* 商品登録フォーム */}
              {selectedProduct && (
                <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-gray-100 animate-slide-up overflow-hidden">
                  {/* 商品ヘッダー */}
                  <div className="flex items-center gap-3 p-4 border-b border-gray-100">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={selectedProduct.image} className="w-16 h-16 object-contain bg-gray-50 rounded-xl" alt={selectedProduct.name} />
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-gray-800 text-sm line-clamp-2">{selectedProduct.name}</h3>
                    </div>
                    <button onClick={() => setSelectedProduct(null)} className="text-gray-300 hover:text-gray-500 text-xl font-bold p-1">✕</button>
                  </div>

                  {/* 賞味期限 */}
                  <div className="px-4 py-3 border-b border-gray-100">
                    <p className="text-xs font-bold text-gray-400 mb-2">賞味期限</p>
                    <div className="grid grid-cols-4 gap-1.5 mb-2">
                      {[
                        { label: '明日', days: 1 },
                        { label: '3日後', days: 3 },
                        { label: '1週間', days: 7 },
                        { label: '1ヶ月', days: 30 },
                      ].map(({ label, days }) => (
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

                  {/* 登録ボタン */}
                  <div className="p-4">
                    <button
                      onClick={registerItem}
                      className="w-full bg-[#5B7A34] text-white py-3.5 rounded-full font-bold shadow-sm text-sm"
                    >
                      登録する
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
              <BarcodeScanner onResult={handleScanSuccess} />
              <button
                onClick={() => setIsScanning(false)}
                className="mt-4 w-full py-3 text-gray-500 border border-gray-200 rounded-full font-bold text-sm"
              >
                キャンセル
              </button>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: 在庫 */}
      {activeTab === 'inventory' && (
        <div className="p-4 flex flex-col items-center animate-fade-in w-full">

          {/* 検索・フィルターバー */}
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

          {/* 在庫グリッド */}
          <div className="w-full max-w-md">
            {displayItems.length === 0 ? (
              <div className="text-center py-16 text-gray-400 text-sm">
                {inventorySearch ? "検索条件に一致する在庫がありません" : "在庫がありません"}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {displayItems.map((item) => {
                  const days = getDaysRemaining(item.expiry_date);
                  const badge = getDaysBadge(days);

                  return (
                    <div key={item.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
                      {/* 商品画像 + バッジ */}
                      <div className="relative bg-gray-50 aspect-square">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={item.image_url || "https://placehold.co/200x200?text=No+Image"}
                          className="w-full h-full object-contain p-2"
                          alt={item.name}
                        />
                        <span className={`absolute top-2 left-2 ${badge.bgClass} ${badge.textClass} text-[10px] font-bold px-2 py-0.5 rounded-full`}>
                          {badge.label}
                        </span>
                      </div>

                      {/* 商品情報 */}
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

                      {/* アクションボタン */}
                      <div className="flex border-t border-gray-100">
                        <button
                          onClick={() => updateStatus(item.id, 'consumed')}
                          className="flex-1 py-2 text-[11px] text-[#5B7A34] font-bold hover:bg-[#EEF3E6] transition-colors"
                        >
                          完食
                        </button>
                        <button
                          onClick={() => updateStatus(item.id, 'discarded')}
                          className="flex-1 py-2 text-[11px] text-red-400 font-bold border-l border-gray-100 hover:bg-red-50 transition-colors"
                        >
                          廃棄
                        </button>
                        <button
                          onClick={() => updateStatus(item.id, 'delete')}
                          className="w-9 flex items-center justify-center text-gray-300 hover:text-red-400 border-l border-gray-100 transition-colors"
                          aria-label="削除"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ボトムナビ */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex justify-around py-2 z-50">
        <button
          onClick={() => setActiveTab('add')}
          className={`flex-1 flex flex-col items-center py-1 transition-colors ${activeTab === 'add' ? 'text-[#5B7A34]' : 'text-gray-400'}`}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
          <span className="text-[10px] font-bold mt-0.5">ホーム</span>
        </button>
        <button
          onClick={() => setActiveTab('inventory')}
          className={`flex-1 flex flex-col items-center py-1 transition-colors ${activeTab === 'inventory' ? 'text-[#5B7A34]' : 'text-gray-400'}`}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
          </svg>
          <span className="text-[10px] font-bold mt-0.5">在庫</span>
        </button>
      </div>

      {/* 日付範囲ピッカーモーダル */}
      {showDatePicker && (
        <DateRangePicker
          startDate={dateRangeStart}
          endDate={dateRangeEnd}
          onStartDateChange={setDateRangeStart}
          onEndDateChange={setDateRangeEnd}
          onClose={() => setShowDatePicker(false)}
        />
      )}

      {/* 賞味期限入力ドラムロールピッカー */}
      {showExpiryPicker && (
        <DrumRollDatePicker
          initialDate={expiryDate ? parseLocalDate(expiryDate) : parseLocalDate(getFutureDate(7))}
          onConfirm={(date) => {
            setExpiryDate(getLocalDateString(date));
            setShowExpiryPicker(false);
          }}
          onCancel={() => setShowExpiryPicker(false)}
        />
      )}
    </main>
  );
}
