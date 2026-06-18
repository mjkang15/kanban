# Design System — 디자인 시스템
# Kanban Board

**버전**: 1.1.0 (팀 관리 / 담당자 UI 추가)  
**작성일**: 2026-06-18

---

## 1. 디자인 원칙

| 원칙 | 설명 |
|------|------|
| **단순함** | 불필요한 시각 요소 제거, 콘텐츠(카드)에 집중 |
| **명확함** | 상태(To-do/진행중/완료)와 담당자를 색상·아바타로 명확히 구분 |
| **반응성** | 모든 인터랙션에 즉각적인 시각 피드백 제공 |
| **일관성** | 동일 컴포넌트는 동일하게 동작하고 동일하게 보임 |
| **역할 가시성** | 현재 로그인 역할(Admin/Member)을 UI 전반에서 명확히 표현 |

---

## 2. 색상 팔레트

### 2.1 브랜드 색상 (컬럼 식별)

| 이름 | CSS 변수 | HEX | 사용처 |
|------|----------|-----|--------|
| Todo Purple | `--color-todo` | `#6c63ff` | To-do 컬럼 강조색 |
| Progress Orange | `--color-inprogress` | `#ff8c42` | In Progress 컬럼 강조색 |
| Done Green | `--color-done` | `#06d6a0` | Done 컬럼 강조색 |

### 2.2 배경 색상

| 이름 | CSS 변수 | HEX | 사용처 |
|------|----------|-----|--------|
| Background Start | `--bg-start` | `#667eea` | 배경 그라디언트 시작 |
| Background End | `--bg-end` | `#764ba2` | 배경 그라디언트 끝 |
| Column Background | `--color-column-bg` | `#ffffff` | 컬럼 배경 (투명도 95%) |
| Card Background | `--color-card-bg` | `#ffffff` | 카드 배경 |

```css
body {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}
```

### 2.3 텍스트 색상

| 이름 | CSS 변수 | HEX | 사용처 |
|------|----------|-----|--------|
| Primary Text | `--text-primary` | `#1a202c` | 카드 제목, 레이블 |
| Secondary Text | `--text-secondary` | `#718096` | 카드 설명, 부제목 |
| Placeholder | `--text-placeholder` | `#a0aec0` | 입력 필드 placeholder |
| Inverse | — | `#ffffff` | 헤더 텍스트 |

### 2.4 상태 색상

| 이름 | HEX | 사용처 |
|------|-----|--------|
| Error Red | `#e53e3e` | 에러 테두리, 에러 메시지 |
| Error Light | `#ffe0e0` | 삭제 버튼 hover 배경 |
| Focus Ring | `rgba(108, 99, 255, 0.15)` | 입력 필드 포커스 링 |
| Drag Over | `rgba(108, 99, 255, 0.07)` | 드롭 대상 컬럼 강조 |
| Role Admin | `#6c63ff` | Admin 역할 뱃지 |
| Role Member | `#718096` | Member 역할 뱃지 |

### 2.5 아바타 기본 색상 풀 (자동 배정)

새 팀원 추가 시 아바타 색상을 순서대로 배정:

```javascript
const AVATAR_COLORS = [
    '#6c63ff', '#ff8c42', '#06d6a0', '#e53e3e',
    '#38b2ac', '#d69e2e', '#805ad5', '#2b6cb0',
    '#c05621', '#2c7a7b',
];
```

---

## 3. 타이포그래피

### 3.1 폰트 패밀리

```css
font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto,
             Oxygen, Ubuntu, Cantarell, sans-serif;
```

### 3.2 타입 스케일

