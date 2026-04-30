import React, { useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import * as pdfjsLib from 'pdfjs-dist/build/pdf.mjs';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';
import { createWorker } from 'tesseract.js';
import {
  BookOpen,
  CalendarDays,
  CheckCircle2,
  Clock3,
  ChevronLeft,
  ChevronRight,
  FileText,
  Gauge,
  GraduationCap,
  LayoutDashboard,
  ListChecks,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
  Search,
  Settings,
  Sparkles,
  Upload,
} from 'lucide-react';
import './styles.css';
import QRCode from 'qrcode';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

const STORAGE_KEY = 'studyflow-state-v1';
const SYNC_STORAGE_KEY = 'studyflow-sync-v1';
const AUTO_SUBJECT = '__auto__';

const todayISO = () => new Date().toISOString().slice(0, 10);
const addDays = (date, days) => {
  const next = new Date(`${date}T00:00:00`);
  next.setDate(next.getDate() + days);
  return next.toISOString().slice(0, 10);
};
const getWeekStart = (date) => {
  const value = new Date(`${date}T00:00:00`);
  const day = value.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  value.setDate(value.getDate() + mondayOffset);
  return value.toISOString().slice(0, 10);
};

const sampleState = {
  subjects: [
    {
      id: 'bio',
      name: 'Biology 101',
      description: 'Cell modules and weekly lab review',
      code: 'BIO101',
      professor: 'Dr. Reyes',
      semester: '2nd Semester',
      color: '#2f9e78',
      difficulty: 'Hard',
      topics: ['Cell transport', 'Photosynthesis', 'Genetics basics'],
      pdfs: [
        { id: 'pdf-bio-1', name: 'BIO101 Course Outline.pdf', size: '1.2 MB', uploadedAt: todayISO() },
      ],
    },
    {
      id: 'calc',
      name: 'Calculus II',
      description: 'Practice sets, quizzes, and theorem review',
      code: 'MATH202',
      professor: 'Prof. Santos',
      semester: '2nd Semester',
      color: '#4f7cff',
      difficulty: 'Hard',
      topics: ['Integration by parts', 'Sequences', 'Power series'],
      pdfs: [],
    },
    {
      id: 'hist',
      name: 'Philippine History',
      description: 'Readings, essays, and source analysis',
      code: 'HIST110',
      professor: 'Ms. Dela Cruz',
      semester: '2nd Semester',
      color: '#e29547',
      difficulty: 'Medium',
      topics: ['Rizal writings', 'Propaganda movement', 'Revolution timeline'],
      pdfs: [
        { id: 'pdf-hist-1', name: 'Orientation Guide.pdf', size: '840 KB', uploadedAt: todayISO() },
      ],
    },
    {
      id: 'web',
      name: 'Web Systems',
      description: 'React, storage, and responsive UI lessons',
      code: 'IT305',
      professor: 'Engr. Lim',
      semester: '2nd Semester',
      color: '#9b6ade',
      difficulty: 'Medium',
      topics: ['React state', 'Local storage', 'Responsive layouts'],
      pdfs: [],
    },
  ],
  tasks: [
    {
      id: 'task-1',
      title: 'Cell transport seatwork',
      subjectId: 'bio',
      type: 'Seatwork',
      deadline: addDays(todayISO(), 2),
      priority: 'High',
      status: 'In Progress',
      notes: 'Answer module guide questions 1-20.',
    },
    {
      id: 'task-2',
      title: 'Integration techniques quiz',
      subjectId: 'calc',
      type: 'Quiz',
      deadline: addDays(todayISO(), 5),
      priority: 'High',
      status: 'Not Started',
      notes: 'Review substitution and integration by parts.',
    },
    {
      id: 'task-3',
      title: 'Rizal essay outline',
      subjectId: 'hist',
      type: 'Project',
      deadline: addDays(todayISO(), 9),
      priority: 'Medium',
      status: 'Not Started',
      notes: 'Draft thesis and supporting sources.',
    },
    {
      id: 'task-4',
      title: 'React localStorage reading',
      subjectId: 'web',
      type: 'Reading',
      deadline: addDays(todayISO(), 1),
      priority: 'Medium',
      status: 'Done',
      notes: 'Summarize examples in notes.',
    },
  ],
  studyBlocks: [
    { id: 'block-1', date: todayISO(), subjectId: 'bio', title: 'Review cell transport', kind: 'Study', minutes: 60 },
    { id: 'block-2', date: addDays(todayISO(), 1), subjectId: 'calc', title: 'Practice integration sets', kind: 'Study', minutes: 75 },
    { id: 'block-3', date: addDays(todayISO(), 4), subjectId: 'calc', title: 'Quiz review day', kind: 'Review', minutes: 60 },
  ],
  weeklyFocus: [
    { id: 'focus-1', subjectId: 'bio', weekStart: getWeekStart(todayISO()), studiedDone: false, tasksChecked: false },
    { id: 'focus-2', subjectId: 'calc', weekStart: getWeekStart(todayISO()), studiedDone: false, tasksChecked: false },
  ],
  weeklyStudyChecks: [
    { id: 'check-bio', subjectId: 'bio', weekStart: getWeekStart(todayISO()), studiedDone: true, tasksChecked: false },
    { id: 'check-calc', subjectId: 'calc', weekStart: getWeekStart(todayISO()), studiedDone: false, tasksChecked: false },
  ],
};

function loadInitialState() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? normalizeState(JSON.parse(saved)) : sampleState;
  } catch {
    return sampleState;
  }
}

function normalizeState(saved) {
  return {
    ...sampleState,
    ...saved,
    subjects: (saved.subjects || sampleState.subjects).map((subject) => ({
      description: '',
      ...subject,
    })),
    tasks: saved.tasks || sampleState.tasks,
    studyBlocks: saved.studyBlocks || sampleState.studyBlocks,
    weeklyFocus: (saved.weeklyFocus || sampleState.weeklyFocus).map((item) => ({
      studiedDone: false,
      tasksChecked: false,
      ...item,
    })),
    weeklyStudyChecks: (saved.weeklyStudyChecks || sampleState.weeklyStudyChecks).map((item) => ({
      studiedDone: Boolean(item.studied ?? item.studiedDone),
      tasksChecked: false,
      ...item,
    })),
  };
}

function base64UrlEncode(bytes) {
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function base64UrlDecodeToBytes(value) {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function randomBase64Url(byteLength) {
  const bytes = new Uint8Array(byteLength);
  crypto.getRandomValues(bytes);
  return base64UrlEncode(bytes);
}

function getSyncFromHash() {
  const hash = window.location.hash || '';
  const match = hash.match(/(?:^|[&#])sync=([^&]+)/);
  if (!match) return null;
  try {
    const raw = decodeURIComponent(match[1]);
    const [roomId, secret] = raw.split('.');
    if (!roomId || !secret) return null;
    return { roomId, secret };
  } catch {
    return null;
  }
}

function loadSyncConfig() {
  try {
    const saved = localStorage.getItem(SYNC_STORAGE_KEY);
    if (!saved) return null;
    const parsed = JSON.parse(saved);
    if (!parsed || typeof parsed !== 'object') return null;
    return {
      enabled: Boolean(parsed.enabled),
      roomId: typeof parsed.roomId === 'string' ? parsed.roomId : '',
      secret: typeof parsed.secret === 'string' ? parsed.secret : '',
      lastPulledAt: typeof parsed.lastPulledAt === 'number' ? parsed.lastPulledAt : null,
      lastPushedAt: typeof parsed.lastPushedAt === 'number' ? parsed.lastPushedAt : null,
      lastRemoteUpdatedAt: typeof parsed.lastRemoteUpdatedAt === 'number' ? parsed.lastRemoteUpdatedAt : null,
    };
  } catch {
    return null;
  }
}

function saveSyncConfig(value) {
  localStorage.setItem(SYNC_STORAGE_KEY, JSON.stringify(value));
}

function initSyncConfig() {
  const fromStorage = loadSyncConfig();
  const fromHash = getSyncFromHash();
  if (fromHash) {
    const merged = {
      enabled: true,
      roomId: fromHash.roomId,
      secret: fromHash.secret,
      lastPulledAt: fromStorage?.lastPulledAt ?? null,
      lastPushedAt: fromStorage?.lastPushedAt ?? null,
      lastRemoteUpdatedAt: fromStorage?.lastRemoteUpdatedAt ?? null,
    };
    saveSyncConfig(merged);
    return merged;
  }
  return (
    fromStorage ?? {
      enabled: false,
      roomId: '',
      secret: '',
      lastPulledAt: null,
      lastPushedAt: null,
      lastRemoteUpdatedAt: null,
    }
  );
}

async function deriveAesKey(secret, saltBytes) {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'PBKDF2' }, false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: saltBytes, iterations: 100_000, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

function runInIdle(callback, timeoutMs = 1200) {
  if (typeof window.requestIdleCallback === 'function') {
    window.requestIdleCallback(callback, { timeout: timeoutMs });
    return;
  }
  window.setTimeout(callback, 0);
}

async function getCachedAesKey(keyCache, secret, roomId) {
  const cacheKey = `${roomId}.${secret}`;
  const existing = keyCache.get(cacheKey);
  if (existing) return existing;
  const saltBytes = base64UrlDecodeToBytes(roomId);
  const derived = await deriveAesKey(secret, saltBytes);
  keyCache.set(cacheKey, derived);
  return derived;
}

async function encryptState(secret, roomId, state, keyCache) {
  const ivBytes = new Uint8Array(12);
  crypto.getRandomValues(ivBytes);
  const key = await getCachedAesKey(keyCache, secret, roomId);
  const encoder = new TextEncoder();
  const plaintext = encoder.encode(JSON.stringify(state));
  const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv: ivBytes }, key, plaintext);
  return {
    v: 2,
    iv: base64UrlEncode(ivBytes),
    ct: base64UrlEncode(new Uint8Array(encrypted)),
  };
}

async function decryptState(secret, roomId, payload, keyCache) {
  if (!payload) throw new Error('missing payload');
  const ivBytes = base64UrlDecodeToBytes(payload.iv);
  const ctBytes = base64UrlDecodeToBytes(payload.ct);

  if (payload.v === 1) {
    const saltBytes = base64UrlDecodeToBytes(payload.salt);
    const key = await deriveAesKey(secret, saltBytes);
    const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: ivBytes }, key, ctBytes);
    const decoder = new TextDecoder();
    return normalizeState(JSON.parse(decoder.decode(new Uint8Array(decrypted))));
  }

  if (payload.v !== 2) throw new Error('unsupported payload version');
  const key = await getCachedAesKey(keyCache, secret, roomId);
  const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: ivBytes }, key, ctBytes);
  const decoder = new TextDecoder();
  return normalizeState(JSON.parse(decoder.decode(new Uint8Array(decrypted))));
}

async function fetchRemote(roomId) {
  const response = await fetch(`/api/sync?roomId=${encodeURIComponent(roomId)}`, { method: 'GET' });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`sync pull failed (${response.status})`);
  return response.json();
}

