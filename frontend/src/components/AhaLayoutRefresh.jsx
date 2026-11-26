'use client';

// Presentation only: no role checks, API calls or account recovery rules are changed here.
export default function AhaLayoutRefresh() {
  return <style jsx global>{`
    .aha-layout-refresh {
      --refresh-blue:#2f6bff; --refresh-cyan:#137bab; --refresh-soft-cyan:#e7f6fc; --refresh-ink-cyan:#146788; --refresh-soft-blue:#edf3ff; --refresh-soft-yellow:#fff4dd;
      --refresh-ink-blue:#2455bf; --refresh-ink-yellow:#825000;
      --refresh-shadow:0 8px 28px rgba(30,54,92,.055);
    }
    html[data-aha-appearance="dark"] .aha-layout-refresh {
      --refresh-cyan:#168dc3; --refresh-soft-cyan:#1b303c; --refresh-ink-cyan:#96d9f4; --refresh-soft-blue:#202e49; --refresh-soft-yellow:#362b1d;
      --refresh-ink-blue:#a9c4ff; --refresh-ink-yellow:#ffd18b; --refresh-shadow:none;
    }
    .aha-layout-refresh button:focus-visible,.aha-layout-refresh summary:focus-visible,
    .aha-layout-refresh a:focus-visible,.aha-layout-refresh input:focus-visible {outline:3px solid var(--aha-primary,#2f6bff)!important;outline-offset:4px}
    .aha-layout-refresh button:disabled{cursor:default;opacity:.65}

    /* Home: preserve the content; vary card proportions and reserve color for useful hierarchy. */
    .aha-layout-refresh.aha-v3-page .aha-v3-content{display:flex!important;flex-direction:column!important;gap:22px!important;width:min(1180px,calc(100% - 40px))!important;padding-top:22px!important;padding-bottom:28px!important}
    .aha-layout-refresh.aha-v3-page .aha-v3-content>section{margin:0!important}
    .aha-layout-refresh.aha-v3-page .aha-welcome{position:relative;isolation:isolate;display:flex!important;align-items:center!important;height:auto!important;min-height:205px!important;max-height:none!important;border:0!important;border-radius:28px!important;background:#2f6bff!important;color:#fff!important;box-shadow:0 12px 32px rgba(47,107,255,.16)!important;overflow:hidden}
    .aha-layout-refresh .aha-welcome::before{content:'';position:absolute;z-index:-1;width:260px;height:260px;border:42px solid rgba(255,255,255,.09);border-radius:50%;right:-70px;top:-115px}
    .aha-layout-refresh .aha-welcome::after{content:'';position:absolute;z-index:-1;width:230px;height:150px;border-radius:50%;right:-65px;bottom:-105px;background:#96d9f4}
    .aha-layout-refresh.aha-v3-page .aha-v3-hero-copy{width:auto!important;flex:1;padding:30px!important;min-width:0}
    .aha-layout-refresh.aha-v3-page .aha-v3-hero-copy h1{color:#fff!important;font-size:clamp(25px,3vw,38px)!important;line-height:1.4!important;margin:10px 0 6px!important;overflow-wrap:anywhere}
    .aha-layout-refresh.aha-v3-page .aha-v3-hero-copy p{color:#fff!important;opacity:.92;font-size:16px!important;margin:0}
    .aha-welcome-label{display:inline-flex;align-items:center;gap:8px;color:#fff;font-size:13px}
    .aha-welcome-label svg{color:#bcecff}
    .aha-welcome-art{position:relative;display:grid;place-items:center;flex:0 0 112px;width:112px;height:112px;margin-right:36px;border-radius:35px;background:rgba(255,255,255,.14);border:1px solid rgba(255,255,255,.25);color:#fff;transform:rotate(-8deg)}
    .aha-welcome-art span,.aha-welcome-art i{position:absolute;border-radius:50%;background:#8ed8f6;width:15px;height:15px;right:-10px;top:-8px}
    .aha-welcome-art i{width:9px;height:9px;left:-15px;top:auto;bottom:8px;background:#b8ddff}
    .aha-layout-refresh.aha-v3-page .aha-v3-feature-row{display:grid!important;grid-template-columns:1.05fr 1fr!important;gap:18px!important;align-items:stretch}
    .aha-layout-refresh.aha-v3-page .aha-v3-next,.aha-layout-refresh.aha-v3-page .aha-v3-card,
    .aha-layout-refresh.aha-v3-page .aha-v3-today-card,.aha-layout-refresh.aha-v3-page .aha-v3-care-card{padding:22px!important;border-radius:24px!important;border:1px solid var(--aha-border)!important;box-shadow:var(--refresh-shadow)!important}
    .aha-layout-refresh.aha-v3-page .aha-v3-next{position:relative;overflow:hidden}
    .aha-layout-refresh .aha-v3-next::before{content:'';position:absolute;left:0;top:22px;bottom:22px;width:4px;background:var(--refresh-blue);border-radius:0 8px 8px 0}
    .aha-layout-refresh.aha-v3-page .aha-v3-next-inner{gap:18px;min-height:132px}
    .aha-layout-refresh.aha-v3-page .aha-v3-clock{background:var(--refresh-soft-blue)!important;color:var(--refresh-ink-blue)!important;border-radius:22px}
    .aha-layout-refresh .aha-v3-card-title{font-size:17px!important;line-height:1.5;gap:10px}
    .aha-layout-refresh .aha-v3-card-title button,.aha-layout-refresh .aha-v3-section-title button{min-height:44px;color:var(--refresh-ink-blue)!important;font-size:14px!important}
    .aha-layout-refresh.aha-v3-page .aha-v3-next-inner>div>strong{font-size:44px!important;line-height:1.2!important}
    .aha-layout-refresh.aha-v3-page .aha-v3-next-inner>div>span{font-size:20px!important;line-height:1.5!important;overflow-wrap:anywhere}
    .aha-layout-refresh.aha-v3-page .aha-v3-next-inner>div>small{font-size:14px!important;line-height:1.5}
    .aha-layout-refresh .aha-v3-primary-button{background:var(--refresh-blue)!important;color:#fff!important;min-height:50px!important;border-radius:16px!important}
    .aha-layout-refresh.aha-v3-page .aha-v3-action-stack{display:grid!important;grid-template-columns:repeat(2,minmax(0,1fr))!important;grid-template-rows:1fr 1fr!important;gap:14px!important;margin:0!important}
    .aha-layout-refresh.aha-v3-page .aha-v3-action-stack>.aha-v3-action{position:relative;min-width:0;min-height:115px!important;height:auto!important;padding:20px!important;display:flex!important;flex-direction:column!important;justify-content:center!important;align-items:flex-start!important;gap:12px!important;border:1px solid transparent!important;border-radius:24px!important;box-shadow:none!important;overflow:hidden;transition:transform .18s ease,box-shadow .18s ease}
    .aha-layout-refresh.aha-v3-page .aha-v3-action-stack>.aha-v3-action:first-child{grid-row:1/3;background:var(--refresh-cyan)!important;color:#fff!important}
    .aha-layout-refresh.aha-v3-page .aha-v3-action-stack>.aha-v3-action:nth-child(2){background:var(--refresh-soft-cyan)!important;color:var(--refresh-ink-cyan)!important}
    .aha-layout-refresh.aha-v3-page .aha-v3-action-stack>.aha-v3-action.red{background:#fff0ee!important;color:#a33535!important}
    .aha-layout-refresh.aha-v3-page .aha-v3-action-stack>.aha-v3-action:first-child{background:#2f6bff!important;color:#fff!important}
    .aha-layout-refresh.aha-v3-page .aha-v3-action-stack>.aha-v3-action:nth-child(2){background:var(--aha-surface)!important;color:var(--aha-text)!important;border-color:var(--aha-border)!important}
    .aha-layout-refresh.aha-v3-page .aha-v3-action-stack>.aha-v3-action.red{background:var(--aha-surface)!important;color:var(--aha-danger,#b72e3c)!important;border-color:var(--aha-border)!important}
    .aha-layout-refresh.aha-v3-page .aha-v3-action-stack>.aha-v3-action strong{color:inherit!important;font-size:18px!important;line-height:1.5;text-align:left!important}
    .aha-layout-refresh.aha-v3-page .aha-v3-action-icon{display:grid!important;place-items:center;width:48px;height:48px;flex:0 0 48px;border:0!important;border-radius:16px!important;background:rgba(255,255,255,.22)!important;color:inherit!important}
    .aha-layout-refresh.aha-v3-page .aha-v3-action-stack>.aha-v3-action .aha-v3-arrow{position:absolute!important;right:12px!important;bottom:14px!important;width:28px!important;height:28px!important;color:inherit!important}
    .aha-layout-refresh.aha-v3-page .aha-v3-metrics-row{display:grid!important;grid-template-columns:1fr 1fr!important;gap:18px!important}
    .aha-layout-refresh.aha-v3-page .aha-v3-progress-inner{gap:18px!important;margin-block:15px}
    .aha-layout-refresh.aha-v3-page .aha-v3-ring{flex:0 0 104px;width:104px!important;height:104px!important}
    .aha-layout-refresh .aha-v3-progress-inner>div>strong{font-size:19px!important}
    .aha-layout-refresh .aha-v3-progress-inner>div>span{font-size:14px!important;line-height:1.6}
    .aha-layout-refresh .aha-v3-mini-note{padding:11px 13px!important;font-size:13px!important;border-radius:12px}
    .aha-layout-refresh .aha-v3-mini-row{padding-block:10px!important}
    .aha-layout-refresh .aha-v3-mini-row strong{font-size:15px!important}
    .aha-layout-refresh .aha-v3-mini-row small{font-size:13px!important}
    .aha-layout-refresh.aha-v3-page .aha-v3-mini-row{grid-template-columns:12px 44px minmax(0,1fr)!important;align-items:start!important;gap:10px!important;box-sizing:border-box;padding:10px 0!important}
    .aha-layout-refresh.aha-v3-page .aha-v3-mini-row>span{width:12px!important;height:12px!important;box-sizing:border-box;margin:5px 0 0!important}
    .aha-layout-refresh.aha-v3-page .aha-v3-mini-row :is(time,strong){line-height:22px!important}
    .aha-layout-refresh.aha-v3-page .aha-v3-mini-row:not(:last-child)::before{left:6px!important;top:21px!important;bottom:-21px!important;height:auto!important;width:2px!important;transform:translateX(-50%);background:var(--aha-border)!important}
    .aha-layout-refresh.aha-v3-page .aha-v3-care-card-large{grid-column:1/-1!important;min-height:100px!important;display:flex!important;align-items:center;gap:16px}
    .aha-layout-refresh .aha-v3-care-card h2{font-size:18px!important;line-height:1.5}
    .aha-layout-refresh .aha-v3-care-card p{font-size:14px!important}
    .aha-layout-refresh .aha-v3-section-title h2{font-size:22px!important}
    .aha-layout-refresh .aha-v3-med-row{min-height:94px;gap:14px;padding-block:16px!important}
    .aha-layout-refresh .aha-v3-med-row strong{font-size:17px!important;overflow-wrap:anywhere}
    .aha-layout-refresh .aha-v3-med-row small{font-size:13px!important}
    .aha-layout-refresh .aha-v3-med-row time{font-size:18px!important}
    /* The connector belongs to the full row, so wrapping actions cannot break it. */
    .aha-layout-refresh.is-elderly .aha-v3-table .aha-v3-med-row{position:relative;grid-template-columns:58px 16px minmax(0,1fr) auto;align-items:start;column-gap:14px}
    .aha-layout-refresh.is-elderly .aha-v3-table .aha-v3-med-row::before{content:'';position:absolute;left:80px;top:32px;bottom:-32px;width:2px;background:var(--aha-border);transform:translateX(-50%)}
    .aha-layout-refresh.is-elderly .aha-v3-table .aha-v3-med-row:last-child::before{display:none}
    .aha-layout-refresh.is-elderly .aha-v3-table .aha-v3-dot{width:16px!important;height:16px!important;box-sizing:border-box;margin-top:8px;z-index:1;flex-shrink:0}
    .aha-layout-refresh.is-elderly .aha-v3-table .aha-v3-dot::after{display:none!important}
    .aha-layout-refresh.aha-v3-page .aha-v3-bottom-grid{display:grid!important;grid-template-columns:1fr 1fr!important;gap:18px}
    .aha-layout-refresh .aha-v3-wellness{border-radius:18px!important;padding:14px 16px!important;min-height:0!important;gap:12px!important}
    .aha-layout-refresh .aha-v3-wellness h2{font-size:17px!important;line-height:1.5!important;margin:0!important}
    .aha-layout-refresh .aha-v3-wellness p{font-size:13px!important}
    .aha-layout-refresh .aha-v3-wellness>svg{width:28px!important;height:28px!important;flex:0 0 28px!important}
    .aha-layout-refresh .aha-v3-wellness>span{font-size:30px!important;flex:0 0 auto!important}

    /* Profile: disclosure panels retain every existing form and handler. */
    .aha-layout-refresh.aha-profile-page .aha-profile-wrap{width:min(920px,calc(100% - 32px));gap:10px}
    .aha-layout-refresh.aha-profile-page .aha-profile-identity{min-height:180px;background:#2f6bff;border-radius:26px}
    .aha-layout-refresh.aha-profile-page .aha-profile-identity .orb-one{background:#edf3ff;opacity:.22}
    .aha-layout-refresh.aha-profile-page .aha-profile-identity .orb-two{background:#ffbd59}
    .aha-settings-category{font-size:15px;font-weight:500;color:var(--aha-text-secondary);margin:18px 6px 0}
    .aha-settings-disclosure{border:1px solid var(--aha-border);border-radius:20px;background:var(--aha-surface);box-shadow:var(--refresh-shadow);min-width:0}
    .aha-settings-disclosure>summary{list-style:none;cursor:pointer;min-height:86px;display:flex;align-items:center;gap:14px;padding:16px 20px;border-radius:20px}
    .aha-settings-disclosure>summary::-webkit-details-marker{display:none}
    .aha-settings-disclosure>summary>span:nth-child(2){flex:1;min-width:0}
    .aha-settings-disclosure summary strong{display:block;font-size:17px;font-weight:500;color:var(--aha-text)}
    .aha-settings-disclosure summary small{display:block;font-size:13px;line-height:1.6;color:var(--aha-text-secondary);margin-top:3px}
    .aha-settings-disclosure summary>svg{color:var(--aha-text-secondary);flex-shrink:0;transition:transform .18s}
    .aha-settings-disclosure[open]>summary{border-bottom:1px solid var(--aha-border);border-radius:20px 20px 0 0}
    .aha-settings-disclosure[open]>summary>svg{transform:rotate(90deg)}
    .aha-setting-icon{width:44px;height:44px;flex:0 0 44px;display:grid;place-items:center;border-radius:14px;background:var(--refresh-soft-blue);color:var(--refresh-ink-blue)}
    .aha-layout-refresh.aha-profile-page .aha-settings-disclosure>.aha-profile-section{border:0;box-shadow:none;border-radius:0 0 20px 20px;margin:0;padding:20px}
    .aha-layout-refresh.aha-profile-page .aha-settings-disclosure .aha-profile-kicker{display:none}
    .aha-layout-refresh.aha-profile-page .aha-profile-settings-grid{display:block}
    .aha-layout-refresh.aha-profile-page .aha-profile-settings-grid .aha-profile-section{box-shadow:var(--refresh-shadow)}
    .aha-layout-refresh.aha-profile-page .aha-appearance-settings{padding:0 20px;box-shadow:var(--refresh-shadow)}
    .aha-setting-switch-row{min-height:82px;display:flex;align-items:center;gap:14px}
    .aha-setting-switch-row+.aha-setting-switch-row{border-top:1px solid var(--aha-border)}
    .aha-layout-refresh.aha-profile-page .aha-setting-switch-row label{flex:1;display:block;cursor:pointer;font-size:16px}
    .aha-setting-switch-row label strong{font-weight:500}
    .aha-setting-switch-row label small{display:block;color:var(--aha-text-secondary);font-size:13px;line-height:1.6}
    .aha-layout-refresh.aha-profile-page input.aha-native-switch{appearance:none;-webkit-appearance:none;width:50px;min-width:50px;height:30px;min-height:30px;border:1px solid var(--aha-border);border-radius:999px;margin:0;padding:3px;background:#7b8594!important;cursor:pointer;flex:0 0 50px}
    .aha-layout-refresh.aha-profile-page input.aha-native-switch::before{content:'';display:block;width:22px;height:22px;border-radius:50%;background:#fff;transition:transform .18s}
    .aha-layout-refresh.aha-profile-page input.aha-native-switch:checked{background:#2f6bff!important;border-color:#2f6bff}
    .aha-layout-refresh.aha-profile-page input.aha-native-switch:checked::before{transform:translateX(19px)}
    .aha-layout-refresh.aha-profile-page .aha-theme-switch{display:inline-flex!important;align-items:center!important;width:48px!important;height:44px!important;min-height:44px!important;flex:0 0 48px!important;padding:8px 0!important;border:0!important;border-radius:14px!important;background:transparent!important;cursor:pointer}
    .aha-layout-refresh .aha-theme-switch>span{position:relative;display:block;width:48px;height:28px;border-radius:999px;background:#b9bcc2;flex:0 0 48px}
    .aha-layout-refresh .aha-theme-switch>span::before{content:'';position:absolute;top:3px;left:3px;width:22px;height:22px;border-radius:50%;background:#fff;transition:transform .18s}
    .aha-layout-refresh .aha-theme-switch[aria-checked="true"]>span{background:#16856f}
    .aha-layout-refresh .aha-theme-switch[aria-checked="true"]>span::before{transform:translateX(20px)}
    .aha-layout-refresh.aha-profile-page .aha-profile-sound-toggle{min-height:64px}
    .aha-layout-refresh .aha-language-settings{display:grid;gap:10px}
    .aha-layout-refresh .aha-language-settings select{width:100%;min-height:48px;border:1px solid var(--aha-border);border-radius:12px;padding:10px 12px;background:var(--aha-surface-soft);color:var(--aha-text);font:inherit;font-size:16px}
    .aha-layout-refresh .aha-language-settings p{font-size:13px;line-height:1.7;color:var(--aha-text-secondary);margin:0}
    .aha-layout-refresh .aha-recovery-link{display:inline-flex;align-items:center;min-height:44px;color:var(--refresh-ink-blue)!important;text-decoration:underline;text-underline-offset:4px}

    /* Inbox: one continuous list per day, quiet separators and touch-accessible options. */
    .aha-layout-refresh.aha-notifications-page{padding:18px 0 120px}
    .aha-layout-refresh.aha-notifications-page .aha-shell{width:min(920px,calc(100% - 32px))!important;background:transparent!important}
    .aha-layout-refresh .aha-notifications-topbar{display:flex;flex-wrap:wrap;height:auto;min-height:64px;gap:12px;margin-bottom:12px}
    .aha-layout-refresh .aha-notifications-topbar .brand{flex:1;min-width:0;gap:9px}
    .aha-layout-refresh .aha-notifications-topbar .brand-mark{display:none}
    .aha-layout-refresh .aha-notifications-topbar h1{font-size:clamp(21px,3vw,28px);margin:0;line-height:1.5}
    .aha-layout-refresh .aha-notifications-count{min-width:25px;min-height:25px;display:inline-grid;place-items:center;padding:2px 7px;border-radius:8px;background:var(--refresh-soft-blue);color:var(--refresh-ink-blue);font-size:13px}
    .aha-layout-refresh .aha-read-all{min-height:44px;font-size:14px;white-space:nowrap;color:var(--refresh-ink-blue);background:transparent;border:0;box-shadow:none}
    .aha-inbox-toolbar{display:flex;gap:22px;border-bottom:1px solid var(--aha-border);padding-inline:4px}
    .aha-inbox-toolbar button{position:relative;min-height:48px;padding:10px 4px 13px;border:0;background:transparent;color:var(--aha-text-secondary);font-size:15px}
    .aha-inbox-toolbar button.selected{color:var(--refresh-ink-blue);font-weight:500}
    .aha-inbox-toolbar button.selected::after{content:'';position:absolute;left:0;right:0;bottom:-1px;height:3px;border-radius:3px;background:var(--refresh-blue)}
    .aha-inbox-toolbar button span{margin-left:5px;font-size:12px;background:var(--refresh-soft-blue);color:var(--refresh-ink-blue);padding:2px 6px;border-radius:6px}
    .aha-inbox{margin-top:24px}
    .aha-inbox-group{margin-bottom:24px}
    .aha-inbox-group>h2{margin:0 4px 9px;font-size:14px;font-weight:500;color:var(--aha-text-secondary)}
    .aha-layout-refresh .aha-notifications-list{display:block;border:1px solid var(--aha-border);border-radius:18px;background:var(--aha-surface)}
    .aha-layout-refresh.aha-notifications-page .notification-item{position:relative;display:grid;grid-template-columns:40px minmax(0,1fr) 44px;gap:12px;padding:18px 16px;border:0;border-radius:0;background:transparent!important;box-shadow:none!important;align-items:start;min-width:0;overflow:visible}
    .aha-layout-refresh.aha-notifications-page .notification-item+.notification-item{border-top:1px solid var(--aha-border)}
    .aha-layout-refresh.aha-notifications-page .notification-item.unread{background:var(--refresh-soft-cyan)!important}
    .aha-layout-refresh .notification-item:first-child{border-radius:18px 18px 0 0}
    .aha-layout-refresh .notification-item:last-child{border-radius:0 0 18px 18px}
    .aha-layout-refresh .notification-item:only-child{border-radius:18px}
    .aha-layout-refresh .notification-icon{width:40px;height:40px;border-radius:13px;display:grid;place-items:center;background:var(--refresh-soft-blue);color:var(--refresh-ink-blue)}
    .aha-layout-refresh .notification-item.family .notification-icon{background:#e5f5f0;color:#126b59}
    .aha-layout-refresh.aha-notifications-page .notification-item.emergency{background:#fff0ee!important;box-shadow:inset 3px 0 #c8323e!important}
    .aha-layout-refresh .notification-item.emergency .notification-icon{background:#ffe0dc;color:#a5202b}
    .aha-layout-refresh .aha-inbox-open{display:block;width:100%;min-width:0;min-height:48px;padding:0;border:0;background:transparent;text-align:left;cursor:pointer;color:var(--aha-text);overflow-wrap:anywhere}
    .aha-layout-refresh .aha-notification-title{display:block;font-size:16px;font-weight:500;color:var(--aha-text);line-height:1.6}
    .aha-layout-refresh .aha-notification-message{display:block;font-size:14px;line-height:1.7;color:var(--aha-text-secondary);margin:3px 0 7px}
    .aha-inbox-meta{display:flex;flex-wrap:wrap;gap:10px;align-items:center;font-size:12px;color:var(--aha-text-secondary)}
    .aha-inbox-read-state{color:var(--aha-text-secondary)}
    .aha-inbox-row-tools{display:flex;flex-direction:column;align-items:center;gap:3px}
    .aha-inbox-unread-dot{width:7px;height:7px;border-radius:50%;background:var(--refresh-blue);margin-top:7px}
    .aha-inbox-menu{position:relative}
    .aha-inbox-menu>summary{display:grid;place-items:center;list-style:none;width:44px;min-height:44px;border-radius:10px;cursor:pointer;color:var(--aha-text-secondary);font-size:25px;line-height:1}
    .aha-inbox-menu>summary::-webkit-details-marker{display:none}
    .aha-inbox-menu[open]>summary{background:var(--aha-surface-soft)}
    .aha-layout-refresh .aha-inbox-menu .aha-notification-actions{position:absolute;right:0;top:46px;z-index:50;display:grid;gap:4px;width:min(250px,65vw);padding:6px;border:1px solid var(--aha-border);border-radius:13px;background:var(--aha-surface);box-shadow:0 8px 28px rgba(0,0,0,.15)}
    .aha-layout-refresh .aha-inbox-menu .btn{justify-content:flex-start;text-align:left;min-height:46px;min-width:44px;padding:10px 12px;font-size:14px;white-space:normal;border:0;border-radius:8px;box-shadow:none}
    .aha-layout-refresh .aha-notifications-back svg{transform:rotate(180deg)}
    .aha-layout-refresh .aha-inbox .empty{border:1px dashed var(--aha-border);border-radius:18px;padding:46px 20px;background:var(--aha-surface);color:var(--aha-text-secondary)}
    .aha-layout-refresh .aha-inbox .empty h2{font-size:20px;color:var(--aha-text)}
    .aha-layout-refresh .aha-inbox .empty p{font-size:15px}
    html[data-aha-appearance="dark"] .aha-layout-refresh.aha-v3-page .aha-v3-action-stack>.aha-v3-action:first-child{background:#2f6bff!important;color:#fff!important}
    html[data-aha-appearance="dark"] .aha-layout-refresh.aha-v3-page .aha-v3-action-stack>.aha-v3-action:nth-child(2){background:var(--aha-surface)!important;color:#fff!important}
    html[data-aha-appearance="dark"] .aha-layout-refresh.aha-v3-page .aha-v3-action-stack>.aha-v3-action.red{background:var(--aha-surface)!important;color:var(--aha-danger)!important}
    html[data-aha-appearance="dark"] .aha-v3-sidebar[data-aha-navigation="true"] .aha-v3-side-links button.aha-v3-nav-voice,
    html[data-aha-appearance="dark"] .aha-v3-sidebar[data-aha-navigation="true"] .aha-v3-side-links button.aha-v3-nav-voice :is(svg,span){color:#fff!important;opacity:1!important}
    html[data-aha-appearance="dark"] .aha-layout-refresh.aha-notifications-page .notification-item.emergency{background:#3a2427!important}
    html[data-aha-appearance="dark"] .aha-layout-refresh .notification-item.emergency .notification-icon{background:#592e33;color:#ffb2ac}
    html[data-aha-appearance="dark"] .aha-layout-refresh .notification-item.family .notification-icon{background:#203831;color:#87d9bd}

    /* Extend the same presentation to existing medicine, family, voice and SOS routes.
       Keep Prompt, navigation geometry, safe areas, form state and handlers intact. */
    .aha-layout-refresh.aha-v3-page .aha-v3-action-icon,
    .aha-layout-refresh.aha-v3-page .aha-v3-clock,
    .aha-layout-refresh .aha-setting-icon,
    .aha-layout-refresh .notification-icon,
    .aha-layout-refresh .notification-item.family .notification-icon,
    .aha-layout-refresh .notification-item.emergency .notification-icon,
    html[data-aha-appearance="dark"] .aha-layout-refresh .notification-icon,
    html[data-aha-appearance="dark"] .aha-layout-refresh .notification-item.family .notification-icon,
    html[data-aha-appearance="dark"] .aha-layout-refresh .notification-item.emergency .notification-icon{
      background:transparent!important;border:0!important;border-radius:0!important;color:inherit!important;box-shadow:none!important;
    }
    .aha-layout-refresh .aha-setting-icon,.aha-layout-refresh .notification-icon{color:var(--aha-text)!important}
    .aha-layout-refresh .notification-item.emergency .notification-icon{color:var(--aha-danger)!important}
    /* More specific than legacy dark/active rules: SOS remains red on every route. */
    .aha-v3-sidebar[data-aha-navigation="true"] .aha-v3-side-links button.danger,
    .aha-v3-sidebar[data-aha-navigation="true"] .aha-v3-side-links button.danger.active,
    html[data-aha-appearance="dark"] .aha-v3-sidebar[data-aha-navigation="true"] .aha-v3-side-links button.danger,
    html[data-aha-appearance="dark"] .aha-v3-sidebar[data-aha-navigation="true"] .aha-v3-side-links button.danger.active{color:var(--aha-danger,#c8323e)!important}
    .aha-layout-refresh :is(input,select,textarea){max-width:100%;min-width:0;box-sizing:border-box}
    .aha-layout-refresh :is(button,a,summary){touch-action:manipulation}
    .aha-layout-refresh :is(h1,h2,h3,p,strong,label){overflow-wrap:anywhere}
    .aha-layout-refresh :is(.field,.med-main,.aha-family-person-main,.aha-family-person-details){min-width:0}
    .aha-layout-refresh :is(.btn,.icon-btn,.med-actions button,.aha-family-actions button){min-height:44px}

    /* Medicines stay text-based. No medicine-photo uploader or fabricated pill image. */
    .aha-layout-refresh.aha-medicines-page .aha-shell{width:min(1040px,calc(100% - 32px));background:transparent!important;border:0;box-shadow:none}
    .aha-layout-refresh.aha-medicines-page .topbar{gap:12px;flex-wrap:wrap;margin-bottom:20px}
    .aha-layout-refresh.aha-medicines-page .topbar>.brand{min-width:0;flex:1}
    .aha-layout-refresh.aha-medicines-page .grid{gap:16px}
    .aha-layout-refresh.aha-medicines-page .reminder-card{display:grid;grid-template-columns:34px minmax(0,1fr) auto;gap:16px;align-items:start;padding:22px;border:1px solid var(--aha-border);border-radius:22px;background:var(--aha-surface);box-shadow:var(--refresh-shadow)}
    .aha-layout-refresh.aha-medicines-page .pill-icon{width:32px;height:40px;background:transparent!important;color:var(--aha-text)!important;border:0;box-shadow:none}
    .aha-layout-refresh.aha-medicines-page .reminder-time{font-size:24px;line-height:1.5;color:var(--aha-text)}
    .aha-layout-refresh.aha-medicines-page .actions{flex-wrap:wrap;gap:8px;justify-content:flex-end}
    .aha-layout-refresh.aha-medicines-page .modal-card{background:var(--aha-surface)!important;color:var(--aha-text)!important;border-radius:24px;border:1px solid var(--aha-border)}
    .aha-layout-refresh.aha-medicines-page .modal-card .form-grid{gap:18px}
    .aha-layout-refresh.aha-medicines-page .modal-card :is(input,select){font-size:16px;min-height:48px}
    .aha-layout-refresh.aha-medicines-page .modal-card .modal-actions{display:flex;flex-wrap:wrap;gap:10px}

    /* Caregiver: today's status first, then the existing chart and calendar. */
    .aha-layout-refresh.aha-family-page .aha-family-shell{max-width:1180px;display:flex;flex-direction:column;gap:20px}
    .aha-layout-refresh.aha-family-page .aha-family-shell>section{margin-block:0!important}
    .aha-layout-refresh.aha-family-page :is(.caregiver-focus,.aha-family-connect-card,.aha-family-person-card,.family-chart-card,.med-editor){border-radius:22px;border-color:var(--aha-border);box-shadow:var(--refresh-shadow)}
    .aha-layout-refresh.aha-family-page .elderly-selector{display:flex;gap:10px;flex-wrap:wrap}
    .aha-layout-refresh.aha-family-page .elderly-selector button{min-width:0;max-width:100%;min-height:64px;border-radius:18px}
    .aha-layout-refresh.aha-family-page .elderly-selector button.active{border-color:#2f6bff;background:var(--refresh-soft-blue);color:var(--aha-text)}
    .aha-layout-refresh.aha-family-page .elderly-selector button span{min-width:0;overflow-wrap:anywhere}
    .aha-layout-refresh.aha-family-page .caregiver-stats{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}
    .aha-layout-refresh.aha-family-page .caregiver-stats>div{min-width:0;border-radius:18px;padding:16px;background:var(--aha-surface-soft)}
    .aha-layout-refresh.aha-family-page .caregiver-stats strong{font-size:30px;line-height:1.3}
    .aha-layout-refresh.aha-family-page .caregiver-stats span{font-size:14px;line-height:1.6}
    .aha-layout-refresh.aha-family-page .medication-row{display:grid;grid-template-columns:64px minmax(0,1fr) auto auto;gap:14px;align-items:center;padding:18px 0}
    .aha-layout-refresh.aha-family-page .med-main strong{font-size:18px;line-height:1.6}
    .aha-layout-refresh.aha-family-page .med-actions{display:flex;gap:8px;flex-wrap:wrap}
    .aha-layout-refresh.aha-family-page .family-chart-card{margin-top:22px}
    .aha-layout-refresh.aha-family-page .chart-wrap{max-width:100%;overflow-x:auto}
    .aha-layout-refresh.aha-family-page .chart-heading{flex-wrap:wrap;gap:12px}
    .aha-layout-refresh.aha-family-page .aha-care-enhancements{width:100%;margin:0;gap:20px}
    .aha-layout-refresh.aha-family-page .aha-care-showcase{background:var(--refresh-soft-blue)!important;color:var(--aha-text)!important}
    .aha-layout-refresh.aha-family-page .aha-care-showcase :is(h2,p,strong,small){color:var(--aha-text)!important}
    .aha-layout-refresh.aha-family-page .aha-care-calendar{border-radius:22px;background:var(--aha-surface)!important;color:var(--aha-text)!important}
    .aha-layout-refresh.aha-family-page .aha-care-calendar :is(h2,strong,p,button,b){color:var(--aha-text)!important}
    .aha-layout-refresh.aha-family-page .aha-care-calendar-grid>button{background:var(--aha-surface)!important;border-color:var(--aha-border)!important;min-height:44px}
    .aha-layout-refresh.aha-family-page .aha-care-calendar-grid>button.today{background:#2f6bff!important;color:#fff!important;border-color:#2f6bff!important}
    .aha-layout-refresh.aha-family-page .aha-care-calendar-selection{background:var(--aha-surface-soft);border-color:var(--aha-border)}
    .aha-layout-refresh.aha-family-page .aha-family-card-icon{background:transparent!important;color:var(--aha-text)!important}

    /* Voice: keep recognition, exact-time parsing and confirmation unchanged. */
    .aha-layout-refresh.aha-conversation-page{background:var(--aha-bg)!important;color:var(--aha-text)!important}
    .aha-layout-refresh.aha-conversation-page .aha-conversation-glow{display:none}
    .aha-layout-refresh.aha-conversation-page .aha-conversation-shell{border:0;background:transparent!important;box-shadow:none}
    .aha-layout-refresh.aha-conversation-page .aha-conversation-header{background:var(--aha-surface)!important;border-bottom:1px solid var(--aha-border)}
    .aha-layout-refresh.aha-conversation-page :is(.aha-chat-heading h1,.aha-live-voice-copy h1){color:var(--aha-text)!important}
    .aha-layout-refresh.aha-conversation-page .aha-chat-bubble{border:1px solid var(--aha-border);border-radius:18px;background:var(--aha-surface-soft)!important;color:var(--aha-text)!important;overflow-wrap:anywhere}
    .aha-layout-refresh.aha-conversation-page .aha-chat-row.user .aha-chat-bubble{background:#2f6bff!important;color:#fff!important;border-color:#2f6bff}
    .aha-layout-refresh.aha-conversation-page .aha-chat-bubble p{color:inherit!important;white-space:pre-wrap}
    .aha-layout-refresh.aha-conversation-page .aha-chat-suggestions{flex-wrap:wrap;overflow:visible;gap:8px}
    .aha-layout-refresh.aha-conversation-page .aha-chat-suggestions button{min-height:44px;white-space:normal}
    .aha-layout-refresh.aha-conversation-page .aha-glass-confirm{background:var(--refresh-soft-blue)!important;border:1px solid var(--aha-border);color:var(--aha-text)!important;border-radius:20px}
    .aha-layout-refresh.aha-conversation-page .aha-glass-confirm :is(strong,span,small){color:var(--aha-text)!important}
    .aha-layout-refresh.aha-conversation-page .aha-glass-confirm button{min-height:48px}
    .aha-layout-refresh.aha-conversation-page .aha-chat-composer{background:var(--aha-surface)!important;border-color:var(--aha-border)}
    .aha-layout-refresh.aha-conversation-page .aha-chat-composer input{font-size:16px;min-width:0;color:var(--aha-text)!important;background:transparent!important}

    /* SOS uses the existing two-second hold, API acknowledgement and separate tel link. */
    .aha-layout-refresh.aha-emergency-screen .aha-shell{max-width:850px;background:transparent!important}
    .aha-layout-refresh.aha-emergency-screen .aha-emergency-hero{border-radius:28px;background:var(--aha-surface)!important;border:1px solid var(--aha-border);box-shadow:var(--refresh-shadow);padding:32px 24px}
    .aha-layout-refresh.aha-emergency-screen .aha-emergency-hero h1{font-size:clamp(25px,5vw,36px);color:var(--aha-text)}
    .aha-layout-refresh.aha-emergency-screen .aha-emergency-hero>p{max-width:520px;margin-inline:auto;font-size:17px;line-height:1.8;color:var(--aha-text-secondary)}
    .aha-layout-refresh.aha-emergency-screen .aha-sos-button{background:#c8323e!important;color:#fff!important;width:clamp(180px,48vw,240px);height:clamp(180px,48vw,240px);border-radius:50%;border:8px solid var(--aha-surface)!important;box-shadow:0 0 0 2px var(--aha-danger),0 12px 28px rgba(200,50,62,.16)}
    .aha-layout-refresh.aha-emergency-screen .aha-sos-button :is(svg,strong,span){color:#fff!important}
    .aha-layout-refresh.aha-emergency-screen .aha-sos-wrap.holding .aha-sos-button{box-shadow:0 0 0 8px var(--aha-danger),0 12px 28px rgba(200,50,62,.2)}
    .aha-layout-refresh.aha-emergency-screen .aha-emergency-call .btn-danger{background:#c8323e!important;color:#fff!important;min-height:54px}
    .aha-layout-refresh.aha-emergency-screen :is(.aha-emergency-call,.aha-location-card){max-width:560px;margin-inline:auto;background:var(--aha-surface-soft)!important;border-color:var(--aha-border);border-radius:20px}
    .aha-layout-refresh.aha-emergency-screen .aha-emergency-call small{font-size:15px;line-height:1.7;color:var(--aha-text-secondary)}

    /* One navigation palette for desktop, tablet and mobile. */
    .aha-v3-sidebar[data-aha-navigation="true"] .aha-v3-side-links button.aha-v3-nav-voice,
    html[data-aha-appearance="dark"] .aha-v3-sidebar[data-aha-navigation="true"] .aha-v3-side-links button.aha-v3-nav-voice{background:#2f6bff!important;color:#fff!important;border-color:#2f6bff!important}
    .aha-v3-sidebar[data-aha-navigation="true"] .aha-v3-side-links button.aha-v3-nav-voice :is(svg,span){color:#fff!important;opacity:1!important}
    @media(max-width:760px){
      /* Floating capsule: keep the requested edge gaps and reserve its raised center. */
      :root{--aha-mobile-nav-offset:max(8px,calc(var(--aha-safe-bottom,env(safe-area-inset-bottom,0px)) - 16px))}
      .aha-layout-refresh.aha-v3-page{padding-bottom:calc(72px + var(--aha-mobile-nav-offset))!important}
      .aha-layout-refresh.aha-v3-page .aha-v3-content{padding-bottom:16px!important}
      .aha-layout-refresh.aha-conversation-page.aha-conversation-v2{padding-bottom:calc(88px + var(--aha-mobile-nav-offset))!important}
      html[data-aha-voice-compact="true"] .aha-layout-refresh.aha-conversation-page.aha-conversation-v2{padding-bottom:calc(76px + var(--aha-mobile-nav-offset))!important}
      .aha-v3-sidebar[data-aha-navigation="true"]{bottom:calc(var(--aha-mobile-nav-offset) + var(--aha-viewport-bottom-gap,0px))!important;left:max(8px,var(--aha-safe-left,env(safe-area-inset-left,0px)))!important;right:max(8px,var(--aha-safe-right,env(safe-area-inset-right,0px)))!important;width:auto!important;height:72px!important;min-height:72px!important;box-sizing:border-box!important;padding:5px!important;border:1px solid var(--aha-border)!important;border-radius:24px!important;overflow:visible!important;box-shadow:0 6px 22px #17345618!important}
      /* Soften the exposed safe-area strip without moving or enlarging the capsule. */
      .aha-v3-sidebar[data-aha-navigation="true"]{-webkit-backdrop-filter:none!important;backdrop-filter:none!important}
      .aha-v3-sidebar[data-aha-navigation="true"]::after{content:'';position:absolute;top:calc(100% - 1px);height:calc(var(--aha-mobile-nav-offset) + 2px);left:calc(-1 * max(8px,var(--aha-safe-left,env(safe-area-inset-left,0px))));right:calc(-1 * max(8px,var(--aha-safe-right,env(safe-area-inset-right,0px))));pointer-events:none;z-index:-1;background:linear-gradient(180deg,rgba(247,247,245,.4),rgba(247,247,245,.94));-webkit-backdrop-filter:blur(12px);backdrop-filter:blur(12px)}
      html[data-aha-appearance="dark"] .aha-v3-sidebar[data-aha-navigation="true"]::after{background:linear-gradient(180deg,rgba(0,0,0,.35),rgba(0,0,0,.94))}
      .aha-v3-sidebar[data-aha-navigation="true"] .aha-v3-side-links{gap:4px!important;align-items:center!important}
      .aha-v3-sidebar[data-aha-navigation="true"] .aha-v3-side-links button,
      .aha-v3-sidebar[data-aha-navigation="true"] .aha-v3-side-links button.aha-v3-nav-voice{height:60px!important;min-height:44px!important;margin:0!important;padding:7px 2px!important;gap:4px!important;border:0!important;border-radius:18px!important;box-shadow:none!important}
      .aha-v3-sidebar[data-aha-navigation="true"] .aha-v3-side-links button svg{width:25px!important;height:25px!important}
      .aha-v3-sidebar[data-aha-navigation="true"] .aha-v3-side-links button span{font-size:clamp(9px,2.5vw,11px)!important;line-height:1.45!important}
      .aha-v3-sidebar[data-aha-navigation="true"] .aha-v3-side-links button.aha-v3-nav-voice{height:72px!important;align-self:start!important;margin-top:-10px!important;border-radius:20px!important;box-shadow:inset 0 0 0 3px #fff,0 5px 12px #2f6bff24!important}
      .aha-v3-sidebar[data-aha-navigation="true"] .aha-v3-side-links button:active{filter:brightness(.94)}
      .aha-v3-sidebar[data-aha-navigation="true"] .aha-v3-side-links button.aha-v3-nav-voice,
      html[data-aha-appearance="dark"] .aha-v3-sidebar[data-aha-navigation="true"] .aha-v3-side-links button.aha-v3-nav-voice{background:#2f6bff!important;color:#fff!important}
      .aha-layout-refresh.aha-medicines-page .reminder-card{grid-template-columns:28px minmax(0,1fr);padding:18px;gap:12px}
      .aha-layout-refresh.aha-medicines-page .reminder-card>.actions{grid-column:2;justify-content:flex-start}
      .aha-layout-refresh.aha-family-page .aha-family-shell{gap:16px}
      .aha-layout-refresh.aha-family-page .caregiver-stats{grid-template-columns:repeat(2,minmax(0,1fr))}
      .aha-layout-refresh.aha-family-page .medication-row{grid-template-columns:52px minmax(0,1fr);gap:10px}
      .aha-layout-refresh.aha-family-page .medication-row>.med-state{grid-column:2;justify-self:start}
      .aha-layout-refresh.aha-family-page .medication-row>.med-actions{grid-column:2}
      .aha-layout-refresh.aha-family-page :is(.medication-manage-bar,.aha-family-person-card,.aha-family-connect-form){flex-wrap:wrap;gap:12px}
      .aha-layout-refresh.aha-family-page .aha-care-calendar-head{flex-wrap:wrap;gap:12px}
      .aha-layout-refresh.aha-family-page .aha-care-calendar-actions{flex-direction:row;flex-wrap:wrap}
      .aha-layout-refresh.aha-family-page .aha-care-calendar-month button{width:44px;height:44px}
      .aha-layout-refresh.aha-family-page .aha-care-calendar-grid{gap:2px}
      .aha-layout-refresh.aha-emergency-screen .aha-emergency-hero{padding:24px 16px}
      .aha-layout-refresh.aha-emergency-screen .aha-emergency-call>div{display:flex;flex-wrap:wrap;gap:10px}
      .aha-layout-refresh.aha-emergency-screen .aha-emergency-call input{flex:1;min-width:100px;font-size:18px}
      .aha-layout-refresh.aha-conversation-page .aha-glass-confirm{flex-wrap:wrap;gap:12px}
    }
    @media(hover:hover) and (prefers-reduced-motion:no-preference){.aha-layout-refresh.aha-v3-page .aha-v3-action:hover{transform:translateY(-3px);box-shadow:0 10px 20px rgba(30,54,92,.1)!important}}
    @media(max-width:1050px){
      .aha-layout-refresh.aha-v3-page .aha-v3-feature-row{grid-template-columns:1fr!important}
      .aha-layout-refresh.aha-v3-page .aha-v3-action-stack{grid-template-columns:repeat(3,minmax(0,1fr))!important;grid-template-rows:1fr!important}
      .aha-layout-refresh.aha-v3-page .aha-v3-action-stack>.aha-v3-action:first-child{grid-row:auto}
    }
    @media(max-width:760px){
      .aha-layout-refresh.aha-v3-page .aha-v3-content{width:calc(100% - 28px)!important;padding-top:14px!important;gap:16px!important}
      .aha-layout-refresh.aha-v3-page .aha-v3-topbar{height:auto!important;min-height:64px!important;padding:10px 14px!important;gap:12px!important}
      .aha-layout-refresh.aha-v3-page .aha-welcome{min-height:138px!important;border-radius:24px!important}
      .aha-layout-refresh.aha-v3-page .aha-v3-hero-copy{padding:18px 16px!important}
      .aha-layout-refresh.aha-v3-page .aha-v3-hero-copy h1{font-size:26px!important}
      .aha-layout-refresh.aha-v3-page .aha-v3-hero-copy p{font-size:14px!important}
      .aha-welcome-label{font-size:12px}
      .aha-welcome-art{flex-basis:64px;width:64px;height:74px;margin-right:22px;border-radius:22px}
      .aha-welcome-art>svg{width:40px;height:40px}
      .aha-layout-refresh.aha-v3-page .aha-v3-next,.aha-layout-refresh.aha-v3-page .aha-v3-card,
      .aha-layout-refresh.aha-v3-page .aha-v3-today-card,.aha-layout-refresh.aha-v3-page .aha-v3-care-card{padding:18px!important;border-radius:22px!important}
      .aha-layout-refresh.aha-v3-page .aha-v3-next-inner{min-height:96px!important;margin-block:8px!important;gap:12px!important}
      .aha-layout-refresh.aha-v3-page .aha-v3-clock{width:40px!important;height:40px!important;flex:0 0 40px!important}
      .aha-layout-refresh.aha-v3-page .aha-v3-next-inner>div>strong{font-size:36px!important}
      .aha-layout-refresh.aha-v3-page .aha-v3-action-stack{grid-template-columns:repeat(3,minmax(0,1fr))!important;grid-template-rows:auto!important;gap:8px!important}
      .aha-layout-refresh.aha-v3-page .aha-v3-action-stack>.aha-v3-action:first-child{grid-row:auto!important}
      .aha-layout-refresh.aha-v3-page .aha-v3-action-stack>.aha-v3-action{min-height:116px!important;padding:12px 8px!important;gap:8px!important;align-items:center!important;justify-content:flex-start!important;border-radius:18px!important}
      .aha-layout-refresh.aha-v3-page .aha-v3-action-stack>.aha-v3-action strong{font-size:14px!important;text-align:center!important;line-height:1.5!important}
      .aha-layout-refresh.aha-v3-page .aha-v3-action-stack>.aha-v3-action .aha-v3-action-icon{width:36px!important;height:36px!important;flex-basis:36px!important}
      .aha-layout-refresh.aha-v3-page .aha-v3-action-stack>.aha-v3-action .aha-v3-arrow{display:none!important}
      .aha-layout-refresh.aha-v3-page .aha-v3-metrics-row{grid-template-columns:1fr!important;gap:14px!important}
      .aha-layout-refresh .aha-v3-med-row{display:grid!important;grid-template-columns:54px 12px minmax(0,1fr)!important;gap:9px}
      .aha-layout-refresh.is-elderly .aha-v3-table .aha-v3-med-row{grid-template-columns:54px 12px minmax(0,1fr)!important;column-gap:9px!important}
      .aha-layout-refresh.is-elderly .aha-v3-table .aha-v3-med-row::before{left:69px;top:30px;bottom:-30px}
      .aha-layout-refresh.is-elderly .aha-v3-table .aha-v3-dot{width:12px!important;height:12px!important;border-width:3px!important}
      .aha-layout-refresh.is-caregiver .aha-v3-med-row{grid-template-columns:12px minmax(0,1fr)!important}
      .aha-layout-refresh .aha-v3-row-actions{grid-column:3;justify-content:flex-start;flex-wrap:wrap}
      .aha-layout-refresh.is-caregiver .aha-v3-row-actions{grid-column:2}
      .aha-layout-refresh.aha-v3-page .aha-v3-bottom-grid{grid-template-columns:1fr!important}
      .aha-layout-refresh.aha-profile-page .aha-profile-identity{min-height:185px}
      .aha-settings-disclosure>summary{padding:14px 16px;gap:12px}
      .aha-layout-refresh.aha-profile-page .aha-appearance-settings{padding-inline:16px}
      .aha-setting-switch-row{gap:10px}
      .aha-layout-refresh.aha-notifications-page .aha-shell{width:calc(100% - 28px)!important}
      .aha-layout-refresh.aha-notifications-page .aha-notifications-topbar{display:grid!important;grid-template-columns:minmax(0,1fr) auto!important;gap:8px!important;min-height:52px!important;height:auto!important;margin-bottom:8px!important}
      .aha-layout-refresh .aha-notifications-topbar .brand{flex-basis:auto!important;gap:6px!important}
      .aha-layout-refresh .aha-notifications-topbar h1{font-size:20px!important}
      .aha-layout-refresh .aha-notifications-topbar .aha-read-all{margin:0!important;padding:8px 4px!important;font-size:12px!important;gap:4px!important}
      .aha-layout-refresh .aha-notifications-topbar .aha-read-all svg{width:16px;height:16px}
      .aha-layout-refresh .aha-inbox{margin-top:16px}
      .aha-layout-refresh.aha-notifications-page .notification-item{grid-template-columns:36px minmax(0,1fr) 44px;padding:16px 12px;gap:9px}
      .aha-layout-refresh .notification-icon{width:36px;height:36px}
      .aha-layout-refresh.aha-medicines-page .nav-row{display:grid!important;grid-template-columns:repeat(2,minmax(0,1fr))!important;overflow:visible!important;gap:8px!important}
      .aha-layout-refresh.aha-medicines-page .nav-pill{min-width:0!important;min-height:44px!important;padding:8px!important;text-align:center;font-size:14px!important}
      .aha-layout-refresh.aha-medicines-page .hero{padding:18px!important;border-radius:20px!important;box-shadow:none!important}
      .aha-layout-refresh.aha-medicines-page .hero h1{font-size:23px!important;line-height:1.5!important;margin:4px 0!important}
      .aha-layout-refresh.aha-medicines-page .hero p{font-size:14px!important;line-height:1.6!important}
      .aha-layout-refresh.aha-medicines-page .hero .eyebrow{display:none}
      .aha-layout-refresh.aha-medicines-page .topbar{height:auto!important;min-height:52px!important;margin-bottom:12px!important}
      .aha-layout-refresh.aha-medicines-page .topbar .brand-mark{display:none}
      .aha-layout-refresh.aha-medicines-page .topbar>.btn{font-size:14px!important;padding:10px 12px!important}
    }
    html[data-aha-appearance="dark"] .aha-layout-refresh.aha-v3-page .aha-v3-next-inner .aha-v3-clock{background:transparent!important;border:0!important;color:var(--aha-text)!important}
    html[data-aha-appearance="dark"] .aha-layout-refresh.aha-v3-page .aha-v3-next-inner .aha-v3-clock svg{color:currentColor!important;stroke:currentColor!important}
    @media(max-width:380px){
      .aha-welcome-art{flex-basis:44px;width:44px;height:60px;margin-right:15px}
      .aha-welcome-art>svg{width:30px;height:30px}
      .aha-layout-refresh.aha-v3-page .aha-v3-hero-copy{padding:22px 16px!important}
      .aha-layout-refresh.aha-v3-page .aha-v3-hero-copy h1{font-size:23px!important}
      .aha-layout-refresh.aha-profile-page .aha-setting-switch-row>.aha-setting-icon{display:none}
    }
    @media(prefers-reduced-motion:reduce){.aha-layout-refresh *,.aha-layout-refresh *::before,.aha-layout-refresh *::after{animation:none!important;transition:none!important;scroll-behavior:auto!important}}
    @media(forced-colors:active){.aha-layout-refresh.aha-profile-page input.aha-native-switch{appearance:auto}.aha-layout-refresh.aha-profile-page input.aha-native-switch::before{display:none}}
  `}</style>;
}