| 이름 | 크기 | 굵기 | 사용처 |
|------|------|------|--------|
| App Title | `2rem` | 700 | 앱 헤더 제목 |
| App Subtitle | `0.95rem` | 400 | 앱 헤더 부제목 |
| Column Title | `0.95rem` | 600 | 컬럼 헤더 제목 |
| Modal Title | `1.1rem` | 600 | 모달 제목 |
| Card Title | `0.9rem` | 600 | 카드 제목 |
| Card Desc | `0.8rem` | 400 | 카드 설명 |
| Assignee Name | `0.75rem` | 500 | 담당자 이름 |
| Avatar Initials | `0.65rem` | 700 | 아바타 이니셜 |
| Role Badge | `0.65rem` | 600 | 역할 뱃지 |
| Label | `0.85rem` | 600 | 폼 레이블 |
| Input | `0.9rem` | 400 | 입력 필드 |
| Badge | `0.75rem` | 600 | 카드 수 뱃지 |
| Error | `0.78rem` | 400 | 에러 메시지 |

---

## 4. 간격 시스템 (Spacing)

4px 기반 그리드 시스템:

| CSS 변수 | 값 | px |
|----------|----|----|
| `--space-1` | `4px` | 4 |
| `--space-2` | `8px` | 8 |
| `--space-3` | `12px` | 12 |
| `--space-4` | `16px` | 16 |
| `--space-5` | `20px` | 20 |
| `--space-6` | `24px` | 24 |
| `--space-8` | `32px` | 32 |
| `--space-10` | `40px` | 40 |

---

## 5. 그림자 (Shadows)

```css
--shadow-card:       0 2px 8px rgba(0, 0, 0, 0.08);
--shadow-card-hover: 0 6px 20px rgba(0, 0, 0, 0.14);
--shadow-card-drag:  0 12px 32px rgba(0, 0, 0, 0.22);
--shadow-column:     0 4px 24px rgba(0, 0, 0, 0.10);
--shadow-modal:      0 20px 60px rgba(0, 0, 0, 0.30);
--shadow-panel:      -4px 0 24px rgba(0, 0, 0, 0.15);  /* 사이드패널 */
--shadow-btn:        0 4px 12px rgba(108, 99, 255, 0.35);
```

---

## 6. 테두리 반경 (Border Radius)

| CSS 변수 | 값 | 사용처 |
|----------|----|----|
| `--radius-xs` | `4px` | 역할 뱃지, 작은 요소 |
| `--radius-sm` | `6px` | 버튼, 입력 필드 |
| `--radius-md` | `12px` | 카드 |
| `--radius-lg` | `16px` | 컬럼, 모달, 사이드패널 |
| `--radius-full` | `9999px` | 아바타 원형, 카드 수 뱃지 |

---

## 7. 반응형 브레이크포인트

| 이름 | 조건 | 컬럼 레이아웃 | 사이드패널 |
|------|------|--------------|-----------|
| Desktop | `> 900px` | 3열 균등 그리드 | 슬라이드 오버레이 |
| Tablet | `600~900px` | 2열 + 하단 1열 | 슬라이드 오버레이 |
| Mobile | `< 600px` | 1열 세로 스택 | 전체 화면 오버레이 |

---

## 8. 컴포넌트 명세

### 8.1 헤더 (Header)

```
┌───────────────────────────────────────────────────────────────┐
│  Kanban Board    [김관리 ▼] [Admin]    [팀 관리]  [전체 ▼]   │
└───────────────────────────────────────────────────────────────┘

요소:
- 앱 제목 (좌측)
- 현재 사용자 드롭다운 (이름 + 역할 뱃지, 클릭 시 팀원 전환 목록)
- "팀 관리" 버튼 (Admin만 표시)
- 담당자 필터 드롭다운 (전체/특정 팀원)

현재 사용자 드롭다운:
┌────────────────────────┐
│ ● 김관리  [관리자]  ✓ │  ← 현재 선택
│ ● 이개발  [팀원]      │
│ ● 박디자  [팀원]      │
└────────────────────────┘
```

### 8.2 컬럼 (Column)

```
┌──────────────────────────────────┐  ← border-radius: 16px
│ ● To-do                     [3] │  ← column-header
│ ─────────────────────────────── │
│                                  │
│ ┌──────────────────────────────┐ │  ← card
│ │ ⋮ 카드 제목              [✎][✕]│
│ │   카드 설명                  │ │
│ │ ──────────────────────────── │ │
│ │ [이개] 이개발                │ │  ← 담당자 아바타 + 이름
│ └──────────────────────────────┘ │
│                                  │
│ + 카드 추가                      │
└──────────────────────────────────┘
```