async function pushRemote(roomId, payload) {
  const response = await fetch(`/api/sync?roomId=${encodeURIComponent(roomId)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ payload }),
  });
  if (!response.ok) throw new Error(`sync push failed (${response.status})`);
  return response.json();
}

function App() {
  const [state, setState] = useState(loadInitialState);
  const [activeView, setActiveView] = useState('Dashboard');
  const [taskFilter, setTaskFilter] = useState('All');
  const [calendarMode, setCalendarMode] = useState('Week');
  const [calendarOffset, setCalendarOffset] = useState(0);
  const [dashboardWeekOffset, setDashboardWeekOffset] = useState(0);
  const [calendarScheduleBlocks, setCalendarScheduleBlocks] = useState([]);
  const [scanStatus, setScanStatus] = useState({ loading: false, message: 'Ready to scan combined orientation PDFs.' });
  const [subjectToDelete, setSubjectToDelete] = useState(null);
  const [subjectModal, setSubjectModal] = useState(null);
  const [studyDurationModal, setStudyDurationModal] = useState(null);
  const [syncConfig, setSyncConfig] = useState(initSyncConfig);
  const [syncRuntime, setSyncRuntime] = useState({ busy: false, error: null });
  const applyingRemoteRef = useRef(false);
  const pushTimerRef = useRef(null);
  const pullTimerRef = useRef(null);
  const syncKeyCacheRef = useRef(new Map());

  React.useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  React.useEffect(() => {
    saveSyncConfig(syncConfig);
  }, [syncConfig]);

  React.useEffect(() => {
    if (!syncConfig.enabled || !syncConfig.roomId || !syncConfig.secret) return () => {};

    let cancelled = false;

    const pullOnce = async () => {
      setSyncRuntime((current) => ({ ...current, busy: true, error: null }));
      try {
        const remote = await fetchRemote(syncConfig.roomId);
        if (cancelled) return;

        const remoteUpdatedAt = typeof remote?.updatedAt === 'number' ? remote.updatedAt : null;
        const shouldApply =
          remote?.payload &&
          remoteUpdatedAt &&
          remoteUpdatedAt !== syncConfig.lastRemoteUpdatedAt &&
          (syncConfig.lastPushedAt == null || remoteUpdatedAt > syncConfig.lastPushedAt);

        if (shouldApply) {
          const next = await decryptState(syncConfig.secret, syncConfig.roomId, remote.payload, syncKeyCacheRef.current);
          if (cancelled) return;
          applyingRemoteRef.current = true;
          setState(next);
          queueMicrotask(() => {
            applyingRemoteRef.current = false;
          });
        }

        setSyncConfig((current) => ({
          ...current,
          lastPulledAt: Date.now(),
          lastRemoteUpdatedAt: remoteUpdatedAt ?? current.lastRemoteUpdatedAt,
        }));
      } catch (error) {
        if (!cancelled) setSyncRuntime((current) => ({ ...current, error: String(error?.message ?? error) }));
      } finally {
        if (!cancelled) setSyncRuntime((current) => ({ ...current, busy: false }));
      }
    };

    pullOnce();

    pullTimerRef.current = window.setInterval(() => {
      if (document.visibilityState === 'visible') pullOnce();
    }, 8000);

    return () => {
      cancelled = true;
      if (pullTimerRef.current) window.clearInterval(pullTimerRef.current);
      pullTimerRef.current = null;
    };
  }, [syncConfig.enabled, syncConfig.roomId, syncConfig.secret, syncConfig.lastPushedAt, syncConfig.lastRemoteUpdatedAt]);

  React.useEffect(() => {
    if (!syncConfig.enabled || !syncConfig.roomId || !syncConfig.secret) return () => {};
    if (applyingRemoteRef.current) return () => {};

    if (pushTimerRef.current) window.clearTimeout(pushTimerRef.current);
    pushTimerRef.current = window.setTimeout(() => {
      runInIdle(async () => {
        try {
          setSyncRuntime((current) => ({ ...current, error: null }));
          const payload = await encryptState(syncConfig.secret, syncConfig.roomId, state, syncKeyCacheRef.current);
          const result = await pushRemote(syncConfig.roomId, payload);
          const updatedAt = typeof result?.updatedAt === 'number' ? result.updatedAt : Date.now();
          setSyncConfig((current) => ({
            ...current,
            lastPushedAt: Date.now(),
            lastRemoteUpdatedAt: updatedAt,
          }));
        } catch (error) {
          setSyncRuntime((current) => ({ ...current, error: String(error?.message ?? error) }));
        }
      });
    }, 1400);

    return () => {
      if (pushTimerRef.current) window.clearTimeout(pushTimerRef.current);
      pushTimerRef.current = null;
    };
  }, [state, syncConfig.enabled, syncConfig.roomId, syncConfig.secret]);

  const subjectsById = useMemo(
    () => Object.fromEntries(state.subjects.map((subject) => [subject.id, subject])),
    [state.subjects],
  );

  const reminders = useMemo(() => buildReminders(state.tasks), [state.tasks]);
  const schedule = useMemo(() => [...state.studyBlocks].sort((a, b) => a.date.localeCompare(b.date)), [state.studyBlocks]);
  const dashboardData = useMemo(
    () => getDashboardData(state, reminders, subjectsById, dashboardWeekOffset),
    [state, reminders, subjectsById, dashboardWeekOffset],
  );

  React.useEffect(() => {
    setCalendarScheduleBlocks([]);
  }, [calendarMode, calendarOffset]);

  const updateState = (recipe) => setState((current) => recipe(structuredClone(current)));

  const saveSubject = ({ id, name, description }) => {
    const trimmedName = name.trim();
    const trimmedDescription = description.trim();
    if (!trimmedName) return false;
    if (id) {
      updateState((draft) => {
        const subject = draft.subjects.find((item) => item.id === id);
        if (subject) {
          subject.name = trimmedName;
          subject.description = trimmedDescription;
        }
        return draft;
      });
      setSubjectModal(null);
      return true;
    }
    const colors = ['#2f9e78', '#4f7cff', '#e29547', '#9b6ade', '#d64f7b', '#0f9fb5'];
    updateState((draft) => {
      draft.subjects.push({
        id: crypto.randomUUID(),
        name: trimmedName,
        description: trimmedDescription,
        code: makeCourseCode(trimmedName),
        professor: 'Personal subject',
        semester: 'Current Semester',
        color: colors[draft.subjects.length % colors.length],
        difficulty: 'Medium',
        topics: [],
        pdfs: [],
      });
      return draft;
    });
    setSubjectModal(null);
    return true;
  };

  const addTask = (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const title = form.get('title')?.trim();
    const subjectId = form.get('subjectId');
    if (!title || !subjectId) return;
    updateState((draft) => {
      draft.tasks.push({
        id: crypto.randomUUID(),
        title,
        subjectId,
        type: form.get('type'),
        deadline: form.get('deadline') || todayISO(),
        priority: form.get('priority'),
        status: 'Not Started',
        notes: form.get('notes')?.trim() || '',
      });
      return draft;
    });
    event.currentTarget.reset();
  };

  const addTopic = (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const topic = form.get('topic')?.trim();
    if (!topic) return;
    updateState((draft) => {
      const subject = draft.subjects.find((item) => item.id === form.get('subjectId'));
      subject?.topics.push(topic);
      return draft;
    });
    event.currentTarget.reset();
  };

  const uploadPdf = async (event) => {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(event.currentTarget);
    const file = form.get('pdf');
    if (!file?.name) return;
    setScanStatus({ loading: true, message: `Scanning ${file.name}...` });
    try {
      const scan = await extractPdfText(file, (message) => setScanStatus({ loading: true, message }));
      const selectedSubjectId = form.get('subjectId');
      const { nextState, importResult } = buildImportedPdfState(state, {
          file,
          text: scan.text,
          selectedSubjectId,
          scanMode: selectedSubjectId === AUTO_SUBJECT ? 'auto' : 'single',
      });
      setState(nextState);
      setScanStatus({
        loading: false,
        message: `Scanned ${file.name} with ${scan.method}: detected ${importResult.subjectsDetected} subject names, added ${importResult.subjectsAdded} new subjects, ${importResult.topicsAdded} topics, ${importResult.tasksAdded} deadlines/tasks, ${scan.text.length.toLocaleString()} text characters.`,
        subjects: importResult.subjectNames,
        preview: scan.text.slice(0, 900),
      });
      formElement.reset();
      setActiveView('Calendar');
    } catch (error) {
      setScanStatus({
        loading: false,
        message: `Could not scan this PDF yet. It may be image-only or protected. You can still add items manually. (${error.message})`,
      });
    }
  };

  const updateTaskStatus = (taskId, status) => {
    updateState((draft) => {
      const task = draft.tasks.find((item) => item.id === taskId);
      if (task) task.status = status;
      return draft;
    });
  };

  const deleteTask = (taskId) => {
    updateState((draft) => {
      draft.tasks = draft.tasks.filter((task) => task.id !== taskId);
      return draft;
    });
  };

  const addWeeklyFocusSubject = (subjectId, weekStart) => {
    if (!subjectId) return;
    updateState((draft) => {
      draft.weeklyFocus = draft.weeklyFocus || [];
      const exists = draft.weeklyFocus.some((item) => item.subjectId === subjectId && item.weekStart === weekStart);
      if (!exists) draft.weeklyFocus.push({ id: crypto.randomUUID(), subjectId, weekStart, studiedDone: false, tasksChecked: false });
      return draft;
    });
  };

  const updateWeeklyFocusStatus = (focusId, field, checked) => {
    updateState((draft) => {
      const focusItem = (draft.weeklyFocus || []).find((item) => item.id === focusId);
      if (focusItem) focusItem[field] = checked;
      return draft;
    });
  };

  const deleteWeeklyFocusSubject = (focusId) => {
    updateState((draft) => {
      draft.weeklyFocus = (draft.weeklyFocus || []).filter((item) => item.id !== focusId);
      return draft;
    });
  };

  const renameSubject = (subjectId, name) => {
    const nextName = name.trim();
    if (!nextName) return;
    updateState((draft) => {
      const subject = draft.subjects.find((item) => item.id === subjectId);
      if (subject) subject.name = nextName;
      return draft;
    });
  };

  const logStudyTime = (subjectId, minutes) => {
    updateState((draft) => {
      const subject = draft.subjects.find((item) => item.id === subjectId);
      if (!subject) return draft;
      draft.studyBlocks.push({
        id: crypto.randomUUID(),
        date: todayISO(),
        subjectId,
        title: `Logged study time for ${subject.name}`,
        kind: 'Study Log',
        minutes,
      });
      return draft;
    });
  };

  const toggleWeeklyStudyCheck = (subjectId, weekStart, field, checked) => {
    updateState((draft) => {
      draft.weeklyStudyChecks = draft.weeklyStudyChecks || [];
      const existing = draft.weeklyStudyChecks.find((item) => item.subjectId === subjectId && item.weekStart === weekStart);
      if (existing) {
        existing[field] = checked;
      } else {
        draft.weeklyStudyChecks.push({
          id: crypto.randomUUID(),
          subjectId,
          weekStart,
          studiedDone: field === 'studiedDone' ? checked : false,
          tasksChecked: field === 'tasksChecked' ? checked : false,
        });
      }
      return draft;
    });
  };

  const openStudyDurationModal = (subjectId, weekStart, field) => {
    const subject = state.subjects.find((item) => item.id === subjectId);
    if (subject) setStudyDurationModal({ subject, weekStart, field });
  };

  const saveStudyDuration = (hours) => {
    const parsed = Number(hours);
    if (!studyDurationModal || !Number.isFinite(parsed) || parsed <= 0) return;
    logStudyTime(studyDurationModal.subject.id, Math.round(parsed * 60));
    toggleWeeklyStudyCheck(studyDurationModal.subject.id, studyDurationModal.weekStart, studyDurationModal.field, true);
    setStudyDurationModal(null);
  };

  const deleteSubject = (subjectId) => {
    const subject = state.subjects.find((item) => item.id === subjectId);
    if (!subject) return;
    setSubjectToDelete(subject);
  };

  const confirmDeleteSubject = () => {
    if (!subjectToDelete) return;
    updateState((draft) => {
      draft.subjects = draft.subjects.filter((item) => item.id !== subjectToDelete.id);
      draft.tasks = draft.tasks.filter((task) => task.subjectId !== subjectToDelete.id);
      draft.studyBlocks = draft.studyBlocks.filter((block) => block.subjectId !== subjectToDelete.id);
      draft.weeklyFocus = (draft.weeklyFocus || []).filter((item) => item.subjectId !== subjectToDelete.id);
      draft.weeklyStudyChecks = (draft.weeklyStudyChecks || []).filter((item) => item.subjectId !== subjectToDelete.id);
      return draft;
    });
    setSubjectToDelete(null);
  };

  const generateSchedule = () => {
    updateState((draft) => {
      draft.studyBlocks = buildGeneratedSchedule(draft, Object.fromEntries(draft.subjects.map((s) => [s.id, s])));
      return draft;
    });
  };

  const generateCalendarStudySchedule = () => {
    setCalendarScheduleBlocks(buildOptionalCalendarSchedule(state, calendarMode, calendarOffset));
  };

  const clearCalendarStudySchedule = () => setCalendarScheduleBlocks([]);

  const resetData = () => setState(structuredClone(sampleState));

  return (
    <div className="app-shell">
      <Sidebar activeView={activeView} setActiveView={setActiveView} />
      <main className="main">
        <Topbar activeView={activeView} tasks={state.tasks} />
        {activeView === 'Dashboard' && (
          <Dashboard
            data={dashboardData}
            subjectsById={subjectsById}
            reminders={reminders}
            schedule={schedule}
            tasks={state.tasks}
            generateSchedule={generateSchedule}
            setActiveView={setActiveView}
            subjects={state.subjects}
            weekOffset={dashboardWeekOffset}
            setWeekOffset={setDashboardWeekOffset}
            logStudyTime={logStudyTime}
            toggleWeeklyStudyCheck={toggleWeeklyStudyCheck}
            openStudyDurationModal={openStudyDurationModal}
          />
        )}
        {activeView === 'Subjects' && (
          <Subjects
            subjects={state.subjects}
            tasks={state.tasks}
            addTopic={addTopic}
            studyBlocks={state.studyBlocks}
            openSubjectModal={setSubjectModal}
            setActiveView={setActiveView}
            renameSubject={renameSubject}
            deleteSubject={deleteSubject}
          />
        )}
        {activeView === 'Calendar' && (
          <CalendarView
            mode={calendarMode}
            setMode={setCalendarMode}
            offset={calendarOffset}
            setOffset={setCalendarOffset}
            tasks={state.tasks}
            blocks={calendarScheduleBlocks}
            subjectsById={subjectsById}
            scheduleGenerated={calendarScheduleBlocks.length > 0}
            generateCalendarStudySchedule={generateCalendarStudySchedule}
            clearCalendarStudySchedule={clearCalendarStudySchedule}
          />
        )}
        {activeView === 'Tasks' && (
          <TasksView
            subjects={state.subjects}
            subjectsById={subjectsById}
            tasks={state.tasks}
            taskFilter={taskFilter}
            setTaskFilter={setTaskFilter}
            addTask={addTask}
            updateTaskStatus={updateTaskStatus}
            deleteTask={deleteTask}
          />
        )}
        {activeView === 'Upload PDFs' && (
          <UploadView
            subjects={state.subjects}
            uploadPdf={uploadPdf}
            addTask={addTask}
            addTopic={addTopic}
            scanStatus={scanStatus}
          />
        )}
        {activeView === 'Settings' && (
          <SettingsView
            resetData={resetData}
            state={state}
            syncConfig={syncConfig}
            setSyncConfig={setSyncConfig}
            syncRuntime={syncRuntime}
          />
        )}
      </main>
      {subjectToDelete ? (
        <ConfirmModal
          subject={subjectToDelete}
          onCancel={() => setSubjectToDelete(null)}
          onConfirm={confirmDeleteSubject}
        />
      ) : null}
      {subjectModal ? (
        <SubjectModal
          subject={subjectModal === 'new' ? null : subjectModal}
          onClose={() => setSubjectModal(null)}
          onSave={saveSubject}
        />
      ) : null}
      {studyDurationModal ? (
        <StudyDurationModal
          subject={studyDurationModal.subject}
          session={studyDurationModal.field === 'studiedDone' ? 'Study session 1' : 'Study session 2'}
          onCancel={() => setStudyDurationModal(null)}
          onSave={saveStudyDuration}
        />
      ) : null}
    </div>
  );
}

function Sidebar({ activeView, setActiveView }) {
  const items = [
    ['Dashboard', LayoutDashboard],
    ['Subjects', BookOpen],
    ['Calendar', CalendarDays],
    ['Tasks', ListChecks],
    ['Upload PDFs', Upload],
    ['Settings', Settings],
  ];
  return (
    <aside className="sidebar">
      <button className="brand" onClick={() => setActiveView('Dashboard')} aria-label="Go to StudyFlow dashboard">
        <div className="brand-mark"><GraduationCap size={24} /></div>
        <div>
          <strong>StudyFlow</strong>
          <span>Student planner</span>
        </div>
      </button>
      <nav>
        {items.map(([label, Icon]) => (
          <button
            className={activeView === label ? 'nav-item active' : 'nav-item'}
            key={label}
            onClick={() => setActiveView(label)}
          >
            <Icon size={18} />
            {label}
          </button>
        ))}
      </nav>
      <div className="sidebar-note">
        <Sparkles size={18} />
        <p>Upload outlines, add tasks, and let StudyFlow shape the week.</p>
      </div>
    </aside>
  );
}

function Topbar({ activeView, tasks }) {
  const done = tasks.filter((task) => task.status === 'Done').length;
  return (
    <header className="topbar">
      <div>
        <p className="eyebrow">Personal study command center</p>
        <h1>{activeView}</h1>
      </div>
      <div className="search-box">
        <Search size={17} />
        <span>{done} of {tasks.length} tasks complete</span>
      </div>
    </header>
  );
}

function ConfirmModal({ subject, onCancel, onConfirm }) {
  return (
    <div className="modal-backdrop" role="presentation">
      <div className="confirm-modal" role="dialog" aria-modal="true" aria-labelledby="delete-subject-title">
        <div className="modal-icon"><Trash2 size={20} /></div>
        <h2 id="delete-subject-title">Are you sure about this cuzzo?</h2>
        <p>
          Deleting <strong>{subject.name}</strong> will also remove its tasks, topics, PDFs, and study blocks.
        </p>
        <div className="modal-actions">
          <button className="modal-cancel" onClick={onCancel}>Cancel</button>
          <button className="modal-delete" onClick={onConfirm}>Delete subject</button>
        </div>
      </div>
    </div>
  );
}

function StudyDurationModal({ subject, session, onCancel, onSave }) {
  const [hours, setHours] = useState('');
  const submit = (event) => {
    event.preventDefault();
    onSave(hours);
  };

  return (
    <div className="modal-backdrop" role="presentation">
      <form className="study-duration-modal" onSubmit={submit} role="dialog" aria-modal="true" aria-labelledby="study-duration-title">
        <div className="modal-icon"><Clock3 size={20} /></div>
        <p className="eyebrow">{session}</p>
        <h2 id="study-duration-title">How long did you study?</h2>
        <p className="muted">{subject.name}</p>
        <label className="duration-field">
          Hours studied
          <input
            type="number"
            min="0.1"
            step="0.25"
            value={hours}
            onChange={(event) => setHours(event.target.value)}
            placeholder="Example: 1.5"
            autoFocus
            required
          />
        </label>
        <div className="modal-actions">
          <button type="button" className="modal-cancel" onClick={onCancel}>Cancel</button>
          <button className="modal-delete" type="submit">Save session</button>
        </div>
      </form>
    </div>
  );
}

function Dashboard({
  data,
  subjectsById,
  reminders,
  schedule,
  tasks,
  generateSchedule,
  setActiveView,
  subjects,
  weekOffset,
  setWeekOffset,
  logStudyTime,
  toggleWeeklyStudyCheck,
  openStudyDurationModal,
}) {
  return (
    <section className="dashboard-grid">
      <Panel className="hours-panel">
        <div className="panel-title-row">
          <div>
            <p className="eyebrow">Hours</p>
            <h2>This week</h2>
            <p className="muted">{data.weekLabel}</p>
          </div>
          <div className="week-picker">
            <button onClick={() => setWeekOffset(weekOffset - 1)} title="Previous week">
              <ChevronLeft size={16} />
            </button>
            <label>
              <input
                type="checkbox"
                checked={weekOffset === 0}
                onChange={() => setWeekOffset(0)}
              />
              This week
            </label>
            <button onClick={() => setWeekOffset(weekOffset + 1)} title="Next week">
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
        <SubjectHours
          subjects={subjects}
          hours={data.weeklyHours}
          checks={data.weeklyStudyChecks}
            weekStart={data.weekStart}
            logStudyTime={logStudyTime}
            toggleWeeklyStudyCheck={toggleWeeklyStudyCheck}
            openStudyDurationModal={openStudyDurationModal}
          />
      </Panel>
      <Panel className="today-panel">
        <div className="panel-title-row">
          <div>
            <p className="eyebrow">Optional</p>
            <h2>Study options</h2>
          </div>
          <button className="icon-button" onClick={generateSchedule} title="Generate schedule">
            <RefreshCw size={18} />
          </button>
        </div>
        <div className="study-list">
          {data.todayBlocks.length ? data.todayBlocks.map((block) => (
            <StudyBlock block={block} subject={subjectsById[block.subjectId]} key={block.id} />
          )) : <EmptyState text="No suggested blocks today. Use this only if you want optional guidance." />}
        </div>
      </Panel>
      <Metric label="Completed this week" value={data.completedThisWeek} helper="tasks marked done" icon={CheckCircle2} />
      <Metric label="Upcoming deadlines" value={data.upcoming.length} helper="next 10 days" icon={Clock3} />
      <Panel className="wide">
        <div className="panel-title-row">
          <div>
            <p className="eyebrow">Urgent</p>
            <h2>Reminders</h2>
          </div>
          <button className="text-button" onClick={() => setActiveView('Tasks')}>Open tasks</button>
        </div>
        <div className="reminder-list">
          {reminders.slice(0, 5).map((reminder) => (
            <div className={reminder.daysUntil <= 3 ? 'reminder urgent' : 'reminder'} key={reminder.id}>
              <span>{reminder.label}</span>
              <strong>{reminder.task.title}</strong>
              <small>{subjectsById[reminder.task.subjectId]?.name} · {formatDate(reminder.task.deadline)}</small>
            </div>
          ))}
        </div>
      </Panel>
      <Panel>
        <div className="panel-title-row">
          <div>
            <p className="eyebrow">Subjects</p>
            <h2>Progress</h2>
          </div>
        </div>
        <div className="progress-list">
          {data.progress.map((item) => (
            <div key={item.subject.id} className="progress-item">
              <div>
                <strong>{item.subject.name}</strong>
                <span>{item.done}/{item.total || 1} tasks</span>
              </div>
              <div className="progress-track">
                <div style={{ width: `${item.percent}%`, background: item.subject.color }} />
              </div>
            </div>
          ))}
        </div>
      </Panel>
      <Panel className="wide">
        <div className="panel-title-row">
          <div>
            <p className="eyebrow">Next up</p>
            <h2>Deadlines</h2>
          </div>
        </div>
        <TaskList tasks={data.upcoming.slice(0, 5)} subjectsById={subjectsById} compact />
      </Panel>
      <Panel>
        <div className="panel-title-row">
          <div>
            <p className="eyebrow">Optional</p>
            <h2>Plan helper</h2>
          </div>
        </div>
        <p className="muted">Optional helper based on unfinished tasks and checked weekly subjects.</p>
        <button className="primary-button full" onClick={generateSchedule}>
          <Sparkles size={17} />
          Generate optional plan
        </button>
        <div className="mini-timeline">
          {schedule.slice(0, 5).map((block) => (
            <span key={block.id}>{new Date(`${block.date}T00:00:00`).toLocaleDateString(undefined, { weekday: 'short' })}</span>
          ))}
        </div>
      </Panel>
      <Panel>
        <div className="panel-title-row">
          <div>
            <p className="eyebrow">Tracker</p>
            <h2>Task mix</h2>
          </div>
        </div>
        <div className="type-grid">
          {['Seatwork', 'Quiz', 'Project', 'Exam', 'Reading'].map((type) => (
            <div className="type-card" key={type}>
              <strong>{tasks.filter((task) => task.type === type).length}</strong>
              <span>{type}</span>
            </div>
          ))}
        </div>
      </Panel>
    </section>
  );
}

function WeeklyFocus({ data, subjects, subjectsById, addWeeklyFocusSubject, deleteWeeklyFocusSubject, updateWeeklyFocusStatus }) {
  const availableSubjects = subjects.filter(
    (subject) => !data.weeklyFocus.some((item) => item.subjectId === subject.id),
  );
  const [selectedSubject, setSelectedSubject] = useState('');

  React.useEffect(() => {
    setSelectedSubject('');
  }, [data.weekStart]);

  const addFocus = () => {
    const subjectId = selectedSubject || availableSubjects[0]?.id;
    if (!subjectId) return;
    addWeeklyFocusSubject(subjectId, data.weekStart);
    setSelectedSubject('');
  };

  return (
    <div className="weekly-focus-layout">
      <div className="focus-list">
        {data.weeklyFocus.length ? data.weeklyFocus.map((item) => {
          const subject = subjectsById[item.subjectId];
          if (!subject) return null;
          return (
            <div className="focus-subject" key={item.id}>
              <span className="subject-dot" style={{ background: subject.color }} />
              <div>
                <strong>{subject.name}</strong>
                <small>{subject.code} · unchecked items appear in Calendar</small>
              </div>
              <div className="focus-checks">
                <label>
                  <input
                    type="checkbox"
                    checked={Boolean(item.studiedDone)}
                    onChange={(event) => updateWeeklyFocusStatus(item.id, 'studiedDone', event.target.checked)}
                  />
                  Studied
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={Boolean(item.tasksChecked)}
                    onChange={(event) => updateWeeklyFocusStatus(item.id, 'tasksChecked', event.target.checked)}
                  />
                  Tasks checked
                </label>
              </div>
              <button className="icon-mini danger" onClick={() => deleteWeeklyFocusSubject(item.id)} title="Remove from weekly focus">
                <Trash2 size={15} />
              </button>
            </div>
          );
        }) : <EmptyState text="Add at least two subjects you want to study this week." />}
      </div>
      <div className="focus-add">
        <select value={selectedSubject} onChange={(event) => setSelectedSubject(event.target.value)}>
          <option value="">Choose subject</option>
          {availableSubjects.map((subject) => (
            <option value={subject.id} key={subject.id}>{subject.name}</option>
          ))}
        </select>
        <button className="primary-button" onClick={addFocus} disabled={!availableSubjects.length}>
          <Plus size={17} />
          Add subject
        </button>
        <p className={data.weeklyFocus.length >= 2 ? 'focus-hint good' : 'focus-hint'}>
          {data.weeklyFocus.length >= 2 ? 'Goal set: 2+ subjects this week.' : `${Math.max(0, 2 - data.weeklyFocus.length)} more subject needed for this week.`}
        </p>
      </div>
    </div>
  );
}

function SubjectHours({ subjects, hours, checks, weekStart, toggleWeeklyStudyCheck, openStudyDurationModal }) {
  const hoursBySubject = Object.fromEntries(hours.map((item) => [item.subject.id, item.hours]));
  const checksBySubject = Object.fromEntries(checks.map((item) => [item.subjectId, item]));
  const maxHours = Math.max(...hours.map((item) => item.hours), 1);
  return (
    <div className="hours-list">
      <div className="hour-row hour-row-header" aria-hidden="true">
        <span />
        <span />
        <span>Study session 1</span>
        <span>Study session 2</span>
      </div>
      {subjects.map((subject) => {
        const subjectHours = hoursBySubject[subject.id] || 0;
        return (
          <HourLogCard
            key={subject.id}
            subject={subject}
            hours={subjectHours}
            maxHours={maxHours}
            check={checksBySubject[subject.id]}
            weekStart={weekStart}
            toggleWeeklyStudyCheck={toggleWeeklyStudyCheck}
            openStudyDurationModal={openStudyDurationModal}
          />
        );
      })}
    </div>
  );
}

function HourLogCard({ subject, hours, maxHours, check, weekStart, toggleWeeklyStudyCheck, openStudyDurationModal }) {
  const handleSessionToggle = (field, checked) => {
    if (checked) {
      openStudyDurationModal(subject.id, weekStart, field);
    } else {
      toggleWeeklyStudyCheck(subject.id, weekStart, field, false);
    }
  };

  return (
    <div className="hour-row">
      <div>
        <span className="subject-dot small" style={{ background: subject.color }} />
        <strong>{subject.name}</strong>
      </div>
      <span>{hours.toFixed(1)}h</span>
      <div className="weekly-row-checks">
        <label>
          <input
            type="checkbox"
            checked={Boolean(check?.studiedDone)}
            onChange={(event) => handleSessionToggle('studiedDone', event.target.checked)}
            aria-label={`${subject.name} study session 1`}
          />
        </label>
        <label>
          <input
            type="checkbox"
            checked={Boolean(check?.tasksChecked)}
            onChange={(event) => handleSessionToggle('tasksChecked', event.target.checked)}
            aria-label={`${subject.name} study session 2`}
          />
        </label>
      </div>
      <div className="progress-track">
        <div style={{ width: `${hours ? Math.max(7, (hours / maxHours) * 100) : 0}%`, background: subject.color }} />
      </div>
    </div>
  );
}

function Subjects({ subjects, tasks, addTopic, studyBlocks, openSubjectModal, setActiveView, deleteSubject }) {
  const groupedSubjects = groupSubjectsByType(subjects);
  return (
    <section className="content-stack">
      {subjects.length === 0 ? (
        <div className="subjects-empty">
          <BookOpen size={34} />
          <h2>It looks empty, choose your subjects</h2>
          <p>Add your first subject or import subjects from your PDF module outline.</p>
          <div className="empty-actions">
            <button className="primary-button" onClick={() => openSubjectModal('new')}>
              <Plus size={17} />
              Add Subject
            </button>
            <button className="text-button" onClick={() => setActiveView('Upload PDFs')}>
              <Upload size={17} />
              Import Subjects
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="subjects-header">
            <div>
              <p className="eyebrow">Subject library</p>
              <h2>Your subjects</h2>
              <p className="muted">Manage your major and minor subjects in one clean place.</p>
            </div>
            <button className="primary-button" onClick={() => openSubjectModal('new')}>
              <Plus size={17} />
              Add Subject
            </button>
          </div>
          <SubjectGroup
            title="Major Subjects"
            subjects={groupedSubjects.major}
            tasks={tasks}
            addTopic={addTopic}
            studyBlocks={studyBlocks}
            openSubjectModal={openSubjectModal}
            deleteSubject={deleteSubject}
          />
          <SubjectGroup
            title="Minor Subjects"
            subjects={groupedSubjects.minor}
            tasks={tasks}
            addTopic={addTopic}
            studyBlocks={studyBlocks}
            openSubjectModal={openSubjectModal}
            deleteSubject={deleteSubject}
          />
          {groupedSubjects.other.length ? (
            <SubjectGroup
              title="Other Subjects"
              subjects={groupedSubjects.other}
              tasks={tasks}
              addTopic={addTopic}
              studyBlocks={studyBlocks}
              openSubjectModal={openSubjectModal}
              deleteSubject={deleteSubject}
            />
          ) : null}
        </>
      )}
    </section>
  );
}

function SubjectGroup({ title, subjects, tasks, addTopic, studyBlocks, openSubjectModal, deleteSubject }) {
  if (!subjects.length) return null;
  return (
    <section className="subject-section">
      <div className="subject-section-title">
        <span />
        <h3>{title}</h3>
        <span />
      </div>
      <div className="subject-grid compact">
        {subjects.map((subject) => {
          const subjectTasks = tasks.filter((task) => task.subjectId === subject.id);
          const done = subjectTasks.filter((task) => task.status === 'Done').length;
          return (
            <SubjectCard
              key={subject.id}
              subject={subject}
              subjectTasks={subjectTasks}
              done={done}
              addTopic={addTopic}
              openSubjectModal={openSubjectModal}
              deleteSubject={deleteSubject}
              studyBlocks={studyBlocks}
            />
          );
        })}
      </div>
    </section>
  );
}

function SubjectCard({ subject, subjectTasks, done, addTopic, openSubjectModal, deleteSubject, studyBlocks }) {
  const heatmap = buildSubjectHeatmap(subject.id, studyBlocks);
  const totalHours = heatmap.reduce((sum, day) => sum + day.hours, 0);
  const displayDescription = cleanSubjectDescription(subject.description);
  return (
    <Panel className="subject-card">
      <div className="subject-head">
        <span className="subject-dot" style={{ background: subject.color }} />
        <div>
          <h2>{subject.name}</h2>
          <p>{displayDescription || 'No description yet'}</p>
        </div>
        <div className="subject-actions">
          <button type="button" className="icon-mini" onClick={() => openSubjectModal(subject)} title="Edit subject" aria-label={`Edit ${subject.name}`}>
            <Pencil size={15} />
          </button>
          <button type="button" className="icon-mini danger" onClick={() => deleteSubject(subject.id)} title="Delete subject" aria-label={`Delete ${subject.name}`}>
            <Trash2 size={15} />
          </button>
        </div>
      </div>
      <div className="stat-row">
        <span>{done}/{subjectTasks.length || 1} tasks done</span>
        <span>{totalHours.toFixed(1)}h logged</span>
      </div>
      <SubjectHeatmap days={heatmap} />
      <h3>Topics</h3>
      <div className="chips">{subject.topics.length ? subject.topics.map((topic) => <span key={topic}>{topic}</span>) : <span>No topics yet</span>}</div>
      <form className="inline-form" onSubmit={addTopic}>
        <input type="hidden" name="subjectId" value={subject.id} />
        <input name="topic" placeholder="Add topic or weekly lesson" />
        <button><Plus size={16} /></button>
      </form>
      <h3>PDFs</h3>
      <div className="file-list">
        {subject.pdfs.length ? subject.pdfs.map((pdf) => (
          <div className="file-row" key={pdf.id}><FileText size={16} /> {pdf.name}<small>{pdf.size}</small></div>
        )) : <span className="muted">No PDFs uploaded yet.</span>}
      </div>
    </Panel>
  );
}

function SubjectHeatmap({ days }) {
  return (
    <div className="subject-heatmap" aria-label="Study hours heatmap">
      {days.map((day) => (
        <span
          key={day.date}
          className={`heat-cell level-${day.level}`}
          title={`${formatDate(day.date)}: ${day.hours.toFixed(1)}h studied`}
        />
      ))}
    </div>
  );
}

function SubjectModal({ subject, onClose, onSave }) {
  const [name, setName] = useState(subject?.name || '');
  const [description, setDescription] = useState(subject?.description || '');
  const [error, setError] = useState('');

  const submit = (event) => {
    event.preventDefault();
    if (!name.trim()) {
      setError('Subject name is required.');
      return;
    }
    const saved = onSave({ id: subject?.id, name, description });
    if (!saved) setError('Subject name is required.');
  };

  return (
    <div className="modal-backdrop" role="presentation">
      <form className="subject-modal" onSubmit={submit} role="dialog" aria-modal="true" aria-labelledby="subject-modal-title">
        <div>
          <p className="eyebrow">{subject ? 'Edit subject' : 'New subject'}</p>
          <h2 id="subject-modal-title">{subject ? 'Update subject' : 'Add Subject'}</h2>
        </div>
        <label>
          Subject Name
          <input value={name} onChange={(event) => { setName(event.target.value); setError(''); }} placeholder="CSS130 Differential and Integral Calculus" autoFocus />
        </label>
        <label>
          Description
          <input value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Week 2 modules - product rule" />
        </label>
        {error ? <p className="form-error">{error}</p> : null}
        <div className="modal-actions">
          <button type="button" className="modal-cancel" onClick={onClose}>Cancel</button>
          <button className="modal-delete" type="submit">{subject ? 'Save changes' : 'Add subject'}</button>
        </div>
      </form>
    </div>
  );
}

function CalendarView({
  mode,
  setMode,
  offset,
  setOffset,
  tasks,
  blocks,
  subjectsById,
  scheduleGenerated,
  generateCalendarStudySchedule,
  clearCalendarStudySchedule,
}) {
  const span = mode === 'Week' ? 7 : 30;
  const startDate = addDays(todayISO(), mode === 'Week' ? offset * 7 : offset * 30);
  const days = Array.from({ length: span }, (_, index) => addDays(startDate, index));
  const rangeLabel = `${formatDate(days[0])} - ${formatDate(days[days.length - 1])}`;
  const monthGroups = groupDaysByMonth(days);
  return (
    <section className="content-stack">
      <Panel>
        <div className="panel-title-row">
          <div>
            <p className="eyebrow">Study calendar</p>
            <h2>{mode} view</h2>
            <p className="muted">{rangeLabel}</p>
          </div>
          <div className="calendar-toolbar">
            {scheduleGenerated ? (
              <button className="ghost-button compact-button" onClick={clearCalendarStudySchedule}>
                Clear suggestions
              </button>
            ) : (
              <button className="primary-button compact-button" onClick={generateCalendarStudySchedule}>
                <Sparkles size={16} />
                Generate study schedule
              </button>
            )}
            <div className="week-carousel" aria-label="Calendar date navigation">
              <button onClick={() => setOffset(offset - 1)} title={`Previous ${mode.toLowerCase()}`}>
                <ChevronLeft size={17} />
              </button>
              <strong>{offset === 0 ? `This ${mode.toLowerCase()}` : rangeLabel}</strong>
              <button onClick={() => setOffset(offset + 1)} title={`Next ${mode.toLowerCase()}`}>
                <ChevronRight size={17} />
              </button>
            </div>
            <div className="segmented">
              {['Week', 'Month'].map((item) => (
                <button
                  className={mode === item ? 'selected' : ''}
                  onClick={() => { setMode(item); setOffset(0); }}
                  key={item}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>
        </div>
        {mode === 'Week' ? (
          <div className="calendar-grid week">
            {days.map((day) => (
              <CalendarDayCell
                key={day}
                day={day}
                tasks={tasks}
                blocks={blocks}
                subjectsById={subjectsById}
                mode={mode}
              />
            ))}
          </div>
        ) : (
          <div className="month-sections">
            {monthGroups.map((group) => (
              <section className="calendar-month-section" key={group.label}>
                <div className="month-divider">
                  <span />
                  <h3>Calendar for {group.label}</h3>
                  <span />
                </div>
                <div className="calendar-grid month">
                  {group.days.map((day) => (
                    <CalendarDayCell
                      key={day}
                      day={day}
                      tasks={tasks}
                      blocks={blocks}
                      subjectsById={subjectsById}
                      mode={mode}
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </Panel>
    </section>
  );
}

function CalendarDayCell({ day, tasks, blocks, subjectsById, mode }) {
  const dayTasks = tasks.filter((task) => task.deadline === day);
  const dayBlocks = blocks.filter((block) => block.date === day);
  return (
    <div className={day === todayISO() ? 'calendar-cell today' : 'calendar-cell'}>
      <strong className="calendar-date">{mode === 'Month' ? formatLongDate(day) : formatWeekDate(day)}</strong>
      {dayBlocks.map((block) => {
        const subject = subjectsById[block.subjectId];
        return (
          <span className={block.optional ? 'calendar-pill study optional' : 'calendar-pill study'} key={block.id} style={{ borderColor: subject?.color }}>
            <b>{subject?.name || 'Subject'}</b>
            {block.title}
          </span>
        );
      })}
      {dayTasks.map((task) => {
        const subject = subjectsById[task.subjectId];
        return (
          <span className="calendar-pill due" key={task.id}>
            <b>{subject?.name || 'Subject'}</b>
            {task.type}: {task.title}
          </span>
        );
      })}
    </div>
  );
}

function TasksView({ subjects, subjectsById, tasks, taskFilter, setTaskFilter, addTask, updateTaskStatus, deleteTask }) {
  const filtered = taskFilter === 'All' ? tasks : tasks.filter((task) => task.status === taskFilter);
  return (
    <section className="content-stack">
      <Panel>
        <h2>Add task or seatwork</h2>
        <TaskForm subjects={subjects} addTask={addTask} />
      </Panel>
      <Panel>
        <div className="panel-title-row">
          <h2>Task tracker</h2>
          <div className="segmented">
            {['All', 'Not Started', 'In Progress', 'Done'].map((item) => (
              <button className={taskFilter === item ? 'selected' : ''} onClick={() => setTaskFilter(item)} key={item}>{item}</button>
            ))}
          </div>
        </div>
        <TaskList
          tasks={filtered}
          subjectsById={subjectsById}
          updateTaskStatus={updateTaskStatus}
          deleteTask={deleteTask}
        />
      </Panel>
    </section>
  );
}

function UploadView({ subjects, uploadPdf, addTask, addTopic, scanStatus }) {
  return (
    <section className="two-column">
      <Panel>
        <p className="eyebrow">PDF scanner</p>
        <h2>Upload one combined orientation PDF</h2>
        <p className="muted">
          StudyFlow will read text from the PDF, use OCR if the pages are scanned images, detect subjects, weekly lessons, and deadline lines, then build a predicted calendar.
        </p>
        <form className="upload-box" onSubmit={uploadPdf}>
          <select name="subjectId" defaultValue={AUTO_SUBJECT}>
            <option value={AUTO_SUBJECT}>Auto-detect subjects from PDF</option>
            {subjects.map((subject) => <option value={subject.id} key={subject.id}>Attach only to {subject.name}</option>)}
          </select>
          <label className="drop-zone">
            <Upload size={30} />
            <span>{scanStatus.loading ? 'Scanning PDF...' : 'Choose a PDF file to scan'}</span>
            <input name="pdf" type="file" accept="application/pdf" />
          </label>
          <button className="primary-button full" disabled={scanStatus.loading}>
            <Sparkles size={17} />
            {scanStatus.loading ? 'Scanning and planning...' : 'Scan PDF and generate calendar'}
          </button>
        </form>
        <div className="scan-result">
          <strong>{scanStatus.message}</strong>
          {scanStatus.subjects?.length ? (
            <div className="scan-subjects">
              {scanStatus.subjects.map((subject) => <span key={subject}>{subject}</span>)}
            </div>
          ) : null}
          {scanStatus.preview ? <pre>{scanStatus.preview}</pre> : null}
        </div>
      </Panel>
      <Panel>
        <p className="eyebrow">Manual fallback</p>
        <h2>Add extracted items yourself</h2>
        <form className="form-grid single" onSubmit={addTopic}>
          <select name="subjectId">{subjects.map((subject) => <option value={subject.id} key={subject.id}>{subject.name}</option>)}</select>
          <input name="topic" placeholder="Topic or weekly lesson from the PDF" />
          <button className="primary-button"><Plus size={17} /> Add topic</button>
        </form>
        <TaskForm subjects={subjects} addTask={addTask} compact />
      </Panel>
    </section>
  );
}

function SettingsView({ resetData, state, syncConfig, setSyncConfig, syncRuntime }) {
  const syncLink =
    syncConfig.enabled && syncConfig.roomId && syncConfig.secret
      ? `${window.location.origin}${window.location.pathname}#sync=${encodeURIComponent(`${syncConfig.roomId}.${syncConfig.secret}`)}`
      : '';
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [copyStatus, setCopyStatus] = useState('');

  React.useEffect(() => {
    let cancelled = false;
    if (!syncLink) {
      setQrDataUrl('');
      return () => {};
    }
    QRCode.toDataURL(syncLink, { margin: 1, width: 220, color: { dark: '#ffffff', light: '#00000000' } })
      .then((url) => {
        if (!cancelled) setQrDataUrl(url);
      })
      .catch(() => {
        if (!cancelled) setQrDataUrl('');
      });
    return () => {
      cancelled = true;
    };
  }, [syncLink]);

  const formatSyncTime = (value) => (value ? new Date(value).toLocaleString() : '—');

  const ensureRoom = () => {
    if (syncConfig.roomId && syncConfig.secret) return;
    setSyncConfig((current) => ({
      ...current,
      enabled: true,
      roomId: randomBase64Url(16),
      secret: randomBase64Url(32),
      lastPulledAt: null,
      lastPushedAt: null,
      lastRemoteUpdatedAt: null,
    }));
  };

  const toggleEnabled = (enabled) => {
    if (enabled) ensureRoom();
    setSyncConfig((current) => ({ ...current, enabled }));
  };

  const generateNewLink = () => {
    setCopyStatus('');
    setSyncConfig((current) => ({
      ...current,
      enabled: true,
      roomId: randomBase64Url(16),
      secret: randomBase64Url(32),
      lastPulledAt: null,
      lastPushedAt: null,
      lastRemoteUpdatedAt: null,
    }));
  };

  const copyLink = async () => {
    if (!syncLink) return;
    try {
      await navigator.clipboard.writeText(syncLink);
      setCopyStatus('Copied.');
      window.setTimeout(() => setCopyStatus(''), 1600);
    } catch {
      setCopyStatus('Could not copy — your browser blocked clipboard access.');
    }
  };

  return (
    <section className="content-stack">
      <Panel>
        <p className="eyebrow">Sync</p>
        <h2>Private sync link (end-to-end encrypted)</h2>
        <p className="muted">
          Turn this on to sync between your devices without logins. Anyone with the link can access your encrypted data, so keep it private.
        </p>
        <div className="sync-settings">
          <label className="sync-toggle">
            <input
              type="checkbox"
              checked={syncConfig.enabled}
              onChange={(event) => toggleEnabled(event.target.checked)}
            />
            <span>Enable sync</span>
          </label>

          <div className="sync-actions">
            <button className="primary-button" onClick={generateNewLink}>
              <RefreshCw size={17} /> Generate new link
            </button>
            <button className="ghost-button" onClick={copyLink} disabled={!syncLink}>
              Copy link
            </button>
          </div>

          {syncLink ? (
            <div className="sync-link-row">
              <input className="sync-link" readOnly value={syncLink} onFocus={(e) => e.currentTarget.select()} />
              {qrDataUrl ? <img className="sync-qr" src={qrDataUrl} alt="Sync QR code" /> : null}
            </div>
          ) : null}

          <div className="sync-status">
            <span><strong>Status</strong> {syncRuntime.busy ? 'Syncing…' : 'Idle'}</span>
            <span><strong>Last push</strong> {formatSyncTime(syncConfig.lastPushedAt)}</span>
            <span><strong>Last pull</strong> {formatSyncTime(syncConfig.lastPulledAt)}</span>
            {copyStatus ? <span className="muted">{copyStatus}</span> : null}
            {syncRuntime.error ? <span className="form-error">{syncRuntime.error}</span> : null}
          </div>
        </div>
      </Panel>
      <Panel>
        <p className="eyebrow">Storage</p>
        <h2>Local browser data</h2>
        <p className="muted">StudyFlow currently stores subjects, task lists, PDF metadata, and generated study blocks in this browser only.</p>
        <div className="settings-actions">
          <button className="primary-button" onClick={resetData}><RefreshCw size={17} /> Reset to sample data</button>
          <span>{state.subjects.length} subjects · {state.tasks.length} tasks · {state.studyBlocks.length} study blocks</span>
        </div>
      </Panel>
    </section>
  );
}

function TaskForm({ subjects, addTask, compact = false }) {
  const hasSubjects = subjects.length > 0;
  return (
    <form className={compact ? 'form-grid single' : 'form-grid'} onSubmit={addTask}>
      <label className="field-label">
        Task title
        <input name="title" placeholder="Example: Seatwork 2, quiz review, reading" required />
      </label>
      <label className="field-label">
        Subject
        <select name="subjectId" defaultValue="" required disabled={!hasSubjects}>
          <option value="" disabled>{hasSubjects ? 'Choose subject for this task' : 'Add a subject first'}</option>
          {subjects.map((subject) => <option value={subject.id} key={subject.id}>{subject.name}</option>)}
        </select>
      </label>
      <label className="field-label">
        Type
        <select name="type" defaultValue="Seatwork">
          <option>Seatwork</option><option>Quiz</option><option>Project</option><option>Exam</option><option>Reading</option>
        </select>
      </label>
      <label className="field-label">
        Deadline
        <input name="deadline" type="date" defaultValue={addDays(todayISO(), 3)} />
      </label>
      <label className="field-label">
        Priority
        <select name="priority" defaultValue="Medium">
          <option>Low</option><option>Medium</option><option>High</option>
        </select>
      </label>
      <label className="field-label">
        Notes
        <input name="notes" placeholder="Optional notes" />
      </label>
      <button className="primary-button" disabled={!hasSubjects}><Plus size={17} /> Add task</button>
    </form>
  );
}

function TaskList({ tasks, subjectsById, updateTaskStatus, deleteTask, compact = false }) {
  if (!tasks.length) return <EmptyState text="No tasks found." />;
  return (
    <div className="task-list">
      {tasks.map((task) => (
        <div className={daysUntil(task.deadline) <= 3 && task.status !== 'Done' ? 'task-row urgent' : 'task-row'} key={task.id}>
          <div className="task-main">
            <span className="subject-dot small" style={{ background: subjectsById[task.subjectId]?.color }} />
            <div>
              <strong>{task.title}</strong>
              <small>{subjectsById[task.subjectId]?.name} · {task.type} · {formatDate(task.deadline)}</small>
              {!compact && task.notes ? <p>{task.notes}</p> : null}
            </div>
          </div>
          <div className="task-actions">
            <span className={`priority ${task.priority.toLowerCase()}`}>{task.priority}</span>
            {updateTaskStatus ? (
              <select value={task.status} onChange={(event) => updateTaskStatus(task.id, event.target.value)}>
                <option>Not Started</option><option>In Progress</option><option>Done</option>
              </select>
            ) : <span className="status-chip">{task.status}</span>}
            {deleteTask ? <button className="ghost-button" onClick={() => deleteTask(task.id)}>Delete</button> : null}
          </div>
        </div>
      ))}
    </div>
  );
}

function Panel({ children, className = '' }) {
  return <div className={`panel ${className}`}>{children}</div>;
}

function Metric({ label, value, helper, icon: Icon }) {
  return (
    <Panel className="metric">
      <div className="metric-icon"><Icon size={20} /></div>
      <strong>{value}</strong>
      <span>{label}</span>
      <small>{helper}</small>
    </Panel>
  );
}

function StudyBlock({ block, subject }) {
  return (
    <div className="study-block">
      <span className="subject-dot" style={{ background: subject?.color }} />
      <div>
        <strong>{block.title}</strong>
        <small>{subject?.name} · {block.kind} · {block.minutes} min</small>
      </div>
    </div>
  );
}

function EmptyState({ text }) {
  return <div className="empty-state"><Gauge size={20} /> {text}</div>;
}

function buildImportedPdfState(currentState, importOptions) {
  const nextState = structuredClone(currentState);
  const importResult = importPdfScan(nextState, importOptions);
  nextState.studyBlocks = buildGeneratedSchedule(
    nextState,
    Object.fromEntries(nextState.subjects.map((subject) => [subject.id, subject])),
  );
  return { nextState, importResult };
}

async function extractPdfText(file, onProgress = () => {}) {
  const data = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data }).promise;
  const pages = [];
  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    onProgress(`Reading PDF text layer: page ${pageNumber} of ${pdf.numPages}...`);
    const page = await pdf.getPage(pageNumber);
    const content = await page.getTextContent();
    const text = getPageTextWithLines(content.items);
    pages.push(`Page ${pageNumber}\n${text}`);
  }
  const fullText = pages.join('\n\n').replace(/[ \t]{2,}/g, ' ').trim();
  if (fullText.length >= 40) {
    return { text: fullText, method: 'PDF text extraction' };
  }
  onProgress('No selectable text found. Switching to OCR; this can take a while for scanned PDFs...');
  const ocrText = await ocrPdfPages(pdf, onProgress);
  if (ocrText.length < 40) {
    throw new Error('not enough readable text found after OCR');
  }
  return { text: ocrText, method: 'OCR' };
}

