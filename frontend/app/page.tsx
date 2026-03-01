
"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { ProductSearchResult, InventoryItem } from "@/types";
import { Html5Qrcode } from "html5-qrcode";
import { BarcodeScanner } from "@/components/BarcodeScanner";
import { DateRangePicker } from "@/components/DateRangePicker";
import { DrumRollDatePicker } from "@/components/DrumRollDatePicker";
import { parseLocalDate, formatDateForDisplay, getLocalDateString } from "@/utils/dateUtils";
import Image from 'next/image';
import { useRouter } from "next/navigation";
import { createClient } from '@/utils/supabase/client';

type InventoryItemWithParsedDates = InventoryItem & {
  _expiryTime: number;
  _createdTime: number;
};

type DashboardRefrigeratorSummary = {
  id: string;
  name: string;
};

type DashboardMembership = {
  role: string;
  refrigerators: DashboardRefrigeratorSummary;
};

export default function Home() {
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
  const router = useRouter();
  const [dashboardError, setDashboardError] = useState<string | null>(null);

  const supabase = useMemo(() => createClient(), []);
  const [memberships, setMemberships] = useState<DashboardMembership[] | null>(null);
  const [currentRefrigeratorId, setCurrentRefrigeratorId] = useState<string>("");
  const [newRefName, setNewRefName] = useState("");

  const [activeTab, setActiveTab] = useState<'add' | 'inventory'>('add');
  const [items, setItems] = useState<InventoryItem[]>([]);

  const [inputCode, setInputCode] = useState("");
  const [inventorySearch, setInventorySearch] = useState("");

  const [dateRangeStart, setDateRangeStart] = useState<string>("");
  const [dateRangeEnd, setDateRangeEnd] = useState<string>("");
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showExpiryPicker, setShowExpiryPicker] = useState(false);

  // Filter & Sort State
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
      setDashboardError(null);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        alert("ログインが必要です。");
        router.push("/login");
        return;
      }

      const authHeader = { Authorization: `Bearer ${session.access_token}` };

      // ダッシュボード（冷蔵庫一覧）の取得
      const dashRes = await fetch(`${API_URL}/api/dashboard`, { headers: authHeader });

      if (!dashRes.ok) {
        if (dashRes.status === 401) {
          alert("セッションの有効期限が切れました。再度ログインしてください。");
          router.push("/login");
        } else {
          setDashboardError("サーバーからデータを取得できませんでした。");
        }
        return;
      }

      const dashData = await dashRes.json();
      setMemberships(dashData);

      let targetRefId = currentRefrigeratorId;
      if (!targetRefId && dashData.length > 0) {
        targetRefId = dashData[0].refrigerators.id;
        setCurrentRefrigeratorId(targetRefId);
      }

      // 選択中の冷蔵庫があれば在庫を取得
      if (targetRefId) {
        const encodedRefId = encodeURIComponent(targetRefId);
        const itemsRes = await fetch(`${API_URL}/api/items?refrigerator_id=${encodedRefId}`, { headers: authHeader });
        if (!itemsRes.ok) {
          if (itemsRes.status === 401) {
            alert("セッションの有効期限が切れました。再度ログインしてください。");
            router.push("/login");
          } else {
            setItems([]);
            setDashboardError("在庫データを取得できませんでした。");
          }
          return;
        }
        setItems(await itemsRes.json());
      } else {
        setItems([]);
      }
    } catch (err) {
      console.error(err);
      setDashboardError("通信エラーが発生しました。ネットワークを確認してください。");
    }
  }, [API_URL, currentRefrigeratorId, supabase, router]);

  useEffect(() => { refreshData(); }, [activeTab, currentRefrigeratorId, refreshData]);

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

  const createRefrigerator = async () => {
    if (!newRefName) return;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        alert("セッションの有効期限が切れました。再度ログインしてください。");
        router.push("/login");
        return;
      }

      const authHeader: Record<string, string> = { Authorization: `Bearer ${session.access_token}` };

      const res = await fetch(`${API_URL}/api/refrigerators`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeader },
        body: JSON.stringify({ name: newRefName }),
      });

      if (!res.ok) {
        let errMsg = "作成に失敗しました";
        try {
          const errData = await res.json();
          if (errData && errData.error) {
            errMsg = `以下の理由で作成に失敗しました:\n${errData.error}`;
          }
        } catch (_) { }
        alert(errMsg);
        return;
      }

      setNewRefName("");
      refreshData();
    } catch (e) {
      console.error(e);
      alert("通信エラーが発生しました。");
    }
  };

  const registerItem = async () => {
    if (!selectedProduct) return;
    if (!currentRefrigeratorId) {
      alert("冷蔵庫が選択されていません。先に冷蔵庫を作成・選択してください。");
      return;
    }
    const finalDate = expiryDate || getFutureDate(7);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        alert("セッションの有効期限が切れました。再度ログインしてください。");
        router.push("/login");
        return;
      }
      const authHeader: Record<string, string> = { Authorization: `Bearer ${session.access_token}` };

      const res = await fetch(`${API_URL}/api/items`, {
        method: "POST", headers: { "Content-Type": "application/json", ...authHeader },
        body: JSON.stringify({
          refrigerator_id: currentRefrigeratorId,
          name: selectedProduct.name,
          barcode: selectedProduct.code || `custom-${Date.now()}`,
          image: selectedProduct.image,
          expiry_date: finalDate,
          category: selectedProduct.categories || '未分類'
        }),
      });

      if (!res.ok) {
        let errorMsg = "もう一度お試しください。";
        // レスポンス本文を外側の変数に保持して、catch内でも参照できるようにする
        let text = "";
        let trimmed = "";
        try {
          // res.json() と res.text() の2重読み取りを防ぐため、先にテキストとして取得する
          text = await res.text();
          trimmed = text.trim();

          if (trimmed) {
            // HTMLかどうか先に判定（大文字・小文字を無視して判定）
            if (
              trimmed.toLowerCase().startsWith("<!doctype") ||
              trimmed.toLowerCase().startsWith("<html")
            ) {
              errorMsg = "サーバーから予期しない形式のエラーレスポンス（HTML）が返されました。";
              console.error("Unexpected HTML error response:", text);
            } else {
              // HTMLでなければJSONとして解析を試みる
              const errData = JSON.parse(trimmed) as { error?: string };
              if (errData && errData.error) {
                errorMsg = `原因: ${errData.error}`;
                console.error("API Error Details:", errData.error);
              }
            }
          }
        } catch (e) {
          // JSONパースエラーなど、レスポンス形式に起因するエラーとその他を分類する
          if (e instanceof SyntaxError) {
            errorMsg = "サーバーから無効な形式のレスポンス（JSON解析に失敗）が返されました。";
            console.error("Failed to parse error response as JSON. Raw response text:", trimmed || text);
          } else {
            errorMsg = "サーバーのエラーレスポンス処理中に予期しないエラーが発生しました。詳細はコンソールをご確認ください。";
            console.error("Error processing error response:", e, "Raw response text:", trimmed || text);
          }
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
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        alert("セッションの有効期限が切れました。再度ログインしてください。");
        router.push("/login");
        return;
      }
      const authHeader: Record<string, string> = { Authorization: `Bearer ${session.access_token}` };

      const method = newStatus === 'delete' ? 'DELETE' : 'PATCH';
      const res = await fetch(`${API_URL}/api/items/${id}`, {
        method, headers: { "Content-Type": "application/json", ...authHeader },
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
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        alert("セッションの有効期限が切れました。再度ログインしてください。");
        router.push("/login");
        return;
      }
      const authHeader: Record<string, string> = { Authorization: `Bearer ${session.access_token}` };

      const res = await fetch(`${API_URL}/api/items/${id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json", ...authHeader },
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
    // 1. 日付のパース関連処理を一度だけ行い、パース済みのプロパティを付与する (Copilot 警告対応・計算量削減)
    let filtered: InventoryItemWithParsedDates[] = items
      .filter(item => item.status === 'active')
      .map(item => ({
        ...item,
        _expiryTime: parseLocalDate(item.expiry_date).getTime(),
        _createdTime: new Date(item.created_at).getTime()
      }));

    // 本日の0時を表すタイムスタンプ (全フィルター・ソートで共通利用)
    const todayTime = new Date().setHours(0, 0, 0, 0);

    const warnInvalidDate = (item: InventoryItemWithParsedDates, context: string) => {
      console.warn(`不正な有効期限のためアイテムを${context}から除外しました`, {
        id: item.id,
        expiry_date: item.expiry_date,
      });
    };

    if (inventorySearch) {
      filtered = filtered.filter(item => item.name.toLowerCase().includes(inventorySearch.toLowerCase()));
    }

    // 日付範囲でフィルタリング (片方のみの指定も許可)
    if (dateRangeStart || dateRangeEnd) {
      let start: Date | null = null;
      let end: Date | null = null;

      if (dateRangeStart) {
        start = new Date(dateRangeStart);
        if (isNaN(start.getTime())) start = null;
        else start.setHours(0, 0, 0, 0);
      }

      if (dateRangeEnd) {
        end = new Date(dateRangeEnd);
        if (isNaN(end.getTime())) end = null;
        else end.setHours(23, 59, 59, 999);
      }

      if (start && end && start > end) {
        // 開始日と終了日の大小関係チェック（開始日が終了日より後の場合はフィルタリングを行わない）
        console.warn("日付範囲が不正なためフィルタリングをスキップします", {
          start,
          end,
        });
      } else if (start || end) {
        filtered = filtered.filter(item => {
          if (isNaN(item._expiryTime)) {
            warnInvalidDate(item, "日付範囲検索");
            return false;
          }

          if (start && item._expiryTime < start.getTime()) return false;
          if (end && item._expiryTime > end.getTime()) return false;
          return true;
        });
      }
    }

    // 絞り込み (フィルター)
    if (filterOption === 'expired') {
      filtered = filtered.filter(item => {
        if (isNaN(item._expiryTime)) {
          warnInvalidDate(item, "期限切れフィルター");
          return false;
        }
        return item._expiryTime < todayTime;
      });
    } else if (filterOption === 'unexpired') {
      filtered = filtered.filter(item => {
        if (isNaN(item._expiryTime)) {
          warnInvalidDate(item, "期限内フィルター");
          return false;
        }
        return item._expiryTime >= todayTime;
      });
    }

    // 並べ替え (ソート)
    return filtered.sort((a, b) => {
      if (sortOption === 'expiry_asc') {
        const dateA = a._expiryTime;
        const dateB = b._expiryTime;
        const isInvalidA = isNaN(dateA);
        const isInvalidB = isNaN(dateB);
        if (isInvalidA && isInvalidB) return 0;
        if (isInvalidA) return 1; // 不正な日付は後ろへ
        if (isInvalidB) return -1;
        return dateA - dateB;
      } else if (sortOption === 'created_desc') {
        const timeA = a._createdTime;
        const timeB = b._createdTime;
        const isInvalidA = isNaN(timeA);
        const isInvalidB = isNaN(timeB);
        if (isInvalidA && isInvalidB) return 0;
        if (isInvalidA) return 1;
        if (isInvalidB) return -1;
        return timeB - timeA;
      } else if (sortOption === 'created_asc') {
        const timeA = a._createdTime;
        const timeB = b._createdTime;
        const isInvalidA = isNaN(timeA);
        const isInvalidB = isNaN(timeB);
        if (isInvalidA && isInvalidB) return 0;
        if (isInvalidA) return 1;
        if (isInvalidB) return -1;
        return timeA - timeB;
      } else if (sortOption === 'name_asc') {
        return a.name.localeCompare(b.name, 'ja');
      }
      return 0; // default (発生しないはず)
    });
  }, [inventorySearch, items, dateRangeStart, dateRangeEnd, filterOption, sortOption]);

  const currentCandidates = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return candidates.slice(start, start + itemsPerPage);
  }, [candidates, currentPage]);

  const totalPages = Math.ceil(candidates.length / itemsPerPage);

  return (
    <>
      <header className="fixed top-0 left-0 right-0 h-16 shadow-md flex items-center px-4 z-50 bg-white">
        <Image
          src="/icon.png"
          alt="Scan & Track Logo"
          width={48}
          height={48}
          className="w-auto h-12 object-contain"
          priority
        />
        <span className="font-bold text-gray-800 ml-3 text-lg hidden sm:block">SCAN & TRACK</span>
      </header>

      <main className="flex flex-col min-h-screen bg-gray-50 pt-16 pb-24">
        {/* 冷蔵庫選択用のバー */}
        {memberships !== null && memberships.length > 0 && (
          <div className="w-full bg-blue-50 border-b border-blue-100 shadow-sm py-2 px-4 flex justify-center sticky top-16 z-40">
            <div className="relative max-w-sm w-full">
              <select
                value={currentRefrigeratorId}
                onChange={(e) => setCurrentRefrigeratorId(e.target.value)}
                className="w-full p-2.5 bg-white border border-gray-300 rounded-xl font-bold text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none cursor-pointer shadow-sm text-center"
                style={{ textAlignLast: 'center' }}
              >
                {memberships.map(m => (
                  <option key={m.refrigerators.id} value={m.refrigerators.id}>
                    {m.refrigerators.name}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-400">
                <svg className="fill-current h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                  <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
                </svg>
              </div>
            </div>
          </div>
        )}

        <div id="reader-hidden" className="hidden"></div>

        {dashboardError !== null ? (
          <div className="p-6 flex flex-col items-center flex-1 w-full justify-center text-center">
            <p className="text-red-500 font-bold mb-4">⚠️ {dashboardError}</p>
            <button onClick={refreshData} className="px-6 py-3 bg-blue-100 text-blue-700 rounded-xl font-bold hover:bg-blue-200 transition-colors">
              再読み込み
            </button>
          </div>
        ) : memberships === null ? (
          <div className="p-6 flex flex-col items-center flex-1 w-full justify-center">
            <p className="text-gray-500 font-bold">データを読み込み中...</p>
          </div>
        ) : memberships.length === 0 ? (
          <div className="p-6 flex flex-col items-center flex-1 w-full justify-center">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 max-w-sm w-full text-center">
              <h2 className="text-xl font-bold mb-4 text-gray-800">始めましょう！</h2>
              <p className="text-sm text-gray-600 mb-6 font-bold">まずは、あなただけの冷蔵庫を作成してください。</p>
              <input
                type="text"
                value={newRefName}
                onChange={(e) => setNewRefName(e.target.value)}
                placeholder="冷蔵庫の名前 (例: 自宅の冷蔵庫)"
                className="w-full p-3 border rounded-xl mb-4"
              />
              <button
                onClick={createRefrigerator}
                className="w-full bg-blue-600 text-white p-3 rounded-xl font-bold shadow-md hover:bg-blue-700"
              >
                作成する
              </button>
            </div>
          </div>
        ) : (
          <>
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
                        <button
                          onClick={() => setShowExpiryPicker(true)}
                          aria-label="賞味期限を選択"
                          className="w-full flex items-center gap-2 bg-gray-50 p-3 rounded-lg border-2 border-gray-300 hover:border-blue-500 transition-colors"
                        >
                          <span className="text-xl">📅</span>
                          <span className="flex-1 text-left text-gray-700 font-bold">
                            {expiryDate ? formatDateForDisplay(expiryDate) : '日付を選択'}
                          </span>
                        </button>
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

                <div className="w-full max-w-md sticky top-0 z-10 bg-gray-50 pb-2 space-y-2">
                  {/* 検索エリア */}
                  <div className="grid grid-cols-2 gap-2">
                    {/* キーワード検索 */}
                    <input
                      type="text"
                      value={inventorySearch}
                      onChange={(e) => setInventorySearch(e.target.value)}
                      placeholder="キーワード検索..."
                      className="p-3 border rounded-xl shadow-sm"
                    />

                    {/* 日付範囲検索ボタン */}
                    <button
                      onClick={() => setShowDatePicker(true)}
                      className="p-3 border rounded-xl shadow-sm bg-white hover:bg-blue-50 font-bold text-gray-700 text-sm flex items-center justify-center gap-1"
                    >
                      📅 期限で検索
                      {(dateRangeStart || dateRangeEnd) && (
                        <span className="text-xs text-blue-600">●</span>
                      )}
                    </button>
                  </div>

                  {/* フィルター・ソートエリア */}
                  <div className="flex gap-2 mb-2">
                    <select
                      aria-label="在庫の絞り込み"
                      value={filterOption}
                      onChange={(e) => setFilterOption(e.target.value as 'all' | 'expired' | 'unexpired')}
                      className="flex-1 p-2 border rounded-xl shadow-sm bg-white text-sm text-gray-700 font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow"
                    >
                      <option value="all">すべて表示</option>
                      <option value="expired">期限切れのみ</option>
                      <option value="unexpired">期限内のみ</option>
                    </select>

                    <select
                      aria-label="在庫の並べ替え"
                      value={sortOption}
                      onChange={(e) => setSortOption(e.target.value as 'expiry_asc' | 'created_desc' | 'created_asc' | 'name_asc')}
                      className="flex-1 p-2 border rounded-xl shadow-sm bg-white text-sm text-gray-700 font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow"
                    >
                      <option value="expiry_asc">期限が近い順</option>
                      <option value="created_desc">登録が新しい順</option>
                      <option value="created_asc">登録が古い順</option>
                      <option value="name_asc">名前順 (あいうえお順)</option>
                    </select>
                  </div>

                  {/* 選択中の日付範囲を表示 */}
                  {(dateRangeStart || dateRangeEnd) && (
                    <div className="text-xs text-gray-600 bg-blue-50 p-2 rounded-lg flex items-center justify-between">
                      <span>
                        {dateRangeStart && !dateRangeEnd && `${formatDateForDisplay(dateRangeStart)} 以降`}
                        {!dateRangeStart && dateRangeEnd && `${formatDateForDisplay(dateRangeEnd)} 以前`}
                        {dateRangeStart && dateRangeEnd && `${formatDateForDisplay(dateRangeStart)} 〜 ${formatDateForDisplay(dateRangeEnd)}`}
                      </span>
                      <button
                        onClick={() => {
                          setDateRangeStart("");
                          setDateRangeEnd("");
                        }}
                        className="text-red-500 hover:text-red-700 font-bold"
                        aria-label="日付範囲フィルターを解除"
                      >
                        ✕
                      </button>
                    </div>
                  )}
                </div>

                <div className="w-full max-w-md space-y-3 mt-2">
                  {displayItems.map((item) => {
                    // NaNの場合は安全にfalseとして扱う
                    const todayTime = new Date().setHours(0, 0, 0, 0);
                    const isExpired = !isNaN(item._expiryTime) && item._expiryTime < todayTime;

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
          </>
        )}

        {/* FOOTER */}
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex justify-around py-4 shadow z-50">
          <button onClick={() => setActiveTab('add')} className={`flex-1 flex flex-col items-center ${activeTab === 'add' ? 'text-blue-600' : 'text-gray-400'}`}><span className="text-2xl">🛍️</span><span className="text-[10px] font-bold">追加</span></button>
          <button onClick={() => setActiveTab('inventory')} className={`flex-1 flex flex-col items-center ${activeTab === 'inventory' ? 'text-blue-600' : 'text-gray-400'}`}><span className="text-2xl">📦</span><span className="text-[10px] font-bold">在庫</span></button>
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
    </>
  );
}