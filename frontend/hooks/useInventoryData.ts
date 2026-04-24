"use client";

import { useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { InventoryItem } from "@/types";
import { DashboardMembership } from "@/types/dashboard";

export const useInventoryData = (API_URL: string) => {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [items, setItems] = useState<InventoryItem[]>([]);
  const [memberships, setMemberships] = useState<DashboardMembership[] | null>(null);
  const [currentRefrigeratorId, setCurrentRefrigeratorId] = useState("");
  const [dashboardError, setDashboardError] = useState<string | null>(null);
  const [newRefName, setNewRefName] = useState("");

  const getAuthHeader = useCallback(async (): Promise<Record<string, string> | null> => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      alert("セッションの有効期限が切れました。再度ログインしてください。");
      router.push("/login");
      return null;
    }
    return { Authorization: `Bearer ${session.access_token}` };
  }, [supabase, router]);

  const refreshData = useCallback(async () => {
    try {
      setDashboardError(null);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { alert("ログインが必要です。"); router.push("/login"); return; }

      const authHeader = { Authorization: `Bearer ${session.access_token}` };
      const dashRes = await fetch(`${API_URL}/api/dashboard`, { headers: authHeader });

      if (!dashRes.ok) {
        if (dashRes.status === 401) { alert("セッションの有効期限が切れました。再度ログインしてください。"); router.push("/login"); }
        else setDashboardError("サーバーからデータを取得できませんでした。");
        return;
      }

      const dashData: DashboardMembership[] = await dashRes.json();
      setMemberships(dashData);

      let targetRefId = currentRefrigeratorId;
      if (!targetRefId && Array.isArray(dashData) && dashData.length > 0) {
        const first = dashData.find(m => m?.refrigerators?.id);
        if (first) { targetRefId = first.refrigerators.id; setCurrentRefrigeratorId(targetRefId); }
      }

      if (targetRefId) {
        const itemsRes = await fetch(`${API_URL}/api/items?refrigerator_id=${encodeURIComponent(targetRefId)}`, { headers: authHeader });
        if (!itemsRes.ok) {
          if (itemsRes.status === 401) { alert("セッションの有効期限が切れました。再度ログインしてください。"); router.push("/login"); }
          else { setItems([]); setDashboardError("在庫データを取得できませんでした。"); }
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

  const createRefrigerator = useCallback(async () => {
    if (!newRefName) return;
    const authHeader = await getAuthHeader();
    if (!authHeader) return;
    try {
      const res = await fetch(`${API_URL}/api/refrigerators`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeader },
        body: JSON.stringify({ name: newRefName }),
      });
      if (!res.ok) {
        let errMsg = "作成に失敗しました";
        try { const d = await res.json(); if (d?.error) errMsg = `以下の理由で作成に失敗しました:\n${d.error}`; } catch { /* noop */ }
        alert(errMsg);
        return;
      }
      setNewRefName("");
      refreshData();
    } catch (e) { console.error(e); alert("通信エラーが発生しました。"); }
  }, [API_URL, newRefName, getAuthHeader, refreshData]);

  const updateStatus = useCallback(async (id: string, newStatus: string) => {
    if (newStatus === 'delete' && !confirm("完全に削除しますか?")) return;
    const authHeader = await getAuthHeader();
    if (!authHeader) return;
    try {
      const method = newStatus === 'delete' ? 'DELETE' : 'PATCH';
      const res = await fetch(`${API_URL}/api/items/${id}`, {
        method, headers: { "Content-Type": "application/json", ...authHeader },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) { alert("更新に失敗しました。もう一度お試しください。"); return; }
      refreshData();
    } catch (e) { console.error(e); alert("ネットワークエラーが発生しました。"); }
  }, [API_URL, getAuthHeader, refreshData]);

  const updateExpiryDate = useCallback(async (id: string, newDate: string) => {
    if (!newDate) return;
    const authHeader = await getAuthHeader();
    if (!authHeader) return;
    try {
      const res = await fetch(`${API_URL}/api/items/${id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json", ...authHeader },
        body: JSON.stringify({ expiry_date: newDate }),
      });
      if (!res.ok) { alert("期限の更新に失敗しました。"); return; }
      refreshData();
    } catch (e) { console.error(e); alert("ネットワークエラーが発生しました。"); }
  }, [API_URL, getAuthHeader, refreshData]);

  const registerItem = useCallback(async (
    product: { name: string; code?: string; image: string; categories?: string },
    expiryDate: string,
    refrigeratorId: string,
    onSuccess: () => void,
  ) => {
    if (!refrigeratorId) { alert("冷蔵庫が選択されていません。先に冷蔵庫を作成・選択してください。"); return; }
    const authHeader = await getAuthHeader();
    if (!authHeader) return;
    try {
      const res = await fetch(`${API_URL}/api/items`, {
        method: "POST", headers: { "Content-Type": "application/json", ...authHeader },
        body: JSON.stringify({
          refrigerator_id: refrigeratorId,
          name: product.name,
          barcode: product.code || `custom-${Date.now()}`,
          image: product.image,
          expiry_date: expiryDate,
          category: product.categories || '未分類',
        }),
      });
      if (!res.ok) {
        let errorMsg = "もう一度お試しください。";
        try {
          const text = await res.text();
          const trimmed = text.trim();
          if (trimmed && !trimmed.toLowerCase().startsWith("<!doctype") && !trimmed.toLowerCase().startsWith("<html")) {
            const d = JSON.parse(trimmed) as { error?: string };
            if (d?.error) errorMsg = `原因: ${d.error}`;
          }
        } catch (e) { if (!(e instanceof SyntaxError)) errorMsg = "サーバーのエラーレスポンス処理中にエラーが発生しました。"; }
        alert(`登録に失敗しました。\n${errorMsg}`);
        return;
      }
      alert(`「${product.name}」を追加しました！`);
      onSuccess();
      refreshData();
    } catch (e) { console.error(e); alert("ネットワークエラーが発生しました。"); }
  }, [API_URL, getAuthHeader, refreshData]);

  return {
    items, memberships, currentRefrigeratorId, setCurrentRefrigeratorId,
    dashboardError, newRefName, setNewRefName,
    refreshData, createRefrigerator, updateStatus, updateExpiryDate, registerItem,
  };
};