async function ocrPdfPages(pdf, onProgress) {
  const worker = await createWorker('eng', 1, {
    logger: (event) => {
      if (event.status) {
        onProgress(`OCR ${event.status}${event.progress ? ` ${Math.round(event.progress * 100)}%` : ''}...`);
      }
    },
  });
  const results = [];
  try {
    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      onProgress(`OCR scanning page ${pageNumber} of ${pdf.numPages}...`);
      const page = await pdf.getPage(pageNumber);
      const viewport = page.getViewport({ scale: 1.8 });
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d', { alpha: false });
      canvas.width = Math.floor(viewport.width);
      canvas.height = Math.floor(viewport.height);
      await page.render({ canvasContext: context, viewport }).promise;
      const { data } = await worker.recognize(canvas);
      results.push(`Page ${pageNumber}\n${data.text}`);
      canvas.width = 0;
      canvas.height = 0;
    }
  } finally {
    await worker.terminate();
  }
  return results.join('\n\n').replace(/[ \t]{2,}/g, ' ').trim();
}

function getPageTextWithLines(items) {
  const rows = [];
  items
    .filter((item) => item.str?.trim())
    .forEach((item) => {
      const x = item.transform?.[4] || 0;
      const y = item.transform?.[5] || 0;
      const row = rows.find((existing) => Math.abs(existing.y - y) < 3);
      if (row) {
        row.items.push({ x, text: item.str.trim() });
      } else {
        rows.push({ y, items: [{ x, text: item.str.trim() }] });
      }
    });

  return rows
    .sort((a, b) => b.y - a.y)
    .map((row) =>
      row.items
        .sort((a, b) => a.x - b.x)
        .map((item) => item.text)
        .join(' ')
        .replace(/[ \t]{2,}/g, ' ')
        .trim(),
    )
    .filter(Boolean)
    .join('\n');
}

