require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function testInsert() {
    console.log("Testing insert into refrigerators...");
    // サービスロールキーのような管理者権限（あるいは匿名を装って）テストする
    // 認証をバイパスするか、現在エラーが出ているポリシーを特定するために純粋なインサートを試行
    const { data, error } = await supabase
        .from('refrigerators')
        .insert([{ name: 'テスト用冷蔵庫' }])
        .select();

    if (error) {
        console.error("❌ refrigerators Table Error:", error);
    } else {
        console.log("✅ Success:", data);
    }
}

testInsert();
