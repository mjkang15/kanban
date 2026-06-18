-- ================================================================
-- Kanban Board — Supabase 초기화 SQL
-- Supabase Dashboard > SQL Editor 에서 전체를 붙여넣고 실행하세요.
-- ================================================================

-- ----------------------------------------------------------------
-- 1. profiles 테이블
--    auth.users 와 1:1 관계. 신규 가입 시 트리거로 자동 생성.
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
    id         uuid        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    name       text        NOT NULL,
    initials   text        NOT NULL,
    color      text        NOT NULL DEFAULT '#6c63ff',
    role       text        NOT NULL DEFAULT 'member'
                           CHECK (role IN ('admin', 'member')),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- ----------------------------------------------------------------
-- 2. cards 테이블
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.cards (
    id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    title        text        NOT NULL,
    description  text        DEFAULT '',
    column_name  text        NOT NULL DEFAULT 'todo'
                             CHECK (column_name IN ('todo', 'inprogress', 'done')),
    sort_order   integer     DEFAULT 0,
    assignee_id  uuid        REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_by   uuid        REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at   timestamptz DEFAULT now(),
    updated_at   timestamptz DEFAULT now()
);

-- ----------------------------------------------------------------
-- 3. 인덱스
-- ----------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_cards_column_order  ON public.cards (column_name, sort_order);
CREATE INDEX IF NOT EXISTS idx_cards_assignee      ON public.cards (assignee_id);

-- ----------------------------------------------------------------
-- 4. Row Level Security 활성화
-- ----------------------------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cards    ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------------
-- 5. profiles RLS 정책
-- ----------------------------------------------------------------
-- 인증된 사용자는 전체 조회 가능
CREATE POLICY "profiles_select"
    ON public.profiles FOR SELECT
    TO authenticated
    USING (true);

-- 본인 프로필만 수정 가능
CREATE POLICY "profiles_update_own"
    ON public.profiles FOR UPDATE
    TO authenticated
    USING (auth.uid() = id);

-- Admin은 타인 역할 변경 가능
CREATE POLICY "profiles_update_admin"
    ON public.profiles FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- 트리거에 의한 자동 삽입 허용
CREATE POLICY "profiles_insert"
    ON public.profiles FOR INSERT
    WITH CHECK (true);

-- ----------------------------------------------------------------
-- 6. cards RLS 정책
-- ----------------------------------------------------------------
-- 인증된 사용자는 전체 조회 가능
CREATE POLICY "cards_select"
    ON public.cards FOR SELECT
    TO authenticated
    USING (true);

-- 인증된 사용자는 카드 생성 가능
CREATE POLICY "cards_insert"
    ON public.cards FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() IS NOT NULL);

-- Admin: 전체 수정, Member: 본인 담당 카드만
CREATE POLICY "cards_update"
    ON public.cards FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
        OR assignee_id = auth.uid()
    );

-- Admin: 전체 삭제, Member: 본인 담당 카드만
CREATE POLICY "cards_delete"
    ON public.cards FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
        OR assignee_id = auth.uid()
    );

-- ----------------------------------------------------------------
-- 7. 신규 사용자 자동 프로필 생성 트리거
--    - 최초 가입자(profiles 0행)는 자동으로 admin 부여
--    - 색상은 AVATAR_COLORS 풀에서 순번으로 배정
-- ----------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
    full_name  text;
    init_val   text;
    colors     text[] := ARRAY[
        '#6c63ff', '#ff8c42', '#06d6a0', '#e53e3e',
        '#38b2ac', '#d69e2e', '#805ad5', '#2b6cb0',
        '#c05621', '#2c7a7b'
    ];
    color_val  text;
    user_cnt   int;
BEGIN
    -- 이름 결정: OAuth metadata > 이메일 로컬파트
    full_name := COALESCE(
        new.raw_user_meta_data->>'full_name',
        new.raw_user_meta_data->>'name',
        split_part(new.email, '@', 1)
    );

    -- 이니셜 (성+이름 첫 글자, 한 단어면 앞 2자)
    init_val := UPPER(LEFT(full_name, 1)) ||
                UPPER(LEFT(split_part(full_name, ' ', 2), 1));
    IF LENGTH(TRIM(init_val)) < 2 THEN
        init_val := UPPER(LEFT(full_name, 2));
    END IF;

    -- 색상 풀 순번 배정
    SELECT COUNT(*) INTO user_cnt FROM public.profiles;
    color_val := colors[(user_cnt % ARRAY_LENGTH(colors, 1)) + 1];

    -- 첫 번째 가입자 = admin
    INSERT INTO public.profiles (id, name, initials, color, role)
    VALUES (
        new.id,
        full_name,
        init_val,
        color_val,
        CASE WHEN user_cnt = 0 THEN 'admin' ELSE 'member' END
    );

    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 기존 트리거 제거 후 재생성 (재실행 안전)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- ----------------------------------------------------------------
-- 완료 메시지
-- ----------------------------------------------------------------
DO $$
BEGIN
    RAISE NOTICE '✅ Kanban Board DB 초기화 완료.';
    RAISE NOTICE '   - profiles 테이블 생성됨';
    RAISE NOTICE '   - cards 테이블 생성됨';
    RAISE NOTICE '   - RLS 정책 적용됨';
    RAISE NOTICE '   - 신규 사용자 트리거 등록됨';
    RAISE NOTICE '   다음 단계: Supabase Dashboard > Auth > Providers에서';
    RAISE NOTICE '   Google · GitHub OAuth 앱을 설정하세요.';
END;
$$;
