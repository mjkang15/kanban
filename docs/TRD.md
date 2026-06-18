# TRD — Technical Requirements Document
# Kanban Board

**버전**: 2.0.0 (Supabase Auth + DB, GitHub Pages 배포)  
**작성일**: 2026-06-18  
**최종 수정**: 2026-06-18

---

## 개정 이력

| 버전 | 날짜 | 변경 내용 |
|------|------|-----------|
| 1.0.0 | 2026-06-18 | 초안 |
| 1.1.0 | 2026-06-18 | 팀원 관리 · 역할 · 담당자 기능 추가 |
| 2.0.0 | 2026-06-18 | Supabase Auth + DB + RLS + GitHub Actions 추가 |

---

## 1. 기술 스택

| 계층 | 기술 | 버전 |
|------|------|------|
| 프론트엔드 | Vanilla JavaScript (ES2022+) | - |
| 마크업 | HTML5 | - |
| 스타일 | CSS3 (Custom Properties, Grid, Flexbox) | - |
| 인증 SDK | supabase-js (CDN) | v2 |
| 인증 제공자 | Supabase Auth | - |
| 데이터베이스 | Supabase PostgreSQL | 15+ |
| 배포 | GitHub Pages | - |
| CI/CD | GitHub Actions | - |

---

## 2. 프로젝트 구조

```
kanban/
├── index.html           # 인증 화면 + 보드 UI (단일 HTML)
├── style.css            # 전체 스타일
├── script.js            # 메인 JS (Supabase 연동)
├── supabase-setup.sql   # DB 초기화 스크립트
└── docs/

.github/
└── workflows/
    └── deploy-kanban.yml
```

---

## 3. Supabase 아키텍처

### 3.1 클라이언트 초기화

```javascript
// CDN을 통한 supabase-js 로드 (빌드 도구 불필요)
const { createClient } = supabase;
const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
```

### 3.2 인증 상태 관리

앱 로드 시 `onAuthStateChange`를 가장 먼저 등록한다.  
모든 화면 전환은 이 이벤트에 의해 구동된다.

```javascript
sb.auth.onAuthStateChange(async (event, session) => {
    if (session) {
        authUser = session.user;
        await Promise.all([fetchCurrentProfile(), fetchAllProfiles(), fetchCards()]);
        showBoardScreen();
    } else {
        authUser = null;
        currentProfile = null;
        showAuthScreen();
    }
});
```

### 3.3 OAuth 로그인

```javascript
async function signInWithOAuth(provider) {
    const { error } = await sb.auth.signInWithOAuth({
        provider,  // 'google' | 'github'
        options: {
            redirectTo: window.location.href.split('#')[0].split('?')[0],
        },
    });
    if (error) showToast(error.message, 'error');
}
```

### 3.4 이메일 인증

```javascript
// 회원가입
const { error } = await sb.auth.signUp({
    email, password,
    options: { data: { full_name: name } },
});

// 로그인
const { error } = await sb.auth.signInWithPassword({ email, password });
```

---

## 4. 데이터베이스 설계

### 4.1 profiles 테이블

```sql
CREATE TABLE profiles (
    id         uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    name       text NOT NULL,
    initials   text NOT NULL,
    color      text NOT NULL DEFAULT '#6c63ff',
    role       text NOT NULL DEFAULT 'member'
                   CHECK (role IN ('admin', 'member')),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);
```

### 4.2 cards 테이블

```sql
CREATE TABLE cards (
    id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    title        text NOT NULL,
    description  text DEFAULT '',
    column_name  text NOT NULL DEFAULT 'todo'
                     CHECK (column_name IN ('todo', 'inprogress', 'done')),
    sort_order   integer DEFAULT 0,
    assignee_id  uuid REFERENCES profiles(id) ON DELETE SET NULL,
    created_by   uuid REFERENCES profiles(id) ON DELETE SET NULL,
    created_at   timestamptz DEFAULT now(),
    updated_at   timestamptz DEFAULT now()
);
```

