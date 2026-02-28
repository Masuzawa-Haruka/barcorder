'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';

export async function login(formData: FormData) {
    const supabase = await createClient();

    const email = formData.get('email');
    const password = formData.get('password');

    if (typeof email !== 'string' || typeof password !== 'string' || !email || !password) {
        redirect(`/login?error=${encodeURIComponent('入力値が不正です')}`);
    }

    const data = { email, password };

    const { error } = await supabase.auth.signInWithPassword(data);

    if (error) {
        redirect(`/login?error=${encodeURIComponent('メールアドレス、またはパスワードが間違っています')}`);
    }

    revalidatePath('/', 'layout');
    redirect('/');
}

export async function signup(formData: FormData) {
    const supabase = await createClient();

    const email = formData.get('email');
    const password = formData.get('password');

    if (typeof email !== 'string' || typeof password !== 'string' || !email || !password) {
        redirect(`/login?error=${encodeURIComponent('入力値が不正です')}`);
    }

    const data = { email, password };

    const { error } = await supabase.auth.signUp(data);

    if (error) {
        redirect(`/login?error=${encodeURIComponent('ユーザーの作成に失敗しました')}`);
    }

    revalidatePath('/', 'layout');
    redirect('/');
}