### 8.3 카드 (Card) — 담당자 포함

```
┌─────────────────────────────────────────────┐
│ ⋮ 카드 제목 텍스트              [✎] [✕]   │
│   카드 설명 텍스트 (있는 경우)              │
│ ─────────────────────────────────────────── │
│ [이개] 이개발                               │  ← 담당자 영역
└─────────────────────────────────────────────┘

│ ⋮ 카드 제목 텍스트              [✎] [✕]   │
│ ─────────────────────────────────────────── │
│ 미배정                                      │  ← 담당자 없음
└─────────────────────────────────────────────┘

권한별 차이:
- Admin: 모든 카드에 [✎][✕] 버튼 표시
- Member(본인 카드): [✎][✕] 버튼 표시
- Member(타인 카드): 버튼 없음, cursor: default
```

### 8.4 담당자 아바타 (Avatar)

```
┌────────────────────────────┐
│ [이개] 이개발              │
└────────────────────────────┘

아바타 원:
- 크기: 24px × 24px
- border-radius: 50%
- background: user.color (HEX)
- 텍스트: user.initials, 흰색, 0.65rem, bold
- 이름: user.name, 0.75rem, secondary text

CSS:
.avatar {
    width: 24px;
    height: 24px;
    border-radius: 50%;
    background-color: var(--user-color);
    color: #ffffff;
    font-size: 0.65rem;
    font-weight: 700;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
}

.assignee-chip {
    display: flex;
    align-items: center;
    gap: 6px;
    padding-top: 8px;
    border-top: 1px solid #f0f0f0;
    margin-top: 8px;
}

.assignee-name {
    font-size: 0.75rem;
    color: var(--text-secondary);
    font-weight: 500;
}

.assignee-none {
    font-size: 0.75rem;
    color: var(--text-placeholder);
    font-style: italic;
}
```

### 8.5 역할 뱃지 (Role Badge)

```
[관리자]  ← Admin: 보라색 배경
[팀원]    ← Member: 회색 배경

CSS:
.role-badge {
    font-size: 0.65rem;
    font-weight: 600;
    padding: 2px 6px;
    border-radius: 4px;
}

.role-badge.admin {
    background: rgba(108, 99, 255, 0.12);
    color: #6c63ff;
}

.role-badge.member {
    background: #f0f0f0;
    color: #718096;
}
```

### 8.6 카드 모달 — 담당자 선택 포함

```
┌──────────────────────────────────┐
│ 카드 추가                   [✕] │
│ ────────────────────────────── │
│                                  │
│  제목 *                          │
│  ┌──────────────────────────┐   │
│  │ 카드 제목 입력           │   │
│  └──────────────────────────┘   │
│                                  │
│  설명 (선택)                     │
│  ┌──────────────────────────┐   │
│  │                          │   │
│  │                          │   │
│  └──────────────────────────┘   │
│                                  │
│  담당자                          │
│  ┌──────────────────────────┐   │
│  │ [이개] 이개발          ▼ │   │  ← 드롭다운
│  └──────────────────────────┘   │
│  (Admin만 변경 가능)             │
│                                  │
│ ────────────────────────────── │
│              [취소]    [저장]   │
└──────────────────────────────────┘

담당자 드롭다운 옵션:
┌──────────────────────────┐
│ (미배정)                 │
│ ─────────────────────── │
│ [김관] 김관리  [관리자]  │
│ [이개] 이개발  [팀원]    │
│ [박디] 박디자  [팀원]    │
└──────────────────────────┘
```

### 8.7 팀원 관리 사이드패널 (Admin 전용)

```
┌────────────────────────────────────┐  ← 우측에서 슬라이드
│ 팀원 관리                     [✕] │
│ ────────────────────────────────  │
│ [+ 팀원 추가]                      │
│ ────────────────────────────────  │
│                                    │
│  [김관] 김관리                     │
│         [관리자]                   │  ← 본인(현재 Admin)
│                                    │
│  [이개] 이개발                     │
│         [팀원]   [역할변경] [삭제] │
│                                    │
│  [박디] 박디자                     │
│         [팀원]   [역할변경] [삭제] │
│                                    │
└────────────────────────────────────┘

너비: 320px (desktop), 전체 너비 (mobile)
배경: #ffffff
그림자: --shadow-panel (좌측 방향)
애니메이션: translateX(100%) → translateX(0), 0.3s ease
```

