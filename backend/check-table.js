require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

(async () => {
    try {
        console.log('🔍 Supabase接続情報:');
        console.log('URL:', process.env.SUPABASE_URL);
        console.log('KEY:', process.env.SUPABASE_KEY ? '設定済み' : '未設定');
        console.log('');
        
        // 全件数を取得
        const { count, error: countError } = await supabase
            .from('items')
            .select('*', { count: 'exact', head: true });

        if (countError) {
            console.log('❌ 件数取得エラー:', countError.message);
        } else {
            console.log('📊 テーブル items の総件数:', count, '件');
        }
        console.log('');

        // テーブルの内容を確認
        const { data, error } = await supabase
            .from('items')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(10);

        if (error) {
            console.log('❌ エラー:', error.message);
            console.log('詳細:', error);
        } else {
            console.log('✅ 最新10件のデータ:');
            if (data.length === 0) {
                console.log('データがありません（テーブルは空です）');
            } else {
                data.forEach((item, index) => {
                    console.log(`\n[${index + 1}]`);
                    console.log('  ID:', item.id);
                    console.log('  商品名:', item.name);
                    console.log('  バーコード:', item.barcode);
                    console.log('  賞味期限:', item.expiry_date);
                    console.log('  ステータス:', item.status);
                    console.log('  登録日時:', item.created_at);
                });
            }

           // ステータス別の件数を取得
            const { count: activeCount } = await supabase
                .from('items')
                .select('*', { count: 'exact', head: true })
                .eq('status', 'active');

            const { count: consumedCount } = await supabase
                .from('items')
                .select('*', { count: 'exact', head: true })
                .eq('status', 'consumed');
            console.log('\n📈 ステータス別件数:');
            console.log('  active (在庫中):', activeCount || 0, '件');
            console.log('  consumed (消費済み):', consumedCount || 0, '件');
        }
    } catch (e) {
        console.log('⚠️ 予期しないエラー:', e.message);
        console.log(e);
    }
})();
