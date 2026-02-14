
"use client";

import { useState, useEffect, useMemo } from "react";
import { ProductSearchResult, InventoryItem } from "@/types";
import { Html5Qrcode } from "html5-qrcode";
import { BarcodeScanner } from "@/components/BarcodeScanner";

export default function Home() {
  const [activeTab, setActiveTab] = useState<'add' | 'inventory'>('add');
  const [items, setItems] = useState<InventoryItem[]>([]);

  const [inputCode, setInputCode] = useState("");
  const [inventorySearch, setInventorySearch] = useState("");

  const [filterOption, setFilterOption] = useState<'all' | 'safe' | 'expired'>('all');

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

  const refreshData = async () => {
    try {
      const res = await fetch("http://localhost:3001/api/items");
      if (res.ok) setItems(await res.json());
    } catch (err) { console.error(err); }
  };

  useEffect(() => { refreshData(); }, [activeTab]);

  useEffect(() => {
    if (selectedProduct) {
      setExpiryDate(getFutureDate(7));
    }
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
      const res = await fetch(`http://localhost:3001/api/product?code=${encodeURIComponent(targetCode)}`);
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
    } catch (err) { alert("読み取り失敗"); }
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
      const res = await fetch("http://localhost:3001/api/items", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: selectedProduct.name, barcode: selectedProduct.code || "unknown",
          image: selectedProduct.image, expiry_date: finalDate
        }),
      });

      if (!res.ok) {
        alert("登録に失敗しました。もう一度お試しください。");
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
      const res = await fetch(`http://localhost:3001/api/items/${id}`, {
        method, headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!res.ok) {
        alert("更新に失敗しました。もう一度お試しください。");
        return;
      }

      refreshData();
    } catch (error) {
      console.error(error);
      alert("ネットワークエラーが発生しました。");
    }
  };

  const updateExpiryDate = async (id: string, newDate: string) => {
    if (!newDate) return;
    try {
      const res = await fetch(`http://localhost:3001/api/items/${id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ expiry_date: newDate }),
      });

      if (!res.ok) {
        alert("期限の更新に失敗しました。");
        return;
      }

      refreshData();
    } catch (e) {
      console.error(e);
      alert("ネットワークエラーが発生しました。");
    }
  };

  const displayItems = useMemo(() => {
    let filtered = items.filter(item => item.status === 'active');

    if (inventorySearch) {
      filtered = filtered.filter(item => item.name.toLowerCase().includes(inventorySearch.toLowerCase()));
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (filterOption === 'safe') {
      filtered = filtered.filter(item => new Date(item.expiry_date) >= today);
    } else if (filterOption === 'expired') {
      filtered = filtered.filter(item => new Date(item.expiry_date) < today);
    }

    return filtered.sort((a, b) => {
      return new Date(a.expiry_date).getTime() - new Date(b.expiry_date).getTime();
    });
  }, [inventorySearch, items, filterOption]);

  const currentCandidates = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return candidates.slice(start, start + itemsPerPage);
  }, [candidates, currentPage]);

  const totalPages = Math.ceil(candidates.length / itemsPerPage);

  return (
    <main className="flex flex-col min-h-screen bg-gray-50 pb-24">
      <div id="reader-hidden" className="hidden"></div>

      {/* TAB 1: 追加 */}
      {activeTab === 'add' && (
        <div className="p-6 flex flex-col items-center animate-fade-in w-full">
          <h1 className="text-2xl font-bold mb-8 text-gray-800">🛍️ 商品を追加</h1>

          <div className="w-full max-w-md bg-white p-6 rounded-2xl shadow-sm border border-gray-100 mb-6">
            {!isScanning ? (
              <>
                <div className="flex gap-2 mb-6">
                  <input type="text" value={inputCode} onChange={(e) => setInputCode(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && searchProduct()} placeholder="バーコード / 商品名" className="flex-1 p-3 border rounded-xl" />
                  <button onClick={() => searchProduct()} disabled={loading} className="bg-blue-600 text-white px-6 rounded-xl font-bold">検索</button>
                </div>
                <div className="flex gap-3">
                  <button onClick={() => setIsScanning(true)} className="flex-1 p-3 bg-blue-500 text-white rounded-xl font-bold">📷 カメラ</button>
                  <label className="flex-1 flex justify-center p-3 bg-gray-100 border-2 border-dashed rounded-xl cursor-pointer font-bold text-gray-600">
                    <span>📁 画像</span><input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                  </label>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center">
                <BarcodeScanner onResult={handleScanSuccess} />
                <button onClick={() => setIsScanning(false)} className="mt-6 text-gray-500 underline font-bold">キャンセル</button>
              </div>
            )}
          </div>

          {candidates.length > 0 && !selectedProduct && (
            <div className="w-full max-w-md animate-slide-up">
              <h2 className="text-lg font-bold text-gray-700 mb-3 ml-2">検索結果 ({candidates.length}件)</h2>
              <div className="space-y-3">
                {currentCandidates.map((cand, idx) => (
                  <div key={idx} onClick={() => setSelectedProduct(cand)} className="bg-white p-3 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4 cursor-pointer hover:bg-blue-50 transition-colors">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={cand.image} className="w-16 h-16 object-contain bg-white rounded" alt={cand.name} />
                    <div className="flex-1">
                      <h3 className="font-bold text-gray-800 text-sm line-clamp-2">{cand.name}</h3>
                      <p className="text-xs text-gray-500 mt-1">タップして選択</p>
                    </div>
                  </div>
                ))}
              </div>
              {totalPages > 1 && (
                <div className="flex justify-center items-center gap-4 mt-6">
                  <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="px-4 py-2 bg-white border rounded-lg disabled:opacity-30 font-bold text-gray-600">&lt; 前へ</button>
                  <span className="font-bold text-gray-600">{currentPage} / {totalPages}</span>
                  <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="px-4 py-2 bg-white border rounded-lg disabled:opacity-30 font-bold text-gray-600">次へ &gt;</button>
                </div>
              )}
            </div>
          )}

          {selectedProduct && (
            <div className="w-full max-w-md bg-white p-6 rounded-2xl shadow-lg border-2 border-blue-100 animate-slide-up relative">
              <button onClick={() => setSelectedProduct(null)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">✕ 戻る</button>

              <div className="text-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={selectedProduct.image} className="w-32 h-32 object-contain mx-auto mb-4" alt={selectedProduct.name} />
                <h3 className="font-bold text-gray-800 mb-6">{selectedProduct.name}</h3>

                <div className="mb-6">
                  <p className="text-sm font-bold text-gray-500 mb-2 text-left">賞味期限を決める (任意)</p>
                  <div className="grid grid-cols-4 gap-2 mb-3">
                    <button onClick={() => setExpiryDate(getFutureDate(1))} className="px-1 py-2 bg-gray-100 rounded text-xs font-bold hover:bg-blue-100 text-gray-600">明日</button>
                    <button onClick={() => setExpiryDate(getFutureDate(3))} className="px-1 py-2 bg-gray-100 rounded text-xs font-bold hover:bg-blue-100 text-gray-600">3日後</button>
                    <button onClick={() => setExpiryDate(getFutureDate(7))} className="px-1 py-2 bg-gray-100 rounded text-xs font-bold hover:bg-blue-100 text-gray-600">1週間</button>
                    <button onClick={() => setExpiryDate(getFutureDate(30))} className="px-1 py-2 bg-gray-100 rounded text-xs font-bold hover:bg-blue-100 text-gray-600">1ヶ月</button>
                  </div>
                  <div className="flex items-center gap-2 bg-gray-50 p-2 rounded-lg border">
                    <span className="text-xl">📅</span>
                    <input
                      type="date"
                      value={expiryDate}
                      onChange={(e) => setExpiryDate(e.target.value)}
                      aria-label="賞味期限を選択"
                      className="bg-transparent flex-1 outline-none text-gray-700 font-bold"
                    />
                  </div>
                </div>

                <button onClick={registerItem} className="w-full bg-green-500 text-white py-3 rounded-xl font-bold shadow-md hover:bg-green-600">完了 (在庫に追加)</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: 在庫 */}
      {activeTab === 'inventory' && (
        <div className="p-4 flex flex-col items-center animate-fade-in w-full">
          <h1 className="text-2xl font-bold mb-4 text-gray-800">📦 冷蔵庫の中身</h1>

          <div className="w-full max-w-md sticky top-0 z-10 bg-gray-50 pb-2 space-y-2 flex flex-col items-end">
            <input type="text" value={inventorySearch} onChange={(e) => setInventorySearch(e.target.value)} placeholder="キーワード検索..." className="w-full p-3 border rounded-xl shadow-sm" />

            <select
              value={filterOption}
              onChange={(e) => setFilterOption(e.target.value as 'all' | 'safe' | 'expired')}
              className="w-auto p-2 border rounded-lg bg-white text-sm font-bold text-gray-600 cursor-pointer"
              aria-label="在庫の表示フィルター"
            >
              <option value="all">👁️ すべて表示</option>
              <option value="safe">✅ 期限内のみ</option>
              <option value="expired">⚠️ 期限切れのみ</option>
            </select>
          </div>

          <div className="w-full max-w-md space-y-3 mt-2">
            {displayItems.map((item) => {
              const isExpired = new Date(item.expiry_date) < new Date(new Date().setHours(0, 0, 0, 0));
              let cardClass = "bg-white border-gray-200";
              if (isExpired) cardClass = "bg-red-50 border-red-300";

              return (
                <div key={item.id} className={`${cardClass} p-4 rounded-xl shadow-sm border flex flex-col gap-3 transition-colors duration-300`}>
                  <div className="flex items-center gap-4">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={item.image_url || "https://placehold.co/80x80"} className="w-16 h-16 object-cover rounded-lg bg-white" alt={item.name} />
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-base truncate text-gray-800">{item.name}</h3>
                      <p className="text-sm text-gray-800 opacity-90 mt-1 flex items-center gap-1">
                        期限:
                        <input
                          type="date"
                          value={item.expiry_date}
                          onChange={(e) => updateExpiryDate(item.id, e.target.value)}
                          aria-label={`${item.name}の賞味期限を編集`}
                          className={`bg-transparent font-bold ml-1 cursor-pointer hover:bg-black/5 rounded px-1 ${isExpired ? 'text-red-600' : ''}`}
                        />
                        {isExpired && <span className="text-xs bg-red-500 text-white px-1 py-0.5 rounded ml-1 font-bold">期限切れ</span>}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2 pt-2 border-t border-black/5">
                    <button onClick={() => updateStatus(item.id, 'consumed')} className="flex-1 bg-green-100 text-green-800 hover:bg-green-200 py-2 rounded-lg font-bold">😋 完食</button>
                    <button onClick={() => updateStatus(item.id, 'discarded')} className="flex-1 bg-red-100 text-red-800 hover:bg-red-200 py-2 rounded-lg font-bold">😱 廃棄</button>
                    <button onClick={() => updateStatus(item.id, 'delete')} className="w-10 flex items-center justify-center text-gray-400 hover:text-red-500" aria-label="削除">🗑️</button>
                  </div>
                </div>
              );
            })}
            {displayItems.length === 0 && (
              <div className="text-center py-10 text-gray-400">
                {inventorySearch ? "検索条件に一致する在庫がありません" : "表示する在庫がありません"}
              </div>
            )}
          </div>
        </div>
      )}

      {/* FOOTER */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex justify-around py-4 shadow z-50">
        <button onClick={() => setActiveTab('add')} className={`flex-1 flex flex-col items-center ${activeTab === 'add' ? 'text-blue-600' : 'text-gray-400'}`}><span className="text-2xl">🛍️</span><span className="text-[10px] font-bold">追加</span></button>
        <button onClick={() => setActiveTab('inventory')} className={`flex-1 flex flex-col items-center ${activeTab === 'inventory' ? 'text-blue-600' : 'text-gray-400'}`}><span className="text-2xl">📦</span><span className="text-[10px] font-bold">在庫</span></button>
      </div>
    </main>
  );
}