### 8.8 팀원 추가 모달

```
┌──────────────────────────────────┐
│ 팀원 추가                   [✕] │
│ ────────────────────────────── │
│                                  │
│  이름 *                          │
│  ┌──────────────────────────┐   │
│  │                          │   │
│  └──────────────────────────┘   │
│                                  │
│  역할                            │
│  ○ 팀원 (Member)                 │  ← 기본값
│  ○ 관리자 (Admin)                │
│                                  │
│  아바타 색상 (자동 배정)          │
│  [●][●][●][●][●][●]             │  ← 색상 팔레트 선택
│                                  │
│ ────────────────────────────── │
│              [취소]    [추가]   │
└──────────────────────────────────┘
```

---

## 9. 버튼

| 유형 | 배경 | 텍스트 | 사용처 |
|------|------|--------|--------|
| Primary (저장/추가) | `#6c63ff` | `#ffffff` | 저장, 추가 버튼 |
| Secondary (취소) | `#f5f5f5` | `#718096` | 취소 버튼 |
| Ghost (카드 추가) | `transparent` | `#718096` | 카드 추가 버튼 (dashed) |
| Danger (삭제) | `#f0f0f0` hover→`#ffe0e0` | `#555` hover→`#e53e3e` | 삭제 버튼 |
| Icon (수정) | `#f0f0f0` hover→`#e0e8ff` | `#555` hover→`#6c63ff` | 수정 아이콘 버튼 |
| Role Toggle | 역할별 다름 | 역할별 다름 | 역할 변경 버튼 |

---

## 10. 애니메이션 & 전환

| 이름 | 속성 | 값 | 용도 |
|------|------|----|------|
| 기본 전환 | transition | `0.2s ease` | hover, 상태 변화 |
| 카드 진입 | animation | fadeIn 0.2s ease | 카드 렌더링 시 |
| 모달 진입 | transform + opacity | scale + translateY 0.2s | 모달 열기 |
| 사이드패널 진입 | transform | translateX 0.3s ease | 팀원 패널 열기 |
| 에러 흔들기 | animation | shake 0.3s ease | 필수 필드 미입력 |

```css
@keyframes fadeIn {
    from { opacity: 0; transform: translateY(8px); }
    to   { opacity: 1; transform: translateY(0); }
}

@keyframes shake {
    0%, 100% { transform: translateX(0); }
    20%      { transform: translateX(-8px); }
    40%      { transform: translateX(8px); }
    60%      { transform: translateX(-4px); }
    80%      { transform: translateX(4px); }
}

@keyframes slideInRight {
    from { transform: translateX(100%); }
    to   { transform: translateX(0); }
}
```

---

## 11. 드래그 앤 드롭 시각 피드백

| 상태 | 시각 표현 |
|------|-----------|
| 드래그 가능 카드 | cursor: grab |
| 드래그 불가 카드 (타인, Member) | cursor: not-allowed 또는 default |
| 드래그 중 | opacity 0.4, rotate(2deg), scale(1.02) |
| 드래그 오버 컬럼 | background rgba(108,99,255,0.07) |
| 드래그 핸들 | 점 격자 패턴, color: #bbb |

---

## 12. 아이콘

외부 아이콘 라이브러리 없이 **인라인 SVG** 사용:

| 아이콘 | 사용처 |
|--------|--------|
| 연필 (pencil) | 카드 수정 버튼 |
| 휴지통 (trash) | 카드/팀원 삭제 버튼 |
| × (close) | 모달/패널 닫기 |
| CSS 점 격자 | 드래그 핸들 |
| 사람 (person) | 팀원 관리 버튼 |
| 화살표 (chevron-down) | 드롭다운 표시자 |
