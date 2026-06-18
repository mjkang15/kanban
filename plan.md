# Kanban Board 개발 계획 (plan.md)

**버전**: 2.0.0 (Supabase Auth + DB, GitHub Pages 배포)  
**최종 수정**: 2026-06-18

---

## 개정 이력

| 버전 | 날짜 | 변경 내용 |
|------|------|-----------|
| 1.0.0 | 2026-06-18 | 초기 기획 (LocalStorage 기반 단독 실행) |
| 1.1.0 | 2026-06-18 | 팀원 관리 · 역할(Admin/Member) · 담당자 기능 추가 |
| 2.0.0 | 2026-06-18 | Supabase Auth + DB 연동, GitHub Pages 배포 자동화 |

---

## 1. 목표

팀 협업 칸반 보드.  
v2.0에서는 실제 인증 시스템(Google · GitHub · 이메일)과 서버 DB를 도입하여 여러 사용자가 동일한 보드를 공유할 수 있게 한다.

---

## 2. 기술 스택

| 영역 | 기술 |
|------|------|
| 프론트엔드 | Vanilla JS (ES2022+), HTML5, CSS3 |
| 인증 | Supabase Auth (Google OAuth, GitHub OAuth, Email/Password) |
| 데이터베이스 | Supabase PostgreSQL + Row Level Security |
| SDK | supabase-js v2 (CDN, 빌드 도구 없음) |
| 배포 | GitHub Pages (GitHub Actions) |
| CI/CD | `.github/workflows/deploy-kanban.yml` |

---

## 3. 아키텍처

```
┌─────────────────────────────────────┐
│            브라우저                   │
│  index.html + style.css + script.js │
│  supabase-js v2 (CDN)               │
└───────┬─────────────────────────────┘
        │ HTTPS / REST / Realtime
┌───────▼─────────────────────────────┐
│          Supabase                   │
│  ┌──────────────┐  ┌─────────────┐  │
│  │  Auth        │  │  PostgreSQL │  │
│  │  Google OAuth│  │  profiles   │  │
│  │  GitHub OAuth│  │  cards      │  │
│  │  Email/PW    │  │  RLS 정책   │  │
│  └──────────────┘  └─────────────┘  │
└─────────────────────────────────────┘
```

### 핵심 설계 원칙
- **Auth First**: 미인증 사용자는 보드에 접근할 수 없다
- **RLS 강제**: 권한 검사는 DB 레벨에서 이중으로 적용
- **정적 배포**: 별도 서버 없이 Supabase CDN만으로 동작
- **Optimistic UI**: DB 저장 완료 후 상태 갱신 (에러 시 toast 알림)

---

## 4. 데이터 모델

### profiles 테이블
```
id          uuid PK  →  auth.users(id) ON DELETE CASCADE
name        text     NOT NULL
initials    text     NOT NULL  (최대 2자)
color       text     NOT NULL  (hex 색상 코드)
role        text     NOT NULL  DEFAULT 'member'  CHECK IN ('admin','member')
created_at  timestamptz  DEFAULT now()
updated_at  timestamptz  DEFAULT now()
```

### cards 테이블
```
id           uuid PK  DEFAULT gen_random_uuid()
title        text     NOT NULL
description  text     DEFAULT ''
column_name  text     NOT NULL  DEFAULT 'todo'  CHECK IN ('todo','inprogress','done')
sort_order   integer  DEFAULT 0
assignee_id  uuid     FK → profiles(id) ON DELETE SET NULL
created_by   uuid     FK → profiles(id) ON DELETE SET NULL
created_at   timestamptz  DEFAULT now()
updated_at   timestamptz  DEFAULT now()
```

### 자동화 (Trigger)
- `auth.users` INSERT → `profiles` 자동 생성
- 최초 가입자(profiles 레코드 0개 시점) → role = 'admin' 자동 부여

---

## 5. 권한 모델

| 작업 | Admin | Member |
|------|:-----:|:------:|
| 카드 조회 | ✅ 전체 | ✅ 전체 |
| 카드 생성 | ✅ | ✅ |
| 카드 수정 / 이동 | ✅ 전체 | ✅ 본인 담당만 |
| 카드 삭제 | ✅ 전체 | ✅ 본인 담당만 |
| 담당자 변경 | ✅ 누구든 | ❌ (본인 자동) |
| 팀원 목록 조회 | ✅ | ✅ |
| 역할 변경 | ✅ | ❌ |

---

## 6. 인증 플로우

```
앱 로드
  └── supabase.auth.onAuthStateChange 리스닝
        ├── 세션 있음
        │     ├── profiles fetch
        │     ├── cards fetch
        │     └── 보드 화면 표시
        └── 세션 없음
              └── 인증 화면 표시
                    ├── [Google] signInWithOAuth({ provider:'google' })
                    ├── [GitHub] signInWithOAuth({ provider:'github' })
                    └── [이메일]
                          ├── 로그인: signInWithPassword(email, pw)
                          └── 회원가입: signUp(email, pw, { data: { full_name } })
```

---

## 7. GitHub Pages 배포

- **워크플로우 파일**: `.github/workflows/deploy-kanban.yml`
- **트리거**: `main` 브랜치 `src/exercise/mjkang/day03/kanban/**` 변경 시
- **배포 대상**: `gh-pages` 브랜치 `mjkang/kanban/` 디렉터리
- **배포 URL**: `https://weable-kosa.github.io/kosa-vibecoding-2026-3rd/mjkang/kanban/`
- **keep_files: true**: 다른 팀원 배포 디렉터리를 덮어쓰지 않음

---

## 8. Supabase 초기 설정 필요 항목

1. Supabase 프로젝트 생성 → URL + anon key 획득
2. `supabase-setup.sql` 실행 (SQL Editor)
3. Auth > Providers에서 Google · GitHub OAuth 앱 등록
4. Auth > URL Configuration에 Redirect URL 추가:
   - `http://localhost:8000`
   - `https://weable-kosa.github.io/kosa-vibecoding-2026-3rd/mjkang/kanban/`
5. `script.js` 상단 `SUPABASE_URL`, `SUPABASE_ANON_KEY` 값 입력

---

## 9. 파일 구조

```
kanban/
├── index.html           # 인증 화면 + 보드 UI (통합)
├── style.css            # 전체 스타일 (인증 화면 포함)
├── script.js            # Supabase 연동 메인 JS
├── supabase-setup.sql   # Supabase 초기화 SQL (테이블 + RLS + 트리거)
├── plan.md              # 이 문서
└── docs/
    ├── PRD.md
    ├── TRD.md
    ├── UserFlow.md
    ├── DatabaseDesign.md
    ├── DesignSystem.md
    └── Tasks.md

.github/
└── workflows/
    └── deploy-kanban.yml
```

---

## 10. 개발 Phase

| Phase | 내용 | 상태 |
|-------|------|------|
| 0 | 요구사항 분석 · 설계 문서 작성 (v1.1) | ✅ 완료 |
| 1 | v1.0 구현 (LocalStorage 기반) | ✅ 완료 |
| 2 | 설계 문서 v2.0 업데이트 | ✅ 완료 |
| 3 | `supabase-setup.sql` 작성 | ✅ 완료 |
| 4 | 인증 화면 HTML/CSS 구현 | ✅ 완료 |
| 5 | script.js Supabase 연동 재작성 | ✅ 완료 |
| 6 | GitHub Actions 배포 워크플로우 | ✅ 완료 |
| 7 | QA · 문서 최종화 | 🔄 진행 중 |
