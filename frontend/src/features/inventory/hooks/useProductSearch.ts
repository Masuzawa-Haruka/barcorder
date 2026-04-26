"use client";

import { useState, useMemo, useCallback } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { ProductSearchResult } from "@/types";

export const useProductSearch = (API_URL: string) => {
  const [candidates, setCandidates] = useState<ProductSearchResult[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<ProductSearchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const searchProduct = useCallback(async (query: string, setInputCode?: (v: string) => void) => {
    if (!query) return;
    setLoading(true);
    setCandidates([]);
    setSelectedProduct(null);
    setCurrentPage(1);
    if (setInputCode) setInputCode(query);

    try {
      const res = await fetch(`${API_URL}/api/product?code=${encodeURIComponent(query)}`);
      if (!res.ok) { alert("商品が見つかりませんでした"); return; }

      const results: ProductSearchResult[] = await res.json();
      const uniqueItems: ProductSearchResult[] = [];
      const seenCodes = new Set<string>();
      const seenNames = new Set<string>();

      results.forEach((item) => {
        if (item.code) {
          if (!seenCodes.has(item.code)) { seenCodes.add(item.code); uniqueItems.push(item); }
        } else {
          if (!seenNames.has(item.name)) { seenNames.add(item.name); uniqueItems.push(item); }
        }
      });

      if (uniqueItems.length === 0) alert("商品が見つかりませんでした");
      else setCandidates(uniqueItems);
    } catch (e) {
      console.error(e);
      alert("検索エラーが発生しました");
    } finally {
      setLoading(false);
    }
  }, [API_URL]);

  const handleImageUpload = useCallback(async (
    e: React.ChangeEvent<HTMLInputElement>,
    onResult: (code: string) => void,
  ) => {
    if (!e.target.files?.length) return;
    setLoading(true);
    try {
      const html5QrCode = new Html5Qrcode("reader-hidden");
      const result = await html5QrCode.scanFileV2(e.target.files[0], true);
      if (result?.decodedText) onResult(result.decodedText);
      else alert("バーコードを検出できませんでした");
    } catch { alert("読み取り失敗"); }
    finally { setLoading(false); e.target.value = ""; }
  }, []);

  const currentCandidates = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return candidates.slice(start, start + itemsPerPage);
  }, [candidates, currentPage]);

  const totalPages = Math.ceil(candidates.length / itemsPerPage);

  const reset = useCallback(() => {
    setCandidates([]);
    setSelectedProduct(null);
    setCurrentPage(1);
  }, []);

  return {
    candidates, selectedProduct, setSelectedProduct,
    loading, currentPage, setCurrentPage, currentCandidates, totalPages,
    searchProduct, handleImageUpload, reset,
  };
};