function importPdfScan(draft, { file, text, selectedSubjectId, scanMode }) {
  const colors = ['#2f9e78', '#4f7cff', '#e29547', '#9b6ade', '#d64f7b', '#0f9fb5', '#5b8c5a'];
  const markerMode = /\{subject name\}/i.test(text);
  const lines = text
    .split(/(?:\n| {2,}|(?=\bWeek\s+\d+)|(?=\bModule\s+\d+)|(?=\bLesson\s+\d+)|(?=\bSubject\s*:)|(?=\bCourse\s*:)|(?=\bDeadline\b)|(?=\bDue\b)|(?=\bSubmission\b)|(?=\bQuiz\b)|(?=\bExam\b)|(?=\bProject\b)|(?=\bSeatwork\b)|(?=\bAssignment\b)|(?=\bActivity\b)|(?=\bReading\b))/i)
    .map((line) => line.trim())
    .filter((line) => line.length > 4);
  const pdfMeta = {
    id: crypto.randomUUID(),
    name: file.name,
    size: `${Math.max(file.size / 1024 / 1024, 0.01).toFixed(2)} MB`,
    uploadedAt: todayISO(),
    scanned: true,
  };
  const parsedSubjects = markerMode ? detectMarkedSubjects(text) : detectSubjects(lines, markerMode);
  const initialSubjectCount = draft.subjects.length;
  if (scanMode === 'auto') {
    parsedSubjects.forEach((subjectInfo) => {
      const subject = findOrCreateSubject(draft, subjectInfo, colors);
      if (!subject.pdfs.some((pdf) => pdf.name === file.name)) subject.pdfs.push(pdfMeta);
    });
  }
  let subjectsAdded = Math.max(0, draft.subjects.length - initialSubjectCount);
  let topicsAdded = 0;
  let tasksAdded = 0;
  let currentSubject =
    scanMode === 'single'
      ? draft.subjects.find((subject) => subject.id === selectedSubjectId)
      : findOrCreateSubject(draft, parsedSubjects[0] || { name: 'Combined PDF Plan', code: 'PDF' }, colors);

  if (currentSubject && !currentSubject.pdfs.some((pdf) => pdf.name === file.name)) {
    currentSubject.pdfs.push(pdfMeta);
  }

  const lineSubjectIds = [];
  lines.forEach((line, index) => {
    const subjectHit = scanMode === 'auto' ? parseSubjectLine(line, markerMode) : null;
    if (subjectHit) {
      currentSubject = findOrCreateSubject(draft, subjectHit, colors);
      if (!currentSubject.pdfs.some((pdf) => pdf.name === file.name)) currentSubject.pdfs.push(pdfMeta);
      lineSubjectIds[index] = currentSubject.id;
      return;
    }

    if (!currentSubject) return;
    lineSubjectIds[index] = currentSubject.id;

    const weekTopic = parseWeekTopic(line);
    if (weekTopic && !currentSubject.topics.includes(weekTopic.topic)) {
      currentSubject.topics.push(weekTopic.topic);
      topicsAdded += 1;
    }

    const task = parseTaskLine(line, currentSubject.id);
    if (task && !draft.tasks.some((existing) => existing.title === task.title && existing.deadline === task.deadline)) {
      draft.tasks.push(task);
      tasksAdded += 1;
    }
  });

  lines.forEach((line, index) => {
    const subjectId = lineSubjectIds[index];
    if (!subjectId) return;
    const nearby = [lines[index - 1], line, lines[index + 1], lines[index + 2]]
      .filter(Boolean)
      .join(' ');
    const task = parseTaskLine(nearby, subjectId);
    if (task && !draft.tasks.some((existing) => existing.title === task.title && existing.deadline === task.deadline)) {
      draft.tasks.push(task);
      tasksAdded += 1;
    }
  });

  return {
    subjectsDetected: parsedSubjects.length,
    subjectNames: parsedSubjects.map((subject) => subject.name),
    subjectsAdded,
    topicsAdded,
    tasksAdded,
  };
}

