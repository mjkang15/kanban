'use strict';

// ================================================================
// Supabase 설정
// Supabase Dashboard > Project Settings > API 에서 값을 복사하세요.
// ================================================================
const SUPABASE_URL      = 'https://dsqddfkayhwfsgksjjvq.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRzcWRkZmtheWh3ZnNna3NqanZxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE3MjA1MzUsImV4cCI6MjA5NzI5NjUzNX0.jj5AE4CnhgeKb2x5FdU_mtr9E67kFPtaRXo8zxuLfNM';

const { createClient } = supabase;
const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ================================================================
// 상수
// ================================================================
const COLUMNS = ['todo', 'inprogress', 'done'];

// ================================================================
// 전역 상태
// ================================================================
let authUser       = null;  // supabase auth.User 객체
let currentProfile = null;  // profiles 테이블 row
let profiles       = [];    // 전체 팀원 배열
let cards          = [];    // 전체 카드 배열 (in-memory)

// 드래그 상태
let draggedId = null;
let dragEl    = null;

// 카드 모달 상태
let cardModalMode   = null;  // 'add' | 'edit'
let cardModalColumn = null;
let editingCardId   = null;

// ================================================================
// 유틸리티
// ================================================================

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = String(text ?? '');
    return div.innerHTML;
}

function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const el = document.createElement('div');
    el.className = `toast ${type}`;
    el.textContent = message;
    container.appendChild(el);
    setTimeout(() => el.remove(), 3500);
}

function showLoading(show) {
    document.getElementById('loading-overlay').classList.toggle('hidden', !show);
}

function authErrorMessage(error) {
    const msg = error?.message || error?.code || '';
    if (msg.includes('Invalid login credentials') || msg.includes('invalid_credentials')) {
        return '이메일 또는 비밀번호가 올바르지 않습니다.';
    }
    if (msg.includes('email_not_confirmed')) {
        return '이메일 인증이 필요합니다. 메일함을 확인해 주세요.';
    }
    if (msg.includes('User already registered') || msg.includes('already registered')) {
        return '이미 가입된 이메일입니다.';
    }
    if (msg.includes('Password should be at least')) {
        return '비밀번호는 6자 이상이어야 합니다.';
    }
    return `오류가 발생했습니다: ${msg}`;
}

// ================================================================
// 화면 전환
// ================================================================

function showAuthScreen() {
    document.getElementById('auth-screen').classList.remove('hidden');
    document.getElementById('app').classList.add('hidden');
}

function showBoardScreen() {
    document.getElementById('auth-screen').classList.add('hidden');
    document.getElementById('app').classList.remove('hidden');
}

// ================================================================
// 인증
// ================================================================

async function signInWithOAuth(provider) {
    const { error } = await sb.auth.signInWithOAuth({
        provider,
        options: {
            redirectTo: window.location.href.split('#')[0].split('?')[0],
        },
    });
    if (error) showToast(authErrorMessage(error), 'error');
}

async function signInWithEmail(email, password) {
    const { error } = await sb.auth.signInWithPassword({ email, password });
    if (error) return authErrorMessage(error);
    return null;
}

async function signUpWithEmail(name, email, password) {
    const { data, error } = await sb.auth.signUp({
        email,
        password,
        options: { data: { full_name: name.trim() } },
    });
    if (error) return authErrorMessage(error);
    if (!data.session) return '__EMAIL_CONFIRM__';
    return null;
}

async function signOut() {
    await sb.auth.signOut();
}

// ================================================================
// 프로필
// ================================================================

async function fetchCurrentProfile() {
    if (!authUser) return;
    const { data, error } = await sb
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .single();
    if (error) { showToast('프로필을 불러오지 못했습니다.', 'error'); return; }
    currentProfile = data;
}

async function fetchAllProfiles() {
    const { data, error } = await sb
        .from('profiles')
        .select('*')
        .order('created_at');
    if (error) { showToast('팀원 목록을 불러오지 못했습니다.', 'error'); return; }
    profiles = data || [];
}

