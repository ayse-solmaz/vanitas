const API = '/api';

let currentTab = 'aktif';
let projects = [];

const tabMap = {
  aktif: 'aktif',
  arastirma: 'arastirma',
  arsiv: 'arsiv',
  beklemede: 'beklemede',
  fikir: 'fikir'
};

const statusToTab = {
  aktif: 'aktif',
  beklemede: 'beklemede',
  fikir: 'fikir',
  arsiv: 'arsiv'
};

function categoryToTab(category) {
  if (category === 'arastirma') return 'arastirma';
  return 'aktif';
}

async function fetchProjects() {
  const res = await fetch(`${API}/projects`);
  projects = await res.json();
  renderAll();
}

async function fetchReminders() {
  const res = await fetch(`${API}/reminders`);
  const reminders = await res.json();
  renderReminders(reminders);
}

async function checkAgentStatus() {
  const res = await fetch(`${API}/agent/status`);
  const { available } = await res.json();
  const el = document.getElementById('agent-status');
  el.textContent = available ? 'Ajan aktif (Ollama)' : 'Ajansız mod';
  el.className = `agent-status ${available ? 'online' : 'offline'}`;
}

function renderAll() {
  renderTabs();
  renderRemindersPanel();
}

function renderTabs() {
  Object.keys(tabMap).forEach(tab => {
    const panel = document.getElementById(`tab-${tab}`);
    const filtered = projects.filter(p => {
      if (tab === 'aktif') return p.status === 'aktif' && p.category !== 'arastirma';
      if (tab === 'arastirma') return p.category === 'arastirma';
      return p.status === tab;
    });
    panel.innerHTML = filtered.length
      ? filtered.map(renderProjectCard).join('')
      : '<div class="empty-state"><p>Proje yok</p></div>';
  });
}

function renderProjectCard(p) {
  return `
    <div class="project-card" data-id="${p.id}">
      <div class="project-header">
        <div class="project-title">${escapeHtml(p.title)}</div>
        <div class="project-badges">
          <span class="badge badge-${p.category}">${p.category}</span>
          <span class="badge badge-${p.status}">${p.status}</span>
        </div>
      </div>
      <div class="project-updated">
        Son güncelleme: ${formatDate(p.updated_at)}
      </div>
      <div class="project-notes">${escapeHtml(p.notes || '(not yok)')}</div>
      <div class="project-actions">
        <button class="btn btn-secondary btn-sm edit-btn">Düzenle</button>
        <button class="btn btn-danger btn-sm delete-btn">Sil</button>
      </div>
    </div>
  `;
}

function renderReminders(reminders) {
  const container = document.getElementById('reminder-list');
  const section = document.getElementById('reminders');
  
  if (reminders.length === 0) {
    section.classList.add('hidden');
    return;
  }
  
  section.classList.remove('hidden');
  container.innerHTML = reminders.map(p => `
    <div class="reminder-item">
      <div class="reminder-info">
        <strong>${escapeHtml(p.title)}</strong>
        <span class="reminder-meta">
          ${p.category} • ${p.status} • ${daysSince(p.updated_at)} gün önce
        </span>
      </div>
      <button class="btn btn-primary btn-sm" onclick="openEditModal(${p.id})">Güncelle</button>
    </div>
  `).join('');
}

function renderRemindersPanel() {
  fetchReminders();
}

function formatDate(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function daysSince(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

document.addEventListener('click', async (e) => {
  if (e.target.matches('.tab-btn')) {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
    e.target.classList.add('active');
    document.getElementById(`tab-${e.target.dataset.tab}`).classList.add('active');
    currentTab = e.target.dataset.tab;
  }

  if (e.target.matches('.edit-btn')) {
    const id = parseInt(e.target.closest('.project-card').dataset.id);
    openEditModal(id);
  }

  if (e.target.matches('.delete-btn')) {
    const id = parseInt(e.target.closest('.project-card').dataset.id);
    if (confirm('Silinsin mi?')) {
      await fetch(`${API}/projects/${id}`, { method: 'DELETE' });
      fetchProjects();
    }
  }

  if (e.target === document.getElementById('add-project-btn')) {
    openEditModal();
  }

  if (e.target === document.getElementById('modal-cancel')) {
    document.getElementById('project-modal').close();
  }

  if (e.target === document.getElementById('chat-send')) {
    sendChatMessage();
  }
});

document.getElementById('project-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const id = document.getElementById('project-id').value;
  const data = {
    title: document.getElementById('project-title').value,
    category: document.getElementById('project-category').value,
    status: document.getElementById('project-status').value,
    notes: document.getElementById('project-notes').value
  };

  if (id) {
    await fetch(`${API}/projects/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
  } else {
    await fetch(`${API}/projects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
  }

  document.getElementById('project-modal').close();
  fetchProjects();
});

function openEditModal(id = null) {
  const modal = document.getElementById('project-modal');
  const form = document.getElementById('project-form');
  form.reset();
  document.getElementById('project-id').value = '';

  if (id) {
    const project = projects.find(p => p.id === id);
    if (!project) return;
    document.getElementById('modal-title').textContent = 'Projeyi Düzenle';
    document.getElementById('project-id').value = project.id;
    document.getElementById('project-title').value = project.title;
    document.getElementById('project-category').value = project.category;
    document.getElementById('project-status').value = project.status;
    document.getElementById('project-notes').value = project.notes;
  } else {
    document.getElementById('modal-title').textContent = 'Yeni Proje';
  }

  modal.showModal();
}

async function sendChatMessage() {
  const input = document.getElementById('chat-input');
  const message = input.value.trim();
  if (!message) return;

  appendChatMessage('user', message);
  input.value = '';

  const res = await fetch(`${API}/agent/message`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message })
  });

  const data = await res.json();
  appendChatMessage('agent', data.response);

  if (data.success && data.projectId) {
    fetchProjects();
  }
}

function appendChatMessage(role, text) {
  const container = document.getElementById('chat-messages');
  const div = document.createElement('div');
  div.className = `chat-message ${role}`;
  div.innerHTML = `<div class="label">${role === 'user' ? 'Sen' : 'Asistan'}</div><div class="text">${escapeHtml(text)}</div>`;
  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
}

fetchProjects();
checkAgentStatus();
setInterval(checkAgentStatus, 30000);

window.openEditModal = openEditModal;