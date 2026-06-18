# Database Design — 데이터베이스 설계
# Kanban Board

**버전**: 2.0.0 (Supabase PostgreSQL + RLS)  
**작성일**: 2026-06-18  
**최종 수정**: 2026-06-18

---

## 개정 이력

| 버전 | 날짜 | 변경 내용 |
|------|------|-----------|
| 1.0.0 | 2026-06-18 | LocalStorage 기반 설계 |
| 1.1.0 | 2026-06-18 | 사용자(역할, 담당자) 기능 추가 |
| 2.0.0 | 2026-06-18 | Supabase PostgreSQL로 전환, RLS 정책, Auth 트리거 추가 |

---

## 1. 현재 구현 (v2.0) — Supabase PostgreSQL

### 1.1 ERD

```
auth.users (Supabase 관리)
    │ 1
    │ ON INSERT → trigger → profiles 자동 생성
    │
    ▼ 1
profiles
    ┌────────────────────────────┐
    │ id         uuid PK         │
    │ name       text            │
    │ initials   text            │
    │ color      text            │
    │ role       text            │
    │ created_at timestamptz     │
    │ updated_at timestamptz     │
    └─────────┬──────────────────┘
              │ 0..* (assignee)
              │ 0..* (created_by)
              ▼
            cards
    ┌────────────────────────────┐
    │ id           uuid PK       │
    │ title        text          │
    │ description  text          │
    │ column_name  text          │
    │ sort_order   integer       │
    │ assignee_id  uuid FK       │  ─── SET NULL on profile delete
    │ created_by   uuid FK       │  ─── SET NULL on profile delete
    │ created_at   timestamptz   │
    │ updated_at   timestamptz   │
    └────────────────────────────┘
```

### 1.2 profiles 테이블

| 컬럼 | 타입 | 제약 | 설명 |
|------|------|------|------|
| id | uuid | PK, FK → auth.users ON DELETE CASCADE | Supabase Auth 사용자 ID |
| name | text | NOT NULL | 표시 이름 |
| initials | text | NOT NULL | 아바타 이니셜 (최대 2자) |
| color | text | NOT NULL DEFAULT '#6c63ff' | 아바타 배경색 (hex) |
| role | text | NOT NULL DEFAULT 'member' CHECK IN ('admin','member') | 사용자 역할 |
| created_at | timestamptz | DEFAULT now() | 생성일 |
| updated_at | timestamptz | DEFAULT now() | 수정일 |

### 1.3 cards 테이블

| 컬럼 | 타입 | 제약 | 설명 |
|------|------|------|------|
| id | uuid | PK DEFAULT gen_random_uuid() | 카드 고유 ID |
| title | text | NOT NULL | 카드 제목 |
| description | text | DEFAULT '' | 카드 설명 |
| column_name | text | NOT NULL DEFAULT 'todo' CHECK IN ('todo','inprogress','done') | 소속 컬럼 |
| sort_order | integer | DEFAULT 0 | 컬럼 내 정렬 순서 |
| assignee_id | uuid | FK → profiles(id) ON DELETE SET NULL | 담당자 |
| created_by | uuid | FK → profiles(id) ON DELETE SET NULL | 생성자 |
| created_at | timestamptz | DEFAULT now() | 생성일 |
| updated_at | timestamptz | DEFAULT now() | 수정일 |

---

## 2. Row Level Security (RLS)

### 2.1 profiles RLS

```sql
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 인증 사용자 전체 읽기 허용
CREATE POLICY "profiles_select"
    ON profiles FOR SELECT TO authenticated
    USING (true);

-- 본인 프로필 수정
CREATE POLICY "profiles_update_own"
    ON profiles FOR UPDATE TO authenticated
    USING (auth.uid() = id);

-- Admin이 타인 역할 변경
CREATE POLICY "profiles_update_admin"
    ON profiles FOR UPDATE TO authenticated
    USING (EXISTS (
        SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    ));

-- 트리거에 의한 자동 생성 허용
CREATE POLICY "profiles_insert"
    ON profiles FOR INSERT
    WITH CHECK (true);
```