async function updateProfileRole(id, newRole) {
    const { error } = await sb
        .from('profiles')
        .update({ role: newRole })
        .eq('id', id);
    if (error) { showToast('역할 변경에 실패했습니다.', 'error'); return false; }
    await fetchAllProfiles();
    return true;
}

function getProfileById(id) {
    return profiles.find(p => p.id === id) || null;
}

// ================================================================
// 카드 데이터
// ================================================================

async function fetchCards() {
    const { data, error } = await sb
        .from('cards')
        .select('*')
        .order('sort_order');
    if (error) { showToast('카드를 불러오지 못했습니다.', 'error'); return; }
    cards = data || [];
}

async function createCard({ title, description, columnName, assigneeId }) {
    const { data, error } = await sb.from('cards').insert({
        title:       title.trim(),
        description: description.trim(),
        column_name: columnName,
        sort_order:  cards.filter(c => c.column_name === columnName).length,
        assignee_id: assigneeId || null,
        created_by:  authUser.id,
    }).select().single();
    if (error) { showToast('카드 생성에 실패했습니다.', 'error'); return false; }
    cards.push(data);
    return true;
}

async function updateCard(id, patch) {
    const { error } = await sb
        .from('cards')
        .update({ ...patch, updated_at: new Date().toISOString() })
        .eq('id', id);
    if (error) { showToast('카드 수정에 실패했습니다.', 'error'); return false; }
    const idx = cards.findIndex(c => c.id === id);
    if (idx !== -1) Object.assign(cards[idx], patch);
    return true;
}

async function deleteCardById(id) {
    const { error } = await sb.from('cards').delete().eq('id', id);
    if (error) { showToast('카드 삭제에 실패했습니다.', 'error'); return false; }
    cards = cards.filter(c => c.id !== id);
    return true;
}

async function syncCardOrders(columnName, orderedIds) {
    if (!orderedIds.length) return;
    const now = new Date().toISOString();
    const updates = orderedIds.map((id, i) => ({
        id,
        column_name: columnName,
        sort_order:  i,
        updated_at:  now,
    }));
    const { error } = await sb.from('cards').upsert(updates);
    if (error) showToast('순서 저장에 실패했습니다.', 'error');
}

function getColumnCards(column) {
    return cards
        .filter(c => c.column_name === column)
        .sort((a, b) => a.sort_order - b.sort_order);
}

// ================================================================
// 권한
// ================================================================

function getPermissions(profile) {
    if (!profile) {
        return {
            canManageTeam:     false,
            canEditCard:       () => false,
            canDeleteCard:     () => false,
            canDragCard:       () => false,
            canChangeAssignee: false,
        };
    }
    const isAdmin = profile.role === 'admin';
    return {
        canManageTeam:     isAdmin,
        canEditCard:       (card) => isAdmin || card?.assignee_id === profile.id,
        canDeleteCard:     (card) => isAdmin || card?.assignee_id === profile.id,
        canDragCard:       (card) => isAdmin || card?.assignee_id === profile.id,
        canChangeAssignee: isAdmin,
    };
}

// ================================================================
// 렌더링
// ================================================================

function renderBoard() {
    COLUMNS.forEach(renderColumn);
    updateCardCounts();
    updateTeamManageBtn();
}

function renderColumn(column) {
    const list = document.getElementById(`list-${column}`);
    if (!list) return;
    list.innerHTML = '';
    const colCards = getColumnCards(column);
    if (colCards.length === 0) {
        const empty = document.createElement('p');
        empty.className = 'empty-col';
        empty.textContent = '카드가 없습니다.';
        list.appendChild(empty);
        return;
    }
    colCards.forEach(card => list.appendChild(createCardElement(card)));
}