function detectSubjects(lines, markerMode = false) {
  const seen = new Map();
  lines.forEach((line) => {
    const subject = parseSubjectLine(line, markerMode);
    if (subject && !seen.has(subject.name.toLowerCase())) {
      seen.set(subject.name.toLowerCase(), subject);
    }
  });
  return [...seen.values()];
}

function detectMarkedSubjects(text) {
  const seen = new Map();
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter(Boolean);

  lines.forEach((line, index) => {
    if (!/\{subject name\}/i.test(line)) return;
    const [beforeRaw = '', afterRaw = ''] = line.split(/\{subject name\}/i);
    const candidates = [
      beforeRaw,
      afterRaw,
      lines[index - 1],
      lines[index + 1],
      `${beforeRaw} ${afterRaw}`,
    ];
    const subject = candidates
      .map(cleanSubjectMarkerCandidate)
      .filter(Boolean)
      .map((name) => toSubjectInfo(name))
      .find((item) => item && !looksLikeMarkerNoise(item.name));

    if (subject && !seen.has(subject.name.toLowerCase())) {
      seen.set(subject.name.toLowerCase(), subject);
    }
  });

  const beforeMarkerRegex = /([^{}\n\r]{2,120})\s*\{subject name\}/gi;
  let match = beforeMarkerRegex.exec(text);
  while (match) {
    const name = cleanSubjectMarkerCandidate(match[1]);
    const subject = name ? toSubjectInfo(name) : null;
    if (subject && !looksLikeMarkerNoise(subject.name) && !seen.has(subject.name.toLowerCase())) {
      seen.set(subject.name.toLowerCase(), subject);
    }
    match = beforeMarkerRegex.exec(text);
  }

  const afterMarkerRegex = /\{subject name\}\s*([^{}\n\r]{2,120})/gi;
  match = afterMarkerRegex.exec(text);
  while (match) {
    const name = cleanSubjectMarkerCandidate(match[1]);
    const subject = name ? toSubjectInfo(name) : null;
    if (subject && !looksLikeMarkerNoise(subject.name) && !seen.has(subject.name.toLowerCase())) {
      seen.set(subject.name.toLowerCase(), subject);
    }
    match = afterMarkerRegex.exec(text);
  }

  return [...seen.values()];
}