### 2.2 cards RLS

```sql
ALTER TABLE cards ENABLE ROW LEVEL SECURITY;

-- 인증 사용자 전체 읽기
CREATE POLICY "cards_select"
    ON cards FOR SELECT TO authenticated
    USING (true);

-- 인증 사용자 카드 생성
CREATE POLICY "cards_insert"
    ON cards FOR INSERT TO authenticated
    WITH CHECK (auth.uid() IS NOT NULL);

-- 수정: Admin 전체 / Member 본인 담당
CREATE POLICY "cards_update"
    ON cards FOR UPDATE TO authenticated
    USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
        OR assignee_id = auth.uid()
    );

-- 삭제: Admin 전체 / Member 본인 담당
CREATE POLICY "cards_delete"
    ON cards FOR DELETE TO authenticated
    USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
        OR assignee_id = auth.uid()
    );
```

---

## 3. 신규 사용자 트리거

```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
    full_name  text;
    init_val   text;
    colors     text[] := ARRAY[
        '#6c63ff','#ff8c42','#06d6a0','#e53e3e',
        '#38b2ac','#d69e2e','#805ad5','#2b6cb0','#c05621','#2c7a7b'
    ];
    color_val  text;
    user_cnt   int;
BEGIN
    -- 이름: OAuth metadata 우선, 없으면 이메일 로컬파트
    full_name := COALESCE(
        new.raw_user_meta_data->>'full_name',
        new.raw_user_meta_data->>'name',
        split_part(new.email, '@', 1)
    );

    -- 이니셜: 성+이름 첫 글자, 없으면 앞 2자
    init_val := UPPER(LEFT(full_name, 1)) ||
                UPPER(LEFT(split_part(full_name, ' ', 2), 1));
    IF LENGTH(init_val) < 2 THEN
        init_val := UPPER(LEFT(full_name, 2));
    END IF;

    -- 색상 풀에서 순번으로 배정
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

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
```

---

## 4. 인덱스

```sql
-- 컬럼별 카드 조회 최적화
CREATE INDEX idx_cards_column_order ON cards (column_name, sort_order);

-- 담당자별 카드 조회
CREATE INDEX idx_cards_assignee ON cards (assignee_id);
```

---

## 5. 향후 MySQL/PostgreSQL 마이그레이션 (참고)

현재 Supabase PostgreSQL 사용 중이므로 독립 PostgreSQL로의 마이그레이션은 간단하다.

| 항목 | 현재 (Supabase) | 독립 PostgreSQL |
|------|-----------------|-----------------|
| 인증 | Supabase Auth | JWT 미들웨어 직접 구현 |
| UUID 생성 | `gen_random_uuid()` | 동일 (PostgreSQL 13+) |
| 시간 | `now()` | 동일 |
| RLS | Supabase 기본 지원 | PostgreSQL 기본 지원 |

MySQL 마이그레이션 시 주요 변경점:
- `uuid` → `CHAR(36)` 또는 `BINARY(16)`
- `gen_random_uuid()` → `UUID()` 함수 또는 애플리케이션에서 생성
- RLS 미지원 → 애플리케이션 레이어에서 권한 처리
- `timestamptz` → `DATETIME` (UTC 처리 필요)
- `ARRAY` 타입 미지원 → 별도 테이블로 분리

---

## 6. 데이터 흐름

```
[사용자 가입]
  OAuth / 이메일 가입
      │
      ▼
  auth.users INSERT
      │ trigger
      ▼
  profiles INSERT (자동)

[카드 생성]
  JS: sb.from('cards').insert({ title, column_name, assignee_id, created_by })
      │ RLS 검사: authenticated?
      ▼
  cards INSERT

[카드 이동 (DnD)]
  JS: sb.from('cards').upsert([ { id, column_name, sort_order } ... ])
      │ RLS 검사: admin OR assignee_id = uid()
      ▼
  cards UPDATE (batch)
```
