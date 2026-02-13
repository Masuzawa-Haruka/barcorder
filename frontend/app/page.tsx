"use client";

import { useState, useEffect, useMemo } from "react";
import { ProductSearchResult, InventoryItem } from "@/types";
import { Html5Qrcode } from "html5-qrcode";
import { BarcodeScanner } from "@/components/BarcodeScanner";

export default function Home() {
  const [activeTab, setActiveTab] = useState<'add' | 'inventory' | 'analysis'>('add');
  const [items, setItems] = useState<InventoryItem[]>([]);
  
  const [inputCode, setInputCode] = useState("");
  const [inventorySearch, setInventorySearch] = useState("");
  
  // 候補リスト
  const [candidates, setCandidates] = useState<ProductSearchResult[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<ProductSearchResult | null>(null);
  
  // ★ 新規追加時の期限日ステート
  const [expiryDate, setExpiryDate] = useState("");

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [loading, setLoading] = useState(false);
  const [isScanning, setIsScanning] = useState(false);

  // --- 便利な日付計算関数 ---
  const getFutureDate = (days: number) => {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return date.toISOString().split('T')[0];
  };

  // データ取得
  const refreshData = async () => {
    try {
      const res = await fetch("http://localhost:3001/api/items");
      if (res.ok) setItems(await res.json());
    } catch (err) { console.error(err); }
  };

  useEffect(() => { refreshData(); }, [activeTab]);

  // 商品選択時にデフォルトの日付(1週間後)をセット
  useEffect(() => {
    if (selectedProduct) {
      setExpiryDate(getFutureDate(7));
    }
  }, [selectedProduct]);

  // 検索ロジック (Open Food Facts)
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
      
      if (!res.ok) {
        alert("商品が見つかりませんでした");
        return;
      }
      
      const results: ProductSearchResult[] = await res.json();
      
      // 重複排除
      const uniqueItems: ProductSearchResult[] = [];
      const seenCodes = new Set();
      const seenNames = new Set();

      results.forEach((item) => {
        if (item.code) {
          if (!seenCodes.has(item.code)) {
            seenCodes.add(item.code);
            uniqueItems.push(item);
          }
        } else {
          if (!seenNames.has(item.name)) {
             seenNames.add(item.name);
             uniqueItems.push(item);
          }
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

  // ★ 登録処理（選択された日付を使う）
  const registerItem = async () => {
    if (!selectedProduct) return;
    
    // 日付が空ならデフォルト7日後
    const finalDate = expiryDate || getFutureDate(7);
    
    await fetch("http://localhost:3001/api/items", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: selectedProduct.name, barcode: selectedProduct.code || "unknown",
        image: selectedProduct.image, expiry_date: finalDate
      }),
    });
    alert(`「${selectedProduct.name}」を追加しました！`);
    
    setCandidates([]);
    setSelectedProduct(null);
    setInputCode("");
    refreshData();
  };

  // ステータス更新
  const updateStatus = async (id: string, newStatus: string) => {
    if (newStatus === 'delete' && !confirm("完全に削除しますか？")) return;
    const method = newStatus === 'delete' ? 'DELETE' : 'PATCH';
    await fetch(`http://localhost:3001/api/items/${id}`, {
      method, headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    refreshData();
  };

  // ★ 日付更新機能（在庫リストから編集用）
  const updateExpiryDate = async (id: string, newDate: string) => {
    if (!newDate) return;
    try {
      await fetch(`http://localhost:3001/api/items/${id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ expiry_date: newDate }),
      });
      refreshData();
    } catch (e) { console.error(e); }
  };

  const displayItems = useMemo(() => {
    let filtered = items;
    if (inventorySearch) {
      filtered = items.filter(item => item.name.toLowerCase().includes(inventorySearch.toLowerCase()));
    }
    return filtered.sort((a, b) => {
      if (a.status === 'active' && b.status !== 'active') return -1;
      if (a.status !== 'active' && b.status === 'active') return 1;
      if (a.status === 'active') return new Date(a.expiry_date).getTime() - new Date(b.expiry_date).getTime();
      return 0;
    });
  }, [inventorySearch, items]);

  const stats = useMemo(() => {
    const total = items.length || 1; 
    const active = items.filter(i => i.status === 'active').length;
    const consumed = items.filter(i => i.status === 'consumed').length;
    const discarded = items.filter(i => i.status === 'discarded').length;
    return {
      active: (active / total) * 100, consumed: (consumed / total) * 100, discarded: (discarded / total) * 100,
      counts: { active, consumed, discarded }
    };
  }, [items]);

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
          
          {/* 検索フォーム */}
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

          {/* 候補リスト */}
          {candidates.length > 0 && !selectedProduct && (
            <div className="w-full max-w-md animate-slide-up">
              <h2 className="text-lg font-bold text-gray-700 mb-3 ml-2">検索結果 ({candidates.length}件)</h2>
              <div className="space-y-3">
                {currentCandidates.map((cand, idx) => (
                  <div 
                    key={idx} 
                    onClick={() => setSelectedProduct(cand)}
                    className="bg-white p-3 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4 cursor-pointer hover:bg-blue-50 transition-colors"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={cand.image} className="w-16 h-16 object-contain bg-white rounded" alt={cand.name}/>
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

          {/* ★ 選択後の期限設定エリア ★ */}
          {selectedProduct && (
            <div className="w-full max-w-md bg-white p-6 rounded-2xl shadow-lg border-2 border-blue-100 animate-slide-up relative">
              <button onClick={() => setSelectedProduct(null)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">✕ 戻る</button>
              
              <div className="text-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={selectedProduct.image} className="w-32 h-32 object-contain mx-auto mb-4" alt={selectedProduct.name}/>
                <h3 className="font-bold text-gray-800 mb-6">{selectedProduct.name}</h3>
                
                {/* 期限設定UI */}
                <div className="mb-6">
                  <p className="text-sm font-bold text-gray-500 mb-2 text-left">賞味期限を決める (任意)</p>
                  
                  {/* ショートカットボタン */}
                  <div className="grid grid-cols-4 gap-2 mb-3">
                    <button onClick={() => setExpiryDate(getFutureDate(1))} className="px-1 py-2 bg-gray-100 rounded text-xs font-bold hover:bg-blue-100 text-gray-600">明日</button>
                    <button onClick={() => setExpiryDate(getFutureDate(3))} className="px-1 py-2 bg-gray-100 rounded text-xs font-bold hover:bg-blue-100 text-gray-600">3日後</button>
                    <button onClick={() => setExpiryDate(getFutureDate(7))} className="px-1 py-2 bg-gray-100 rounded text-xs font-bold hover:bg-blue-100 text-gray-600">1週間</button>
                    <button onClick={() => setExpiryDate(getFutureDate(30))} className="px-1 py-2 bg-gray-100 rounded text-xs font-bold hover:bg-blue-100 text-gray-600">1ヶ月</button>
                  </div>
                  
                  {/* カレンダー入力 */}
                  <div className="flex items-center gap-2 bg-gray-50 p-2 rounded-lg border">
                    <span className="text-xl">📅</span>
                    <input 
                      type="date" 
                      value={expiryDate} 
                      onChange={(e) => setExpiryDate(e.target.value)}
                      className="bg-transparent flex-1 outline-none text-gray-700 font-bold"
                    />
                  </div>
                </div>

                <button onClick={registerItem} className="w-full bg-green-500 text-white py-3 rounded-xl font-bold shadow-md hover:bg-green-600">
                  完了 (在庫に追加)
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: 在庫 */}
      {activeTab === 'inventory' && (
        <div className="p-4 flex flex-col items-center animate-fade-in">
          <h1 className="text-2xl font-bold mb-4 text-gray-800">📦 在庫と履歴</h1>
          <div className="w-full max-w-md sticky top-0 z-10 bg-gray-50 pb-4">
             <input type="text" value={inventorySearch} onChange={(e) => setInventorySearch(e.target.value)} placeholder="検索..." className="w-full p-3 border rounded-xl shadow-sm" />
          </div>
          <div className="w-full max-w-md space-y-3">
            {displayItems.map((item) => {
              const isExpired = item.status === 'active' && new Date(item.expiry_date) < new Date();
              
              let cardClass = "bg-white border-gray-200";
              let textClass = "text-gray-800";
              let badgeClass = "hidden";
              let statusText = "";

              if (item.status === 'consumed') {
                cardClass = "bg-green-50 border-green-200 opacity-80";
                badgeClass = "bg-green-100 text-green-800";
                statusText = "😋 完食";
              } else if (item.status === 'discarded') {
                cardClass = "bg-red-50 border-red-200 opacity-80";
                badgeClass = "bg-red-100 text-red-800";
                statusText = "😱 廃棄";
              }

              return (
                <div key={item.id} className={`${cardClass} p-4 rounded-xl shadow-sm border flex flex-col gap-3 transition-colors duration-300`}>
                  <div className="flex items-center gap-4">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={item.image_url || "https://placehold.co/80x80"} className="w-16 h-16 object-cover rounded-lg bg-white" alt={item.name}/>
                    <div className="flex-1 min-w-0">
                      <h3 className={`font-bold text-base truncate ${textClass}`}>{item.name}</h3>
                      <p className={`text-sm ${textClass} opacity-90 mt-1 flex items-center gap-1`}>
                        {item.status === 'active' ? (
                          <>
                            期限: 
                            {/* ★ 日付編集機能：クリックでカレンダーが開く */}
                            <input 
                              type="date" 
                              value={item.expiry_date} 
                              onChange={(e) => updateExpiryDate(item.id, e.target.value)}
                              className={`bg-transparent font-bold ml-1 cursor-pointer hover:bg-gray-100 rounded px-1 ${isExpired ? 'text-red-600' : ''}`}
                            />
                          </>
                        ) : <span className={`px-2 py-1 rounded text-xs font-bold ${badgeClass}`}>{statusText}</span>}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2 pt-2 border-t border-black/5">
                    {item.status === 'active' ? (
                      <>
                        <button onClick={() => updateStatus(item.id, 'consumed')} className="flex-1 bg-green-100 text-green-800 hover:bg-green-200 py-2 rounded-lg font-bold">😋 完食</button>
                        <button onClick={() => updateStatus(item.id, 'discarded')} className="flex-1 bg-red-100 text-red-800 hover:bg-red-200 py-2 rounded-lg font-bold">😱 廃棄</button>
                      </>
                    ) : (
                      <button onClick={() => updateStatus(item.id, 'active')} className="flex-1 bg-white border border-gray-300 text-gray-600 hover:bg-gray-50 py-2 rounded-lg font-bold">↩ 元に戻す</button>
                    )}
                    <button onClick={() => updateStatus(item.id, 'delete')} className="w-10 flex items-center justify-center text-gray-400 hover:text-red-500">🗑️</button>
                  </div>
                </div>
              );
            })}
            {displayItems.length === 0 && <div className="text-center py-10 text-gray-400">データなし</div>}
          </div>
        </div>
      )}

      {/* TAB 3: 分析 */}
      {activeTab === 'analysis' && (
        <div className="p-6 flex flex-col items-center animate-fade-in">
          <h1 className="text-2xl font-bold mb-8 text-gray-800">📊 傾向レポート</h1>
          <div className="w-full max-w-md bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <h2 className="text-gray-500 font-bold mb-6 text-center">アイテムの状態内訳</h2>
            <div className="w-full h-8 flex rounded-full overflow-hidden bg-gray-100 mb-6 shadow-inner">
              <div style={{ width: `${stats.active}%` }} className="bg-gray-300 h-full" />
              <div style={{ width: `${stats.consumed}%` }} className="bg-green-400 h-full" />
              <div style={{ width: `${stats.discarded}%` }} className="bg-red-400 h-full" />
            </div>
            <div className="space-y-4">
              <div className="flex justify-between items-center p-3 rounded-lg bg-gray-50"><span className="flex items-center gap-2 font-bold text-gray-600"><span className="w-3 h-3 rounded-full bg-gray-300"></span>在庫中</span><span className="font-bold text-xl">{stats.counts.active}</span></div>
              <div className="flex justify-between items-center p-3 rounded-lg bg-green-50"><span className="flex items-center gap-2 font-bold text-green-800"><span className="w-3 h-3 rounded-full bg-green-400"></span>完食</span><span className="font-bold text-xl text-green-700">{stats.counts.consumed}</span></div>
              <div className="flex justify-between items-center p-3 rounded-lg bg-red-50"><span className="flex items-center gap-2 font-bold text-red-800"><span className="w-3 h-3 rounded-full bg-red-400"></span>廃棄</span><span className="font-bold text-xl text-red-700">{stats.counts.discarded}</span></div>
            </div>
          </div>
        </div>
      )}

      {/* FOOTER */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex justify-around py-4 shadow z-50">
        <button onClick={() => setActiveTab('add')} className={`flex-1 flex flex-col items-center ${activeTab === 'add' ? 'text-blue-600' : 'text-gray-400'}`}><span className="text-2xl">🛍️</span><span className="text-[10px] font-bold">追加</span></button>
        <button onClick={() => setActiveTab('inventory')} className={`flex-1 flex flex-col items-center ${activeTab === 'inventory' ? 'text-blue-600' : 'text-gray-400'}`}><span className="text-2xl">📦</span><span className="text-[10px] font-bold">在庫</span></button>
        <button onClick={() => setActiveTab('analysis')} className={`flex-1 flex flex-col items-center ${activeTab === 'analysis' ? 'text-blue-600' : 'text-gray-400'}`}><span className="text-2xl">📊</span><span className="text-[10px] font-bold">分析</span></button>
      </div>
    </main>
  );
}