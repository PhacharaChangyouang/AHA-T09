'use client';

import { T } from '../../components/Language';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import AhaIcon from '../../components/AhaIcon';
import AhaCompanion from '../../components/AhaCompanion';
import { getUser, saveSession } from '../../services/auth';
import { authApi, reminderApi } from '../../services/api';
import { disableAhaPush, enableAhaPush, setAhaPushPreference } from '../../services/push';
import { normalizeVoiceText, understandTime, extractMedicineName, isCreateRequest, isMedicalAdvice, isEmergency, pendingTurn, unsupportedSchedule } from '../../lib/voice-understanding';

const ALL_DAYS = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'];
const INITIAL_MESSAGE = 'แตะปุ่มแล้วพูดได้เลยค่ะ เช่น “ยาครั้งต่อไปกี่โมง”';
const VOICE_GREETING = 'สวัสดีค่ะ มีอะไรให้ AHA ช่วยไหมคะ';
const normalizeDialectText = normalizeVoiceText;

function createReminderPayload(pending) {
  return {
    medicine_name: pending.medicine_name,
    dosage: null,
    reminder_time: pending.reminder_time,
    frequency: 'daily',
    days_of_week: ALL_DAYS,
    start_date: null,
    end_date: null,
    is_active: true,
  };
}

function formatTime(time) {
  return String(time || '').slice(0, 5);
}

function conversationalTime(time) {
  const [hourValue, minuteValue] = formatTime(time).split(':').map(Number);
  if (!Number.isFinite(hourValue) || !Number.isFinite(minuteValue)) return formatTime(time);
  if (hourValue === 0) return minuteValue ? `เที่ยงคืน ${minuteValue} นาที` : 'เที่ยงคืน';
  if (hourValue === 12) return minuteValue ? `เที่ยง ${minuteValue} นาที` : 'เที่ยง';
  return minuteValue ? `${hourValue} นาฬิกา ${minuteValue} นาที` : `${hourValue} นาฬิกา`;
}

function apiErrorMessage(error) {
  if (error?.status === 401) return 'เซสชันหมดอายุค่ะ กรุณาเข้าสู่ระบบใหม่เพื่อความปลอดภัย';
  if (error?.status === 429) return 'มีการเรียกใช้งานถี่เกินไป กรุณารอสักครู่แล้วลองใหม่ค่ะ';
  return error?.message || 'การเชื่อมต่อไม่เสถียร รายการยังไม่ถูกบันทึก กรุณาลองใหม่ค่ะ';
}

function waitForSpeechVoices(synthesis, timeoutMs = 1800) {
  const available = synthesis.getVoices();
  if (available.length) return Promise.resolve(available);
  return new Promise((resolve) => {
    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      window.clearTimeout(timer);
      synthesis.removeEventListener?.('voiceschanged', finish);
      resolve(synthesis.getVoices());
    };
    const timer = window.setTimeout(finish, timeoutMs);
    synthesis.addEventListener?.('voiceschanged', finish, { once: true });
  });
}

function selectThaiFemaleVoice(voices) {
  const femaleHints = /(female|woman|หญิง|kanya|premwadee|narisa|pattara|siri|google.*ไทย)/i;
  const naturalHints = /(natural|neural|online|premium|enhanced)/i;
  const maleHints = /(male|man|ชาย|niwat|chatchawarn)/i;
  return [...voices]
    .map((voice) => {
      const label = `${voice.name || ''} ${voice.voiceURI || ''}`;
      const lang = String(voice.lang || '').toLowerCase();
      let score = lang.startsWith('th-th') ? 120 : lang.startsWith('th') ? 100 : 0;
      if (femaleHints.test(label)) score += 45;
      if (naturalHints.test(label)) score += 18;
      if (voice.localService) score += 4;
      if (maleHints.test(label)) score -= 60;
      return { voice, score };
    })
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)[0]?.voice || null;
}