function parseSubjectLine(line, markerMode = false) {
  const clean = line.replace(/\s+/g, ' ').trim();
  const marked = parseMarkedSubjectLine(clean);
  if (marked) return marked;
  if (markerMode) return null;
  const labeled = clean.match(/\b(?:subject|course|class)\s*(?:name|title|code)?\s*[:\-]\s*([A-Z]{2,}\s?\d{2,4})?\s*[-:]?\s*([A-Za-z][A-Za-z0-9 &,/()'-]{3,80})/i);
  if (labeled && !/deadline|submission|week|module|lesson/i.test(labeled[2])) {
    return {
      code: labeled[1] || makeCourseCode(labeled[2]),
      name: titleCase(labeled[2].replace(/\b(course outline|orientation|module)\b/gi, '').trim()),
    };
  }
  const coded = clean.match(/\b([A-Z]{2,}\s?\d{2,4})\s*[-:]\s*([A-Za-z][A-Za-z0-9 &,/()'-]{3,70})/);
  if (coded && !/deadline|submission|week|module/i.test(coded[2])) {
    return { code: coded[1], name: titleCase(coded[2]) };
  }
  return null;
}

function parseMarkedSubjectLine(line) {
  if (!/\{subject name\}/i.test(line)) return null;
  const [beforeRaw = '', afterRaw = ''] = line.split(/\{subject name\}/i);
  const before = cleanSubjectMarkerCandidate(beforeRaw);
  const after = cleanSubjectMarkerCandidate(afterRaw);
  const name = before || after;
  if (!name) return null;
  return toSubjectInfo(name);
}

function toSubjectInfo(name) {
  const coded = name.match(/^([A-Z]{2,}\s?\d{2,4})\s*[-:]\s*(.+)$/);
  return {
    code: coded ? coded[1] : makeCourseCode(name),
    name: titleCase(coded ? coded[2] : name),
  };
}

function cleanSubjectMarkerCandidate(value) {
  if (!value) return '';
  const cleaned = value
    .replace(/\b(?:subject|course|class)\s*(?:name|title|code)?\s*[:\-]?\s*/gi, '')
    .replace(/\b(?:orientation|module|outline|syllabus|course guide)\b/gi, '')
    .replace(/\b(?:week|module|lesson)\s*\d{1,2}.*$/gi, '')
    .replace(/\b(?:deadline|due|submission|quiz|exam|project|seatwork|assignment|activity|reading)\b.*$/gi, '')
    .replace(/[|•]+/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/^[-:–\s]+|[-:–\s]+$/g, '')
    .trim()
    .slice(0, 80);
  if (cleaned.length < 2 || /^\d+$/.test(cleaned)) return '';
  return cleaned;
}

function looksLikeMarkerNoise(name) {
  return /^(page|week|module|lesson|deadline|due|submission|activity|assignment|quiz|exam|project|reading)$/i.test(name)
    || /\{subject name\}/i.test(name)
    || name.length < 2;
}

function parseWeekTopic(line) {
  const clean = line.replace(/\s+/g, ' ').trim();
  const week = clean.match(/\b(?:week|wk|module|lesson)\s*(\d{1,2})\s*(?:[:\-–]|\))?\s*([A-Za-z0-9 &,/()'-.]{4,120})/i);
  if (!week) return null;
  return { week: Number(week[1]), topic: `Week ${week[1]}: ${titleCase(week[2])}` };
}

function parseTaskLine(line, subjectId) {
  const clean = line.replace(/\s+/g, ' ').trim();
  if (!/(deadline|due|submission|submit|quiz|exam|project|seatwork|assignment|activity|reading|output)/i.test(clean)) {
    return null;
  }
  const deadline = parseDateFromText(clean) || parseWeekDeadline(clean);
  if (!deadline) return null;
  const type = inferTaskType(clean);
  const title = clean
    .replace(/\b(?:deadline|due date|due|submission|submit on|submit by)\b\s*[:\-]*/gi, '')
    .replace(/\b(?:on|by)?\s*(?:\d{1,2}[/-]\d{1,2}(?:[/-]\d{2,4})?|\d{4}-\d{1,2}-\d{1,2}|(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\.?\s+\d{1,2}(?:,\s*\d{4})?)\b/gi, '')
    .slice(0, 82)
    .trim();
  return {
    id: crypto.randomUUID(),
    title: titleCase(title || `${type} from uploaded PDF`),
    subjectId,
    type,
    deadline,
    priority: ['Quiz', 'Exam', 'Project'].includes(type) || daysUntil(deadline) <= 7 ? 'High' : 'Medium',
    status: 'Not Started',
    notes: `Imported from PDF line: "${clean.slice(0, 180)}"`,
  };
}

function inferTaskType(text) {
  if (/exam|midterm|final/i.test(text)) return 'Exam';
  if (/quiz/i.test(text)) return 'Quiz';
  if (/project|output/i.test(text)) return 'Project';
  if (/seatwork|activity|assignment/i.test(text)) return 'Seatwork';
  if (/read|reading/i.test(text)) return 'Reading';
  return 'Seatwork';
}

function parseDateFromText(text) {
  const numeric = text.match(/\b(\d{4})[-/](\d{1,2})[-/](\d{1,2})\b|\b(\d{1,2})[/-](\d{1,2})(?:[/-](\d{2,4}))?\b/);
  if (numeric) {
    if (numeric[1]) return safeISODate(Number(numeric[1]), Number(numeric[2]), Number(numeric[3]));
    const year = numeric[6] ? normalizeYear(Number(numeric[6])) : new Date().getFullYear();
    return safeISODate(year, Number(numeric[4]), Number(numeric[5]));
  }
  const monthNames = 'jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec';
  const named = text.match(new RegExp(`\\b(${monthNames})[a-z]*\\.?\\s+(\\d{1,2})(?:,?\\s+(\\d{4}))?\\b`, 'i'));
  if (named) {
    const month = monthIndex(named[1]);
    return safeISODate(named[3] ? Number(named[3]) : new Date().getFullYear(), month, Number(named[2]));
  }
  const dayFirst = text.match(new RegExp(`\\b(\\d{1,2})\\s+(${monthNames})[a-z]*\\.?(?:,?\\s+(\\d{4}))?\\b`, 'i'));
  if (dayFirst) {
    return safeISODate(
      dayFirst[3] ? Number(dayFirst[3]) : new Date().getFullYear(),
      monthIndex(dayFirst[2]),
      Number(dayFirst[1]),
    );
  }
  return null;
}

function parseWeekDeadline(text) {
  const week = text.match(/\b(?:week|wk|module)\s*(\d{1,2})\b/i);
  if (!week) return null;
  return addDays(todayISO(), (Number(week[1]) - 1) * 7 + 5);
}

function monthIndex(month) {
  return ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec']
    .indexOf(month.toLowerCase().slice(0, 3)) + 1;
}

function safeISODate(year, month, day) {
  const parsed = new Date(year, month - 1, day);
  if (parsed.getFullYear() !== year || parsed.getMonth() !== month - 1 || parsed.getDate() !== day) return null;
  return parsed.toISOString().slice(0, 10);
}

function normalizeYear(year) {
  return year < 100 ? 2000 + year : year;
}

function findOrCreateSubject(draft, subjectInfo, colors) {
  const existing = draft.subjects.find(
    (subject) =>
      subject.name.toLowerCase() === subjectInfo.name.toLowerCase() ||
      subject.code.toLowerCase() === subjectInfo.code.toLowerCase(),
  );
  if (existing) return existing;
  const subject = {
    id: crypto.randomUUID(),
    name: subjectInfo.name,
    description: 'Imported from PDF',
    code: subjectInfo.code,
    professor: 'Imported from PDF',
    semester: 'Current Semester',
    color: colors[draft.subjects.length % colors.length],
    difficulty: 'Medium',
    topics: [],
    pdfs: [],
  };
  draft.subjects.push(subject);
  return subject;
}

function makeCourseCode(name) {
  return name
    .split(/\s+/)
    .map((part) => part[0])
    .join('')
    .slice(0, 5)
    .toUpperCase() || 'PDF';
}

function titleCase(value) {
  return value
    .toLowerCase()
    .replace(/\b[a-z]/g, (letter) => letter.toUpperCase())
    .replace(/\b(?:And|Of|The|For|In)\b/g, (word) => word.toLowerCase());
}

function buildReminders(tasks) {
  return tasks
    .filter((task) => task.status !== 'Done')
    .map((task) => {
      const until = daysUntil(task.deadline);
      if (until < 0 || until > 7) return null;
      const reminderWindow = [7, 5, 3, 0].find((offset) => until >= offset) ?? 0;
      return {
        id: `reminder-${task.id}`,
        task,
        daysUntil: until,
        reminderWindow,
        label: until === 0 ? 'Due today' : `${until} day${until === 1 ? '' : 's'} left`,
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.daysUntil - b.daysUntil);
}

function buildOptionalCalendarSchedule(state, mode, offset) {
  const span = mode === 'Week' ? 7 : 30;
  const startDate = addDays(todayISO(), mode === 'Week' ? offset * 7 : offset * 30);
  const activeSubjectIds = new Set(
    state.tasks
      .filter((task) => task.status !== 'Done')
      .map((task) => task.subjectId),
  );
  const unfinishedSubjects = state.subjects.filter((subject) => activeSubjectIds.has(subject.id));
  const subjectPool = unfinishedSubjects.length ? unfinishedSubjects : state.subjects;
  if (!subjectPool.length) return [];

  return Array.from({ length: span }, (_, dayIndex) => {
    const date = addDays(startDate, dayIndex);
    const daySubjects = pickTwoSubjects(subjectPool);
    return daySubjects.map((subject, pickIndex) => ({
      id: `optional-${date}-${subject.id}-${pickIndex}-${crypto.randomUUID()}`,
      date,
      subjectId: subject.id,
      title: 'Optional study suggestion',
      kind: 'Optional',
      minutes: 0,
      optional: true,
    }));
  }).flat();
}

function pickTwoSubjects(subjects) {
  if (subjects.length <= 2) return [...subjects];
  const shuffled = [...subjects];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }
  return shuffled.slice(0, 2);
}

function buildGeneratedSchedule(state, subjectsById) {
  const workload = {};
  const blocks = [];
  const activeTasks = state.tasks
    .filter((task) => task.status !== 'Done')
    .sort((a, b) => scoreTask(a, subjectsById[a.subjectId]) - scoreTask(b, subjectsById[b.subjectId]));

  activeTasks.forEach((task) => {
    const dueIn = Math.max(0, daysUntil(task.deadline));
    const targetOffset = Math.max(0, dueIn - (['Quiz', 'Exam'].includes(task.type) ? 2 : 1));
    const dayOffset = findLightestDay(workload, targetOffset, targetOffset + 6);
    const date = addDays(todayISO(), dayOffset);
    workload[date] = (workload[date] || 0) + 1;
    blocks.push({
      id: `plan-${task.id}`,
      date,
      subjectId: task.subjectId,
      title: `${task.type === 'Reading' ? 'Read' : 'Work on'} ${task.title}`,
      kind: 'Study',
      minutes: task.priority === 'High' ? 75 : 50,
    });
    if (['Quiz', 'Exam'].includes(task.type) && dueIn > 1) {
      const reviewDate = addDays(todayISO(), Math.max(0, dueIn - 1));
      blocks.push({
        id: `review-${task.id}`,
        date: reviewDate,
        subjectId: task.subjectId,
        title: `Review for ${task.title}`,
        kind: 'Review',
        minutes: 60,
      });
    }
  });

  state.subjects.forEach((subject, index) => {
    subject.topics.forEach((topic, topicIndex) => {
      const week = extractWeekNumber(topic);
      const offset = week ? (week - 1) * 7 + (index % 5) : topicIndex * 7 + (index % 5);
      const date = addDays(todayISO(), offset);
      blocks.push({
        id: `topic-${subject.id}-${topicIndex}`,
        date,
        subjectId: subject.id,
        title: topic,
        kind: 'Topic',
        minutes: subject.difficulty === 'Hard' ? 60 : 40,
      });
    });
  });

  return blocks.sort((a, b) => a.date.localeCompare(b.date));
}

function findLightestDay(workload, preferredOffset, maxOffset = preferredOffset + 6) {
  for (let offset = preferredOffset; offset <= maxOffset; offset += 1) {
    const date = addDays(todayISO(), offset);
    if ((workload[date] || 0) < 3) return offset;
  }
  return preferredOffset;
}

function extractWeekNumber(topic) {
  const match = topic.match(/\bWeek\s+(\d{1,2})\b/i);
  return match ? Number(match[1]) : null;
}

function scoreTask(task, subject) {
  const priority = { High: 0, Medium: 4, Low: 8 }[task.priority] || 5;
  const difficulty = subject?.difficulty === 'Hard' ? -2 : 0;
  return daysUntil(task.deadline) + priority + difficulty;
}

function getDashboardData(state, reminders, subjectsById, weekOffset = 0) {
  const weekStart = addDays(getWeekStart(todayISO()), weekOffset * 7);
  const weekEnd = addDays(weekStart, 6);
  const upcoming = [...state.tasks]
    .filter((task) => task.status !== 'Done')
    .sort((a, b) => a.deadline.localeCompare(b.deadline));
  const weeklyFocus = (state.weeklyFocus || []).filter((item) => item.weekStart === weekStart);
  const weeklyStudyChecks = (state.weeklyStudyChecks || []).filter((item) => item.weekStart === weekStart);
  const weeklyHours = state.subjects
    .map((subject) => {
      const minutes = state.studyBlocks
        .filter((block) => block.subjectId === subject.id && block.date >= weekStart && block.date <= weekEnd)
        .reduce((total, block) => total + (block.minutes || 0), 0);
      return { subject, hours: minutes / 60 };
    })
    .filter((item) => item.hours > 0)
    .sort((a, b) => b.hours - a.hours);
  return {
    reminders,
    upcoming,
    weekStart,
    weekEnd,
    weekLabel: `${formatLongDate(weekStart)} - ${formatLongDate(weekEnd)}`,
    weeklyFocus,
    weeklyStudyChecks,
    weeklyHours,
    todayBlocks: state.studyBlocks.filter((block) => block.date === todayISO()),
    completedThisWeek: state.tasks.filter((task) => task.status === 'Done' && task.deadline >= weekStart && task.deadline <= weekEnd).length,
    progress: state.subjects.map((subject) => {
      const subjectTasks = state.tasks.filter((task) => task.subjectId === subject.id);
      const done = subjectTasks.filter((task) => task.status === 'Done').length;
      const total = subjectTasks.length;
      return { subject, done, total, percent: Math.round((done / Math.max(total, 1)) * 100), color: subjectsById[subject.id]?.color };
    }),
  };
}

function buildSubjectHeatmap(subjectId, studyBlocks) {
  return Array.from({ length: 21 }, (_, index) => {
    const date = addDays(todayISO(), index - 20);
    const minutes = studyBlocks
      .filter((block) => block.subjectId === subjectId && block.date === date)
      .reduce((sum, block) => sum + (block.minutes || 0), 0);
    const hours = minutes / 60;
    return {
      date,
      hours,
      level: Math.min(4, Math.ceil((Math.min(hours, 3) / 3) * 4)),
    };
  });
}

function groupSubjectsByType(subjects) {
  return subjects.reduce(
    (groups, subject) => {
      const type = getSubjectType(subject);
      groups[type].push(subject);
      return groups;
    },
    { major: [], minor: [], other: [] },
  );
}

function getSubjectType(subject) {
  const source = `${subject.description || ''} ${subject.name || ''}`;
  if (/\bmajor\b/i.test(source)) return 'major';
  if (/\bminor\b/i.test(source)) return 'minor';
  return 'other';
}

function cleanSubjectDescription(description = '') {
  return description
    .replace(/\b(?:major|minor)\b\s*[-:–]?\s*/gi, '')
    .trim();
}

function daysUntil(date) {
  const start = new Date(`${todayISO()}T00:00:00`);
  const end = new Date(`${date}T00:00:00`);
  return Math.ceil((end - start) / 86400000);
}

function formatDate(date) {
  return new Date(`${date}T00:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function formatLongDate(date) {
  return new Date(`${date}T00:00:00`).toLocaleDateString(undefined, { month: 'long', day: 'numeric' });
}

function formatWeekDate(date) {
  return new Date(`${date}T00:00:00`).toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'long',
    day: 'numeric',
  });
}

function formatShortDay(date) {
  return new Date(`${date}T00:00:00`).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric' });
}

function groupDaysByMonth(days) {
  const groups = [];
  days.forEach((day) => {
    const label = new Date(`${day}T00:00:00`).toLocaleDateString(undefined, { month: 'long' });
    let group = groups.find((item) => item.label === label);
    if (!group) {
      group = { label, days: [] };
      groups.push(group);
    }
    group.days.push(day);
  });
  return groups;
}

class RootErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    // Keep a console trail for debugging.
    console.error('StudyFlow crashed during render:', error);
    console.error(info);
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div style={{ padding: 24, fontFamily: 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif' }}>
        <h1 style={{ margin: 0, fontSize: 20 }}>StudyFlow failed to render</h1>
        <p style={{ marginTop: 8, opacity: 0.8 }}>
          Open DevTools Console for details. The error is shown below to help pinpoint the broken Dashboard/card code.
        </p>
        <pre
          style={{
            marginTop: 16,
            padding: 14,
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: 12,
            overflow: 'auto',
            whiteSpace: 'pre-wrap',
          }}
        >
          {String(this.state.error?.stack || this.state.error?.message || this.state.error)}
        </pre>
      </div>
    );
  }
}

createRoot(document.getElementById('root')).render(
  <RootErrorBoundary>
    <App />
  </RootErrorBoundary>,
);
