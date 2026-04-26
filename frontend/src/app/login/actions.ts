'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export async function login(formData: FormData) {
    const supabase = await createClient();

    const email = formData.get('email');
    const password = formData.get('password');

    if (typeof email !== 'string' || typeof password !== 'string' || !email || !password) {
        redirect(`/login?mode=login&error=${encodeURIComponent('入力値が不正です')}`);
    }

    const data = { email, password };

    const { error } = await supabase.auth.signInWithPassword(data);

    if (error) {
        redirect(`/login?mode=login&error=${encodeURIComponent('メールアドレス、またはパスワードが間違っています')}`);
    }

    revalidatePath('/', 'layout');
    redirect('/');
}

export async function signup(formData: FormData) {
    const supabase = await createClient();

    const email = formData.get('email');
    const password = formData.get('password');

    if (typeof email !== 'string' || typeof password !== 'string' || !email || !password) {
        redirect(`/login?mode=signup&error=${encodeURIComponent('入力値が不正です')}`);
    }

    if (password.length < 6) {
        redirect(`/login?mode=signup&error=${encodeURIComponent('パスワードは6文字以上で入力してください')}`);
    }

    const data = { email, password };

    const { error } = await supabase.auth.signUp(data);

    if (error) {
        const msg = error.message.toLowerCase().includes('already registered')
            ? 'このメールアドレスはすでに登録されています'
            : 'ユーザーの作成に失敗しました';
        redirect(`/login?mode=signup&error=${encodeURIComponent(msg)}`);
    }

    revalidatePath('/', 'layout');
    redirect('/signup-complete');
}