function toNaturalSpeechText(text) {
  return String(text || '')
    .replace(/AHA/gi, 'เอ เอช เอ')
    .replace(/\b(\d{1,2}):(\d{2})(?:\s*น\.)?/g, (_, hour, minute) => Number(minute) ? `${Number(hour)} นาฬิกา ${Number(minute)} นาที` : `${Number(hour)} นาฬิกา`)
    .replace(/\s+ค่ะ/g, ' ค่ะ')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function applyAppearance(mode) {
  const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches;
  const resolved = mode === 'system' ? (prefersDark ? 'dark' : 'light') : mode;
  localStorage.setItem('aha_appearance', mode);
  document.documentElement.dataset.ahaAppearance = resolved;
  document.documentElement.style.colorScheme = resolved;
  window.dispatchEvent(new CustomEvent('aha-appearance-change', { detail: mode }));
}

function resolveSystemIntent(text) {
  if (/(เปลี่ยน|ตั้ง|แก้).*(รหัสผ่าน|พาสเวิร์ด|password)/i.test(text)) {
    return { intent: 'change_password', allowed: false };
  }
  if (/(รหัสพิน|\bpin\b|ลบบัญชี|เปลี่ยนอีเมล|เปลี่ยนเบอร์|ออกจากระบบ|ยกเลิกการเชื่อมต่อ)/i.test(text)) {
    return { intent: 'security_setting', allowed: false };
  }
  const theme = /(ธีม|โหมด|สี).*(มืด|ดำ|กลางคืน)|(มืด|ดำ|กลางคืน).*(ธีม|โหมด|สี)/.test(text) ? 'dark'
    : /(ธีม|โหมด|สี).*(สว่าง|ขาว|กลางวัน)|(สว่าง|ขาว|กลางวัน).*(ธีม|โหมด|สี)/.test(text) ? 'light'
      : /(ธีม|โหมด).*(ตามระบบ|อัตโนมัติ)|(ตามระบบ|อัตโนมัติ).*(ธีม|โหมด)/.test(text) ? 'system' : null;
  if (theme && /(เปลี่ยน|ใช้|เปิด|ตั้ง|ปรับ)/.test(text)) return { intent: 'change_theme', allowed: true, theme };
  if (!/หน้า|ไป/.test(text) && /((เปิด|ปิด).*(แจ้งเตือน))|(แจ้งเตือน.*(เปิด|ปิด))/.test(text)) {
    return { intent: 'change_notifications', allowed: true, enabled: /เปิด/.test(text) && !/ปิด/.test(text) };
  }
  return null;
}

export default function VoicePage() {
  const router = useRouter();
  const recognitionRef = useRef(null);
  const mountedRef = useRef(true);
  const executingRef = useRef(false);
  const speechRequestRef = useRef(0);
  const utteranceRef = useRef(null);
  const greetingGivenRef = useRef(false);
  const conversationEndRef = useRef(null);
  const [mode, setMode] = useState('voice');
  const [state, setState] = useState('idle');
  const [transcript, setTranscript] = useState('');
  const [response, setResponse] = useState(INITIAL_MESSAGE);
  const [messages, setMessages] = useState([{ role: 'assistant', text: INITIAL_MESSAGE }]);
  const [pending, setPending] = useState(null);
  const [typedText, setTypedText] = useState('');
  const [error, setError] = useState('');
  const [speechSupported, setSpeechSupported] = useState(true);
  const [ttsSupported, setTtsSupported] = useState(true);
  const [voiceEnabled, setVoiceEnabled] = useState(true);

  const appendMessage = useCallback((role, text) => {
    setMessages((current) => [...current, { role, text }].slice(-12));
  }, []);

  const speak = useCallback(async (text, { onEnd } = {}) => {
    if (typeof window === 'undefined' || mode !== 'voice' || !voiceEnabled || !('speechSynthesis' in window)) {
      setState('done');
      onEnd?.();
      return;
    }
    const requestId = ++speechRequestRef.current;
    const synthesis = window.speechSynthesis;
    synthesis.cancel();
    const voices = await waitForSpeechVoices(synthesis);
    if (!mountedRef.current || requestId !== speechRequestRef.current) return;
    const utterance = new SpeechSynthesisUtterance(toNaturalSpeechText(text));
    utteranceRef.current = utterance;
    utterance.lang = 'th-TH';
    utterance.rate = 0.92;
    utterance.pitch = 1.06;
    utterance.volume = 1;
    const thaiVoice = selectThaiFemaleVoice(voices);
    if (thaiVoice) utterance.voice = thaiVoice;
    utterance.onstart = () => mountedRef.current && setState('speaking');
    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      utteranceRef.current = null;
      if (mountedRef.current) setState('done');
      onEnd?.();
    };
    utterance.onend = finish;
    utterance.onerror = finish;
    synthesis.resume?.();
    synthesis.speak(utterance);
    window.setTimeout(() => synthesis.resume?.(), 60);
  }, [mode, voiceEnabled]);

  const answer = useCallback((text, { speakResponse = true } = {}) => {
    setResponse(text);
    appendMessage('assistant', text);
    if (speakResponse) speak(text);
    else setState('done');
  }, [appendMessage, speak]);

  useEffect(() => {
    mountedRef.current = true;
    let active = true;
    setSpeechSupported(Boolean(window.SpeechRecognition || window.webkitSpeechRecognition));
    setTtsSupported('speechSynthesis' in window && 'SpeechSynthesisUtterance' in window);
    window.speechSynthesis?.getVoices?.();
    try { setVoiceEnabled(localStorage.getItem('aha_voice_response_enabled') !== 'false'); } catch (_) {}
    authApi.me().then((result) => { if (active && result?.user) saveSession({ user: result.user }); }).catch(() => { if (active) router.replace('/login'); });
    return () => {
      active = false;
      mountedRef.current = false;
      recognitionRef.current?.abort?.();
      speechRequestRef.current += 1;
      window.speechSynthesis?.cancel?.();
    };
  }, [router]);

  useEffect(() => {
    if (!pending) return undefined;
    const timer = window.setTimeout(() => {
      setPending(null);
      answer('รายการที่รอยืนยันหมดเวลาแล้วค่ะ กรุณาบอกรายละเอียดใหม่อีกครั้ง');
    }, 2 * 60 * 1000);
    return () => window.clearTimeout(timer);
  }, [answer, pending]);

  useEffect(() => {
    conversationEndRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'nearest' });
  }, [messages, mode, pending]);

  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return undefined;
    const resize = () => {
      document.documentElement.style.setProperty('--aha-voice-height', `${viewport.height}px`);
      document.documentElement.dataset.ahaVoiceCompact = String(viewport.height <= 520);
    };
    resize();
    viewport.addEventListener('resize', resize);
    return () => {
      viewport.removeEventListener('resize', resize);
      document.documentElement.style.removeProperty('--aha-voice-height');
      delete document.documentElement.dataset.ahaVoiceCompact;
    };
  }, []);

  const askForMissingSlot = useCallback((draft) => {
    if (!draft.medicine_name) {
      setPending({ ...draft, stage: 'collecting', missing: 'medicine_name' });
      answer('ต้องการให้เตือนยาอะไรคะ');
      return;
    }
    if (!draft.reminder_time) {
      setPending({ ...draft, stage: 'collecting', missing: 'reminder_time' });
      answer(`ต้องการให้เตือนยา${draft.medicine_name}กี่โมงคะ`);
      return;
    }
    const confirming = { ...draft, stage: 'confirming', missing: null };
    setPending(confirming);
    answer(`โอเคค่ะ จะให้ AHA เตือนยา${confirming.medicine_name}ทุกวันตอน${conversationalTime(confirming.reminder_time)} ถูกต้องไหมคะ`);
  }, [answer]);

  const executeCreateReminder = useCallback(async (command) => {
    if (executingRef.current) return;
    if (!command.medicine_name || understandTime(command.reminder_time).status !== 'valid') {
      askForMissingSlot({ ...command, reminder_time: null });
      return;
    }
    executingRef.current = true;
    setState('processing');
    setError('');
    try {
      await reminderApi.create(createReminderPayload(command));
      setPending(null);
      window.dispatchEvent(new CustomEvent('aha-reminders-refresh'));
      answer(`เรียบร้อยค่ะ AHA จะเตือนยา${command.medicine_name}ทุกวันตอน${conversationalTime(command.reminder_time)}นะคะ`);
    } catch (err) {
      const message = apiErrorMessage(err);
      setError(message);
      setPending(null);
      answer(message);
      if (err?.status === 401) window.setTimeout(() => router.replace('/login'), 1800);
    } finally {
      executingRef.current = false;
    }
  }, [answer, askForMissingSlot, router]);

  const readTodayReminders = useCallback(async (onlyNext = false) => {
    setState('processing');
    setError('');
    try {
      const result = await reminderApi.today();
      const items = (Array.isArray(result?.data) ? result.data : []).filter((item) => item.is_active !== false && !item.taken);
      if (!items.length) {
        answer('วันนี้ไม่มีรายการยาที่กำลังรอทานค่ะ ต้องการตั้งเตือนยาใหม่ไหมคะ');
        return;
      }
      const sorted = [...items].sort((a, b) => formatTime(a.reminder_time).localeCompare(formatTime(b.reminder_time)));
      if (onlyNext) {
        const now = new Date();
        const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
        const next = sorted.find((item) => formatTime(item.reminder_time) >= currentTime) || sorted[0];
        answer(`ยารายการถัดไปคือยา${next.medicine_name} ตอน${conversationalTime(next.reminder_time)}ค่ะ`);
        return;
      }
      const detail = sorted.slice(0, 3).map((item) => `ยา${item.medicine_name} ตอน${conversationalTime(item.reminder_time)}`).join(' และ ');
      answer(sorted.length > 3 ? `วันนี้มี ${sorted.length} รายการค่ะ สามรายการแรกคือ ${detail} รายการทั้งหมดดูได้ที่หน้าจัดการยาค่ะ` : `วันนี้มี ${sorted.length} รายการค่ะ ${detail}`);
    } catch (err) {
      const message = apiErrorMessage(err);
      setError(message);
      answer(message);
    }
  }, [answer]);

  const handlePendingTurn = useCallback(async (text, command) => {
    const turn = pendingTurn(text, command);
    if (turn.action === 'cancel') {
      setPending(null);
      answer('ยกเลิกรายการแล้วค่ะ');
      return;
    }
    if (turn.action === 'confirm') {
      await executeCreateReminder(turn.command);
      return;
    }
    if (turn.action === 'reply' || turn.action === 'clarify') {
      if (turn.command) setPending(turn.command);
      answer(turn.prompt);
      return;
    }
    askForMissingSlot(turn.command);
  }, [answer, askForMissingSlot, executeCreateReminder]);

  const handleCommand = useCallback(async (rawText) => {
    if (executingRef.current) return;
    const text = normalizeDialectText(rawText).replace(/\s+/g, ' ').trim();
    if (!text) return;
    if (text.length > 500) {
      answer('ข้อความยาวเกินไปค่ะ กรุณาบอกคำสั่งครั้งละหนึ่งรายการ พร้อมชื่อยาและเวลา');
      return;
    }
    setError('');
    setTranscript(text);
    appendMessage('user', text);

    if (isEmergency(text)) {
      setPending(null);
      answer('กำลังเปิดหน้าฉุกเฉินค่ะ กรุณาเลือกโทร 1669 หรือแจ้งผู้ดูแลบนหน้าจอ');
      window.setTimeout(() => router.push('/emergency'), 700);
      return;
    }
    if (isMedicalAdvice(text)) {
      answer('AHA ไม่สามารถวินิจฉัยหรือแนะนำให้เปลี่ยนยาและขนาดยาได้ค่ะ กรุณาทำตามคำสั่งแพทย์หรือเภสัชกร หากมีอาการรุนแรงให้โทร 1669 หรือติดต่อผู้ดูแลทันที');
      return;
    }
    if ((pending || isCreateRequest(text)) && unsupportedSchedule(text)) {
      setPending(null);
      answer('การตั้งเตือนผ่านเสียงตอนนี้รองรับทุกวันค่ะ หากต้องการวันเฉพาะหรือความถี่อื่น กรุณากำหนดในหน้าจัดการยา');
      return;
    }
    if (/^(สวัสดี|หวัดดี|ดีจ้า|ดีครับ|ดีค่ะ)(ครับ|ค่ะ|คะ|จ้า)?$/.test(text)) {
      answer('สวัสดีค่ะ มีอะไรให้ AHA ช่วยไหมคะ จะถามเรื่องยา ตั้งเวลาเตือน หรือให้ช่วยเปิดหน้าต่าง ๆ ก็ได้ค่ะ');
      return;
    }
    if (/ช่วยอะไร|ทำอะไรได้|พูดอะไรได้|วิธีใช้/.test(text)) {
      answer('AHA ช่วยดูรายการยาวันนี้ ดูยาครั้งถัดไป ตั้งเตือนยา เปิดหน้าต่าง ๆ เปลี่ยนธีม และเปิดหรือปิดการแจ้งเตือนได้ค่ะ');
      return;
    }
    if (/(พูดอีกครั้ง|พูดซ้ำ|ทวนอีกที|เมื่อกี้ว่าอะไร)/.test(text)) {
      answer(response);
      return;
    }
    if (/(กี่โมง|เวลาเท่าไหร่)/.test(text) && !/ยา|เตือน/.test(text)) {
      const now = new Date();
      answer(`ตอนนี้เวลา ${now.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} ค่ะ`);
      return;
    }
    if (/(วันนี้วันที่|วันที่เท่าไหร่|วันอะไร)/.test(text)) {
      answer(`วันนี้${new Date().toLocaleDateString('th-TH', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}ค่ะ`);
      return;
    }
    const systemIntent = resolveSystemIntent(text);
    if (systemIntent?.intent === 'change_password') {
      answer('AHA ไม่สามารถเปลี่ยนรหัสผ่านให้ได้เพื่อความปลอดภัยค่ะ กรุณาทำการเปลี่ยนด้วยตนเองที่หน้าตั้งค่าบัญชีค่ะ');
      return;
    }
    if (systemIntent && !systemIntent.allowed) {
      answer('รายการนี้เกี่ยวกับความปลอดภัย AHA จะไม่เปลี่ยนให้โดยอัตโนมัติค่ะ กรุณาตรวจสอบและยืนยันด้วยตัวเองในหน้าตั้งค่าบัญชี');
      return;
    }
    if (systemIntent?.intent === 'change_theme') {
      try {
        applyAppearance(systemIntent.theme);
        answer(systemIntent.theme === 'dark' ? 'ได้เลยค่ะ เปลี่ยนเป็นโหมดมืดให้แล้วนะคะ' : systemIntent.theme === 'light' ? 'ได้เลยค่ะ เปลี่ยนเป็นโหมดสว่างให้แล้วนะคะ' : 'ตั้งธีมให้เปลี่ยนตามระบบเรียบร้อยแล้วค่ะ');
      } catch (_) { answer('ยังเปลี่ยนธีมให้ไม่ได้ค่ะ ลองเปลี่ยนจากหน้าตั้งค่าอีกครั้งนะคะ'); }
      return;
    }
    if (systemIntent?.intent === 'change_notifications') {
      const enable = systemIntent.enabled;
      const userId = getUser()?.id;
      setState('processing');
      try {
        if (enable) {
          setAhaPushPreference(true, userId);
          await enableAhaPush({ requestPermission: true, userId });
          window.dispatchEvent(new CustomEvent('aha-push-preference-change'));
          answer('เปิดการแจ้งเตือนยาให้แล้วค่ะ');
        } else {
          setAhaPushPreference(false, userId);
          try { await disableAhaPush({ userId }); } catch (_) {}
          window.dispatchEvent(new CustomEvent('aha-push-preference-change'));
          answer('ปิดการแจ้งเตือนยาให้แล้วค่ะ คุณเปิดกลับได้ทุกเมื่อจากหน้าตั้งค่านะคะ');
        }
      } catch (err) {
        answer(`${err?.message || 'ยังเปลี่ยนการแจ้งเตือนไม่สำเร็จ'} กรุณาตรวจสอบต่อในหน้าตั้งค่าค่ะ`);
        window.setTimeout(() => router.push('/profile'), 1200);
      }
      return;
    }
    if (/ยาครั้ง(ต่อ|ถัด)ไป|ครั้ง(ต่อ|ถัด)ไป.*กี่โมง/.test(text)) {
      await readTodayReminders(true);
      return;
    }
    if (/วันนี้.*ยา|ยา.*วันนี้|รายการยาวันนี้/.test(text)) {
      await readTodayReminders(false);
      return;
    }
    const navigation = [
      { pattern: /(ไป|เปิด).*(หน้าหลัก|โฮม)/, route: '/home', label: 'หน้าหลัก' },
      { pattern: /(ไป|เปิด|จัดการ).*(รายการยา|ยา|การเตือน)/, route: '/reminders', label: 'หน้าจัดการยา' },
      { pattern: /(ไป|เปิด).*(แจ้งเตือน)/, route: '/notifications', label: 'หน้าการแจ้งเตือน' },
      { pattern: /(ไป|เปิด).*(ครอบครัว|การเชื่อมต่อ|ผู้ดูแล)/, route: '/family', label: 'หน้าการเชื่อมต่อ' },
      { pattern: /(ไป|เปิด).*(โปรไฟล์|ตั้งค่า)/, route: '/profile', label: 'หน้าโปรไฟล์' },
    ].find((item) => item.pattern.test(text));
    if (navigation) {
      setPending(null);
      answer(`กำลังเปิด${navigation.label}ค่ะ`);
      window.setTimeout(() => router.push(navigation.route), 500);
      return;
    }
    if (pending) {
      await handlePendingTurn(text, pending);
      return;
    }
    if (isCreateRequest(text)) {
      const time = understandTime(text);
      const draft = { intent: 'create_reminder', medicine_name: extractMedicineName(text), reminder_time: time.time, stage: 'collecting' };
      if (time.status === 'invalid' || time.status === 'ambiguous') {
        setPending({ ...draft, missing: 'reminder_time' });
        answer(time.prompt);
      } else askForMissingSlot(draft);
      return;
    }
    if (/ยกเลิก|ไม่ทำแล้ว/.test(text)) {
      answer('ตอนนี้ยังไม่มีรายการที่รอยืนยันค่ะ');
      return;
    }
    answer('ขออภัยค่ะ AHA ยังไม่เข้าใจ ลองพูดสั้น ๆ เช่น “ยาครั้งต่อไป” หรือ “เตือนยาความดันสองทุ่ม” ค่ะ');
  }, [answer, appendMessage, askForMissingSlot, handlePendingTurn, pending, readTodayReminders, response, router]);

  const beginRecognition = () => {
    setError('');
    setTranscript('');
    speechRequestRef.current += 1;
    window.speechSynthesis?.cancel?.();
    window.speechSynthesis?.getVoices?.();
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Recognition) {
      setSpeechSupported(false);
      setError('อุปกรณ์นี้ไม่รองรับการฟังเสียง กรุณาพิมพ์ข้อความในช่องด้านล่าง');
      return;
    }
    recognitionRef.current?.abort?.();
    const recognition = new Recognition();
    recognition.lang = 'th-TH';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognitionRef.current = recognition;
    recognition.onstart = () => setState('listening');
    recognition.onresult = async (event) => {
      const text = event.results?.[0]?.[0]?.transcript || '';
      setState('understanding');
      await handleCommand(text);
    };
    recognition.onerror = (event) => {
      const message = event.error === 'not-allowed' ? 'กรุณาอนุญาตการใช้ไมโครโฟน หรือพิมพ์ข้อความแทน' : event.error === 'no-speech' ? 'AHA ยังไม่ได้ยินเสียง กรุณาลองใหม่หรือพิมพ์ข้อความแทน' : 'ฟังเสียงไม่สำเร็จ กรุณาลองใหม่หรือพิมพ์ข้อความแทน';
      setError(message);
      setState('idle');
    };
    recognition.onend = () => setState((current) => current === 'listening' ? 'idle' : current);
    try { recognition.start(); } catch (_) { setState('idle'); }
  };

  const startListening = () => {
    if (mode === 'voice' && !greetingGivenRef.current) {
      greetingGivenRef.current = true;
      setError('');
      setTranscript('');
      setResponse(VOICE_GREETING);
      appendMessage('assistant', VOICE_GREETING);
      speak(VOICE_GREETING, { onEnd: beginRecognition });
      return;
    }
    beginRecognition();
  };

  const submitTypedText = async (event) => {
    event.preventDefault();
    const text = typedText.trim();
    if (!text || state === 'processing') return;
    setTypedText('');
    speechRequestRef.current += 1;
    window.speechSynthesis?.cancel?.();
    setState('understanding');
    await handleCommand(text);
  };

  const toggleVoice = () => {
    const next = !voiceEnabled;
    setVoiceEnabled(next);
    try { localStorage.setItem('aha_voice_response_enabled', String(next)); } catch (_) {}
    if (!next) {
      speechRequestRef.current += 1;
      window.speechSynthesis?.cancel?.();
    } else {
      window.speechSynthesis?.getVoices?.();
    }
    setState('idle');
  };

  const clearConversation = () => {
    recognitionRef.current?.abort?.();
    speechRequestRef.current += 1;
    window.speechSynthesis?.cancel?.();
    setPending(null);
    greetingGivenRef.current = false;
    setTranscript('');
    setResponse(INITIAL_MESSAGE);
    setMessages([{ role: 'assistant', text: INITIAL_MESSAGE }]);
    setError('');
    setState('idle');
  };

  const switchMode = (nextMode) => {
    recognitionRef.current?.abort?.();
    speechRequestRef.current += 1;
    window.speechSynthesis?.cancel?.();
    setMode(nextMode);
    setError('');
    setState('idle');
  };

  const stateLabel = state === 'listening' ? 'กำลังฟัง...'
    : state === 'understanding' ? 'กำลังทำความเข้าใจ...'
      : state === 'processing' ? 'กำลังบันทึกรายการ...'
        : state === 'speaking' ? 'AHA กำลังตอบ...'
          : pending?.stage === 'confirming' ? 'รอการยืนยัน'
            : pending?.stage === 'collecting' ? 'รอข้อมูลเพิ่มเติม'
              : 'พร้อมฟัง';

  return (
    <div className="aha-conversation-page aha-layout-refresh aha-conversation-v2">
      <main className="aha-conversation-shell">
        <header className="aha-conversation-header">
          <button className="aha-conversation-icon-button back" type="button" onClick={() => router.push('/home')} aria-label="กลับหน้าหลัก">
            <AhaIcon name="arrow" size={21} />
          </button>
          <div className="aha-conversation-identity">
            <AhaCompanion compact />
            <div><strong><T>คุยกับ AHA</T></strong><span><i aria-hidden="true" /><T>ผู้ช่วยเรื่องยา ใกล้คุณเสมอ</T></span></div>
          </div>
          <button className="aha-conversation-icon-button aha-conversation-mode-switch" type="button" onClick={() => switchMode(mode === 'text' ? 'voice' : 'text')} aria-label={mode === 'text' ? 'เปลี่ยนเป็นโหมดเสียง' : 'เปลี่ยนเป็นโหมดข้อความ'}>
            <AhaIcon name={mode === 'text' ? 'activity' : 'message'} size={22} />
            <span><T>{mode === 'text' ? 'ใช้เสียง' : 'พิมพ์คุย'}</T></span>
          </button>
        </header>

        {mode === 'text' ? (
          <div className="aha-chat-layout">
            <aside className="aha-chat-intro">
              <span className="aha-companion-label">AHA COMPANION</span>
              <AhaCompanion state={state} />
              <h2><T>เรื่องยา ให้ AHA ช่วยจำ</T></h2>
              <p><T>พิมพ์ชื่อยาและเวลา หรือค่อย ๆ บอกทีละอย่างก็ได้ค่ะ</T></p>
              <span className="aha-companion-note"><AhaIcon name="pill" size={18} /><T>ตรวจสอบก่อนบันทึกทุกครั้ง</T></span>
            </aside>
            <section className="aha-text-chat-stage" aria-label="สนทนาข้อความกับ AHA">
            <div className="aha-chat-heading">
              <div><span><T>แชทข้อความ</T></span><h1><T>วันนี้ให้ช่วยอะไรดีคะ?</T></h1></div>
              <button type="button" onClick={clearConversation}><T>เริ่มใหม่</T></button>
            </div>

            <div className="aha-chat-scroll">
            <div className="aha-chat-messages" aria-label="ประวัติการสนทนา">
              {messages.map((message, index) => (
                <div className={`aha-chat-row ${message.role}`} key={`${message.role}-${index}`}>
                  {message.role === 'assistant' && <span className="aha-chat-avatar" aria-hidden="true"><AhaCompanion compact /></span>}
                  <div className="aha-chat-bubble"><small><T>{message.role === 'assistant' ? 'AHA' : 'คุณ'}</T></small><p>{message.text}</p></div>
                </div>
              ))}
            </div>

            {pending?.stage === 'confirming' && (
              <div className="aha-glass-confirm" role="group" aria-label="ยืนยันการตั้งเตือนยา">
                <div><small><T>ตรวจสอบก่อนบันทึก</T></small><strong><T>ยา</T>{pending.medicine_name}</strong><span><T>ทุกวัน เวลา</T>{pending.reminder_time}<T>น.</T></span></div>
                <div><button type="button" className="confirm" onClick={() => handleCommand('ยืนยัน')} disabled={state === 'processing'}><T>ยืนยัน</T></button><button type="button" onClick={() => handleCommand('ยกเลิก')}><T>ยกเลิก</T></button></div>
              </div>
            )}

            {error && <div className="aha-conversation-error" role="alert">{error}</div>}
              <div ref={conversationEndRef} />
            </div>

            <div className="aha-chat-suggestions" aria-label="คำถามแนะนำ">
              <button type="button" onClick={() => handleCommand('ยาครั้งต่อไปกี่โมง')}><T>ยาครั้งถัดไป</T></button>
              <button type="button" onClick={() => handleCommand('วันนี้มียาอะไรบ้าง')}><T>รายการยาวันนี้</T></button>
              <button type="button" onClick={() => handleCommand('เตือนยาความดันสองทุ่ม')}><T>ตั้งเตือนยา</T></button>
            </div>

            <form className="aha-chat-composer" onSubmit={submitTypedText}>
              <input aria-label="พิมพ์ข้อความถึง AHA" value={typedText} onChange={(event) => setTypedText(event.target.value)} placeholder="ถาม AHA ได้เลย..." maxLength={240} />
              {typedText.trim() ? (
                <button type="submit" className="send" disabled={state === 'processing'} aria-label="ส่งข้อความ"><AhaIcon name="arrow" size={21} /></button>
              ) : (
                <button type="button" className="mic" onClick={startListening} disabled={state === 'processing'} aria-label="พูดข้อความ"><AhaIcon name="mic" size={22} /></button>
              )}
            </form>
            </section>
          </div>
        ) : (
          <section className="aha-live-voice-stage">
            <div className="aha-voice-topline"><span><AhaIcon name="mic" size={17} /><T>สนทนาด้วยเสียง</T></span><button type="button" onClick={clearConversation}><T>เริ่มใหม่</T></button></div>
            <div className="aha-voice-layout">
              <div className="aha-character-panel">
                <div className="aha-character-scene"><AhaCompanion state={state} /><span className="aha-character-spark one" /><span className="aha-character-spark two" /></div>
              </div>
              <div className="aha-voice-interaction">
            <div className="aha-live-status" role="status" aria-live="polite">
              <span className={`aha-voice-status-chip ${state}`}><i aria-hidden="true" />{stateLabel}</span>
              <h1><T>{state === 'listening' ? 'AHA กำลังฟังคุณ...' : state === 'speaking' ? 'AHA กำลังตอบ...' : 'พร้อมคุยกับคุณแล้วค่ะ'}</T></h1>
              <p>{response}</p>
              {transcript && <small><T>คุณพูดว่า “</T>{transcript}”</small>}
            </div>

            {pending?.stage === 'confirming' && (
              <div className="aha-glass-confirm voice" role="group" aria-label="ยืนยันการตั้งเตือนยา">
                <div><small><T>ตรวจสอบก่อนบันทึก</T></small><strong><T>ยา</T>{pending.medicine_name}</strong><span><T>ทุกวัน เวลา</T>{pending.reminder_time}<T>น.</T></span></div>
                <div><button type="button" className="confirm" onClick={() => handleCommand('ยืนยัน')} disabled={state === 'processing'}><T>ยืนยัน</T></button><button type="button" onClick={() => handleCommand('ยกเลิก')}><T>ยกเลิก</T></button></div>
              </div>
            )}

            {!speechSupported && <div className="aha-voice-fallback"><span><T>อุปกรณ์นี้ไม่รองรับการฟังเสียง</T></span><button type="button" onClick={() => switchMode('text')}><T>เปลี่ยนไปพิมพ์ข้อความ</T></button></div>}
            {error && <div className="aha-conversation-error" role="alert">{error}</div>}

            <div className="aha-live-controls">
              <button type="button" className={`side speaker-sticker ${voiceEnabled ? 'active' : ''}`} onClick={toggleVoice} disabled={!ttsSupported} aria-label={voiceEnabled ? 'ปิดเสียงตอบกลับ' : 'เปิดเสียงตอบกลับ'}><AhaIcon name={voiceEnabled ? 'volume' : 'volumeOff'} size={25} /><small><T>เสียง</T></small></button>
              <button type="button" className={`main ${state === 'listening' ? 'listening' : ''}`} onClick={state === 'listening' ? () => recognitionRef.current?.stop?.() : startListening} disabled={state === 'processing'} aria-label={state === 'listening' ? 'หยุดฟัง' : 'เริ่มพูด'}><AhaIcon name="mic" size={34} /></button>
              <button type="button" className="side" onClick={() => router.push('/profile')} aria-label="เปิดการตั้งค่า"><AhaIcon name="activity" size={25} /><small><T>ตั้งค่า</T></small></button>
            </div>
            <p className="aha-live-help"><T>{state === 'listening' ? 'พูดได้เลย แล้วแตะไมโครโฟนเพื่อหยุด' : 'แตะไมโครโฟนหนึ่งครั้งเพื่อเริ่มพูด'}</T></p>
            <button type="button" className="aha-voice-type-link" onClick={() => switchMode('text')}><AhaIcon name="message" size={17} /><T>สะดวกพิมพ์? คุยด้วยข้อความ</T></button>
              </div>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

