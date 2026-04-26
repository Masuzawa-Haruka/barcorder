"use client";

type Tab = 'add' | 'inventory' | 'history';

type Props = {
  activeTab: Tab;
  setActiveTab: (tab: Tab) => void;
};

export const BottomNav = ({ activeTab, setActiveTab }: Props) => (
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
    <button
      onClick={() => setActiveTab('history')}
      className={`flex-1 flex flex-col items-center py-1 transition-colors ${activeTab === 'history' ? 'text-[#5B7A34]' : 'text-gray-400'}`}
    >
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <span className="text-[10px] font-bold mt-0.5">履歴</span>
    </button>
  </div>
);