### 4.3 신규 사용자 프로필 자동 생성 트리거

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
    full_name := COALESCE(
        new.raw_user_meta_data->>'full_name',
        new.raw_user_meta_data->>'name',
        split_part(new.email, '@', 1)
    );
    init_val := UPPER(LEFT(full_name, 1)) ||
                UPPER(LEFT(split_part(full_name, ' ', 2), 1));
    IF LENGTH(init_val) < 2 THEN
        init_val := UPPER(LEFT(full_name, 2));
    END IF;

    SELECT COUNT(*) INTO user_cnt FROM public.profiles;
    color_val := colors[(user_cnt % ARRAY_LENGTH(colors, 1)) + 1];

    INSERT INTO public.profiles (id, name, initials, color, role)
    VALUES (
        new.id, full_name, init_val, color_val,
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

## 5. Row Level Security (RLS)

### profiles

```sql
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 인증 사용자 전체 조회 허용
CREATE POLICY "profiles_select" ON profiles
    FOR SELECT TO authenticated USING (true);

-- 본인 프로필 업데이트
CREATE POLICY "profiles_update_own" ON profiles
    FOR UPDATE TO authenticated USING (auth.uid() = id);

-- Admin이 타인 역할 변경
CREATE POLICY "profiles_update_admin" ON profiles
    FOR UPDATE TO authenticated
    USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- 트리거에 의한 삽입 허용
CREATE POLICY "profiles_insert" ON profiles
    FOR INSERT WITH CHECK (true);
```

### cards

```sql
ALTER TABLE cards ENABLE ROW LEVEL SECURITY;

-- 인증 사용자 전체 조회
CREATE POLICY "cards_select" ON cards
    FOR SELECT TO authenticated USING (true);

-- 인증 사용자 생성
CREATE POLICY "cards_insert" ON cards
    FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

-- Admin 전체 수정 / Member 본인 담당 카드만
CREATE POLICY "cards_update" ON cards
    FOR UPDATE TO authenticated
    USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
        OR assignee_id = auth.uid()
    );

-- Admin 전체 삭제 / Member 본인 담당 카드만
CREATE POLICY "cards_delete" ON cards
    FOR DELETE TO authenticated
    USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
        OR assignee_id = auth.uid()
    );
```

---

## 6. JavaScript 함수 설계

### 6.1 전역 상태

```javascript
let authUser       = null;   // supabase auth.User 객체
let currentProfile = null;   // profiles 테이블 row
let profiles       = [];     // 전체 팀원 배열
let cards          = [];     // 전체 카드 배열 (in-memory)
```

### 6.2 권한 함수

```javascript
function getPermissions(profile) {
    if (!profile) return { canEditCard: () => false, ... };
    const isAdmin = profile.role === 'admin';
    return {
        canManageTeam:     isAdmin,
        canEditCard:       (card) => isAdmin || card?.assignee_id === profile.id,
        canDeleteCard:     (card) => isAdmin || card?.assignee_id === profile.id,
        canDragCard:       (card) => isAdmin || card?.assignee_id === profile.id,
        canChangeAssignee: isAdmin,
    };
}
```

### 6.3 카드 CRUD (비동기)

```javascript
async function createCard({ title, description, columnName, assigneeId }) { ... }
async function updateCard(id, patch) { ... }           // 단건 수정
async function deleteCardById(id) { ... }
async function syncCardOrders(columnName, orderedIds) { ... }  // DnD 완료 후 순서 일괄 저장
```

### 6.4 toast 알림

```javascript
function showToast(message, type = 'info') {
    // type: 'info' | 'success' | 'error'
    // DOM에 .toast 요소 추가 후 3초 뒤 자동 제거
}
```

### 6.5 화면 전환

```javascript
function showAuthScreen() {
    document.getElementById('auth-screen').classList.remove('hidden');
    document.getElementById('app').classList.add('hidden');
}
function showBoardScreen() {
    document.getElementById('auth-screen').classList.add('hidden');
    document.getElementById('app').classList.remove('hidden');
}
```

---

## 7. 비동기 패턴

```javascript
// 모든 Supabase 호출에 에러 처리
async function fetchCards() {
    const { data, error } = await sb
        .from('cards')
        .select('*')
        .order('sort_order');
    if (error) { showToast('카드를 불러오지 못했습니다.', 'error'); return; }
    cards = data;
}
```

DnD 순서 저장은 카드별 개별 update (upsert는 RLS `cards_insert` 정책과 충돌하여 개별 update로 변경):
```javascript
async function syncCardOrders(columnName, orderedIds) {
    const now = new Date().toISOString();
    const results = await Promise.all(
        orderedIds.map((id, i) =>
            sb.from('cards').update({ column_name: columnName, sort_order: i, updated_at: now }).eq('id', id)
        )
    );
    if (results.some(({ error }) => error)) showToast('순서 저장에 실패했습니다.', 'error');
}
```

---

## 8. GitHub Pages 배포

### 8.1 워크플로우 (`.github/workflows/deploy-kanban.yml`)

```yaml
name: Deploy Kanban to GitHub Pages
on:
  push:
    branches: [main]
    paths: ['src/exercise/mjkang/day03/kanban/**']
  workflow_dispatch:

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: peaceiris/actions-gh-pages@v4
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./src/exercise/mjkang/day03/kanban
          destination_dir: mjkang/kanban
          keep_files: true
```

### 8.2 배포 URL

```
https://weable-kosa.github.io/kosa-vibecoding-2026-3rd/mjkang/kanban/
```

---

## 9. 보안 고려사항

| 항목 | 대응 |
|------|------|
| XSS | DOM 삽입 시 `escapeHtml()` 사용 (`textContent` 기반) |
| SQL Injection | Supabase SDK 파라미터 바인딩 (클라이언트가 raw SQL 직접 전송 없음) |
| 권한 우회 | RLS로 DB 레벨 이중 검사 (프론트 UI만으로 충분하지 않음) |
| 키 노출 | anon key는 공개되어도 안전 (RLS가 실제 접근 제한) |
| CSRF | Supabase JWT 기반 (쿠키 미사용, SameSite 이슈 없음) |

---

## 10. 향후 확장

| 기능 | 방법 |
|------|------|
| 실시간 동기화 | `sb.channel('cards').on('postgres_changes', ...)` |
| 팀원 초대 | Supabase Admin API (invite by email) |
| 복수 보드 | `boards` 테이블 추가, cards에 `board_id` FK |
| 첨부 파일 | Supabase Storage |
| 알림 | Supabase Edge Functions + Push API |
