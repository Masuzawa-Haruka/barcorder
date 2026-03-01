import { login, signup } from './actions';

export default async function LoginPage({
    searchParams,
}: {
    searchParams: { error?: string, info?: string };
}) {
    const error = searchParams?.error;
    const info = searchParams?.info;

    return (
        <main className="flex min-h-screen bg-gray-50 flex-col pt-16 pb-24">
            {/* 簡易ヘッダー */}
            <header className="w-full shadow-md flex items-center px-4 py-2 sticky top-0 z-30 bg-white">
                {/* Next.jsのImageがまだ適用されない環境もあるため最低限のimgタグで代用 */}
                <img
                    src="/icon.png"
                    alt="Scan & Track Logo"
                    width={48}
                    height={48}
                    className="w-auto h-12 object-contain"
                />
            </header>

            <div className="flex-1 flex flex-col items-center justify-center p-4">
                <div className="w-full max-w-sm bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <h1 className="text-2xl font-bold mb-6 text-center text-gray-800">🔐 ログイン</h1>

                    {error && (
                        <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4 text-sm font-bold text-center border border-red-200">
                            {error}
                        </div>
                    )}

                    {info && (
                        <div className="bg-blue-50 text-blue-600 p-3 rounded-lg mb-4 text-sm font-bold text-center border border-blue-200">
                            {info}
                        </div>
                    )}

                    <form className="flex flex-col gap-4">
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1" htmlFor="email">
                                メールアドレス
                            </label>
                            <input
                                id="email"
                                name="email"
                                type="email"
                                required
                                className="w-full p-3 border rounded-xl"
                                placeholder="you@example.com"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1" htmlFor="password">
                                パスワード
                            </label>
                            <input
                                id="password"
                                name="password"
                                type="password"
                                required
                                className="w-full p-3 border rounded-xl"
                                placeholder="••••••••"
                            />
                        </div>

                        <div className="flex gap-3 mt-4">
                            <button
                                formAction={login}
                                className="flex-1 bg-blue-600 text-white p-3 rounded-xl font-bold shadow-md hover:bg-blue-700 transition-colors"
                            >
                                ログイン
                            </button>
                            <button
                                formAction={signup}
                                className="flex-1 bg-white text-blue-600 border-2 border-blue-600 p-3 rounded-xl font-bold shadow-sm hover:bg-blue-50 transition-colors"
                            >
                                新規登録
                            </button>
                        </div>
                    </form>

                    <p className="mt-6 text-xs text-gray-500 text-center font-bold">
                        ※新規登録時は確認メールが送信される場合があります。(SupabaseのEmail Auth設定に依存)
                    </p>
                </div>
            </div>
        </main>
    );
}