function createCardElement(card) {
    const perms    = getPermissions(currentProfile);
    const canEdit  = perms.canEditCard(card);
    const canDrag  = perms.canDragCard(card);
    const assignee = getProfileById(card.assignee_id);

    const el = document.createElement('div');
    el.className = 'card' + (canDrag ? '' : ' no-drag');
    el.setAttribute('draggable', String(canDrag));
    el.dataset.id = card.id;
    el.setAttribute('role', 'listitem');

    el.innerHTML = `
        <div class="card-drag-handle" aria-hidden="true"></div>
        <div class="card-title-row">
            <h3 class="card-title">${escapeHtml(card.title)}</h3>
            <div class="card-actions">
                <button class="btn-icon btn-edit" title="수정" aria-label="카드 수정">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
                         stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"
                         aria-hidden="true">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                    </svg>
                </button>
                <button class="btn-icon btn-delete" title="삭제" aria-label="카드 삭제">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
                         stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"
                         aria-hidden="true">
                        <polyline points="3 6 5 6 21 6"/>
                        <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                        <path d="M10 11v6M14 11v6"/>
                        <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                    </svg>
                </button>
            </div>
        </div>
        ${card.description ? `<p class="card-desc">${escapeHtml(card.description)}</p>` : ''}
        <div class="card-footer">${renderAssigneeChip(assignee)}</div>
    `;

    if (!canEdit) {
        el.querySelector('.card-actions').style.display = 'none';
    } else {
        el.querySelector('.btn-edit').addEventListener('click', e => {
            e.stopPropagation();
            openCardModal('edit', null, card.id);
        });
        el.querySelector('.btn-delete').addEventListener('click', e => {
            e.stopPropagation();
            handleDeleteCard(card.id);
        });
    }

    if (canDrag) {
        el.addEventListener('dragstart', handleDragStart);
        el.addEventListener('dragend',   handleDragEnd);
    }

    return el;
}

function renderAssigneeChip(profile) {
    if (!profile) return `<span class="assignee-none">미배정</span>`;
    return `
        <div class="assignee-chip">
            <span class="avatar avatar--card" style="background-color:${escapeHtml(profile.color)}">${escapeHtml(profile.initials)}</span>
            <span class="assignee-name">${escapeHtml(profile.name)}</span>
        </div>`;
}

function updateCardCounts() {
    COLUMNS.forEach(col => {
        const el = document.getElementById(`count-${col}`);
        if (el) el.textContent = cards.filter(c => c.column_name === col).length;
    });
}

function renderCurrentUserUI() {
    if (!currentProfile) return;
    const avatarEl = document.getElementById('header-avatar');
    avatarEl.style.backgroundColor = currentProfile.color;
    avatarEl.textContent            = currentProfile.initials;
    document.getElementById('header-user-name').textContent = currentProfile.name;
    const badge = document.getElementById('header-role-badge');
    badge.textContent = currentProfile.role === 'admin' ? '관리자' : '팀원';
    badge.className   = `role-badge ${currentProfile.role}`;
    updateTeamManageBtn();
}

function updateTeamManageBtn() {
    const btn = document.getElementById('btn-team-manage');
    if (btn) btn.classList.toggle('hidden', currentProfile?.role !== 'admin');
}

function renderTeamPanel() {
    const list = document.getElementById('user-list');
    if (!list) return;
    list.innerHTML = '';

    profiles.forEach(p => {
        const isSelf = p.id === authUser?.id;
        const li = document.createElement('li');
        li.className = 'user-list-item';
        li.innerHTML = `
            <span class="avatar" style="background-color:${escapeHtml(p.color)}">${escapeHtml(p.initials)}</span>
            <div class="user-info">
                <div class="user-item-name">${escapeHtml(p.name)}</div>
                <div class="user-item-meta">
                    <span class="role-badge ${p.role === 'admin' ? 'admin-dark' : 'member-dark'}">
                        ${p.role === 'admin' ? '관리자' : '팀원'}
                    </span>
                    ${isSelf ? '<span class="user-self-tag">(나)</span>' : ''}
                </div>
            </div>
            ${!isSelf ? `
            <div class="user-item-actions">
                <button class="btn-role-change" title="${p.role === 'admin' ? '팀원으로 변경' : '관리자로 변경'}">
                    ${p.role === 'admin' ? '→팀원' : '→관리자'}
                </button>
            </div>` : ''}
        `;

        if (!isSelf) {
            li.querySelector('.btn-role-change').addEventListener('click', async () => {
                const newRole = p.role === 'admin' ? 'member' : 'admin';
                const ok = await updateProfileRole(p.id, newRole);
                if (ok) {
                    renderTeamPanel();
                    renderCurrentUserUI();
                    renderBoard();
                    showToast(`${p.name}의 역할을 변경했습니다.`, 'success');
                }
            });
        }

        list.appendChild(li);
    });
}

