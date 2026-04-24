"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import Image from "next/image";
import { AddTab } from "@/components/tabs/AddTab";
import { InventoryTab } from "@/components/tabs/InventoryTab";
import { HistoryTab } from "@/components/tabs/HistoryTab";
import { BottomNav } from "@/components/BottomNav";
import { useInventoryData } from "@/hooks/useInventoryData";
import { useProductSearch } from "@/hooks/useProductSearch";
import { InventoryItem } from "@/types";
import { parseLocalDate } from "@/utils/dateUtils";

type Tab = 'add' | 'inventory' | 'history';

type InventoryItemWithParsedDates = InventoryItem & { _expiryTime: number; _createdTime: number };

export default function Home() {
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

  const {
    items, memberships, currentRefrigeratorId, setCurrentRefrigeratorId,
    dashboardError, newRefName, setNewRefName,
    refreshData, createRefrigerator, updateStatus, updateExpiryDate, registerItem,
  } = useInventoryData(API_URL);

  const {
    candidates, selectedProduct, setSelectedProduct,
    loading, currentPage, setCurrentPage, currentCandidates, totalPages,
    searchProduct, handleImageUpload, reset: resetSearch,
  } = useProductSearch(API_URL);

  const [activeTab, setActiveTab] = useState<Tab>('add');
  const [inputCode, setInputCode] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [showExpiryPicker, setShowExpiryPicker] = useState(false);
  const [isScanning, setIsScanning] = useState(false);

  const [inventorySearch, setInventorySearch] = useState("");
  const [filterOption, setFilterOption] = useState<'all' | 'expired' | 'unexpired'>('all');
  const [sortOption, setSortOption] = useState<'expiry_asc' | 'created_desc' | 'created_asc' | 'name_asc'>('expiry_asc');
  const [dateRangeStart, setDateRangeStart] = useState("");
  const [dateRangeEnd, setDateRangeEnd] = useState("");
  const [showDatePicker, setShowDatePicker] = useState(false);

  const [historySearch, setHistorySearch] = useState("");
  const [historyFilter, setHistoryFilter] = useState<'all' | 'consumed' | 'discarded'>('all');

  const getFutureDate = useCallback((days: number) => {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return date.toISOString().split('T')[0];
  }, []);

  useEffect(() => { refreshData(); }, [refreshData]);

  const handleSelectProduct = useCallback((product: typeof selectedProduct) => {
    setSelectedProduct(product);
    if (product) setExpiryDate(getFutureDate(7));
  }, [setSelectedProduct, getFutureDate]);

  const displayItems = useMemo<InventoryItemWithParsedDates[]>(() => {
    let filtered = items
      .filter(item => item.status === 'active')
      .map(item => ({
        ...item,
        _expiryTime: parseLocalDate(item.expiry_date).getTime(),
        _createdTime: new Date(item.created_at).getTime(),
      }));

    const todayTime = new Date().setHours(0, 0, 0, 0);

    if (inventorySearch) {
      filtered = filtered.filter(item => item.name.toLowerCase().includes(inventorySearch.toLowerCase()));
    }

    if (dateRangeStart || dateRangeEnd) {
      let start: Date | null = null;
      let end: Date | null = null;
      if (dateRangeStart) { start = new Date(dateRangeStart); if (isNaN(start.getTime())) start = null; else start.setHours(0, 0, 0, 0); }
      if (dateRangeEnd) { end = new Date(dateRangeEnd); if (isNaN(end.getTime())) end = null; else end.setHours(23, 59, 59, 999); }
      if (!(start && end && start > end)) {
        filtered = filtered.filter(item => {
          if (isNaN(item._expiryTime)) return false;
          if (start && item._expiryTime < start.getTime()) return false;
          if (end && item._expiryTime > end.getTime()) return false;
          return true;
        });
      }
    }

    if (filterOption === 'expired') filtered = filtered.filter(item => !isNaN(item._expiryTime) && item._expiryTime < todayTime);
    else if (filterOption === 'unexpired') filtered = filtered.filter(item => !isNaN(item._expiryTime) && item._expiryTime >= todayTime);

    return filtered.sort((a, b) => {
      if (sortOption === 'expiry_asc') return (isNaN(a._expiryTime) ? Infinity : a._expiryTime) - (isNaN(b._expiryTime) ? Infinity : b._expiryTime);
      if (sortOption === 'created_desc') return (isNaN(b._createdTime) ? -Infinity : b._createdTime) - (isNaN(a._createdTime) ? -Infinity : a._createdTime);
      if (sortOption === 'created_asc') return (isNaN(a._createdTime) ? Infinity : a._createdTime) - (isNaN(b._createdTime) ? Infinity : b._createdTime);
      if (sortOption === 'name_asc') return a.name.localeCompare(b.name, 'ja');
      return 0;
    });
  }, [items, inventorySearch, dateRangeStart, dateRangeEnd, filterOption, sortOption]);

  const historyItems = useMemo(() => {
    let filtered = items.filter(item => item.status === 'consumed' || item.status === 'discarded');
    if (historyFilter !== 'all') filtered = filtered.filter(item => item.status === historyFilter);
    if (historySearch) filtered = filtered.filter(item => item.name.toLowerCase().includes(historySearch.toLowerCase()));
    return filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [items, historyFilter, historySearch]);

  const handleRegister = useCallback(() => {
    if (!selectedProduct) return;
    registerItem(selectedProduct, expiryDate || getFutureDate(7), currentRefrigeratorId, () => {
      resetSearch();
      setInputCode("");
      setExpiryDate("");
    });
  }, [selectedProduct, expiryDate, currentRefrigeratorId, registerItem, resetSearch, getFutureDate]);

  return (
    <>
      <header className="w-full bg-white flex items-center px-4 py-2 fixed top-0 z-30 border-b border-gray-200">
        <Image src="/icon.png" alt="BarCorder" width={40} height={40} className="w-auto h-10 object-contain" priority />
        <span className="ml-2 font-bold text-[#5B7A34] text-lg tracking-tight">BarCorder</span>
      </header>

      <main className="flex flex-col min-h-screen bg-[#F5F2EC] pt-14 pb-20">
        {memberships !== null && memberships.length > 0 && (
          <div className="w-full bg-blue-50 border-b border-blue-100 shadow-sm py-2 px-4 flex justify-center sticky top-14 z-40">
            <div className="relative max-w-sm w-full">
              <select
                value={currentRefrigeratorId}
                onChange={(e) => setCurrentRefrigeratorId(e.target.value)}
                className="w-full p-2.5 bg-white border border-gray-300 rounded-xl font-bold text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none cursor-pointer shadow-sm text-center"
                style={{ textAlignLast: 'center' }}
              >
                {memberships.filter(m => m?.refrigerators?.id).map(m => (
                  <option key={m.refrigerators.id} value={m.refrigerators.id}>{m.refrigerators.name}</option>
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

        <div id="reader-hidden" className="hidden" />

        {dashboardError !== null ? (
          <div className="p-6 flex flex-col items-center flex-1 w-full justify-center text-center">
            <p className="text-red-500 font-bold mb-4">⚠️ {dashboardError}</p>
            <button onClick={refreshData} className="px-6 py-3 bg-blue-100 text-blue-700 rounded-xl font-bold hover:bg-blue-200 transition-colors">再読み込み</button>
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
              <input type="text" value={newRefName} onChange={(e) => setNewRefName(e.target.value)} placeholder="冷蔵庫の名前 (例: 自宅の冷蔵庫)" className="w-full p-3 border rounded-xl mb-4" />
              <button onClick={createRefrigerator} className="w-full bg-blue-600 text-white p-3 rounded-xl font-bold shadow-md hover:bg-blue-700">作成する</button>
            </div>
          </div>
        ) : (
          <>
            {activeTab === 'add' && (
              <AddTab
                inputCode={inputCode} setInputCode={setInputCode}
                loading={loading} isScanning={isScanning} setIsScanning={setIsScanning}
                candidates={candidates} selectedProduct={selectedProduct} setSelectedProduct={handleSelectProduct}
                currentCandidates={currentCandidates} totalPages={totalPages}
                currentPage={currentPage} setCurrentPage={setCurrentPage}
                expiryDate={expiryDate} setExpiryDate={setExpiryDate}
                showExpiryPicker={showExpiryPicker} setShowExpiryPicker={setShowExpiryPicker}
                getFutureDate={getFutureDate}
                onSearch={(q) => searchProduct(q ?? inputCode, q ? setInputCode : undefined)}
                onImageUpload={(e) => handleImageUpload(e, (code) => searchProduct(code, setInputCode))}
                onScanSuccess={(result) => { setIsScanning(false); setTimeout(() => searchProduct(result, setInputCode), 300); }}
                onRegister={handleRegister}
              />
            )}
            {activeTab === 'inventory' && (
              <InventoryTab
                displayItems={displayItems}
                inventorySearch={inventorySearch} setInventorySearch={setInventorySearch}
                filterOption={filterOption} setFilterOption={setFilterOption}
                sortOption={sortOption} setSortOption={setSortOption}
                dateRangeStart={dateRangeStart} dateRangeEnd={dateRangeEnd}
                setDateRangeStart={setDateRangeStart} setDateRangeEnd={setDateRangeEnd}
                showDatePicker={showDatePicker} setShowDatePicker={setShowDatePicker}
                updateStatus={updateStatus} updateExpiryDate={updateExpiryDate}
              />
            )}
            {activeTab === 'history' && (
              <HistoryTab
                historyItems={historyItems}
                historySearch={historySearch} setHistorySearch={setHistorySearch}
                historyFilter={historyFilter} setHistoryFilter={setHistoryFilter}
                updateStatus={updateStatus}
              />
            )}
            <BottomNav activeTab={activeTab} setActiveTab={setActiveTab} />
          </>
        )}
      </main>
    </>
  );
}
