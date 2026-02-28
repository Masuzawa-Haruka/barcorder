import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Vercel Cron Job用の設定（サーバーレス関数としてエッジまたはNodeで動く）
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    // 1. Cron Jobの認証（不正アクセスの防止）
    // Vercel Cronはリクエストヘッダーに `Authorization: Bearer <CRON_SECRET>` を付与する
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret) {
        if (process.env.NODE_ENV === 'development') {
            console.warn('[cron] CRON_SECRET が未設定ですが、NODE_ENV=development のため認証チェックをスキップします。');
        } else {
            return NextResponse.json(
                { error: 'CRON_SECRET が未設定のためバッチ処理を実行できません。' },
                { status: 500 }
            );
        }
    } else {
        if (authHeader !== `Bearer ${cronSecret}`) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
    }

    try {
        // 2. サービスロールキーを使用してSupabaseクライアントを初期化
        // ※RLSをバイパスして全ユーザーのデータ（明日期限切れ）を一度に取得するため
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

        if (!supabaseUrl || !supabaseServiceKey) {
            throw new Error('Supabaseの環境変数（SERVICE_ROLE_KEY）が設定されていません。バッチ処理を実行できません。');
        }

        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        // 3. 「明日」の日付範囲を計算 (0:00:00 〜 23:59:59) - JST(Asia/Tokyo, UTC+9) 基準
        // Vercel上の実行環境は基本UTCのため、そのまま new Date() を使うと「どのタイムゾーンの明日か」が曖昧になる。
        // ここではJSTを基準とするため、UTC現在時刻に+9時間してJSTに変換し、その上で「明日0:00〜23:59:59」を算出し、
        // 最後にUTCに戻してISO文字列（startISO/endISO）として扱う。
        const nowUtc = new Date();
        const jstOffsetMs = 9 * 60 * 60 * 1000; // Asia/Tokyo はUTC+9で夏時間なし
        const nowJst = new Date(nowUtc.getTime() + jstOffsetMs);

        const tomorrowJstBase = new Date(nowJst);
        tomorrowJstBase.setDate(tomorrowJstBase.getDate() + 1);

        const tomorrowStartJst = new Date(tomorrowJstBase);
        tomorrowStartJst.setHours(0, 0, 0, 0);

        const tomorrowEndJst = new Date(tomorrowJstBase);
        tomorrowEndJst.setHours(23, 59, 59, 999);

        const startISO = new Date(tomorrowStartJst.getTime() - jstOffsetMs).toISOString();
        const endISO = new Date(tomorrowEndJst.getTime() - jstOffsetMs).toISOString();

        // 4. 賞味期限が「明日」かつステータスが「active」のアイテムを抽出
        // 同時に、そのアイテムが属する冷蔵庫と、その冷蔵庫のメンバー（およびプロフィール）を取得する
        const { data: expiringItems, error } = await supabase
            .from('inventory_items')
            .select(`
        id,
        barcode,
        expiration_date,
        refrigerator_id,
        products_master (
          name,
          image_url
        ),
        refrigerators (
          name,
          refrigerator_members (
            user_id,
            profiles (
              display_name
            )
          )
        )
      `)
            .eq('status', 'active')
            .gte('expiration_date', startISO)
            .lte('expiration_date', endISO);

        if (error) {
            throw error;
        }

        if (!expiringItems || expiringItems.length === 0) {
            return NextResponse.json({ message: '明日期限切れのアイテムはありませんでした。' });
        }

        // 5. 送信先のユーザーごとに通知内容をグループ化する
        const notificationsByUser: Record<string, {
            displayName: string;
            items: {
                productName: string;
                refrigeratorName: string;
            }[];
        }> = {};

        type DbItem = {
            products_master: { name: string } | null;
            refrigerators: {
                name: string;
                refrigerator_members: { user_id: string; profiles: { display_name: string } | null }[]
            } | null;
        };

        (expiringItems as unknown as DbItem[]).forEach((item) => {
            const productName = item.products_master?.name || '不明な商品';
            const refrigeratorName = item.refrigerators?.name || '不明な冷蔵庫';
            const members = item.refrigerators?.refrigerator_members || [];

            members.forEach((member) => {
                const userId = member.user_id;
                const displayName = member.profiles?.display_name || 'ユーザー';

                if (!notificationsByUser[userId]) {
                    notificationsByUser[userId] = {
                        displayName,
                        items: []
                    };
                }

                notificationsByUser[userId].items.push({
                    productName,
                    refrigeratorName
                });
            });
        });

        // 6. ユーザーごとに非同期で通知（メール送信やPush通知等）を実行
        const sendPromises = Object.entries(notificationsByUser).map(async ([userId, data]) => {
            // NOTE: ここに実際のメール送信API（ResendやSendGridなど）を呼び出す処理を実装します。
            console.log(`[Mock Email] To UserID: ${userId} (${data.displayName} 様)`);
            console.log(`[Mock Email] Subject: 【リマインダー】明日賞味期限切れになる商品があります`);
            console.log(`[Mock Email] Body:`);
            data.items.forEach(i => {
                console.log(`  - ${i.productName} (場所: ${i.refrigeratorName})`);
            });
            console.log('--------------------------------------------------');

            return Promise.resolve();
        });

        await Promise.allSettled(sendPromises);

        return NextResponse.json({
            success: true,
            message: `${Object.keys(notificationsByUser).length}人のユーザーにリマインダーを送信しました。`
        });

    } catch (error: any) {
        console.error('Cron Job Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