function renderAssigneeOptions(selectedId) {
    const select  = document.getElementById('input-card-assignee');
    const hint    = document.getElementById('assignee-hint');
    const isAdmin = currentProfile?.role === 'admin';
    select.innerHTML = '';

    if (isAdmin) {
        const noneOpt = new Option('미배정', '');
        if (!selectedId) noneOpt.selected = true;
        select.appendChild(noneOpt);
        profiles.forEach(p => {
            const opt = new Option(`${p.name} (${p.role === 'admin' ? '관리자' : '팀원'})`, p.id);
            if (p.id === selectedId) opt.selected = true;
            select.appendChild(opt);
        });
        select.disabled = false;
        if (hint) hint.textContent = '';
    } else {
        if (currentProfile) {
            select.appendChild(new Option(`${currentProfile.name} (본인)`, currentProfile.id, true, true));
        }
        select.disabled = true;
        if (hint) hint.textContent = '팀원은 본인에게만 카드를 배정할 수 있습니다.';
    }
}

// ================================================================
// 카드 모달
// ================================================================

function openCardModal(mode, column, cardId) {
    cardModalMode   = mode;
    cardModalColumn = column;
    editingCardId   = cardId;

    const titleInput = document.getElementById('input-card-title');
    const descInput  = document.getElementById('input-card-desc');

    document.getElementById('card-modal-title').textContent =
        mode === 'edit' ? '카드 수정' : '카드 추가';

    if (mode === 'edit') {
        const card = cards.find(c => c.id === cardId);
        if (!card) return;
        titleInput.value = card.title;
        descInput.value  = card.description || '';
        renderAssigneeOptions(card.assignee_id);
    } else {
        titleInput.value = '';
        descInput.value  = '';
        renderAssigneeOptions(currentProfile?.id || null);
    }

    titleInput.classList.remove('error');
    document.getElementById('card-modal-overlay').classList.add('active');
    setTimeout(() => titleInput.focus(), 60);
}

function closeCardModal() {
    document.getElementById('card-modal-overlay').classList.remove('active');
    document.getElementById('input-card-title').classList.remove('error');
    cardModalMode = cardModalColumn = editingCardId = null;
}

async function saveCard() {
    const titleInput  = document.getElementById('input-card-title');
    const title       = titleInput.value.trim();
    const description = document.getElementById('input-card-desc').value.trim();
    const assigneeId  = document.getElementById('input-card-assignee').value || null;

    if (!title) {
        titleInput.classList.add('error');
        titleInput.focus();
        return;
    }

    const saveBtn = document.getElementById('card-modal-save');
    saveBtn.disabled = true;

    let ok;
    if (cardModalMode === 'add') {
        ok = await createCard({ title, description, columnName: cardModalColumn, assigneeId });
    } else {
        const patch = { title, description };
        if (currentProfile?.role === 'admin') patch.assignee_id = assigneeId;
        ok = await updateCard(editingCardId, patch);
    }

    saveBtn.disabled = false;
    if (ok) {
        renderBoard();
        closeCardModal();
        showToast(cardModalMode === 'add' ? '카드를 추가했습니다.' : '카드를 수정했습니다.', 'success');
    }
}

// ================================================================
// 카드 삭제
// ================================================================

async function handleDeleteCard(id) {
    const card = cards.find(c => c.id === id);
    if (!confirm(`"${card?.title || '이 카드'}"를 삭제하시겠습니까?`)) return;
    const ok = await deleteCardById(id);
    if (ok) { renderBoard(); showToast('카드를 삭제했습니다.', 'info'); }
}

