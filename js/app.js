/** Vanilla JS SPA — hash router + UI */
;(function () {
  'use strict'

  const {
    ZONE, COPY, formatTimer, formatFreeWait, formatCost, formatDate, formatDateTime, tariffLabel,
    parseScooterNumberFromQr, walkMinutesFromCenter, batteryTone,
    isRented, isPackageTariff, playBeep, playRideDong, escapeHtml, profileInitials, AVATAR_COLOR_OPTIONS,
    cameraErrorMessage, isCameraSupported,
    getCameraStream, pickBackCameraId, resolveBackCameraDeviceId, buildQrCameraCandidates, getQrScannerConfig,
  } = window.utils

  const LOGO = 'assets/YandexGoLogo.png'
  const SCOOTER_IMG = 'assets/scooter.png'
  const SCOOTER_ICON = 'icons/scooter.svg'

  const ICONS = {
    chevron: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m9 18 6-6-6-6"/></svg>',
    chevronLeft: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m15 18-6-6 6-6"/></svg>',
    scan: '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2"/><line x1="7" y1="12" x2="17" y2="12"/></svg>',
    scanSmall: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2"/><line x1="7" y1="12" x2="17" y2="12"/></svg>',
    play: '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>',
    pause: '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>',
    lock: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>',
    volume: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07M19.07 4.93a10 10 0 0 1 0 14.14"/></svg>',
    x: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6 6 18M6 6l12 12"/></svg>',
    xCircle: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="m15 9-6 6M9 9l6 6"/></svg>',
    battery: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="7" width="18" height="10" rx="2"/><line x1="22" y1="11" x2="22" y2="13"/></svg>',
    flashlight: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6H5a2 2 0 0 0-2 2v3a2 2 0 0 0 2 2h13l-3-3 3-3z"/><path d="M12 13v8"/><path d="M12 3v3"/></svg>',
    user: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>',
    edit: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>',
    wallet: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 7V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-2"/><path d="M3 7h18"/><path d="M16 12h2a2 2 0 0 1 0 4h-2"/></svg>',
    camera: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>',
  }

  const state = {
    sessions: [],
    rentedScooters: [],
    wallet: { prepaid_seconds: 0, prepaid_minutes: 0 },
    toast: null,
    toastTimer: null,
    completedRide: null,
    purchaseReceipt: null,
    scooterTariff: {},
    confirmModal: null,
    pendingRideFeedback: null,
    qrScanner: null,
    cameraStream: null,
    qrTorchOn: false,
    qrInitToken: 0,
    qrScanHandled: false,
    renderEpoch: 0,
    tickTimer: null,
  }

  function isMobileLayout() {
    return window.matchMedia('(max-width: 899px)').matches
  }

  function apiCall(fn) {
    try {
      return fn()
    } catch (e) {
      if (e instanceof StoreError) throw new Error(e.message)
      throw e
    }
  }

  function refreshState() {
    state.sessions = store.listSessions()
    state.rentedScooters = store.listRentedScooters()
    state.wallet = store.getWallet()
  }

  function showToast(message) {
    state.toast = message
    if (state.toastTimer) clearTimeout(state.toastTimer)
    state.toastTimer = setTimeout(() => {
      state.toast = null
      renderToast()
    }, 2800)
    renderToast()
  }

  function renderToast() {
    let el = document.getElementById('toast')
    if (!state.toast) {
      if (el) el.remove()
      return
    }
    if (!el) {
      el = document.createElement('div')
      el.id = 'toast'
      el.className = 'toast'
      document.body.appendChild(el)
    }
    el.textContent = state.toast
    el.classList.add('toast--visible')
  }

  function navigate(path) {
    if (path.startsWith('/')) path = path.slice(1)
    location.hash = path ? `#/${path}` : '#/'
  }

  function parseRoute() {
    const hash = location.hash.replace(/^#\/?/, '') || ''
    const parts = hash.split('/').filter(Boolean)
    return { page: parts[0] || 'home', param: parts[1] || '' }
  }

  function headerHtml({ showScan = true, showProfile = true, service = 'Scooters' } = {}) {
    const rightButtons = []
    if (showProfile) {
      rightButtons.push(`<button type="button" class="app-header__profile" data-action="navigate" data-path="profile" aria-label="Profile">${ICONS.user}</button>`)
    }
    if (showScan) {
      rightButtons.push(`<button type="button" class="app-header__scan" data-action="navigate" data-path="scan">${ICONS.scanSmall}<span>Scan</span></button>`)
    }
    return `
      <header class="app-header">
        <div class="app-header__left">
          <button type="button" class="app-header__brand" data-action="navigate" data-path="" aria-label="Yandex Go — home">
            <img src="${LOGO}" alt="" class="app-header__logo-img" />
            ${service ? `<span class="app-header__service">${escapeHtml(service)}</span>` : ''}
          </button>
        </div>
        ${rightButtons.length ? `<div class="app-header__right">${rightButtons.join('')}</div>` : ''}
      </header>`
  }

  function floatingBackBtnHtml({ backPath = '', variant = 'map' } = {}) {
    const backAttr = backPath ? `data-back="${escapeHtml(backPath)}"` : ''
    return `<button type="button" class="floating-back floating-back--${variant}" data-action="back" ${backAttr} aria-label="Back">${ICONS.chevronLeft}</button>`
  }

  function walletBannerHtml(minutes) {
    if (!minutes || minutes <= 0) return ''
    return `
      <div class="wallet-banner">
        <span class="wallet-banner__label">Minute balance</span>
        <span class="wallet-banner__value" data-live="wallet-value">${minutes} min</span>
      </div>`
  }

  function batteryBarHtml(percent) {
    const tone = batteryTone(percent)
    return `
      <div class="battery-bar battery-bar--${tone}">
        <div class="battery-bar__track"><div class="battery-bar__fill" style="width:${percent}%"></div></div>
        <span class="battery-bar__label">${percent}%</span>
      </div>`
  }

  function scooterCardHtml(number, battery, rangeHours, walkMin) {
    return `
      <div class="scooter-card">
        <div class="scooter-card__main">
          <div class="scooter-card__id-row">
            <h2 class="scooter-number">${escapeHtml(number)}</h2>
            ${walkMin != null ? `<span class="scooter-walk">${walkMin} min walk</span>` : ''}
          </div>
          <div class="scooter-meta"><span class="badge badge-range">~${rangeHours} h range</span></div>
          ${batteryBarHtml(battery)}
        </div>
        <div class="scooter-card__photo"><img src="${SCOOTER_IMG}" alt="Scooter ${escapeHtml(number)}" /></div>
      </div>`
  }

  function mapBackgroundHtml({ scooters, highlightNumber, rentedNumbers, showUserDot, userPosition, mode, onClickAttr }) {
    const rentedSet = new Set((rentedNumbers || []).map((n) => n.toUpperCase()))
    const visible = mode === 'focus' ? scooters : scooters.filter((s) => s.available)
    const availableCount = mode === 'fleet' ? scooters.filter((s) => s.available).length : visible.length
    const focusRentedCount = rentedSet.size
    const dotLeft = userPosition ? `${userPosition.lng_pct}%` : '50%'
    const dotTop = userPosition ? `${userPosition.lat_pct}%` : '52%'

    const markers = visible.map((s) => {
      const isHighlight = highlightNumber === s.number
      const isRentedMarker = rentedSet.has(s.number)
      const variant = isHighlight ? 'current' : isRentedMarker ? 'rented' : 'free'
      return `
        <button type="button" class="scooter-marker scooter-marker--enter scooter-marker--${variant} ${isHighlight ? 'highlight' : ''}"
          style="left:${s.lng_pct}%;top:${s.lat_pct}%" data-action="open-scooter" data-number="${escapeHtml(s.number)}"
          aria-label="Scooter ${escapeHtml(s.number)}">
          ${isHighlight ? '<span class="marker-ring"></span>' : ''}
          <span class="marker-icon"><img src="${SCOOTER_ICON}" alt="" /></span>
          <span class="marker-pin"></span>
          <span class="marker-label">${escapeHtml(s.number)}</span>
        </button>`
    }).join('')

    return `
      <div class="map-background">
        <div class="map-placeholder" aria-hidden="true"></div>
        <div class="map-vignette" aria-hidden="true"></div>
        <div class="map-chrome">
          <div class="map-zone-chip"><span class="map-zone-chip__dot"></span>${ZONE.name}</div>
          ${mode === 'fleet'
            ? `<div class="map-fleet-chip">${availableCount} free</div>`
            : `<div class="map-fleet-chip map-fleet-chip--focus">${focusRentedCount > 0 ? `${focusRentedCount} rented` : highlightNumber || 'Selected'}${highlightNumber && focusRentedCount > 0 ? ` · ${highlightNumber}` : ''}</div>`}
        </div>
        ${showUserDot ? `<div class="user-location user-location--live" style="left:${dotLeft};top:${dotTop}"><span class="user-dot"></span><span class="user-pulse"></span></div>` : ''}
        ${markers}
      </div>`
  }

  function sessionDetailText(session) {
    const riding = session.riding_seconds ?? session.elapsed_seconds
    const waitingSession = session.waiting_session_seconds ?? 0
    let detail = session.scooter_number
    if (session.status === 'reserved' && session.free_wait_remaining_seconds != null) {
      detail = `${session.scooter_number} · Free wait ${formatFreeWait(session.free_wait_remaining_seconds)}`
    } else if (session.status === 'riding') {
      detail = `${session.scooter_number} · Riding ${formatTimer(riding)} · ${formatCost(session.cost_rub)}`
    } else if (session.status === 'paused') {
      detail = `${session.scooter_number} · Waiting ${formatTimer(waitingSession)} · ${formatCost(session.cost_rub)}`
    } else if (session.status === 'finish_photo') {
      detail = `${session.scooter_number} · Photo required`
    }
    return detail
  }

  function statusBannerText(session) {
    const walletHint = session.wallet_minutes_remaining != null
      ? `${session.wallet_minutes_remaining} min on balance`
      : state.wallet.prepaid_minutes > 0 ? `${state.wallet.prepaid_minutes} min on balance` : null
    const timerVal = session.status === 'paused'
      ? (session.waiting_session_seconds ?? 0)
      : (session.riding_seconds ?? session.elapsed_seconds)
    const prefix = session.status === 'paused' ? 'Waiting' : 'Riding'
    return `${prefix}${walletHint ? ` · ${walletHint}` : ''} · ${formatTimer(timerVal)}`
  }

  function activeRentalsHtml(sessions) {
    const active = sessions.filter((s) => isRented(s.status) || s.status === 'finish_photo')
    if (!active.length) return ''
    const totalCost = active.reduce((sum, s) => sum + s.cost_rub, 0)
    const labels = {
      selected: 'Scooter selected', reserved: 'Reserved', riding: 'Ride in progress',
      paused: 'Waiting', finish_photo: 'Take a parking photo',
    }

    const items = active.map((session) => {
      const detail = sessionDetailText(session)
      return `
        <button type="button" class="session-banner" data-action="continue-session" data-number="${escapeHtml(session.scooter_number)}">
          <span class="session-banner__dot session-banner__dot--${session.status}"></span>
          <span class="session-banner__text">
            <span class="session-banner__title">${labels[session.status]}</span>
            <span class="session-banner__detail" data-live="session-detail" data-session="${escapeHtml(session.scooter_number)}">${escapeHtml(detail)}</span>
          </span>
          ${ICONS.chevron}
        </button>`
    }).join('')

    return `
      <div class="active-rentals" id="live-rentals">
        <div class="active-rentals__header">
          <span class="active-rentals__label">Your rentals · ${active.length}</span>
          ${totalCost > 0 ? `<span class="active-rentals__total" data-live="rentals-total">${formatCost(totalCost)} total</span>` : '<span class="active-rentals__total" data-live="rentals-total" hidden></span>'}
        </div>
        ${items}
      </div>`
  }

  function nearbyListHtml(scooters) {
    const available = scooters.filter((s) => s.available)
    const items = available.length === 0
      ? '<p class="nearby-empty">All scooters are currently in use</p>'
      : available.map((s) => {
          const walk = walkMinutesFromCenter(s.lat_pct, s.lng_pct)
          const tone = batteryTone(s.battery)
          return `
            <button type="button" class="nearby-item" data-action="open-scooter" data-number="${escapeHtml(s.number)}">
              <span class="nearby-item__icon"><img src="${SCOOTER_ICON}" alt="" /></span>
              <span class="nearby-item__body">
                <span class="nearby-item__number">${escapeHtml(s.number)}</span>
                <span class="nearby-item__meta">${walk} min · <span class="nearby-battery nearby-battery--${tone}">${ICONS.battery}</span>${s.battery}%</span>
              </span>
              <span class="nearby-item__chevron">${ICONS.chevron}</span>
            </button>`
        }).join('')

    return `
      <div class="nearby-list">
        <div class="nearby-list__header"><h3>Nearby</h3><span class="nearby-count">${available.length} available</span></div>
        ${items}
      </div>`
  }

  function renderHome() {
    const scooters = store.listScooters()
    return `
      <div class="app-shell app-shell--map">
        ${headerHtml()}
        <div class="map-layout">
          <div class="map-layout__map">${mapBackgroundHtml({ scooters, mode: 'fleet' })}</div>
          <aside class="map-layout__panel">
            <div class="control-panel" data-bottom-sheet data-sheet-id="home">
              <div class="control-panel__sheet-drag" data-sheet-handle tabindex="0" role="button" aria-label="Expand or collapse panel">
                <div class="control-panel__handle-hit">
                  <div class="control-panel__handle" aria-hidden="true"></div>
                </div>
                <div class="control-panel__head">
                  <div class="control-panel__head-text">
                    <h2 class="control-panel__title">${ZONE.label}</h2>
                    <p class="control-panel__subtitle">${COPY.demoNote}</p>
                  </div>
                  <button type="button" class="demo-reset-btn" data-action="reset-demo">Reset demo</button>
                </div>
              </div>
              <div class="control-panel__content">
                <div class="control-panel__sheet-core">
                  ${walletBannerHtml(state.wallet.prepaid_minutes)}
                  ${activeRentalsHtml(state.sessions)}
                  <button type="button" class="scan-hero" data-action="navigate" data-path="scan">
                    <span class="scan-hero__icon">${ICONS.scan}</span>
                    <span class="scan-hero__text">
                      <span class="scan-hero__title">Scan to ride</span>
                      <span class="scan-hero__sub">QR on handlebars or enter number</span>
                    </span>
                  </button>
                </div>
                <div class="control-panel__sheet-extra" data-sheet-extra>
                  ${nearbyListHtml(scooters)}
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>`
  }

  const RIDE_CUE_CLASSES = [
    'status-banner--cue-unlock',
    'status-banner--cue-pause',
    'status-banner--cue-resume',
    'status-banner--cue-start',
    'status-banner--cue-finish',
  ]

  function rideActionFeedback(kind) {
    playRideDong(kind)
    if (navigator.vibrate) {
      if (kind === 'unlock') navigator.vibrate([10, 35, 12])
      else if (kind === 'pause') navigator.vibrate(16)
      else if (kind === 'resume') navigator.vibrate([8, 28, 10])
      else if (kind === 'start') navigator.vibrate([14, 45, 18])
      else if (kind === 'finish') navigator.vibrate([20, 50, 16])
    }
    requestAnimationFrame(() => {
      const cueClass = `status-banner--cue-${kind}`
      const targets = [
        document.querySelector('.status-banner'),
        document.querySelector('.finish-page'),
        document.querySelector('.ride-receipt'),
      ].filter(Boolean)
      if (!targets.length) return
      for (const el of targets) {
        el.classList.remove(...RIDE_CUE_CLASSES)
        void el.offsetWidth
        el.classList.add(cueClass)
        window.setTimeout(() => el.classList.remove(cueClass), 650)
      }
    })
  }

  function historyEntryHtml(entry) {
    const attrs = `data-action="open-history-receipt" data-history-id="${escapeHtml(entry.id)}" role="button" tabindex="0"`
    if (entry.type === 'purchase') {
      return `
        <li class="history-item history-item--purchase history-item--clickable" ${attrs}>
          <span class="history-item__icon history-item__icon--purchase">+</span>
          <div class="history-item__body">
            <span class="history-item__title">${escapeHtml(tariffLabel(entry.tariff))}</span>
            <span class="history-item__meta">${entry.minutes_added} min added · ${formatDateTime(entry.completed_at)}</span>
          </div>
          <span class="history-item__amount">${formatCost(entry.price_rub)}</span>
        </li>`
    }
    const totalMin = Math.max(1, Math.round(
      ((entry.riding_seconds || 0) + (entry.waiting_total_seconds || 0)) / 60,
    ))
    const costLabel = entry.cost_rub > 0 ? formatCost(entry.cost_rub) : '0₽'
    const balanceNote = (entry.prepaid_minutes_used ?? 0) > 0
      ? ` · ${entry.prepaid_minutes_used} min from balance`
      : ''
    return `
      <li class="history-item history-item--ride history-item--clickable" ${attrs}>
        <span class="history-item__icon"><img src="${SCOOTER_ICON}" alt="" /></span>
        <div class="history-item__body">
          <span class="history-item__title">${escapeHtml(entry.scooter_number)}</span>
          <span class="history-item__meta">${totalMin} min · ${tariffLabel(entry.tariff)}${balanceNote} · ${formatDateTime(entry.completed_at)}</span>
        </div>
        <span class="history-item__amount">${costLabel}</span>
      </li>`
  }

  function openHistoryReceipt(entryId) {
    const entry = store.getHistoryEntry(entryId)
    if (!entry) {
      showToast('Receipt not found')
      return
    }
    if (entry.type === 'ride') {
      state.completedRide = {
        scooter_number: entry.scooter_number,
        riding_seconds: entry.riding_seconds || 0,
        waiting_total_seconds: entry.waiting_total_seconds || 0,
        cost_rub: entry.cost_rub || 0,
        tariff: entry.tariff,
        prepaid_minutes_used: entry.prepaid_minutes_used || 0,
        completed_at: entry.completed_at,
        fromHistory: true,
      }
      state.purchaseReceipt = null
    } else if (entry.type === 'purchase') {
      state.purchaseReceipt = {
        tariff: entry.tariff,
        minutes_added: entry.minutes_added,
        price_rub: entry.price_rub,
        prepaid_minutes: entry.balance_after_minutes ?? store.getWallet().prepaid_minutes,
        completed_at: entry.completed_at,
        fromHistory: true,
      }
      state.completedRide = null
    }
    renderOverlays()
  }

  const AVATAR_CROP_VIEWPORT = 200
  const AVATAR_CROP_OUTPUT = 256
  const AVATAR_CROP_MAX_SOURCE = 1600

  let avatarCropSession = null

  function profileAvatarInnerHtml({ name, avatar_color, avatar_url }, className = 'profile-avatar') {
    const color = avatar_color || 'yellow'
    if (avatar_url) {
      return `<div class="${className} profile-avatar--photo profile-avatar--${color}"><img src="${avatar_url}" alt="" /></div>`
    }
    return `<div class="${className} profile-avatar--${color}" aria-hidden="true">${escapeHtml(profileInitials(name))}</div>`
  }

  function profileAvatarPickerHtml(profile) {
    const swatches = AVATAR_COLOR_OPTIONS.map((opt) => `
      <button
        type="button"
        class="profile-avatar-swatch profile-avatar-swatch--${opt.id}${profile.avatar_color === opt.id ? ' is-selected' : ''}"
        data-action="pick-avatar-color"
        data-color="${opt.id}"
        aria-label="${escapeHtml(opt.label)}"
        aria-pressed="${profile.avatar_color === opt.id}"
      ></button>`).join('')

    return `
      <div class="profile-avatar-edit">
        <div id="profile-avatar-preview" class="profile-avatar-preview">
          ${profileAvatarInnerHtml(profile, 'profile-avatar profile-avatar--lg')}
        </div>
        <div id="profile-avatar-crop" class="profile-avatar-crop" hidden>
          <div class="profile-avatar-crop__viewport" data-avatar-crop-handle>
            <img data-avatar-crop-image alt="" draggable="false" />
            <div class="profile-avatar-crop__ring" aria-hidden="true"></div>
          </div>
          <label class="profile-avatar-crop__zoom">
            <span>Zoom</span>
            <input type="range" data-avatar-crop-zoom min="1" max="4" step="0.01" value="1" />
          </label>
          <p class="profile-avatar-crop__hint">Drag to move · slider or pinch to zoom</p>
          <div class="profile-avatar-crop__actions">
            <button type="button" class="btn-secondary" data-action="cancel-avatar-crop">Cancel</button>
            <button type="button" class="btn-primary" data-action="apply-avatar-crop">Apply</button>
          </div>
        </div>
        <div id="profile-avatar-controls" class="profile-avatar-controls">
          <div class="profile-avatar-colors" role="group" aria-label="Avatar color">${swatches}</div>
          <div class="profile-avatar-actions">
            <label class="profile-avatar-upload">
              ${ICONS.camera}
              <span>Upload photo</span>
              <input type="file" id="profile-avatar-input" accept="image/jpeg,image/png,image/webp" hidden />
            </label>
            <button type="button" class="profile-avatar-remove${profile.avatar_url ? '' : ' is-hidden'}" data-action="remove-avatar-photo">Remove photo</button>
          </div>
        </div>
      </div>`
  }

  function setAvatarCropMode(form, active) {
    const preview = form.querySelector('#profile-avatar-preview')
    const crop = form.querySelector('#profile-avatar-crop')
    const controls = form.querySelector('#profile-avatar-controls')
    if (preview) preview.hidden = active
    if (controls) controls.hidden = active
    if (crop) crop.hidden = !active
  }

  function clampAvatarCropOffsets(session) {
    const vw = session.viewport
    const iw = session.img.width * session.scale
    const ih = session.img.height * session.scale
    session.x = Math.min(0, Math.max(vw - iw, session.x))
    session.y = Math.min(0, Math.max(vw - ih, session.y))
  }

  function renderAvatarCropSession(session) {
    const img = session.elements.image
    const zoom = session.elements.zoom
    if (!img) return
    img.style.width = `${session.img.width * session.scale}px`
    img.style.height = `${session.img.height * session.scale}px`
    img.style.transform = `translate(${session.x}px, ${session.y}px)`
    if (zoom) {
      const ratio = session.scale / session.minScale
      zoom.value = String(Math.max(1, Math.min(4, ratio)))
    }
  }

  function zoomAvatarCropAt(session, nextScale, focalX, focalY) {
    const clamped = Math.max(session.minScale, Math.min(session.maxScale, nextScale))
    const imgX = (focalX - session.x) / session.scale
    const imgY = (focalY - session.y) / session.scale
    session.scale = clamped
    session.x = focalX - imgX * session.scale
    session.y = focalY - imgY * session.scale
    clampAvatarCropOffsets(session)
    renderAvatarCropSession(session)
  }

  function exportAvatarCrop(session) {
    const canvas = document.createElement('canvas')
    const size = AVATAR_CROP_OUTPUT
    canvas.width = size
    canvas.height = size
    const ctx = canvas.getContext('2d')
    if (!ctx) return ''
    const ratio = size / session.viewport
    ctx.beginPath()
    ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2)
    ctx.closePath()
    ctx.clip()
    ctx.drawImage(
      session.img,
      session.x * ratio,
      session.y * ratio,
      session.img.width * session.scale * ratio,
      session.img.height * session.scale * ratio,
    )
    return canvas.toDataURL('image/jpeg', 0.9)
  }

  function detachAvatarCropSession() {
    if (!avatarCropSession) return
    const { cleanup } = avatarCropSession
    if (cleanup) cleanup()
    avatarCropSession = null
  }

  function closeAvatarCrop(form, { restorePrevious = true } = {}) {
    if (!avatarCropSession || avatarCropSession.form !== form) return
    if (restorePrevious) form.avatar_url.value = avatarCropSession.previousUrl
    detachAvatarCropSession()
    setAvatarCropMode(form, false)
    updateProfileAvatarPreview(form)
  }

  function attachAvatarCropSession(form, session) {
    const viewport = session.elements.viewport
    const zoom = session.elements.zoom
    if (!viewport) return

    const onPointerDown = (e) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return
      session.dragging = true
      session.pointerId = e.pointerId
      session.startX = e.clientX
      session.startY = e.clientY
      session.startOffsetX = session.x
      session.startOffsetY = session.y
      viewport.setPointerCapture(e.pointerId)
      e.preventDefault()
    }

    const onPointerMove = (e) => {
      if (!session.dragging || e.pointerId !== session.pointerId) return
      session.x = session.startOffsetX + (e.clientX - session.startX)
      session.y = session.startOffsetY + (e.clientY - session.startY)
      clampAvatarCropOffsets(session)
      renderAvatarCropSession(session)
    }

    const finishDrag = (e) => {
      if (!session.dragging || (e && e.pointerId !== session.pointerId)) return
      session.dragging = false
      try { viewport.releasePointerCapture(session.pointerId) } catch { /* ignore */ }
      session.pointerId = null
    }

    const onWheel = (e) => {
      e.preventDefault()
      const rect = viewport.getBoundingClientRect()
      const focalX = e.clientX - rect.left
      const focalY = e.clientY - rect.top
      const factor = Math.exp(-e.deltaY * 0.002)
      zoomAvatarCropAt(session, session.scale * factor, focalX, focalY)
    }

    const onZoomInput = () => {
      const ratio = Number(zoom.value)
      if (!Number.isFinite(ratio)) return
      zoomAvatarCropAt(session, session.minScale * ratio, session.viewport / 2, session.viewport / 2)
    }

    let pinchStartDist = 0
    let pinchStartScale = session.scale
    const activeTouches = new Map()

    const pinchDistance = () => {
      const points = [...activeTouches.values()]
      if (points.length < 2) return 0
      const dx = points[0].x - points[1].x
      const dy = points[0].y - points[1].y
      return Math.hypot(dx, dy)
    }

    const pinchCenter = () => {
      const points = [...activeTouches.values()]
      const rect = viewport.getBoundingClientRect()
      return {
        x: (points[0].x + points[1].x) / 2 - rect.left,
        y: (points[0].y + points[1].y) / 2 - rect.top,
      }
    }

    const onTouchStart = (e) => {
      for (const touch of e.changedTouches) {
        activeTouches.set(touch.identifier, { x: touch.clientX, y: touch.clientY })
      }
      if (activeTouches.size === 2) {
        pinchStartDist = pinchDistance()
        pinchStartScale = session.scale
      }
    }

    const onTouchMove = (e) => {
      for (const touch of e.changedTouches) {
        if (activeTouches.has(touch.identifier)) {
          activeTouches.set(touch.identifier, { x: touch.clientX, y: touch.clientY })
        }
      }
      if (activeTouches.size >= 2 && pinchStartDist > 0) {
        e.preventDefault()
        const dist = pinchDistance()
        const center = pinchCenter()
        const nextScale = pinchStartScale * (dist / pinchStartDist)
        zoomAvatarCropAt(session, nextScale, center.x, center.y)
      }
    }

    const onTouchEnd = (e) => {
      for (const touch of e.changedTouches) activeTouches.delete(touch.identifier)
      if (activeTouches.size < 2) pinchStartDist = 0
    }

    viewport.addEventListener('pointerdown', onPointerDown)
    viewport.addEventListener('pointermove', onPointerMove)
    viewport.addEventListener('pointerup', finishDrag)
    viewport.addEventListener('pointercancel', finishDrag)
    viewport.addEventListener('wheel', onWheel, { passive: false })
    viewport.addEventListener('touchstart', onTouchStart, { passive: true })
    viewport.addEventListener('touchmove', onTouchMove, { passive: false })
    viewport.addEventListener('touchend', onTouchEnd)
    viewport.addEventListener('touchcancel', onTouchEnd)
    zoom?.addEventListener('input', onZoomInput)

    session.cleanup = () => {
      viewport.removeEventListener('pointerdown', onPointerDown)
      viewport.removeEventListener('pointermove', onPointerMove)
      viewport.removeEventListener('pointerup', finishDrag)
      viewport.removeEventListener('pointercancel', finishDrag)
      viewport.removeEventListener('wheel', onWheel)
      viewport.removeEventListener('touchstart', onTouchStart)
      viewport.removeEventListener('touchmove', onTouchMove)
      viewport.removeEventListener('touchend', onTouchEnd)
      viewport.removeEventListener('touchcancel', onTouchEnd)
      zoom?.removeEventListener('input', onZoomInput)
    }
  }

  function openAvatarCrop(form, dataUrl) {
    detachAvatarCropSession()
    const crop = form.querySelector('#profile-avatar-crop')
    const image = crop?.querySelector('[data-avatar-crop-image]')
    const viewport = crop?.querySelector('[data-avatar-crop-handle]')
    const zoom = crop?.querySelector('[data-avatar-crop-zoom]')
    if (!crop || !image || !viewport) return

    const img = new Image()
    img.onload = () => {
      const viewportSize = AVATAR_CROP_VIEWPORT
      const minScale = Math.max(viewportSize / img.width, viewportSize / img.height)
      const session = {
        form,
        img,
        viewport: viewportSize,
        scale: minScale * 1.08,
        minScale,
        maxScale: minScale * 4,
        x: (viewportSize - img.width * minScale * 1.08) / 2,
        y: (viewportSize - img.height * minScale * 1.08) / 2,
        previousUrl: form.avatar_url.value || '',
        elements: { crop, image, viewport, zoom },
        cleanup: null,
      }
      clampAvatarCropOffsets(session)
      image.src = dataUrl
      avatarCropSession = session
      setAvatarCropMode(form, true)
      renderAvatarCropSession(session)
      attachAvatarCropSession(form, session)
    }
    img.onerror = () => showToast('Could not read image')
    img.src = dataUrl
  }

  function applyAvatarCrop(form) {
    if (!avatarCropSession || avatarCropSession.form !== form) return
    form.avatar_url.value = exportAvatarCrop(avatarCropSession)
    detachAvatarCropSession()
    setAvatarCropMode(form, false)
    const fileInput = form.querySelector('#profile-avatar-input')
    if (fileInput) fileInput.value = ''
    updateProfileAvatarPreview(form)
  }

  function syncProfileAccentClass(color) {
    const shell = document.querySelector('.app-shell--page')
    if (!shell) return
    for (const opt of AVATAR_COLOR_OPTIONS) {
      shell.classList.remove(`profile-page--accent-${opt.id}`)
    }
    shell.classList.add(`profile-page--accent-${color || 'yellow'}`)
  }

  function updateProfileAvatarPreview(form) {
    const preview = form.querySelector('#profile-avatar-preview')
    if (!preview) return
    const name = form.name.value || 'Demo rider'
    const avatar_color = form.avatar_color.value || 'yellow'
    const avatar_url = form.avatar_url.value || ''
    preview.innerHTML = profileAvatarInnerHtml({ name, avatar_color, avatar_url }, 'profile-avatar profile-avatar--lg')
    syncProfileAccentClass(avatar_color)
    const removeBtn = form.querySelector('.profile-avatar-remove')
    if (removeBtn) removeBtn.classList.toggle('is-hidden', !avatar_url)
    form.querySelectorAll('[data-action="pick-avatar-color"]').forEach((btn) => {
      const selected = btn.dataset.color === avatar_color
      btn.classList.toggle('is-selected', selected)
      btn.setAttribute('aria-pressed', String(selected))
    })
  }

  function readAvatarImageData(file) {
    return new Promise((resolve, reject) => {
      if (!file || !/^image\/(jpeg|png|webp)$/.test(file.type)) {
        reject(new Error('Choose a JPG, PNG or WebP image'))
        return
      }
      if (file.size > 5 * 1024 * 1024) {
        reject(new Error('Image is too large (max 5 MB)'))
        return
      }
      const reader = new FileReader()
      reader.onload = () => {
        const img = new Image()
        img.onload = () => {
          const maxSide = AVATAR_CROP_MAX_SOURCE
          const scale = Math.min(1, maxSide / Math.max(img.width, img.height))
          if (scale >= 1) {
            resolve(String(reader.result))
            return
          }
          const width = Math.max(1, Math.round(img.width * scale))
          const height = Math.max(1, Math.round(img.height * scale))
          const canvas = document.createElement('canvas')
          canvas.width = width
          canvas.height = height
          const ctx = canvas.getContext('2d')
          if (!ctx) {
            resolve(String(reader.result))
            return
          }
          ctx.drawImage(img, 0, 0, width, height)
          resolve(canvas.toDataURL('image/jpeg', 0.92))
        }
        img.onerror = () => reject(new Error('Could not read image'))
        img.src = String(reader.result)
      }
      reader.onerror = () => reject(new Error('Could not read image'))
      reader.readAsDataURL(file)
    })
  }

  function renderProfile() {
    const profile = store.getProfile()
    const history = store.getHistory()
    const stats = store.getHistoryStats()
    const wallet = store.getWallet()
    const historyItems = history.length
      ? history.map(historyEntryHtml).join('')
      : '<li class="history-empty">No rides yet. Scan a scooter to start.</li>'

    return `
      <div class="app-shell app-shell--page profile-page--accent-${escapeHtml(profile.avatar_color)}">
        ${headerHtml()}
        ${floatingBackBtnHtml({ variant: 'page' })}
        <main class="profile-page">
          <section class="profile-hero">
            <div class="profile-hero__row">
              ${profileAvatarInnerHtml(profile, 'profile-hero__avatar profile-avatar')}
              <div class="profile-hero__info">
                <h1 class="profile-hero__name">${escapeHtml(profile.name)}</h1>
                <p class="profile-hero__city">${escapeHtml(profile.city)}</p>
              </div>
              <button type="button" class="profile-edit-btn" data-action="open-profile-edit" aria-label="Edit profile">
                ${ICONS.edit}
                <span>Edit</span>
              </button>
            </div>
          </section>

          <section class="profile-wallet" aria-label="Minute balance">
            <div class="profile-wallet__icon">${ICONS.wallet}</div>
            <div class="profile-wallet__body">
              <span class="profile-wallet__value">${wallet.prepaid_minutes} min</span>
              <span class="profile-wallet__label">Prepaid balance</span>
            </div>
            <span class="profile-wallet__badge">Wallet</span>
          </section>

          <section class="profile-stats" aria-label="Ride statistics">
            <div class="profile-stat profile-stat--primary">
              <span class="profile-stat__value">${formatCost(stats.totalSpent)}</span>
              <span class="profile-stat__label">Total spent</span>
            </div>
            <div class="profile-stat">
              <span class="profile-stat__value">${stats.rideCount}</span>
              <span class="profile-stat__label">Rides</span>
            </div>
            <div class="profile-stat">
              <span class="profile-stat__value">${stats.totalRideMinutes}</span>
              <span class="profile-stat__label">Minutes</span>
            </div>
          </section>

          <section class="profile-history">
            <div class="profile-section-head">
              <h2 class="profile-history__title">Rental history</h2>
              ${history.length ? `<span class="profile-section-badge">${history.length}</span>` : ''}
            </div>
            <ul class="history-list">${historyItems}</ul>
          </section>
        </main>

        <div id="profile-edit-overlay" class="profile-edit-overlay" hidden>
          <div class="profile-edit-backdrop" data-action="hide-profile-edit"></div>
          <form id="profile-edit-form" class="profile-edit-modal" role="dialog" aria-modal="true" aria-labelledby="profile-edit-title">
            <h3 id="profile-edit-title">Edit profile</h3>
            <p class="profile-edit-modal__hint">Saved on this device only.</p>
            <input type="hidden" name="avatar_color" value="${escapeHtml(profile.avatar_color)}" />
            <input type="hidden" name="avatar_url" value="" />
            ${profileAvatarPickerHtml(profile)}
            <label class="profile-field">
              <span class="profile-field__label">Name</span>
              <input type="text" name="name" value="${escapeHtml(profile.name)}" maxlength="40" autocomplete="name" required />
            </label>
            <label class="profile-field">
              <span class="profile-field__label">City</span>
              <input type="text" name="city" value="${escapeHtml(profile.city)}" maxlength="40" autocomplete="address-level2" />
            </label>
            <div class="profile-edit-actions">
              <button type="button" class="btn-secondary" data-action="hide-profile-edit">Cancel</button>
              <button type="submit" class="btn-primary">Save</button>
            </div>
          </form>
        </div>
      </div>`
  }

  function tariffSelectorHtml(tariffs, selected) {
    return `<div class="tariff-scroll">${tariffs.map((t) => `
      <button type="button" class="tariff-card ${selected === t.id ? 'selected' : ''}" data-action="select-tariff" data-tariff="${t.id}">
        <span class="tariff-label">${escapeHtml(t.label)}</span>
        <span class="tariff-sub">${escapeHtml(t.subtitle)}</span>
        <span class="tariff-price">${escapeHtml(t.price)}</span>
        ${t.original_price ? `<span class="tariff-original">${escapeHtml(t.original_price)}</span>` : ''}
      </button>`).join('')}</div>`
  }

  function rentalSwitcherHtml(sessions, currentNumber) {
    const active = sessions.filter((s) => isRented(s.status) || s.status === 'finish_photo')
    if (active.length <= 1) return ''
    const short = { selected: 'Selected', reserved: 'Reserved', riding: 'Riding', paused: 'Paused', finish_photo: 'Photo' }
    return `<div class="rental-switcher" role="tablist">${active.map((session) => {
      const isCurrent = session.scooter_number === currentNumber.toUpperCase()
      const timer = session.status === 'riding'
        ? formatTimer(session.riding_seconds ?? session.elapsed_seconds)
        : session.status === 'paused' ? formatTimer(session.waiting_session_seconds ?? 0) : null
        return `
        <button type="button" role="tab" aria-selected="${isCurrent}" class="rental-switcher__chip ${isCurrent ? 'rental-switcher__chip--active' : ''} rental-switcher__chip--${session.status}" data-action="navigate" data-path="scooter/${escapeHtml(session.scooter_number)}">
          <span class="rental-switcher__number">${escapeHtml(session.scooter_number)}</span>
          <span class="rental-switcher__meta" data-live="rental-meta" data-session="${escapeHtml(session.scooter_number)}">${short[session.status]}${timer ? ` · ${timer}` : ''}${session.cost_rub > 0 ? ` · ${formatCost(session.cost_rub)}` : ''}</span>
        </button>`
    }).join('')}</div>`
  }

  function actionBarHtml(actions) {
    return `<div class="action-bar">${actions.map((a) => `
      <button type="button" class="action-btn" data-action="${a.action}" data-number="${escapeHtml(a.number || '')}">
        ${a.icon}<span>${escapeHtml(a.label)}</span>
      </button>`).join('')}</div>`
  }

  function renderScooter(number) {
    let scooter
    try {
      scooter = store.getScooter(number)
      apiCall(() => store.selectScooter(number))
      refreshState()
    } catch {
      navigate('')
      return renderHome()
    }

    const session = state.sessions.find((s) => s.scooter_number === number.toUpperCase()) || null
    const status = session?.status ?? 'selected'
    const tariff = state.scooterTariff[number.toUpperCase()] || 'per_minute'
    const selectedTariff = scooter.tariffs.find((t) => t.id === tariff)
    const isPackage = isPackageTariff(tariff)
    const battery = session?.battery ?? scooter.battery
    const rangeHours = session?.range_hours ?? scooter.range_hours
    const walkMin = walkMinutesFromCenter(scooter.lat_pct, scooter.lng_pct)
    const isTall = status !== 'selected'

    const mapScooters = [...state.rentedScooters]
    if (!mapScooters.find((s) => s.number === scooter.number)) mapScooters.push(scooter)
    const rentedNumbers = state.rentedScooters.map((s) => s.number)

    let panelCore = ''
    let panelExtra = ''
    let panelFooter = ''
    let sheetId = 'scooter-selected'

    if (status === 'selected') {
      sheetId = 'scooter-selected'
      panelCore = `
        ${walletBannerHtml(state.wallet.prepaid_minutes)}
        ${scooterCardHtml(scooter.number, battery, rangeHours, walkMin)}`
      panelExtra = `
        <div class="section-label">Tariff</div>
        ${tariffSelectorHtml(scooter.tariffs, tariff)}`
      panelFooter = `
        <div class="reserve-row">
          <div class="payment-chip" title="Alfa-Bank"><span class="payment-chip__mark">α</span></div>
          ${isPackage
            ? `<button type="button" class="btn-reserve" data-action="purchase" data-number="${escapeHtml(number)}" data-tariff="${tariff}">
                <span>Buy ${escapeHtml(selectedTariff?.label || 'package')}</span>
                <small>${escapeHtml(selectedTariff?.price || '')} · credited to your balance</small>
              </button>`
            : `<button type="button" class="btn-reserve" data-action="reserve" data-number="${escapeHtml(number)}">
                <span>Reserve</span>
                <small>₽8.99/min after free wait${state.wallet.prepaid_minutes > 0 ? ` · ${state.wallet ? state.wallet.prepaid_minutes : 0} min prepaid` : ''}</small>
              </button>`}
        </div>
        <p class="legal">${isPackage ? 'Minute packages are added to your account and used during rides.' : 'By tapping Reserve you agree to the Terms of Use.'}</p>`
    } else if (status === 'reserved' && session) {
      sheetId = 'scooter-active'
      panelCore = `
        ${walletBannerHtml(state.wallet.prepaid_minutes)}
        <div class="status-banner status-banner--wait">
          <span>Free wait</span><span class="status-banner__value" id="live-free-wait">${formatFreeWait(session.free_wait_remaining_seconds ?? 0)}</span>
        </div>
        ${scooterCardHtml(scooter.number, battery, rangeHours)}`
      panelExtra = actionBarHtml([
        { action: 'confirm-cancel', label: 'Cancel', icon: ICONS.xCircle, number },
        { action: 'beep', label: 'Beep', icon: ICONS.volume, number },
        { action: 'unlock', label: 'Unlock', icon: ICONS.lock, number },
      ])
      panelFooter = `<button type="button" class="btn-start" data-action="start" data-number="${escapeHtml(number)}">${ICONS.play} Start ride</button>`
    } else if ((status === 'riding' || status === 'paused') && session) {
      sheetId = 'scooter-active'
      const walletHint = session.wallet_minutes_remaining != null
        ? `${session.wallet_minutes_remaining} min on balance`
        : state.wallet.prepaid_minutes > 0 ? `${state.wallet.prepaid_minutes} min on balance` : null
      const timerVal = status === 'paused'
        ? (session.waiting_session_seconds ?? 0)
        : (session.riding_seconds ?? session.elapsed_seconds)
      panelCore = `
        <div class="status-banner status-banner--animated ${status === 'paused' ? 'status-banner--paused' : 'status-banner--ride'}">
          <span id="live-status-text">${status === 'paused' ? 'Waiting' : 'Riding'}${walletHint ? ` · ${walletHint}` : ''} · ${formatTimer(timerVal)}</span>
          <span class="status-banner__value" id="live-status-cost">${session.cost_rub > 0 ? formatCost(session.cost_rub) : '0₽'}</span>
        </div>
        ${scooterCardHtml(scooter.number, battery, rangeHours)}`
      panelExtra = actionBarHtml(status === 'paused'
        ? [
            { action: 'resume', label: 'Resume', icon: ICONS.play, number },
            { action: 'unlock', label: 'Unlock', icon: ICONS.lock, number },
            { action: 'beep', label: 'Beep', icon: ICONS.volume, number },
          ]
        : [
            { action: 'pause', label: 'Pause', icon: ICONS.pause, number },
            { action: 'unlock', label: 'Unlock', icon: ICONS.lock, number },
            { action: 'beep', label: 'Beep', icon: ICONS.volume, number },
          ])
      panelFooter = `<button type="button" class="btn-finish" data-action="confirm-finish" data-number="${escapeHtml(number)}">${ICONS.x} End ride</button>`
    }

    const hasSheetExtra = Boolean(panelExtra)

    const titles = {
      selected: { title: 'Ready to ride', sub: isPackage ? 'Buy minutes or switch to per-minute to reserve' : 'Choose a tariff and reserve' },
      reserved: { title: 'Reserved', sub: 'Free wait time is running' },
      riding: { title: 'Ride in progress' },
      paused: { title: 'Waiting' },
    }
    const t = titles[status] || { title: scooter.number }

    if (session?.status === 'finish_photo') {
      setTimeout(() => navigate(`finish-photo/${number}`), 0)
    }

    return {
      html: `
      <div class="app-shell app-shell--map">
        ${headerHtml()}
        <div class="map-layout ${isTall ? 'map-layout--tall' : ''}">
          <div class="map-layout__map">
            ${mapBackgroundHtml({
            scooters: mapScooters, highlightNumber: scooter.number, rentedNumbers,
            mode: 'focus', showUserDot: status === 'riding' || status === 'paused',
            userPosition: { lat_pct: scooter.lat_pct, lng_pct: scooter.lng_pct },
          })}
            ${floatingBackBtnHtml()}
          </div>
          <aside class="map-layout__panel">
            <div class="control-panel${panelFooter ? ' control-panel--with-footer' : ''}${hasSheetExtra ? '' : ''}"${hasSheetExtra ? ` data-bottom-sheet data-sheet-id="${sheetId}"` : ''}>
              <div class="control-panel__sheet-drag" data-sheet-handle tabindex="0" role="button" aria-label="Expand or collapse panel">
                <div class="control-panel__handle-hit">
                  <div class="control-panel__handle" aria-hidden="true"></div>
                </div>
                <div class="control-panel__head">
                  <div class="control-panel__head-text">
                    <h2 class="control-panel__title">${escapeHtml(t.title)}</h2>
                    ${t.sub ? `<p class="control-panel__subtitle">${escapeHtml(t.sub)}</p>` : ''}
                  </div>
                </div>
              </div>
              <div class="control-panel__content">
                ${rentalSwitcherHtml(state.sessions, number)}
                <div class="control-panel__sheet-core">
                  ${panelCore}
                </div>
                ${hasSheetExtra ? `<div class="control-panel__sheet-extra" data-sheet-extra>${panelExtra}</div>` : ''}
              </div>
              ${panelFooter && !isMobileLayout() ? `<div class="control-panel__footer">${panelFooter}</div>` : ''}
            </div>
          </aside>
        </div>
      </div>`,
      dockFooter: panelFooter,
    }
  }

  function renderScan() {
    return `
      <div class="app-shell app-shell--fullscreen">
        ${headerHtml()}
        <div class="qr-page">
          ${floatingBackBtnHtml({ variant: 'overlay' })}
          <div class="qr-body">
            <p class="qr-hint">${COPY.scanHint}</p>
            <p class="qr-zone">${ZONE.name} fleet · ${COPY.scanTip}</p>
            <div class="qr-viewport">
              <div id="qr-reader" class="qr-reader"></div>
              <div class="qr-frame" aria-hidden="true"></div>
            </div>
            <p id="qr-error" class="qr-error" hidden></p>
            <div class="qr-controls">
              <button type="button" class="qr-enter-btn qr-enter-btn--prominent" data-action="show-manual">Enter number manually</button>
              <button type="button" class="qr-round-btn" data-action="toggle-qr-torch" aria-label="Flashlight" aria-pressed="false">${ICONS.flashlight}</button>
            </div>
          </div>
        </div>
      </div>
      <div id="enter-overlay" class="enter-overlay" hidden>
        <form class="enter-modal" id="manual-form">
          <h3>Scooter number</h3>
          <p class="enter-modal__hint">Printed below the QR code on the handlebar</p>
          <input type="text" name="number" placeholder="HA538P" autocomplete="off" spellcheck="false" />
          <div class="enter-actions">
            <button type="button" data-action="hide-manual">Cancel</button>
            <button type="submit" class="primary">Find scooter</button>
          </div>
        </form>
      </div>`
  }

  function renderFinishPhoto(number) {
    const session = store.getSession(number)
    if (!session || session.status !== 'finish_photo') {
      setTimeout(() => navigate(''), 0)
      return renderHome()
    }
    return `
      <div class="app-shell app-shell--fullscreen">
        ${headerHtml()}
        <div class="finish-page">
          ${floatingBackBtnHtml({ variant: 'overlay' })}
          <div class="finish-body">
            <video id="finish-video" class="finish-video" playsinline muted autoplay></video>
            <div id="finish-flash" class="finish-flash" hidden aria-hidden="true"></div>
            <div class="finish-overlay">
              <p id="finish-message" class="finish-message">${COPY.finishHint} · ${escapeHtml(number)}</p>
              <div class="finish-actions">
                <button type="button" class="shutter-btn" data-action="complete-ride" data-number="${escapeHtml(number)}" aria-label="Take photo">
                  <span class="shutter-btn__inner"></span>
                </button>
                <button type="button" class="finish-skip-btn" id="finish-skip" data-action="complete-ride" data-number="${escapeHtml(number)}" hidden>Finish without photo (demo)</button>
              </div>
            </div>
          </div>
        </div>
      </div>`
  }

  function rideReceiptModalHtml(ride) {
    const totalMinutes = Math.max(1, Math.round((ride.riding_seconds + ride.waiting_total_seconds) / 60))
    const title = ride.fromHistory ? 'Ride receipt' : 'Ride complete'
    const dateLine = ride.completed_at
      ? `<p class="ride-receipt__date">${formatDateTime(ride.completed_at)}</p>`
      : ''
    return `
      <div class="ride-receipt-backdrop" data-action="close-receipt">
        <div class="ride-receipt" role="dialog">
          <div class="ride-receipt__icon">✓</div>
          <h2 class="ride-receipt__title">${title}</h2>
          <p class="ride-receipt__scooter">${escapeHtml(ride.scooter_number)}</p>
          ${dateLine}
          <dl class="ride-receipt__rows">
            <div><dt>Tariff</dt><dd>${tariffLabel(ride.tariff)}</dd></div>
            <div><dt>Riding</dt><dd>${formatTimer(ride.riding_seconds)}</dd></div>
            ${ride.waiting_total_seconds > 0 ? `<div><dt>Waiting</dt><dd>${formatTimer(ride.waiting_total_seconds)}</dd></div>` : ''}
            <div><dt>Total time</dt><dd>~${totalMinutes} min</dd></div>
            ${(ride.prepaid_minutes_used ?? 0) > 0 ? `<div><dt>From balance</dt><dd>${ride.prepaid_minutes_used} min</dd></div>` : ''}
            <div class="ride-receipt__total"><dt>Charged extra</dt><dd>${ride.cost_rub > 0 ? formatCost(ride.cost_rub) : '0₽'}</dd></div>
          </dl>
          <button type="button" class="ride-receipt__btn" data-action="close-receipt">Done</button>
        </div>
      </div>`
  }

  function purchaseReceiptModalHtml(purchase) {
    const title = purchase.fromHistory ? 'Purchase receipt' : 'Minutes purchased'
    const dateLine = purchase.completed_at
      ? `<p class="ride-receipt__date">${formatDateTime(purchase.completed_at)}</p>`
      : ''
    const balanceLabel = purchase.fromHistory ? 'Balance after purchase' : 'Your balance'
    return `
      <div class="ride-receipt-backdrop" data-action="close-purchase">
        <div class="ride-receipt ride-receipt--purchase" role="dialog">
          <div class="ride-receipt__icon ride-receipt__icon--purchase">+</div>
          <h2 class="ride-receipt__title">${title}</h2>
          <p class="ride-receipt__scooter">${tariffLabel(purchase.tariff)}</p>
          ${dateLine}
          <dl class="ride-receipt__rows">
            <div><dt>Added to balance</dt><dd>${purchase.minutes_added} min</dd></div>
            <div><dt>Paid</dt><dd>${formatCost(purchase.price_rub)}</dd></div>
            <div class="ride-receipt__total"><dt>${balanceLabel}</dt><dd>${purchase.prepaid_minutes} min</dd></div>
          </dl>
          <p class="ride-receipt__note">Minutes are spent during rides first. Per-minute billing starts only after your balance runs out.</p>
          <button type="button" class="ride-receipt__btn" data-action="close-purchase">Got it</button>
        </div>
      </div>`
  }

  function confirmModalHtml({ title, confirmLabel, action, number }) {
    return `
      <div class="confirm-overlay" role="dialog" aria-modal="true">
        <div class="confirm-backdrop" data-action="close-confirm"></div>
        <div class="confirm-modal">
          <h3>${escapeHtml(title)}</h3>
          <div class="confirm-actions">
            <button type="button" class="btn-secondary" data-action="close-confirm">Back</button>
            <button type="button" class="btn-primary" data-action="${action}" data-number="${escapeHtml(number)}">${escapeHtml(confirmLabel)}</button>
          </div>
        </div>
      </div>`
  }

  function stopAllVideoElements() {
    document.querySelectorAll('video').forEach((video) => {
      const stream = video.srcObject
      if (stream && typeof stream.getTracks === 'function') {
        stream.getTracks().forEach((track) => track.stop())
      }
      video.srcObject = null
      video.removeAttribute('src')
      video.load()
    })
  }

  async function cleanupPageResources() {
    state.qrInitToken += 1
    state.qrScanHandled = false
    state.qrTorchOn = false

    const scanner = state.qrScanner
    state.qrScanner = null
    if (scanner) {
      try {
        await scanner.stop()
      } catch {
        // scanner may already be stopped or DOM removed
      }
      try {
        scanner.clear()
      } catch {
        // ignore cleanup errors
      }
    }

    if (state.cameraStream) {
      state.cameraStream.getTracks().forEach((track) => track.stop())
      state.cameraStream = null
    }

    stopAllVideoElements()
  }

  async function initQrScanner() {
    const initToken = state.qrInitToken
    await new Promise((resolve) => setTimeout(resolve, 100))
    if (initToken !== state.qrInitToken) return
    if (parseRoute().page !== 'scan') return

    const errEl = document.getElementById('qr-error')
    const showError = (message) => {
      if (errEl) {
        errEl.textContent = message
        errEl.hidden = false
      }
    }

    if (typeof Html5Qrcode === 'undefined') {
      showError('QR library failed to load. Enter number manually.')
      return
    }

    if (!isCameraSupported()) {
      showError('Camera needs HTTPS or localhost. Use http://127.0.0.1:8000 on this device, or enter the number manually.')
      return
    }

    if (!document.getElementById('qr-reader')) return

    const scanner = new Html5Qrcode('qr-reader', { verbose: false })
    state.qrScanner = scanner
    state.qrScanHandled = false
    state.qrTorchOn = false

    const config = getQrScannerConfig()

    const onScan = async (decoded) => {
      if (state.qrScanHandled) return
      const num = parseScooterNumberFromQr(decoded)
      if (!num) return
      state.qrScanHandled = true
      await cleanupPageResources()
      openScooter(num)
    }

    try {
      if (initToken !== state.qrInitToken || parseRoute().page !== 'scan') {
        await cleanupPageResources()
        return
      }

      const candidates = await buildQrCameraCandidates(() => Html5Qrcode.getCameras())
      if (initToken !== state.qrInitToken || parseRoute().page !== 'scan') {
        await cleanupPageResources()
        return
      }

      let started = false
      let lastError = null
      for (const camera of candidates) {
        try {
          await scanner.start(camera, config, onScan, () => {})
          started = true
          break
        } catch (e) {
          lastError = e
        }
      }

      if (!started) {
        throw lastError || new Error('Could not start camera')
      }
    } catch (e) {
      if (initToken !== state.qrInitToken) return
      state.qrScanner = null
      showError(cameraErrorMessage(e))
      stopAllVideoElements()
    }
  }

  async function toggleQrTorch() {
    const scanner = state.qrScanner
    if (!scanner) return

    try {
      const caps = scanner.getRunningTrackCameraCapabilities()
      if (!caps || !caps.torch) {
        showToast('Flash not available on this device')
        return
      }

      state.qrTorchOn = !state.qrTorchOn
      await scanner.applyVideoConstraints({
        advanced: [{ torch: state.qrTorchOn }],
      })

      const btn = document.querySelector('[data-action="toggle-qr-torch"]')
      if (btn) {
        btn.classList.toggle('qr-round-btn--active', state.qrTorchOn)
        btn.setAttribute('aria-pressed', state.qrTorchOn ? 'true' : 'false')
      }
    } catch {
      showToast('Could not toggle flash')
    }
  }

  async function initFinishCamera() {
    const video = document.getElementById('finish-video')
    const msg = document.getElementById('finish-message')
    const skip = document.getElementById('finish-skip')
    if (!video) return

    if (!isCameraSupported()) {
      if (msg) msg.textContent = 'Camera unavailable in browser — finish the ride in demo mode'
      if (skip) skip.hidden = false
      return
    }

    try {
      const stream = await getCameraStream()
      if (parseRoute().page !== 'finish-photo') {
        stream.getTracks().forEach((track) => track.stop())
        return
      }
      state.cameraStream = stream
      video.srcObject = stream
      await video.play().catch(() => {})
      video.classList.add('finish-video--live')
    } catch (e) {
      if (msg) msg.textContent = `${cameraErrorMessage(e)} — you can still finish the ride in demo mode`
      if (skip) skip.hidden = false
    }
  }

  function renderOverlays() {
    const el = document.getElementById('overlays')
    if (!el) return
    let html = ''
    if (state.completedRide) html += rideReceiptModalHtml(state.completedRide)
    if (state.purchaseReceipt) html += purchaseReceiptModalHtml(state.purchaseReceipt)
    if (state.confirmModal) html += confirmModalHtml(state.confirmModal)
    el.innerHTML = html
  }

  function updateLiveUI() {
    refreshState()
    const { page, param } = parseRoute()

    document.querySelectorAll('[data-live="wallet-value"]').forEach((el) => {
      el.textContent = `${state.wallet.prepaid_minutes} min`
    })

    const rentalsRoot = document.getElementById('live-rentals')
    if (rentalsRoot) {
      const active = state.sessions.filter((s) => isRented(s.status) || s.status === 'finish_photo')
      const totalEl = rentalsRoot.querySelector('[data-live="rentals-total"]')
      if (totalEl) {
        const totalCost = active.reduce((sum, s) => sum + s.cost_rub, 0)
        totalEl.textContent = totalCost > 0 ? `${formatCost(totalCost)} total` : ''
        totalEl.hidden = totalCost <= 0
      }
      active.forEach((session) => {
        const detailEl = rentalsRoot.querySelector(`[data-live="session-detail"][data-session="${session.scooter_number}"]`)
        if (detailEl) detailEl.textContent = sessionDetailText(session)
      })
    }

    if (page === 'scooter' && param) {
      const session = state.sessions.find((s) => s.scooter_number === param.toUpperCase())
      if (session?.status === 'finish_photo') {
        navigate(`finish-photo/${param}`)
        return
      }
      if (!session) return

      const freeWait = document.getElementById('live-free-wait')
      if (freeWait && session.status === 'reserved') {
        freeWait.textContent = formatFreeWait(session.free_wait_remaining_seconds ?? 0)
      }

      const statusText = document.getElementById('live-status-text')
      const statusCost = document.getElementById('live-status-cost')
      if (statusText && statusCost && (session.status === 'riding' || session.status === 'paused')) {
        statusText.textContent = statusBannerText(session)
        statusCost.textContent = session.cost_rub > 0 ? formatCost(session.cost_rub) : '0₽'
      }

      document.querySelectorAll('[data-live="rental-meta"]').forEach((el) => {
        const num = el.dataset.session
        const s = state.sessions.find((x) => x.scooter_number === num)
        if (!s) return
        const short = { selected: 'Selected', reserved: 'Reserved', riding: 'Riding', paused: 'Paused', finish_photo: 'Photo' }
        const timer = s.status === 'riding'
          ? formatTimer(s.riding_seconds ?? s.elapsed_seconds)
          : s.status === 'paused' ? formatTimer(s.waiting_session_seconds ?? 0) : null
        el.textContent = `${short[s.status]}${timer ? ` · ${timer}` : ''}${s.cost_rub > 0 ? ` · ${formatCost(s.cost_rub)}` : ''}`
      })
    }
  }

  function positionDock() {
    const dock = document.getElementById('dock')
    const vv = window.visualViewport
    if (!dock || dock.hidden || !vv || !isMobileLayout()) return

    const top = Math.round(vv.offsetTop + vv.height - dock.offsetHeight)
    dock.style.top = `${top}px`
    dock.style.bottom = 'auto'
  }

  function resetViewportLayout() {
    const root = document.documentElement
    const app = document.getElementById('app')
    const dock = document.getElementById('dock')

    root.style.removeProperty('--vv-offset-top')
    root.style.removeProperty('--app-height')
    root.style.removeProperty('--vv-bottom-inset')

    if (app) {
      app.style.position = ''
      app.style.top = ''
      app.style.left = ''
      app.style.right = ''
      app.style.height = ''
      app.style.overflow = ''
      app.style.zIndex = ''
    }
    if (dock) {
      dock.style.top = ''
      dock.style.bottom = ''
    }
  }

  function syncViewportInsets() {
    const root = document.documentElement
    const app = document.getElementById('app')
    const dock = document.getElementById('dock')
    const vv = window.visualViewport

    if (!isMobileLayout() || !vv) {
      resetViewportLayout()
      return
    }

    const top = Math.round(vv.offsetTop)
    const height = Math.round(vv.height)
    const bottomInset = Math.max(0, Math.round(window.innerHeight - height - top))
    const useMapShell = Boolean(document.querySelector('.app-shell--map'))

    root.style.setProperty('--vv-offset-top', `${top}px`)
    root.style.setProperty('--app-height', `${height}px`)
    root.style.setProperty('--vv-bottom-inset', `${bottomInset}px`)

    if (useMapShell && app) {
      app.style.position = 'fixed'
      app.style.top = `${top}px`
      app.style.left = '0'
      app.style.right = '0'
      app.style.height = `${height}px`
      app.style.overflow = 'hidden'
      app.style.zIndex = '1'
    } else if (app) {
      app.style.position = ''
      app.style.top = ''
      app.style.left = ''
      app.style.right = ''
      app.style.height = ''
      app.style.overflow = ''
      app.style.zIndex = ''
    }

    if (dock && !dock.hidden) {
      positionDock()
      root.style.setProperty('--panel-footer-height', `${dock.offsetHeight}px`)
    }
  }

  function renderDock(footerHtml) {
    const dock = document.getElementById('dock')
    if (!dock) return

    const show = Boolean(footerHtml && isMobileLayout())
    document.body.classList.toggle('has-panel-dock', show)

    if (!show) {
      dock.hidden = true
      dock.innerHTML = ''
      return
    }

    dock.hidden = false
    dock.innerHTML = `<div class="control-panel__footer">${footerHtml}</div>`
    requestAnimationFrame(() => {
      syncViewportInsets()
      requestAnimationFrame(syncViewportInsets)
    })
  }

  function initViewportSync() {
    syncViewportInsets()
    window.visualViewport?.addEventListener('resize', syncViewportInsets)
    window.visualViewport?.addEventListener('scroll', syncViewportInsets)
    window.addEventListener('resize', () => {
    syncViewportInsets()
    if (isMobileLayout() && window.sheet) {
      window.sheet.initBottomSheetsDeferred()
    }
  })
    window.addEventListener('orientationchange', () => setTimeout(syncViewportInsets, 200))
  }

  async function render() {
    const epoch = state.renderEpoch + 1
    state.renderEpoch = epoch

    await cleanupPageResources()
    if (epoch !== state.renderEpoch) return

    refreshState()
    const { page, param } = parseRoute()
    const root = document.getElementById('app')
    let html = ''
    let dockFooter = ''

    if (page === 'scooter' && param) {
      const scooterPage = renderScooter(param)
      html = scooterPage.html
      dockFooter = scooterPage.dockFooter
    } else if (page === 'scan') html = renderScan()
    else if (page === 'finish-photo' && param) html = renderFinishPhoto(param)
    else if (page === 'profile') html = renderProfile()
    else if (!html) html = renderHome()

    if (epoch !== state.renderEpoch) return

    root.innerHTML = html
    renderDock(dockFooter)
    renderOverlays()
    requestAnimationFrame(syncViewportInsets)

    if (page === 'scan') void initQrScanner()
    if (page === 'finish-photo' && param) void initFinishCamera()
    if (page === 'home' || page === 'scooter') {
      if (window.sheet) window.sheet.initBottomSheetsDeferred()
    }

    if (state.pendingRideFeedback) {
      const kind = state.pendingRideFeedback
      state.pendingRideFeedback = null
      rideActionFeedback(kind)
    }
  }

  function openScooter(number) {
    try {
      apiCall(() => store.selectScooter(number))
      refreshState()
      navigate(`scooter/${number.toUpperCase()}`)
    } catch (e) {
      showToast(e.message)
    }
  }

  function continueSession(number) {
    const session = state.sessions.find((s) => s.scooter_number === number.toUpperCase())
    if (session?.status === 'finish_photo') navigate(`finish-photo/${number}`)
    else navigate(`scooter/${number}`)
  }

  function hideProfileEdit() {
    const form = document.getElementById('profile-edit-form')
    if (form) closeAvatarCrop(form, { restorePrevious: true })
    detachAvatarCropSession()
    const overlay = document.getElementById('profile-edit-overlay')
    if (overlay) overlay.hidden = true
  }

  function hideManualEntry() {
    const overlay = document.getElementById('enter-overlay')
    if (overlay) overlay.hidden = true
  }

  document.addEventListener('click', (e) => {
    const overlay = document.getElementById('enter-overlay')
    if (overlay && !overlay.hidden && e.target === overlay) {
      hideManualEntry()
      return
    }

    const profileOverlay = document.getElementById('profile-edit-overlay')
    if (profileOverlay && !profileOverlay.hidden && e.target.classList.contains('profile-edit-backdrop')) {
      hideProfileEdit()
      return
    }

    const btn = e.target.closest('[data-action]')
    if (!btn) return
    const action = btn.dataset.action
    const number = btn.dataset.number

    if (action === 'navigate') {
      navigate(btn.dataset.path)
      return
    }
    if (action === 'back') {
      navigate(btn.dataset.back || '')
      return
    }
    if (action === 'open-scooter') {
      openScooter(btn.dataset.number)
      return
    }
    if (action === 'continue-session') {
      continueSession(btn.dataset.number)
      return
    }
    if (action === 'reset-demo') {
      store.reset()
      refreshState()
      state.completedRide = null
      state.purchaseReceipt = null
      state.scooterTariff = {}
      showToast('Demo reset')
      render()
      return
    }
    if (action === 'open-history-receipt') {
      openHistoryReceipt(btn.dataset.historyId)
      return
    }
    if (action === 'select-tariff') {
      const { page, param } = parseRoute()
      if (page === 'scooter' && param) state.scooterTariff[param.toUpperCase()] = btn.dataset.tariff
      void render().then(() => {
        if (window.sheet) window.sheet.initBottomSheetsDeferred()
      })
      return
    }
    if (action === 'reserve') {
      try {
        apiCall(() => store.reserve(number, 'per_minute'))
        refreshState()
        render()
      } catch (err) { showToast(err.message) }
      return
    }
    if (action === 'purchase') {
      try {
        const receipt = apiCall(() => store.purchasePackage(btn.dataset.tariff))
        state.purchaseReceipt = receipt
        state.scooterTariff[number.toUpperCase()] = 'per_minute'
        refreshState()
        render()
      } catch (err) { showToast(err.message) }
      return
    }
    if (action === 'start') {
      try {
        apiCall(() => store.start(number))
        refreshState()
        void render().then(() => rideActionFeedback('start'))
      } catch (err) { showToast(err.message) }
      return
    }
    if (action === 'pause') {
      try {
        apiCall(() => store.pause(number))
        refreshState()
        void render().then(() => rideActionFeedback('pause'))
      } catch (err) { showToast(err.message) }
      return
    }
    if (action === 'resume') {
      try {
        apiCall(() => store.resume(number))
        refreshState()
        void render().then(() => rideActionFeedback('resume'))
      } catch (err) { showToast(err.message) }
      return
    }
    if (action === 'unlock') {
      try {
        apiCall(() => store.unlock(number))
        rideActionFeedback('unlock')
        showToast('Scooter unlocked')
      } catch (err) { showToast(err.message) }
      return
    }
    if (action === 'beep') {
      try { apiCall(() => store.beep(number)); playBeep(); showToast('Signal sent to scooter') }
      catch (err) { showToast(err.message) }
      return
    }
    if (action === 'stub') {
      showToast(COPY.stubFeature)
      return
    }
    if (action === 'confirm-finish') {
      state.confirmModal = { title: 'Finish ride?', confirmLabel: 'Yes, finish', action: 'finish', number }
      renderOverlays()
      return
    }
    if (action === 'confirm-cancel') {
      state.confirmModal = { title: 'Cancel ride?', confirmLabel: 'Yes, cancel', action: 'cancel', number }
      renderOverlays()
      return
    }
    if (action === 'finish') {
      state.confirmModal = null
      try {
        apiCall(() => store.finish(number))
        state.pendingRideFeedback = 'finish'
        navigate(`finish-photo/${number}`)
      } catch (err) { showToast(err.message); render() }
      return
    }
    if (action === 'cancel') {
      state.confirmModal = null
      try { apiCall(() => store.cancel(number)); navigate('') }
      catch (err) { showToast(err.message); render() }
      return
    }
    if (action === 'close-confirm') {
      state.confirmModal = null
      renderOverlays()
      return
    }
    if (action === 'close-receipt') {
      if (btn.classList.contains('ride-receipt-backdrop') && e.target !== btn) return
      state.completedRide = null
      renderOverlays()
      return
    }
    if (action === 'close-purchase') {
      if (btn.classList.contains('ride-receipt-backdrop') && e.target !== btn) return
      state.purchaseReceipt = null
      renderOverlays()
      return
    }
    if (action === 'complete-ride') {
      const shutter = btn.closest('.finish-actions')?.querySelector('.shutter-btn')
      if (shutter) shutter.classList.add('shutter-btn--busy')
      const flash = document.getElementById('finish-flash')
      if (flash) { flash.hidden = false; setTimeout(() => { flash.hidden = true }, 180) }
      try {
        const result = apiCall(() => store.complete(number))
        state.completedRide = result
        state.pendingRideFeedback = 'finish'
        navigate('')
      } catch (err) {
        showToast(err.message)
        if (shutter) shutter.classList.remove('shutter-btn--busy')
      }
      return
    }
    if (action === 'show-manual') {
      const overlay = document.getElementById('enter-overlay')
      if (overlay) { overlay.hidden = false; overlay.querySelector('input')?.focus() }
      return
    }
    if (action === 'toggle-qr-torch') {
      void toggleQrTorch()
      return
    }
    if (action === 'apply-avatar-crop') {
      const form = document.getElementById('profile-edit-form')
      if (form) applyAvatarCrop(form)
      return
    }
    if (action === 'cancel-avatar-crop') {
      const form = document.getElementById('profile-edit-form')
      if (form) closeAvatarCrop(form, { restorePrevious: true })
      const fileInput = form?.querySelector('#profile-avatar-input')
      if (fileInput) fileInput.value = ''
      return
    }
    if (action === 'pick-avatar-color') {
      const form = document.getElementById('profile-edit-form')
      if (!form) return
      form.avatar_color.value = btn.dataset.color || 'yellow'
      updateProfileAvatarPreview(form)
      return
    }
    if (action === 'remove-avatar-photo') {
      const form = document.getElementById('profile-edit-form')
      if (!form) return
      form.avatar_url.value = ''
      const input = form.querySelector('#profile-avatar-input')
      if (input) input.value = ''
      updateProfileAvatarPreview(form)
      return
    }
    if (action === 'open-profile-edit') {
      const overlay = document.getElementById('profile-edit-overlay')
      const form = document.getElementById('profile-edit-form')
      if (overlay && form) {
        closeAvatarCrop(form, { restorePrevious: true })
        const current = store.getProfile()
        form.name.value = current.name
        form.city.value = current.city
        form.avatar_color.value = current.avatar_color
        form.avatar_url.value = current.avatar_url || ''
        const fileInput = form.querySelector('#profile-avatar-input')
        if (fileInput) fileInput.value = ''
        updateProfileAvatarPreview(form)
        overlay.hidden = false
        form.name.focus()
      }
      return
    }
    if (action === 'hide-profile-edit') {
      hideProfileEdit()
      return
    }
    if (action === 'hide-manual') {
      hideManualEntry()
      return
    }
  })

  document.getElementById('app').addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' && e.key !== ' ') return
    const item = e.target.closest('[data-action="open-history-receipt"]')
    if (!item) return
    e.preventDefault()
    openHistoryReceipt(item.dataset.historyId)
  })

  document.getElementById('app').addEventListener('change', (e) => {
    if (e.target.id !== 'profile-avatar-input') return
    const form = document.getElementById('profile-edit-form')
    if (!form) return
    const file = e.target.files?.[0]
    if (!file) return
    readAvatarImageData(file)
      .then((dataUrl) => openAvatarCrop(form, dataUrl))
      .catch((err) => showToast(err.message))
  })

  document.getElementById('app').addEventListener('input', (e) => {
    if (e.target.form?.id !== 'profile-edit-form' || e.target.name !== 'name') return
    updateProfileAvatarPreview(e.target.form)
  })

  document.getElementById('app').addEventListener('submit', (e) => {
    if (e.target.id === 'profile-edit-form') {
      e.preventDefault()
      const form = e.target
      if (avatarCropSession && avatarCropSession.form === form) {
        applyAvatarCrop(form)
      }
      try {
        apiCall(() => store.updateProfile({
          name: form.name.value,
          city: form.city.value,
          avatar_color: form.avatar_color.value,
          avatar_url: form.avatar_url.value,
        }))
        hideProfileEdit()
        showToast('Profile updated')
        render()
      } catch (err) {
        showToast(err.message)
      }
      return
    }
    if (e.target.id !== 'manual-form') return
    e.preventDefault()
    const input = e.target.querySelector('input[name="number"]')
    const num = parseScooterNumberFromQr(input.value) || input.value.trim().toUpperCase()
    if (num) openScooter(num)
    else {
      const errEl = document.getElementById('qr-error')
      if (errEl) { errEl.textContent = 'Enter a valid number, e.g. HA538P'; errEl.hidden = false }
    }
  })

  window.addEventListener('hashchange', () => { void render() })
  window.addEventListener('pagehide', () => { void cleanupPageResources() })

  function startTick() {
    if (state.tickTimer) clearInterval(state.tickTimer)
    state.tickTimer = setInterval(() => {
      const { page } = parseRoute()
      if (page === 'home' || page === 'scooter') {
        updateLiveUI()
      }
    }, 1000)
  }

  render()
  initViewportSync()
  startTick()
})()
