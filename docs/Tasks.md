# Tasks — 개발 태스크 목록
# Kanban Board

**버전**: 2.0.0 (Supabase Auth + DB, GitHub Pages 배포)  
**작성일**: 2026-06-18  
**최종 수정**: 2026-06-18

---

## 진행 현황 요약

| Phase | 설명 | 완료 | 전체 |
|-------|------|------|------|
| Phase 1 | 설계 문서 (v1.1) | 7 | 7 |
| Phase 2 | v1.0 구현 (LocalStorage) | 3 | 3 |
| Phase 3 | 설계 문서 v2.0 업데이트 | 6 | 6 |
| Phase 4 | Supabase 설정 | 5 | 5 |
| Phase 5 | 인증 화면 구현 | 8 | 8 |
| Phase 6 | JS Supabase 연동 재작성 | 12 | 12 |
| Phase 7 | GitHub Actions 배포 | 3 | 3 |
| Phase 8 | QA | 5 | 10 |

---

## Phase 1 — 설계 문서 v1.1 ✅

- [x] plan.md 초안 작성
- [x] docs/PRD.md 작성
- [x] docs/TRD.md 작성
- [x] docs/UserFlow.md 작성
- [x] docs/DatabaseDesign.md 작성
- [x] docs/DesignSystem.md 작성
- [x] docs/Tasks.md 작성

---

## Phase 2 — v1.0 구현 (LocalStorage 기반) ✅

- [x] index.html 작성 (보드 UI)
- [x] style.css 작성 (전체 스타일)
- [x] script.js 작성 (LocalStorage CRUD + DnD + 팀원 관리)

---

## Phase 3 — 설계 문서 v2.0 업데이트 ✅

- [x] plan.md → v2.0 (Supabase + GitHub Pages)
- [x] docs/PRD.md → v2.0 (AUTH-* 요구사항 추가)
- [x] docs/TRD.md → v2.0 (Supabase 아키텍처, RLS, GitHub Actions)
- [x] docs/DatabaseDesign.md → v2.0 (PostgreSQL 스키마 + RLS 정책)
- [x] docs/UserFlow.md → v2.0 (OAuth + 이메일 인증 흐름)
- [x] docs/Tasks.md → v2.0 (이 파일)

---

## Phase 4 — Supabase 설정 ✅

- [x] supabase-setup.sql 작성 (테이블 DDL)
- [x] RLS 정책 SQL 작성
- [x] 신규 사용자 트리거 SQL 작성
- [x] 인덱스 SQL 작성
- [x] 초기 샘플 데이터 SQL 작성

---

## Phase 5 — 인증 화면 구현 ✅

- [x] index.html에 인증 화면(`#auth-screen`) 추가
- [x] Google 로그인 버튼 추가
- [x] GitHub 로그인 버튼 추가
- [x] 이메일 로그인 폼 추가
- [x] 이메일 회원가입 폼 추가
- [x] 로그인/회원가입 탭 전환 UI
- [x] 로딩 오버레이(`#loading-overlay`) 추가
- [x] Toast 알림 컨테이너(`#toast-container`) 추가
- [x] 헤더 로그아웃 버튼 추가
- [x] style.css에 인증 화면 스타일 추가

---

## Phase 6 — script.js Supabase 연동 재작성 ✅

- [x] Supabase 클라이언트 초기화 (SUPABASE_URL, SUPABASE_ANON_KEY 설정)
- [x] `onAuthStateChange` 리스너 등록
- [x] `signInWithOAuth(provider)` 구현 (Google, GitHub)
- [x] `signInWithEmail(email, password)` 구현
- [x] `signUpWithEmail(name, email, password)` 구현
- [x] `signOut()` 구현
- [x] `fetchCurrentProfile()` 구현
- [x] `fetchAllProfiles()` 구현
- [x] `updateProfileRole(id, role)` 구현
- [x] `fetchCards()` 구현
- [x] `createCard(data)` 구현 (async)
- [x] `updateCard(id, patch)` 구현 (async)
- [x] `deleteCardById(id)` 구현 (async)
- [x] `syncCardOrders(columnName, orderedIds)` 구현 (DnD 완료 후 개별 update — upsert RLS 제약 우회)
- [x] `getPermissions(profile)` 구현
- [x] `showToast(message, type)` 구현
- [x] `showLoading(show)` 구현
- [x] 보드 렌더링 함수 (profiles 기반으로 교체)
- [x] 팀원 관리 패널 (Supabase profiles 기반)
- [x] 카드 모달 (async save)
- [x] DnD 핸들러 (async handleDrop)
- [x] 인증 화면 이벤트 바인딩

---

## Phase 7 — GitHub Actions 배포 ✅

- [x] `.github/workflows/deploy-kanban.yml` 작성
- [x] `peaceiris/actions-gh-pages` 액션 설정 (destination_dir + keep_files)
- [x] 트리거 경로 설정 (`src/exercise/mjkang/day03/kanban/**`)

---

## Phase 8 — QA 🔄

- [x] Supabase 프로젝트 생성 후 SQL 스크립트 실행 검증
- [ ] Google OAuth 연동 E2E 테스트
- [ ] GitHub OAuth 연동 E2E 테스트
- [x] 이메일 회원가입/로그인 E2E 테스트
- [x] Admin 권한 카드 CRUD 테스트 (RLS 검증 완료)
- [x] Member 권한 카드 CRUD 테스트 (RLS 검증 완료)
- [x] 드래그 앤 드롭 순서 저장 검증 (개별 update로 버그 수정 후 재검증 완료)
- [ ] 역할 변경 테스트 (Admin → Member, Member → Admin)
- [ ] 반응형 레이아웃 모바일 테스트
- [ ] GitHub Pages 배포 후 OAuth 리다이렉트 검증

---

## 체크리스트: 사용자가 직접 수행해야 하는 항목

- [x] Supabase 프로젝트 생성 및 URL/anon key 획득
- [x] `script.js` 상단 `SUPABASE_URL`, `SUPABASE_ANON_KEY` 입력 (hardcoded 완료)
- [x] Supabase SQL Editor에서 `supabase-setup.sql` 실행
- [ ] Supabase > Auth > Providers > Google 활성화 + OAuth 앱 등록
- [ ] Supabase > Auth > Providers > GitHub 활성화 + OAuth 앱 등록
- [ ] Supabase > Auth > URL Configuration에 Redirect URL 추가:
  - `http://localhost:8000`
  - `https://weable-kosa.github.io/kosa-vibecoding-2026-3rd/mjkang/kanban/`
- [x] GitHub 저장소에서 Pages 활성화 (Settings > Pages > Source: gh-pages branch)
- [x] `git push origin main` → GitHub Actions 자동 배포 확인