// ================================================================
// 팀원 관리 패널
// ================================================================

function openTeamPanel() {
    renderTeamPanel();
    document.getElementById('team-panel').classList.add('open');
    document.getElementById('team-panel-overlay').classList.add('active');
}

function closeTeamPanel() {
    document.getElementById('team-panel').classList.remove('open');
    document.getElementById('team-panel-overlay').classList.remove('active');
}

// ================================================================
// 드래그 앤 드롭
// ================================================================

function handleDragStart(e) {
    const card  = cards.find(c => c.id === this.dataset.id);
    const perms = getPermissions(currentProfile);
    if (!perms.canDragCard(card)) { e.preventDefault(); return; }

    draggedId = this.dataset.id;
    dragEl    = this;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', draggedId);
    setTimeout(() => this.classList.add('dragging'), 0);
}

function handleDragEnd() {
    if (dragEl) dragEl.classList.remove('dragging');
    if (draggedId) { renderBoard(); draggedId = null; }
    dragEl = null;
    document.querySelectorAll('.card-list').forEach(l => l.classList.remove('drag-over'));
}

function handleDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    this.classList.add('drag-over');
    const after = getDropPosition(this, e.clientY);
    if (dragEl) {
        if (after) this.insertBefore(dragEl, after);
        else        this.appendChild(dragEl);
    }
}

function handleDragLeave(e) {
    if (!this.contains(e.relatedTarget)) this.classList.remove('drag-over');
}

async function handleDrop(e) {
    e.preventDefault();
    const targetColumn = this.dataset.column;
    this.classList.remove('drag-over');
    if (!draggedId) return;

    const droppedId = draggedId;
    const droppedCard = cards.find(c => c.id === droppedId);
    const srcColumn = droppedCard?.column_name;

    // DOM 순서로 in-memory 상태 갱신 (낙관적 업데이트)
    const now = new Date().toISOString();
    const orderedIds = [...this.querySelectorAll('.card')].map(el => el.dataset.id);
    orderedIds.forEach((id, i) => {
        const card = cards.find(c => c.id === id);
        if (card) { card.column_name = targetColumn; card.sort_order = i; card.updated_at = now; }
    });

    draggedId = null;
    renderBoard();

    // 목적 컬럼 순서 저장
    await syncCardOrders(targetColumn, orderedIds);

    // 원본 컬럼이 다르면 원본 컬럼도 순서 재저장
    if (srcColumn && srcColumn !== targetColumn) {
        const srcIds = getColumnCards(srcColumn).map(c => c.id);
        await syncCardOrders(srcColumn, srcIds);
    }
}

function getDropPosition(container, mouseY) {
    const items = [...container.querySelectorAll('.card:not(.dragging)')];
    return items.reduce((closest, child) => {
        const box    = child.getBoundingClientRect();
        const offset = mouseY - box.top - box.height / 2;
        if (offset < 0 && offset > closest.offset) {
            return { offset, element: child };
        }
        return closest;
    }, { offset: Number.NEGATIVE_INFINITY }).element;
}

// ================================================================
// 인증 화면 이벤트 바인딩
// ================================================================

