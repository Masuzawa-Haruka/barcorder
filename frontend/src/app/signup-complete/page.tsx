import Link from 'next/link';
import Image from 'next/image';

export default function SignupCompletePage() {
    return (
        <main className="flex min-h-screen bg-[#F5F2EC] flex-col items-center justify-center p-4">
            <div className="w-full max-w-sm flex flex-col items-center gap-8 animate-fade-in">
                <div className="flex flex-col items-center gap-3">
                    <Image src="/icon.png" alt="BarCorder" width={80} height={80} className="w-20 h-20 object-contain" />
                    <h1 className="text-2xl font-bold text-[#5B7A34]">BarCorder</h1>
                </div>

                <div className="w-full bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center gap-4">
                    <div className="w-14 h-14 rounded-full bg-[#EEF3E6] flex items-center justify-center text-3xl">
                        ✓
                    </div>
                    <div className="text-center">
                        <h2 className="text-lg font-bold text-gray-800 mb-1">登録完了！</h2>
                        <p className="text-sm text-gray-400">アカウントが作成されました。<br />ログインして始めましょう。</p>
                    </div>
                    <Link
                        href="/login?mode=login"
                        className="w-full bg-[#5B7A34] text-white py-4 rounded-full font-bold text-center text-base shadow-sm"
                    >
                        ログインする
                    </Link>
                </div>
            </div>
        </main>
    );
}
