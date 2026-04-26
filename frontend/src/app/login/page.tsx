import Link from 'next/link';
import Image from 'next/image';
import { login, signup } from './actions';

export default async function LoginPage({
    searchParams,
}: {
    searchParams: Promise<{ error?: string | string[]; info?: string | string[]; mode?: string }>;
}) {
    const params = await searchParams;

    const normalizeParam = (param: string | string[] | undefined): string | undefined =>
        Array.isArray(param) ? param[0] : param;

    const error = normalizeParam(params?.error);
    const info = normalizeParam(params?.info);
    const mode = params?.mode;

    return (
        <main className="flex min-h-screen bg-[#F5F2EC] flex-col items-center justify-center p-4">

            {/* 選択画面 */}
            {!mode && (
                <div className="w-full max-w-sm flex flex-col items-center gap-8 animate-fade-in">
                    <div className="flex flex-col items-center gap-3">
                        <Image src="/icon.png" alt="BarCorder" width={80} height={80} className="w-20 h-20 object-contain" />
                        <h1 className="text-2xl font-bold text-[#5B7A34]">BarCorder</h1>
                        <p className="text-sm text-gray-400">賞味期限をスキャンして管理</p>
                    </div>

                    <div className="w-full flex flex-col gap-3">
                        <Link
                            href="/login?mode=login"
                            className="w-full bg-[#5B7A34] text-white py-4 rounded-full font-bold text-center text-base shadow-sm"
                        >
                            ログイン
                        </Link>
                        <Link
                            href="/login?mode=signup"
                            className="w-full bg-white text-[#5B7A34] border-2 border-[#5B7A34] py-4 rounded-full font-bold text-center text-base"
                        >
                            新規登録
                        </Link>
                    </div>
                </div>
            )}

            {/* ログインフォーム */}
            {mode === 'login' && (
                <div className="w-full max-w-sm animate-fade-in">
                    <Link href="/login" className="flex items-center gap-1 text-sm text-gray-400 font-bold mb-6">
                        ‹ 戻る
                    </Link>
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                        <h1 className="text-xl font-bold mb-6 text-gray-800">ログイン</h1>

                        {error && (
                            <div className="bg-red-50 text-red-500 p-3 rounded-xl mb-4 text-sm font-bold text-center border border-red-100">
                                {error}
                            </div>
                        )}
                        {info && (
                            <div className="bg-[#EEF3E6] text-[#5B7A34] p-3 rounded-xl mb-4 text-sm font-bold text-center border border-[#5B7A34]/20">
                                {info}
                            </div>
                        )}

                        <form className="flex flex-col gap-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-400 mb-1" htmlFor="email">
                                    メールアドレス
                                </label>
                                <input
                                    id="email"
                                    name="email"
                                    type="email"
                                    required
                                    className="w-full p-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#5B7A34]/30"
                                    placeholder="you@example.com"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-400 mb-1" htmlFor="password">
                                    パスワード
                                </label>
                                <input
                                    id="password"
                                    name="password"
                                    type="password"
                                    required
                                    className="w-full p-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#5B7A34]/30"
                                    placeholder="••••••••"
                                />
                            </div>

                            <button
                                formAction={login}
                                className="w-full bg-[#5B7A34] text-white py-3.5 rounded-full font-bold mt-2 shadow-sm"
                            >
                                ログインする
                            </button>
                        </form>

                        <p className="mt-4 text-xs text-gray-400 text-center">
                            アカウントをお持ちでない方は
                            <Link href="/login?mode=signup" className="text-[#5B7A34] font-bold ml-1">
                                新規登録
                            </Link>
                        </p>
                    </div>
                </div>
            )}

            {/* 新規登録フォーム */}
            {mode === 'signup' && (
                <div className="w-full max-w-sm animate-fade-in">
                    <Link href="/login" className="flex items-center gap-1 text-sm text-gray-400 font-bold mb-6">
                        ‹ 戻る
                    </Link>
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                        <h1 className="text-xl font-bold mb-6 text-gray-800">新規登録</h1>

                        {error && (
                            <div className="bg-red-50 text-red-500 p-3 rounded-xl mb-4 text-sm font-bold text-center border border-red-100">
                                {error}
                            </div>
                        )}
                        {info && (
                            <div className="bg-[#EEF3E6] text-[#5B7A34] p-3 rounded-xl mb-4 text-sm font-bold text-center border border-[#5B7A34]/20">
                                {info}
                            </div>
                        )}

                        <form className="flex flex-col gap-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-400 mb-1" htmlFor="email">
                                    メールアドレス
                                </label>
                                <input
                                    id="email"
                                    name="email"
                                    type="email"
                                    required
                                    className="w-full p-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#5B7A34]/30"
                                    placeholder="you@example.com"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-400 mb-1" htmlFor="password">
                                    パスワード
                                </label>
                                <input
                                    id="password"
                                    name="password"
                                    type="password"
                                    required
                                    minLength={6}
                                    className="w-full p-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#5B7A34]/30"
                                    placeholder="••••••••"
                                />
                                <p className="mt-1 text-xs text-gray-300">6文字以上で入力してください</p>
                            </div>

                            <button
                                formAction={signup}
                                className="w-full bg-[#5B7A34] text-white py-3.5 rounded-full font-bold mt-2 shadow-sm"
                            >
                                登録する
                            </button>
                        </form>

                        <p className="mt-4 text-xs text-gray-400 text-center">
                            すでにアカウントをお持ちの方は
                            <Link href="/login?mode=login" className="text-[#5B7A34] font-bold ml-1">
                                ログイン
                            </Link>
                        </p>
                        <p className="mt-3 text-xs text-gray-300 text-center">
                            ※登録後に確認メールが送られる場合があります
                        </p>
                    </div>
                </div>
            )}
        </main>
    );
}