function initAuthScreen() {
    // 탭 전환
    document.querySelectorAll('.auth-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.auth-tab').forEach(t => {
                t.classList.remove('active');
                t.setAttribute('aria-selected', 'false');
            });
            tab.classList.add('active');
            tab.setAttribute('aria-selected', 'true');
            document.querySelectorAll('.auth-form').forEach(f => f.classList.add('hidden'));
            document.getElementById(tab.dataset.target).classList.remove('hidden');
        });
    });

    document.getElementById('btn-google-auth').addEventListener('click', () => {
        signInWithOAuth('google');
    });

    document.getElementById('btn-github-auth').addEventListener('click', () => {
        signInWithOAuth('github');
    });

    // 이메일 로그인
    document.getElementById('form-login').addEventListener('submit', async e => {
        e.preventDefault();
        const email    = document.getElementById('login-email').value.trim();
        const password = document.getElementById('login-password').value;
        const errorEl  = document.getElementById('login-error');
        errorEl.textContent = '';

        if (!email || !password) {
            errorEl.textContent = '이메일과 비밀번호를 입력해 주세요.';
            return;
        }
        const btn = e.target.querySelector('[type=submit]');
        btn.disabled = true;
        btn.textContent = '로그인 중...';

        const err = await signInWithEmail(email, password);
        btn.disabled = false;
        btn.textContent = '로그인';
        if (err) errorEl.textContent = err;
    });

    // 이메일 회원가입
    document.getElementById('form-signup').addEventListener('submit', async e => {
        e.preventDefault();
        const name     = document.getElementById('signup-name').value.trim();
        const email    = document.getElementById('signup-email').value.trim();
        const password = document.getElementById('signup-password').value;
        const errorEl  = document.getElementById('signup-error');
        errorEl.style.color = '';
        errorEl.textContent = '';

        if (!name || !email || !password) {
            errorEl.textContent = '모든 필드를 입력해 주세요.';
            return;
        }
        if (password.length < 6) {
            errorEl.textContent = '비밀번호는 6자 이상이어야 합니다.';
            return;
        }
        const btn = e.target.querySelector('[type=submit]');
        btn.disabled = true;
        btn.textContent = '가입 중...';

        const result = await signUpWithEmail(name, email, password);
        btn.disabled = false;
        btn.textContent = '회원가입';

        if (result === '__EMAIL_CONFIRM__') {
            errorEl.style.color = '#2f855a';
            errorEl.textContent = '확인 이메일을 발송했습니다. 메일함을 확인해 주세요.';
        } else if (result) {
            errorEl.textContent = result;
        }
    });
}

// ================================================================
// 보드 이벤트 바인딩
// ================================================================

function initBoardEvents() {
    document.querySelectorAll('.card-list').forEach(list => {
        list.addEventListener('dragover',  handleDragOver);
        list.addEventListener('dragleave', handleDragLeave);
        list.addEventListener('drop',      handleDrop);
    });

    document.querySelectorAll('.add-card-btn').forEach(btn => {
        btn.addEventListener('click', () => openCardModal('add', btn.dataset.column));
    });

    document.getElementById('card-modal-save').addEventListener('click', saveCard);
    document.getElementById('card-modal-cancel').addEventListener('click', closeCardModal);
    document.getElementById('card-modal-close').addEventListener('click', closeCardModal);
    document.getElementById('card-modal-overlay').addEventListener('click', e => {
        if (e.target === e.currentTarget) closeCardModal();
    });
    document.getElementById('input-card-title').addEventListener('input', function () {
        this.classList.remove('error');
    });

    document.getElementById('btn-team-manage').addEventListener('click', openTeamPanel);
    document.getElementById('team-panel-close').addEventListener('click', closeTeamPanel);
    document.getElementById('team-panel-overlay').addEventListener('click', closeTeamPanel);

    document.getElementById('btn-logout').addEventListener('click', async () => {
        await signOut();
    });

    document.addEventListener('keydown', e => {
        if (e.key === 'Escape') {
            closeCardModal();
            closeTeamPanel();
        }
        if (e.key === 'Enter'
            && document.getElementById('card-modal-overlay').classList.contains('active')
            && document.activeElement === document.getElementById('input-card-title')) {
            saveCard();
        }
    });
}

// ================================================================
// 초기화
// ================================================================

async function init() {
    showLoading(true);

    // 인증 상태 변경 — 화면 전환의 단일 진입점
    sb.auth.onAuthStateChange(async (event, session) => {
        if (session) {
            authUser = session.user;
            showLoading(true);
            await fetchCurrentProfile();
            await fetchAllProfiles();
            await fetchCards();
            showBoardScreen();
            renderBoard();
            renderCurrentUserUI();
            showLoading(false);
        } else {
            authUser       = null;
            currentProfile = null;
            profiles       = [];
            cards          = [];
            showAuthScreen();
            showLoading(false);
        }
    });

    initAuthScreen();
    initBoardEvents();
}

document.addEventListener('DOMContentLoaded', init);
