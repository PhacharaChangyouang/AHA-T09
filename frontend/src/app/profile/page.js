'use client';
import AhaInstallCard from '../../components/AhaInstallCard';

import { T, LanguageSelector } from '../../components/Language';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import AhaIcon from '../../components/AhaIcon';
import GoogleSignInButton from '../../components/GoogleSignInButton';
import { authApi, notificationApi } from '../../services/api';
import { clearSession, getAvatar, saveAvatar, saveSession } from '../../services/auth';
import {
  disableAhaPush,
  enableAhaPush,
  getAhaPushPermission,
  isAhaPushEnabledLocally,
  setAhaPushPreference,
} from '../../services/push';


function applyAppearance(mode) {
  if (typeof window === 'undefined') return;
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const resolved = mode === 'system' ? (prefersDark ? 'dark' : 'light') : mode;
  document.documentElement.dataset.ahaAppearance = resolved;
  document.documentElement.style.colorScheme = resolved;
}

export default function ProfilePage() {
  const router = useRouter();
  const fileRef = useRef(null);
  const [user, setUser] = useState(null);
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [role, setRole] = useState('elderly');
  const [theme, setTheme] = useState('light');
  const [avatar, setAvatar] = useState('');
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmNewPin, setConfirmNewPin] = useState('');
  const [pinSaving, setPinSaving] = useState(false);
  const [medicinePushEnabled, setMedicinePushEnabled] = useState(true);
  const [pushDeliveryState, setPushDeliveryState] = useState('checking');
  const [notificationBusy, setNotificationBusy] = useState(false);
  const [appearanceNotice, setAppearanceNotice] = useState('');
  const [supportName, setSupportName] = useState('');
  const [supportEmail, setSupportEmail] = useState('');
  const [supportIssue, setSupportIssue] = useState('');
  const [supportBusy, setSupportBusy] = useState(false);
  const [supportOpen, setSupportOpen] = useState(false);
  const [linkMethod, setLinkMethod] = useState('pin');
  const [linkCredential, setLinkCredential] = useState('');
  const [linkBusy, setLinkBusy] = useState(false);
  const [linkGrant, setLinkGrant] = useState('');
  const [linkError, setLinkError] = useState('');
  const [pinError, setPinError] = useState('');
  const [systemDark, setSystemDark] = useState(false);

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const sync = () => {
      setSystemDark(media.matches);
      if (localStorage.getItem('aha_appearance') === 'system') applyAppearance('system');
    };
    sync();
    if (media.addEventListener) media.addEventListener('change', sync);
    else media.addListener(sync);
    return () => {
      if (media.removeEventListener) media.removeEventListener('change', sync);
      else media.removeListener(sync);
    };
  }, []);

  useEffect(() => {
    if (!linkGrant) return undefined;
    const timer = window.setTimeout(() => {
      setLinkGrant(''); setLinkError('การยืนยันหมดอายุ กรุณายืนยันบัญชี AHA อีกครั้ง');
    }, 300000);
    return () => window.clearTimeout(timer);
  }, [linkGrant]);

  useEffect(() => {
    const savedAppearance = localStorage.getItem('aha_appearance') || 'light';
    setTheme(savedAppearance);
    applyAppearance(savedAppearance);
    authApi.me().then((result) => {
      if (!result?.user) throw new Error('Unauthorized');
      const fresh = result.user;
      setUser(fresh); setName(fresh.name || ''); setAge(fresh.age ?? ''); setRole(fresh.role || 'elderly'); setPhone(fresh.phone || '');
      setSupportName((value) => value || fresh.name || '');
      setSupportEmail((value) => value || fresh.email || '');
      setAvatar(getAvatar(fresh.id) || fresh.avatarUrl || '');
      saveSession({ user: fresh });
      const preferred = isAhaPushEnabledLocally(fresh.id);
      setMedicinePushEnabled(preferred);
      if (!preferred) {
        setPushDeliveryState('disabled');
        return null;
      }

      const permission = getAhaPushPermission();
      if (permission === 'unsupported') {
        setPushDeliveryState('unsupported');
        return null;
      }
      if (permission === 'default') {
        setPushDeliveryState('permission_required');
        return null;
      }
      if (permission === 'denied') {
        setPushDeliveryState('blocked');
        return null;
      }

      return enableAhaPush({ requestPermission: false, userId: fresh.id })
        .then(() => setPushDeliveryState('active'))
        .catch(() => setPushDeliveryState('unavailable'));
    }).catch((err) => {
      setPushDeliveryState('unavailable');
      if (err?.status === 401 || err?.message === 'Unauthorized') router.replace('/login');
    });
  }, [router]);

  const flash = (ok, text) => { setError(ok ? '' : text); setMessage(ok ? text : ''); };

  const selectTheme = (key) => {
    setTheme(key);
    localStorage.setItem('aha_appearance', key);
    applyAppearance(key);
    window.dispatchEvent(new CustomEvent('aha-appearance-change', { detail: key }));
    setAppearanceNotice(key === 'dark' ? 'เปลี่ยนเป็นโหมดมืดแล้ว' : key === 'system' ? 'ใช้ธีมตามระบบแล้ว' : 'เปลี่ยนเป็นโหมดสว่างแล้ว');
    window.setTimeout(() => setAppearanceNotice(''), 1800);
  };

  const toggleMedicineNotifications = async () => {
    setNotificationBusy(true); setError(''); setMessage('');
    try {
      if (medicinePushEnabled) {
        await disableAhaPush({ userId: user?.id });
        setMedicinePushEnabled(false);
        setPushDeliveryState('disabled');
        setMessage('ปิดการแจ้งเตือนยาแล้ว');
      } else {
        setAhaPushPreference(true, user?.id);
        setMedicinePushEnabled(true);
        await enableAhaPush({ requestPermission: true, userId: user?.id });
        setPushDeliveryState('active');
        setMessage('เปิดการแจ้งเตือนยาและเชื่อมต่ออุปกรณ์นี้แล้ว');
      }
    } catch (err) {
      if (medicinePushEnabled) {
        setMedicinePushEnabled(true);
        setAhaPushPreference(true, user?.id);
      }
      setPushDeliveryState(err?.code === 'PUSH_PERMISSION_DENIED' ? 'blocked'
        : err?.code === 'PUSH_PERMISSION_REQUIRED' ? 'permission_required'
          : err?.code === 'PUSH_UNSUPPORTED' || err?.code === 'PUSH_IOS_INSTALL_REQUIRED' ? 'unsupported'
            : 'unavailable');
      setError(err?.message || 'ไม่สามารถเปลี่ยนการตั้งค่าการแจ้งเตือนยาได้');
    } finally { setNotificationBusy(false); }
  };

  const activateNotificationsOnDevice = async () => {
    setNotificationBusy(true); setError(''); setMessage('');
    setAhaPushPreference(true, user?.id);
    setMedicinePushEnabled(true);
    try {
      await enableAhaPush({ requestPermission: true, userId: user?.id });
      setPushDeliveryState('active');
      setMessage('อุปกรณ์นี้พร้อมรับการแจ้งเตือนยาแล้ว');
    } catch (err) {
      setPushDeliveryState(err?.code === 'PUSH_PERMISSION_DENIED' ? 'blocked'
        : err?.code === 'PUSH_PERMISSION_REQUIRED' ? 'permission_required'
          : err?.code === 'PUSH_UNSUPPORTED' || err?.code === 'PUSH_IOS_INSTALL_REQUIRED' ? 'unsupported'
            : 'unavailable');
      setError(err?.message || 'ยังเปิดการแจ้งเตือนบนอุปกรณ์นี้ไม่สำเร็จ');
    } finally { setNotificationBusy(false); }
  };

  const chooseAvatar = () => fileRef.current?.click();

  const onAvatarChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { flash(false, 'กรุณาเลือกไฟล์รูปภาพ'); return; }
    if (file.size > 2 * 1024 * 1024) { flash(false, 'รูปภาพต้องมีขนาดไม่เกิน 2 MB'); return; }
    const reader = new FileReader();
    reader.onload = () => {
      const value = String(reader.result || '');
      setAvatar(value);
      if (user?.id) saveAvatar(user.id, value);
      flash(true, 'เปลี่ยนรูปโปรไฟล์แล้ว');
    };
    reader.readAsDataURL(file);
    event.target.value = '';
  };

  const removeAvatar = () => {
    setAvatar('');
    if (user?.id) saveAvatar(user.id, '');
    flash(true, 'ลบรูปโปรไฟล์แล้ว');
  };

  const saveProfile = async () => {
    setSaving(true); setError(''); setMessage('');
    try {
      const result = await authApi.updateMe({ name: name.trim(), age: age === '' ? null : Number(age) });
      const fresh = result.user;
      saveSession({ user: fresh });
      setUser(fresh); setMessage('บันทึกข้อมูลโปรไฟล์แล้ว');
    } catch (err) { setError(err.message || 'บันทึกข้อมูลไม่สำเร็จ'); }
    finally { setSaving(false); }
  };

  const pinFieldsValid = () => {
    if (!/^\d{4}$/.test(newPin) || !/^\d{4}$/.test(confirmNewPin)) {
      setPinError('PIN ใหม่ต้องเป็นตัวเลข 4 หลักทั้งสองช่อง'); return false;
    }
    if (newPin !== confirmNewPin) { setPinError('PIN ใหม่และการยืนยัน PIN ไม่ตรงกัน'); return false; }
    return true;
  };

  const changePin = async () => {
    if (pinSaving) return;
    setPinError(''); setError(''); setMessage('');
    if (!pinFieldsValid()) return;
    if (!/^\d{4}$/.test(currentPin)) { setPinError('กรุณากรอก PIN ปัจจุบัน 4 หลัก'); return; }
    if (currentPin === newPin) { setPinError('PIN ใหม่ต้องไม่ซ้ำกับ PIN ปัจจุบัน'); return; }
    setPinSaving(true);
    try {
      await authApi.changePin(currentPin, newPin, confirmNewPin);
      setCurrentPin(''); setNewPin(''); setConfirmNewPin('');
      clearSession();
      router.replace('/login');
    } catch (err) { setPinError(err.message || 'เปลี่ยน PIN ไม่สำเร็จ'); }
    finally { setPinSaving(false); }
  };

  const verifyGoogleLink = async () => {
    if (linkBusy) return;
    setLinkError(''); setLinkGrant('');
    if (!linkCredential || (linkMethod === 'pin' && !/^\d{4}$/.test(linkCredential))) {
      setLinkError('กรุณากรอก PIN หรือรหัสผ่าน AHA ปัจจุบัน'); return;
    }
    setLinkBusy(true);
    try {
      const result = await authApi.verifyGoogleLink({ method: linkMethod, currentCredential: linkCredential });
      if (!result.linkGrant) throw new Error('ยืนยันบัญชีไม่สำเร็จ กรุณาลองใหม่');
      setLinkCredential(''); setLinkGrant(result.linkGrant);
    } catch (err) { setLinkError(err.message || 'ยืนยันบัญชีไม่สำเร็จ'); }
    finally { setLinkBusy(false); }
  };

  const linkGoogle = async (credential) => {
    if (!linkGrant || linkBusy) return;
    setLinkError(''); setLinkBusy(true);
    try {
      await authApi.linkGoogle({ credential, linkGrant });
      setLinkGrant(''); clearSession(); router.replace('/login');
    } catch (err) {
      setLinkGrant(''); setLinkError(err.message || 'เชื่อมต่อ Google ไม่สำเร็จ กรุณายืนยันบัญชีอีกครั้ง');
    } finally { setLinkBusy(false); }
  };

  const submitSupport = async (event) => {
    event.preventDefault();
    setError(''); setMessage('');
    const cleanName = supportName.trim();
    const cleanEmail = supportEmail.trim();
    const cleanIssue = supportIssue.trim();
    if (!cleanName || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail) || cleanIssue.length < 5) {
      setError('กรุณากรอกชื่อ อีเมล และรายละเอียดปัญหาให้ครบถ้วน');
      return;
    }
    setSupportBusy(true);
    try {
      await notificationApi.contactSupport({ name: cleanName, email: cleanEmail, issue: cleanIssue });
      setSupportIssue('');
      setMessage('ส่งข้อความถึงผู้ดูแลระบบแล้ว');
    } catch (err) {
      setError(err?.message || 'ส่งข้อความถึงผู้ดูแลระบบไม่สำเร็จ');
    } finally { setSupportBusy(false); }
  };

  const logout = async () => {
    try { await disableAhaPush({ rememberPreference: false, userId: user?.id }); } catch (_) {}
    try { await authApi.logout(); } catch (_) {}
    clearSession(); router.replace('/login');
  };

  if (!user) return <div className="aha-profile-page"><div className="aha-profile-loading"><T>กำลังโหลดโปรไฟล์…</T></div></div>;

  const initial = (user.name || 'A').slice(0, 1).toUpperCase();

  return (
    <div className="aha-profile-page aha-layout-refresh">
      <header className="aha-profile-header">
        <button className="aha-profile-icon-button" onClick={() => router.push('/home')} type="button" aria-label="กลับหน้าหลัก"><AhaIcon name="arrow" size={22} /></button>
        <div className="aha-profile-title"><strong><T>โปรไฟล์</T></strong><span><T>บัญชีและการตั้งค่า AHA</T></span></div>
        <button className="aha-profile-home-button" onClick={() => router.push('/home')} type="button"><AhaIcon name="home" size={19} /><span><T>หน้าหลัก</T></span></button>
      </header>

      <main className="aha-profile-wrap">
        <AhaInstallCard persistent hideWhenInstalled />
        <section className="aha-profile-identity">
          <span className="aha-profile-orb orb-one" /><span className="aha-profile-orb orb-two" />
          <button className="aha-profile-edit" onClick={chooseAvatar} type="button"><T>แก้ไขรูป</T></button>
          <div className="aha-profile-avatar-wrap">
            <button className="aha-profile-avatar" onClick={chooseAvatar} type="button" aria-label="เปลี่ยนรูปโปรไฟล์">
              {avatar ? <Image src={avatar} alt="รูปโปรไฟล์" fill sizes="120px" unoptimized /> : <span>{initial}</span>}
              <i aria-hidden="true" />
            </button>
            <input ref={fileRef} type="file" accept="image/*" onChange={onAvatarChange} hidden />
          </div>
          <div className="aha-profile-identity-copy">
            <span className="aha-profile-role"><T>{user.role === 'caregiver' ? 'ผู้ดูแล' : 'ผู้สูงอายุ'}</T></span>
            <h1>{user.name || 'ผู้ใช้งาน AHA'}</h1>
            <p>{user.phone || 'ยังไม่ได้ระบุเบอร์โทรศัพท์'}</p>
            {avatar && <button className="aha-profile-remove-avatar" type="button" onClick={removeAvatar}><T>ลบรูปโปรไฟล์</T></button>}
          </div>
          <div className="aha-profile-mark" aria-hidden="true"><span /><span /><span /><span /></div>
        </section>

        {(message || error || appearanceNotice) && <div role={error ? 'alert' : 'status'} className={`aha-profile-alert ${error ? 'error' : 'success'}`}>{error || message || appearanceNotice}</div>}

        <h2 className="aha-settings-category"><T>บัญชีของฉัน</T></h2>
        <details className="aha-settings-disclosure"><summary><span className="aha-setting-icon"><AhaIcon name="users" size={22} /></span><span><strong><T>ข้อมูลส่วนตัว</T></strong><small><T>ชื่อ อายุ และบทบาทของคุณ</T></small></span><AhaIcon name="chevron" size={19} /></summary>
          <section className="aha-profile-section aha-profile-personal">
          <div className="aha-profile-section-heading"><div><span className="aha-profile-kicker">PROFILE</span><h2><T>ข้อมูลส่วนตัว</T></h2><p><T>ข้อมูลที่ใช้แสดงในระบบ AHA</T></p></div></div>
          <div className="aha-profile-fields">
            <label><T>ชื่อที่แสดง</T><input value={name} onChange={(e) => setName(e.target.value)} maxLength={100} /></label>
            <label><T>อายุ</T><input type="number" min="1" max="120" value={age} onChange={(e) => setAge(e.target.value)} /></label>
            <label><T>บทบาท</T><input value={role === 'caregiver' ? 'ผู้ดูแล' : 'ผู้สูงอายุ'} readOnly aria-readonly="true" /></label>
          </div>
          <button className="aha-profile-primary" onClick={saveProfile} disabled={saving}><T>{saving ? 'กำลังบันทึก…' : 'บันทึกข้อมูล'}</T></button>
        </section>

          <section className="aha-profile-section">
            <div className="aha-profile-section-heading"><div><span className="aha-profile-kicker">PHONE</span><h2><T>เบอร์โทรศัพท์</T></h2><p><T>ปิดการเปลี่ยนเบอร์อัตโนมัติแล้ว หากต้องแก้ไขกรุณาติดต่อผู้ดูแลระบบ</T></p></div></div>
            <div className="aha-profile-fields single"><label><T>เบอร์โทรศัพท์</T><input value={phone} readOnly aria-readonly="true" /></label></div>
          </section>
        </details>

        <h2 className="aha-settings-category"><T>การตั้งค่า</T></h2>
        <LanguageSelector />
        <section className="aha-profile-section aha-appearance-settings" aria-label="การแสดงผล">
          <div className="aha-setting-switch-row"><span className="aha-setting-icon"><AhaIcon name="moon" size={22} /></span><label htmlFor="aha-dark-mode"><strong><T>โหมดมืด</T></strong><small><T>เปิดเพื่อใช้พื้นหลังสีเข้ม</T></small></label><button id="aha-dark-mode" className="aha-theme-switch" type="button" role="switch" aria-label="โหมดมืด" aria-checked={theme === 'dark' || (theme === 'system' && systemDark)} onClick={() => selectTheme((theme === 'dark' || (theme === 'system' && systemDark)) ? 'light' : 'dark')}><span /></button></div>
          <div className="aha-setting-switch-row"><span className="aha-setting-icon"><AhaIcon name="sun" size={22} /></span><label htmlFor="aha-system-theme"><strong><T>ตามการตั้งค่าโทรศัพท์</T></strong><small><T>เปลี่ยนสว่างหรือมืดตามอุปกรณ์</T></small></label><button id="aha-system-theme" className="aha-theme-switch" type="button" role="switch" aria-label="ตามการตั้งค่าโทรศัพท์" aria-checked={theme === 'system'} onClick={() => selectTheme(theme === 'system' ? (systemDark ? 'dark' : 'light') : 'system')}><span /></button></div>
        </section>

        <section className="aha-profile-section">
            <div className="aha-profile-section-heading"><div><span className="aha-profile-kicker">NOTIFICATIONS</span><h2><T>การแจ้งเตือนยา</T></h2><p><T>ระบบตั้งค่าเป็นเปิดไว้ให้โดยอัตโนมัติ คุณสามารถปิดเองได้เมื่อต้องการ</T></p></div></div>
            <button type="button" disabled={notificationBusy} className={`aha-profile-sound-toggle ${medicinePushEnabled ? 'active' : ''}`} aria-pressed={medicinePushEnabled} onClick={toggleMedicineNotifications}><span><AhaIcon name="bell" size={20} /></span><strong><T>{medicinePushEnabled ? 'เปิดการแจ้งเตือนยา' : 'ปิดการแจ้งเตือนยา'}</T></strong><i aria-hidden="true"><b /></i></button>
            <p role="status" style={{ margin: '12px 0 0', color: pushDeliveryState === 'active' ? '#08785f' : pushDeliveryState === 'disabled' ? '#475569' : '#9a5b00', lineHeight: 1.55 }}>
              <T>{pushDeliveryState === 'active' ? '✓ อุปกรณ์นี้พร้อมรับการแจ้งเตือนแล้ว'
                : pushDeliveryState === 'permission_required' ? 'เปิดไว้แล้ว แต่ต้องกดอนุญาต Notification บนอุปกรณ์นี้อีกหนึ่งครั้ง'
                  : pushDeliveryState === 'blocked' ? 'เปิดไว้แล้ว แต่ Browser กำลังบล็อก Notification กรุณาอนุญาตในการตั้งค่าเว็บไซต์'
                    : pushDeliveryState === 'unsupported' ? 'เปิดไว้แล้ว แต่อุปกรณ์นี้ยังไม่รองรับ Push Notification'
                      : pushDeliveryState === 'unavailable' ? 'เปิดไว้แล้ว แต่ยังเชื่อมต่อระบบแจ้งเตือนไม่สำเร็จ กรุณาลองอีกครั้ง'
                        : pushDeliveryState === 'disabled' ? 'คุณปิดการแจ้งเตือนยาไว้ด้วยตนเอง'
                          : 'กำลังตรวจสอบการแจ้งเตือนบนอุปกรณ์นี้…'}</T>
            </p>
            {medicinePushEnabled && ['permission_required', 'blocked', 'unsupported', 'unavailable'].includes(pushDeliveryState) && (
              <button type="button" className="aha-profile-secondary" style={{ marginTop: 12 }} disabled={notificationBusy} onClick={activateNotificationsOnDevice}>
                <T>{notificationBusy ? 'กำลังเปิด…' : pushDeliveryState === 'blocked' ? 'ตรวจสอบสิทธิ์อีกครั้ง' : 'เปิดใช้งานบนอุปกรณ์นี้'}</T>
              </button>
            )}
          </section>


        <h2 className="aha-settings-category"><T>การเข้าสู่ระบบและความปลอดภัย</T></h2>
        <details className="aha-settings-disclosure"><summary><span className="aha-setting-icon"><AhaIcon name="shield" size={22} /></span><span><strong><T>เปลี่ยน PIN</T></strong><small><T>เปลี่ยนรหัส หรือกู้คืนเมื่อจำ PIN ไม่ได้</T></small></span><AhaIcon name="chevron" size={19} /></summary>
          <section className="aha-profile-section aha-profile-security" aria-labelledby="pin-heading">
          <div className="aha-profile-section-heading"><div><span className="aha-profile-kicker">SECURITY</span><h2 id="pin-heading"><T>เปลี่ยน PIN 4 หลัก</T></h2><p><T>เมื่อสำเร็จ ระบบจะออกจากระบบทุกอุปกรณ์ กรุณาเข้าสู่ระบบด้วย PIN ใหม่</T></p></div></div>
          <Link className="aha-recovery-link" href="/forgot-pin"><T>ลืม PIN ใช่ไหม?</T></Link>
          <div className="aha-profile-pin-grid">
            <label><T>PIN ปัจจุบัน</T><input type="password" inputMode="numeric" maxLength={4} pattern="[0-9]{4}" autoComplete="current-password" value={currentPin} disabled={pinSaving} onChange={(e) => setCurrentPin(e.target.value.replace(/\D/g, '').slice(0, 4))} /></label>
            <label><T>PIN ใหม่</T><input type="password" inputMode="numeric" maxLength={4} pattern="[0-9]{4}" autoComplete="new-password" value={newPin} disabled={pinSaving} onChange={(e) => setNewPin(e.target.value.replace(/\D/g, '').slice(0, 4))} /></label>
            <label><T>ยืนยัน PIN ใหม่</T><input type="password" inputMode="numeric" maxLength={4} pattern="[0-9]{4}" autoComplete="new-password" value={confirmNewPin} disabled={pinSaving} onChange={(e) => setConfirmNewPin(e.target.value.replace(/\D/g, '').slice(0, 4))} /></label>
          </div>
          {pinError && <p className="aha-security-error" role="alert">{pinError}</p>}
          <button className="aha-profile-primary" type="button" onClick={() => changePin()} disabled={pinSaving}><T>{pinSaving ? 'กำลังบันทึก…' : 'ยืนยัน PIN ใหม่และออกจากระบบ'}</T></button>
        </section>
        </details>

        {user?.email && <details className="aha-settings-disclosure"><summary><span className="aha-setting-icon"><AhaIcon name="shield" size={22} /></span><span><strong><T>บัญชี Google</T></strong><small><T>{user.authProvider === 'google' ? 'เชื่อมต่อแล้ว' : 'เพิ่มวิธีเข้าสู่บัญชีเดิม'}</T></small></span><AhaIcon name="chevron" size={19} /></summary><section className="aha-profile-section" aria-labelledby="account-login-heading">
          <div className="aha-profile-section-heading"><div><span className="aha-profile-kicker">ACCOUNT SIGN-IN</span><h2 id="account-login-heading"><T>บัญชีและการเข้าสู่ระบบ</T></h2><p><T>อีเมลบัญชี AHA:</T><strong className="aha-account-email">{user.email}</strong></p><p><T>การเชื่อม Google เพิ่มวิธีเข้าสู่บัญชีเดิม โดยต้องใช้อีเมลเดียวกัน</T></p></div></div>
          {user.authProvider === 'google' ? <p className="aha-security-help"><T>เชื่อมบัญชี Google แล้ว ใช้ปุ่ม Google บนหน้าเข้าสู่ระบบได้</T></p> : <>
            <h3><T>เชื่อม Google กับบัญชี AHA เดิม</T></h3>
            {!linkGrant ? <>
              <p className="aha-security-help"><T>ขั้นที่ 1 ยืนยันบัญชี AHA ก่อนเลือก Google</T></p>
              <fieldset className="aha-security-methods" disabled={linkBusy}><legend><T>วิธียืนยันบัญชี AHA</T></legend>
                <label><input type="radio" name="google-link-method" checked={linkMethod === 'pin'} onChange={() => { setLinkMethod('pin'); setLinkCredential(''); setLinkError(''); }} /><T>PIN ปัจจุบัน</T></label>
                <label><input type="radio" name="google-link-method" checked={linkMethod === 'password'} onChange={() => { setLinkMethod('password'); setLinkCredential(''); setLinkError(''); }} /><T>รหัสผ่าน AHA</T></label>
              </fieldset>
              <div className="aha-profile-pin-grid"><label><T>{linkMethod === 'pin' ? 'PIN ปัจจุบัน' : 'รหัสผ่าน AHA ปัจจุบัน'}</T><input type="password" autoComplete="current-password" inputMode={linkMethod === 'pin' ? 'numeric' : 'text'} maxLength={linkMethod === 'pin' ? 4 : undefined} value={linkCredential} onChange={(event) => setLinkCredential(linkMethod === 'pin' ? event.target.value.replace(/\D/g, '').slice(0, 4) : event.target.value)} disabled={linkBusy} /></label></div>
              <button className="aha-profile-primary" type="button" onClick={verifyGoogleLink} disabled={linkBusy || !linkCredential}><T>{linkBusy ? 'กำลังตรวจสอบ…' : 'ยืนยันบัญชี AHA'}</T></button>
            </> : <div className="aha-security-google">
              <p role="status"><T>ยืนยันบัญชี AHA แล้ว — ขั้นที่ 2 เลือก Google ที่ใช้อีเมล</T><strong className="aha-account-email">{user.email}</strong><T>ภายใน 5 นาที</T></p>
              <p><T>เมื่อเชื่อมสำเร็จ ระบบจะออกจากระบบทุกอุปกรณ์</T></p>
              <GoogleSignInButton onCredential={linkGoogle} disabled={linkBusy} />
              <button className="aha-profile-secondary" type="button" disabled={linkBusy} onClick={() => setLinkGrant('')}><T>ยกเลิกการเชื่อมต่อครั้งนี้</T></button>
            </div>}
            {linkError && <p className="aha-security-error" role="alert">{linkError}</p>}
          </>}
        </section></details>}

        <footer className="aha-editorial-footer" aria-label="ความช่วยเหลือและข้อมูล">
          <p className="aha-editorial-eyebrow">AHA / AI HEALTH ASSISTANT</p>
          <h2><T>สุขภาพที่ดี เริ่มจากความใส่ใจ</T></h2>
          <div className="aha-editorial-rule" aria-hidden="true" />
          <p className="aha-editorial-eyebrow"><T>กฎหมายและความเป็นส่วนตัว</T></p>
          <nav className="aha-editorial-links" aria-label="ลิงก์ความช่วยเหลือและกฎหมาย">
            <details className="aha-editorial-contact" onToggle={(event) => setSupportOpen(event.currentTarget.open)}>
              <summary><span className="aha-editorial-link-text"><T>ติดต่อผู้ดูแลระบบ</T> <svg aria-hidden="true" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M7 17 17 7M8 7h9v9"/></svg></span></summary>
              <div className="aha-editorial-contact-form">
                <p><T>แจ้งปัญหาการใช้งาน อีเมลที่กรอกใช้เพื่อติดต่อกลับเท่านั้น</T></p>
                {supportOpen && <form className="aha-profile-support-form" onSubmit={submitSupport}>
            <div className="aha-profile-pin-grid">
              <label><T>ชื่อ</T><input value={supportName} onChange={(e) => setSupportName(e.target.value)} maxLength={100} autoComplete="name" placeholder="ชื่อผู้ติดต่อ" /></label>
              <label><T>อีเมลติดต่อกลับ (ไม่เปลี่ยนอีเมลบัญชี)</T><input type="email" value={supportEmail} onChange={(e) => setSupportEmail(e.target.value)} maxLength={254} autoComplete="email" placeholder="name@example.com" /></label>
            </div>
            <label><T>ปัญหาที่ต้องการติดต่อ</T><textarea value={supportIssue} onChange={(e) => setSupportIssue(e.target.value)} maxLength={4000} rows={5} placeholder="อธิบายปัญหาที่พบ หรือสิ่งที่ต้องการให้ผู้ดูแลช่วยเหลือ" /></label>
            <button className="aha-profile-primary" type="submit" disabled={supportBusy}><T>{supportBusy ? 'กำลังส่ง…' : 'ส่งถึงผู้ดูแลระบบ'}</T></button>
          </form>}
              </div>
            </details>
            <Link href="/privacy-policy"><span className="aha-editorial-link-text"><T>นโยบายความเป็นส่วนตัว</T> <svg aria-hidden="true" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M7 17 17 7M8 7h9v9"/></svg></span></Link>
            <Link href="/terms-of-service"><span className="aha-editorial-link-text"><T>ข้อกำหนดการใช้บริการ</T> <svg aria-hidden="true" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M7 17 17 7M8 7h9v9"/></svg></span></Link>
            <Link href="/cookies-policy"><span className="aha-editorial-link-text"><T>นโยบายคุกกี้</T> <svg aria-hidden="true" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M7 17 17 7M8 7h9v9"/></svg></span></Link>
          </nav>
          <div className="aha-editorial-rule" aria-hidden="true" />
          <p className="aha-editorial-eyebrow">SOCIAL LINKS</p>
          <nav className="aha-editorial-social" aria-label="ช่องทางออนไลน์">
            <Link href="/support"><span className="aha-editorial-link-text"><T>สนับสนุนผู้พัฒนา</T> <svg aria-hidden="true" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M7 17 17 7M8 7h9v9"/></svg></span></Link>
            <a href="https://www.tiktok.com/@ahahealth.online" target="_blank" rel="noopener noreferrer"><span className="aha-editorial-link-text">TikTok <svg aria-hidden="true" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M7 17 17 7M8 7h9v9"/></svg></span></a>
            <a href="https://fastwork.co/byob/SWEsKEoTzr?openExternalBrowser=1&amp;source=byob" target="_blank" rel="noopener noreferrer"><span className="aha-editorial-link-text">Fastwork <svg aria-hidden="true" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M7 17 17 7M8 7h9v9"/></svg></span></a>
            <a href="https://phacharaportfolio.vercel.app/" target="_blank" rel="noopener noreferrer"><span className="aha-editorial-link-text">Portfolio <svg aria-hidden="true" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M7 17 17 7M8 7h9v9"/></svg></span></a>
       </nav>
          
          <div className="aha-editorial-rule" aria-hidden="true" />
          <section className="aha-profile-account" style={{ margin: '32px 0' }}>
            <div>
              <span className="aha-profile-kicker">ACCOUNT</span>
              <strong><T>บัญชี AHA</T></strong>
              <span><T>ออกจากระบบเฉพาะอุปกรณ์นี้</T></span>
            </div>
            <button onClick={logout} type="button"><T>ออกจากระบบ</T></button>
          </section>
          <div style={{ paddingBottom: '32px' }}>
            <p className="aha-editorial-credit">© 2026 ahahealth.online - สงวนลิขสิทธิ์</p>
            <p className="aha-editorial-disclaimer"><T>AHA เป็นโครงการช่วยเตือนการรับประทานยาและสนับสนุนผู้ดูแล ไม่ใช่ช่องทางช่วยเหลือฉุกเฉินหรือบริการวินิจฉัยทางการแพทย์</T></p>
          </div>
          
        </footer>
      </main>
      <style jsx>{`
        .aha-security-methods{border:0;padding:0;margin:16px 0;display:flex;flex-wrap:wrap;gap:10px}.aha-security-methods legend{font-size:14px;margin-bottom:8px;color:var(--aha-text,#111)}.aha-profile-section .aha-security-methods label{display:flex;align-items:center;gap:9px;min-height:48px;padding:8px 12px;background:var(--aha-surface-soft,#f1f2f4);border:1px solid var(--aha-border,#e2e3e6);border-radius:12px;cursor:pointer}.aha-profile-section .aha-security-methods input{width:20px;min-height:20px;height:20px;margin:0;padding:0;accent-color:#2864e8;flex-shrink:0}.aha-security-help,.aha-security-google p{font-size:14px;line-height:1.65;color:var(--aha-text-secondary,#62666d)}.aha-security-google{max-width:400px;margin-top:18px}.aha-account-email{overflow-wrap:anywhere;color:var(--aha-text,#111)}.aha-security-error{padding:12px;border:1px solid #b92c3a;border-radius:10px;background:var(--aha-surface-soft,#fff2f2);color:var(--aha-text,#9d1624);line-height:1.6}.aha-profile-section button:focus-visible,.aha-profile-section input:focus-visible{outline:3px solid #6a9cff;outline-offset:3px}.aha-profile-section button:disabled{opacity:.65;cursor:wait}

        .aha-editorial-footer{color:var(--aha-text,#111);padding:32px 12px 20px;min-width:0;overflow-wrap:anywhere}
        .aha-editorial-footer h2{color:inherit;font-size:clamp(20px,4.5vw,30px);line-height:1.3;margin:9px 0 24px;font-weight:700}
        .aha-editorial-eyebrow{color:var(--aha-text-secondary,#62666d);font-size:12px;letter-spacing:.06em;font-weight:600;margin:0}
        .aha-editorial-rule{height:1px;background:var(--aha-border,#d7d9de);margin:24px 0}
        .aha-editorial-links{display:grid;justify-items:start;gap:10px}
        .aha-editorial-links>a,.aha-editorial-contact>summary,.aha-editorial-social>a{color:inherit;font-size:16px;line-height:1.5;text-decoration:none;min-height:36px;display:inline-flex;align-items:center;cursor:pointer}
        .aha-editorial-link-text{display:inline;overflow-wrap:normal;text-decoration:none;border-bottom:2px solid currentColor;padding-bottom:2px;-webkit-box-decoration-break:clone;box-decoration-break:clone}
        .aha-editorial-links svg,.aha-editorial-social svg{width:14px;height:14px;display:inline;vertical-align:-1px;margin-left:3px;flex:none}
        .aha-editorial-links a:focus-visible,.aha-editorial-contact summary:focus-visible,.aha-editorial-social a:focus-visible{outline:2px solid currentColor;outline-offset:4px}
        .aha-editorial-contact{width:100%;min-width:0}.aha-editorial-contact>summary{list-style:none;display:inline-flex}.aha-editorial-contact>summary::-webkit-details-marker{display:none}
        .aha-editorial-contact-form{padding:18px 0 7px;max-width:100%;min-width:0}.aha-editorial-contact-form>p{color:var(--aha-text-secondary,#62666d);font-size:14px;line-height:1.65;margin:0 0 12px}
        .aha-editorial-contact-form .aha-profile-support-form label{display:grid;gap:7px;color:var(--aha-text,#111);font-size:14px;min-width:0}
        .aha-editorial-contact-form .aha-profile-support-form input,.aha-editorial-contact-form .aha-profile-support-form textarea{width:100%;min-width:0;max-width:100%;min-height:48px;border:1px solid var(--aha-border,#e2e3e6);border-radius:12px;background:var(--aha-surface-soft,#f1f2f4);color:var(--aha-text,#111);padding:12px 14px;font:inherit}
        .aha-editorial-contact-form .aha-profile-support-form button{min-height:44px}
        .aha-editorial-contact-form .aha-profile-support-form{max-width:100%;margin-top:0}.aha-editorial-contact-form .aha-profile-pin-grid{grid-template-columns:repeat(2,minmax(0,1fr))}
        .aha-editorial-social{display:flex;gap:12px 24px;flex-wrap:wrap;margin-top:12px;align-items:center}
        .aha-editorial-credit{font-size:13px;color:var(--aha-text-secondary,#62666d);line-height:1.75;margin:0}
        .aha-editorial-disclaimer{font-size:12px;color:var(--aha-text-secondary,#62666d);line-height:1.65;max-width:680px;margin:14px 0 0}
        @media(max-width:560px){.aha-editorial-footer{padding:28px 6px 14px}.aha-editorial-contact-form .aha-profile-pin-grid{grid-template-columns:minmax(0,1fr)}.aha-editorial-social{gap:8px 18px}}
        .aha-profile-page,.aha-profile-page *{box-sizing:border-box}
        .aha-profile-page{min-height:100dvh;background:var(--aha-bg,#f7f7f5);color:var(--aha-text,#111);padding:0 0 calc(112px + env(safe-area-inset-bottom,0px));font-family:var(--font-prompt),"Prompt",sans-serif;overflow-x:hidden}
        .aha-profile-header{height:72px;width:min(920px,calc(100% - 32px));margin:auto;display:grid;grid-template-columns:44px 1fr auto;align-items:center;gap:12px}
        .aha-profile-icon-button,.aha-profile-home-button{min-height:44px;border:1px solid var(--aha-border,#e2e3e6);background:var(--aha-surface,#fff);color:var(--aha-text,#111);border-radius:14px;display:flex;align-items:center;justify-content:center;gap:7px;}.aha-profile-icon-button{width:44px}.aha-profile-home-button{padding:0 14px}
        .aha-profile-title strong{display:block;color:var(--aha-text,#111);font-size:22px}.aha-profile-title span{display:block;color:var(--aha-text-secondary,#62666d);font-size:12px;margin-top:2px}
        .aha-profile-wrap{width:min(920px,calc(100% - 32px));margin:auto;display:grid;gap:14px}
        @media(min-width:1051px){.aha-profile-page{margin-left:214px}}
        @media(min-width:761px) and (max-width:1050px){.aha-profile-page{margin-left:180px}}
        .aha-profile-identity{min-height:205px;padding:26px 28px;display:flex;align-items:center;gap:20px;position:relative;isolation:isolate;overflow:hidden;border-radius:26px;background:#244fcb;color:#fff}
        .aha-profile-orb{position:absolute;z-index:-1;border-radius:50%;pointer-events:none}.orb-one{width:250px;height:165px;right:-70px;bottom:-100px;background:#52d3ca}.orb-two{width:275px;height:175px;left:-155px;bottom:-125px;background:#ffb84d}
        .aha-profile-edit{position:absolute;right:20px;top:18px;border:1px solid rgba(255,255,255,.55);background:rgba(0,0,0,.16);color:#fff;border-radius:999px;padding:9px 14px;}
        .aha-profile-avatar{width:106px;height:106px;border-radius:50%;border:4px solid #fff;background:#fff;color:#111;display:grid;place-items:center;font-size:40px;position:relative;padding:0;overflow:hidden}.aha-profile-avatar img{width:100%;height:100%;object-fit:cover}.aha-profile-avatar i{position:absolute;right:5px;bottom:5px;width:20px;height:20px;border:4px solid #fff;border-radius:50%;background:#16856f}
        .aha-profile-identity-copy{min-width:0;position:relative;z-index:2;color:#fff}.aha-profile-role{display:inline-flex;padding:5px 9px;border-radius:999px;background:rgba(0,0,0,.18);color:#fff;border:1px solid rgba(255,255,255,.42);font-size:11px;margin-bottom:8px}.aha-profile-identity-copy h1{color:#fff;font-size:30px;line-height:1.15;margin:0 0 5px;overflow-wrap:anywhere}.aha-profile-identity-copy p{margin:0;color:#fff;font-size:14px}.aha-profile-remove-avatar{margin-top:10px;border:0;background:transparent;color:#fff;padding:0;font-size:11px;text-decoration:underline}
        .aha-profile-mark{position:absolute;right:26px;bottom:22px;display:flex;gap:4px;align-items:center}.aha-profile-mark span{display:block;width:3px;height:25px;border-radius:3px;background:#fff}.aha-profile-mark span:nth-child(2){height:17px}.aha-profile-mark span:nth-child(3){height:29px}.aha-profile-mark span:nth-child(4){height:20px}
        .aha-profile-alert{padding:13px 15px;border-radius:14px;overflow-wrap:anywhere}.aha-profile-alert.success{background:#eaf8f4;color:#126b59;border:1px solid #bde4d9}.aha-profile-alert.error{background:#fff0f0;color:#a5202b;border:1px solid #efc1c5}
        .aha-profile-section,.aha-profile-account{background:var(--aha-surface,#fff);border:1px solid var(--aha-border,#e2e3e6);border-radius:22px;color:var(--aha-text,#111);box-shadow:var(--aha-shadow,0 7px 24px rgba(15,23,42,.055))}
        .aha-profile-section{padding:21px}.aha-profile-section-heading{margin-bottom:16px}.aha-profile-kicker{display:block;color:var(--aha-text,#111);font-size:10px;}.aha-profile-section-heading h2{margin:3px 0 0;color:var(--aha-text,#111);font-size:21px}.aha-profile-section-heading p{margin:5px 0 0;color:var(--aha-text-secondary,#62666d);font-size:13px;line-height:1.5}
        .aha-profile-fields,.aha-profile-pin-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:11px}.aha-profile-fields.single{grid-template-columns:1fr}.aha-profile-pin-grid{grid-template-columns:repeat(2,minmax(0,1fr));max-width:680px}
        .aha-profile-section label{display:grid;gap:7px;color:var(--aha-text,#111);font-size:13px;}.aha-profile-section input,.aha-profile-section select{width:100%;min-width:0;min-height:50px;border:1px solid var(--aha-border,#e2e3e6);border-radius:13px;background:var(--aha-surface-soft,#f1f2f4);color:var(--aha-text,#111);padding:0 14px;outline:none;font-size:16px}.aha-profile-section input:focus,.aha-profile-section select:focus{border-color:#2f6bff;box-shadow:0 0 0 3px rgba(47,107,255,.12)}
        .aha-profile-primary,.aha-profile-secondary{margin-top:14px;min-height:48px;border-radius:13px;padding:0 17px;}.aha-profile-primary{border:0;background:#2f6bff;color:#fff}.aha-profile-secondary{background:var(--aha-surface-soft,#f1f2f4);color:var(--aha-text,#111);border:1px solid var(--aha-border,#e2e3e6)}
        .aha-theme-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px;padding:5px;border-radius:16px;background:var(--aha-surface-soft,#f1f2f4)}.aha-theme-option{min-width:0;min-height:52px;border:1px solid transparent;background:transparent;border-radius:12px;display:flex;align-items:center;justify-content:center;gap:8px;padding:0 10px;color:var(--aha-text-secondary,#62666d);}.aha-theme-option .aha-theme-symbol{width:25px;height:25px;border-radius:8px;display:grid;place-items:center;background:var(--aha-surface,#fff);color:var(--aha-text,#111)}.aha-theme-option b{color:var(--aha-text,#111)}.aha-theme-option.active{background:var(--aha-surface,#fff);border-color:var(--aha-border,#e2e3e6);color:var(--aha-text,#111);box-shadow:0 2px 8px rgba(0,0,0,.06)}
        .aha-profile-settings-grid{display:grid;grid-template-columns:.9fr 1.1fr;gap:14px}.aha-profile-sound-toggle{width:100%;min-height:60px;border:1px solid var(--aha-border,#e2e3e6);background:var(--aha-surface-soft,#f1f2f4);border-radius:15px;padding:10px 12px;display:flex;align-items:center;gap:10px;color:var(--aha-text,#111)}.aha-profile-sound-toggle>span{width:39px;height:39px;border-radius:11px;background:var(--aha-surface,#fff);display:grid;place-items:center}.aha-profile-sound-toggle strong{flex:1;text-align:left;color:var(--aha-text,#111)}.aha-profile-sound-toggle>i{width:48px;height:28px;border-radius:999px;background:#b9bcc2;padding:3px;display:flex;align-items:center}.aha-profile-sound-toggle>i b{width:22px;height:22px;border-radius:50%;background:#fff;transition:transform .18s}.aha-profile-sound-toggle.active>i{background:#16856f}.aha-profile-sound-toggle.active>i b{transform:translateX(20px)}
        .aha-profile-support-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px}.aha-profile-support-head .aha-profile-section-heading{margin-bottom:0}.aha-profile-support-toggle{min-width:64px;min-height:40px;border:1px solid var(--aha-border,#e2e3e6);border-radius:11px;background:var(--aha-surface-soft,#f1f2f4);color:var(--aha-text,#111);cursor:pointer}.aha-profile-support-form{display:grid;gap:12px;margin-top:16px}.aha-profile-support-form textarea{width:100%;min-width:0;border:1px solid var(--aha-border,#e2e3e6);border-radius:13px;background:var(--aha-surface-soft,#f1f2f4);color:var(--aha-text,#111);padding:13px 14px;outline:none;font:inherit;line-height:1.55;resize:vertical}.aha-profile-support-form textarea:focus{border-color:#2f6bff;box-shadow:0 0 0 3px rgba(47,107,255,.12)}.aha-profile-support-form .aha-profile-primary{justify-self:start}
        html[data-aha-appearance="dark"] .aha-profile-support-form textarea{background:var(--aha-surface-soft);border-color:var(--aha-border);color:var(--aha-text)}
        .aha-profile-legal-links{display:grid;border:1px solid var(--aha-border,#e2e3e6);border-radius:15px;overflow:hidden}.aha-profile-legal-links :global(a){min-height:52px;padding:0 15px;display:flex;align-items:center;justify-content:space-between;gap:12px;color:var(--aha-text,#111);background:var(--aha-surface-soft,#f1f2f4);text-decoration:none;border-bottom:1px solid var(--aha-border,#e2e3e6)}.aha-profile-legal-links :global(a:last-child){border-bottom:0}.aha-profile-legal-links :global(a:hover){color:#2f6bff}.aha-profile-legal-links :global(span){font-size:24px;color:#2f6bff}
        .aha-profile-account{padding:18px 20px;display:flex;align-items:center;justify-content:space-between;gap:14px}.aha-profile-account strong{display:block;color:var(--aha-text,#111);font-size:17px;margin-top:2px}.aha-profile-account>div>span:last-child{display:block;color:var(--aha-text-secondary,#62666d);font-size:12px;margin-top:3px}.aha-profile-account button{min-height:44px;border:1px solid #e9b6ba;background:#fff0f0;color:#a5202b;border-radius:12px;padding:0 16px;}
        .aha-profile-footer{text-align:center;color:var(--aha-text-secondary,#62666d);font-size:11px;line-height:1.6;padding:3px 0 10px}.aha-profile-footer span{display:inline-block;margin:0 4px}.aha-profile-loading{min-height:100dvh;display:grid;place-items:center;color:var(--aha-text-secondary,#62666d);background:var(--aha-bg,#f7f7f5)}
        @media(max-width:720px){.aha-profile-page{padding-bottom:calc(108px + env(safe-area-inset-bottom,0px))}.aha-profile-header{height:66px;width:calc(100% - 20px);grid-template-columns:42px 1fr 42px;gap:8px}.aha-profile-title strong{font-size:19px}.aha-profile-title span{font-size:11px}.aha-profile-home-button{width:42px;padding:0}.aha-profile-home-button span{display:none}.aha-profile-wrap{width:calc(100% - 20px);gap:11px}.aha-profile-identity{min-height:190px;padding:22px 16px 18px;align-items:flex-end;gap:13px;border-radius:23px}.aha-profile-edit{right:14px;top:14px;font-size:12px}.aha-profile-avatar{width:82px;height:82px;font-size:32px;border-width:3px}.aha-profile-identity-copy h1{font-size:23px}.aha-profile-identity-copy p{font-size:12px}.aha-profile-role{font-size:9px;margin-bottom:5px}.aha-profile-mark{right:16px;bottom:16px;opacity:.65}.aha-profile-section{padding:17px;border-radius:19px}.aha-profile-fields,.aha-profile-pin-grid{grid-template-columns:1fr}.aha-profile-settings-grid{grid-template-columns:1fr;gap:11px}.aha-theme-grid{grid-template-columns:repeat(3,minmax(0,1fr))}.aha-theme-option{font-size:12px;padding:0 5px;gap:4px}.aha-profile-account{border-radius:19px}}
        @media(max-width:390px){.aha-profile-wrap,.aha-profile-header{width:calc(100% - 14px)}.aha-profile-identity{padding-left:13px;padding-right:13px}.aha-profile-avatar{width:74px;height:74px}.aha-profile-identity-copy h1{font-size:20px}.aha-theme-option .aha-theme-symbol{display:none}.aha-profile-account{align-items:flex-start;flex-direction:column}.aha-profile-account button{width:100%}}
      `}</style>
    </div>
  );
}
