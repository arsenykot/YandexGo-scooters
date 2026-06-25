/** Vanilla JS SPA — hash router + UI */
;(function () {
  'use strict'

  const {
    ZONE, COPY, formatTimer, formatFreeWait, formatCost, formatDate, formatDateTime, tariffLabel,
    parseScooterNumberFromQr, walkMinutesFromCenter, batteryTone,
    isRented, isPackageTariff, playBeep, escapeHtml, cameraErrorMessage,
    getCameraStream, pickBackCameraId,
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
    qrScanner: null,
    cameraStream: null,
    tickTimer: null,
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

  function headerHtml({ showBack, showScan, showProfile, service, dark, backPath }) {
    const backAttr = backPath ? `data-back="${escapeHtml(backPath)}"` : ''
    const rightButtons = []
    if (showProfile) {
      rightButtons.push(`<button type="button" class="app-header__profile" data-action="navigate" data-path="profile" aria-label="Profile">${ICONS.user}</button>`)
    }
    if (showScan) {
      rightButtons.push(`<button type="button" class="app-header__scan" data-action="navigate" data-path="scan">${ICONS.scanSmall}<span>Scan</span></button>`)
    }
    return `
      <header class="app-header ${dark ? 'app-header--dark' : ''}">
        <div class="app-header__left">
          ${showBack ? `<button type="button" class="app-header__back" data-action="back" ${backAttr} aria-label="Back">${ICONS.chevronLeft}</button>` : ''}
          <div class="app-header__brand">
            <img src="${LOGO}" alt="Yandex Go" class="app-header__logo-img" />
            ${service ? `<span class="app-header__service">${escapeHtml(service)}</span>` : ''}
          </div>
        </div>
        ${rightButtons.length ? `<div class="app-header__right">${rightButtons.join('')}</div>` : ''}
      </header>`
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
        ${headerHtml({ showScan: true, showProfile: true, service: 'Scooters' })}
        <div class="map-layout">
          <div class="map-layout__map">${mapBackgroundHtml({ scooters, mode: 'fleet' })}</div>
          <aside class="map-layout__panel">
            <div class="control-panel">
              <div class="control-panel__handle" aria-hidden="true"></div>
              <div class="control-panel__head">
                <div class="control-panel__head-text">
                  <h2 class="control-panel__title">${ZONE.label}</h2>
                  <p class="control-panel__subtitle">${COPY.demoNote}</p>
                </div>
                <button type="button" class="demo-reset-btn" data-action="reset-demo">Reset demo</button>
              </div>
              <div class="control-panel__content">
                ${walletBannerHtml(state.wallet.prepaid_minutes)}
                ${activeRentalsHtml(state.sessions)}
                <button type="button" class="scan-hero" data-action="navigate" data-path="scan">
                  <span class="scan-hero__icon">${ICONS.scan}</span>
                  <span class="scan-hero__text">
                    <span class="scan-hero__title">Scan to ride</span>
                    <span class="scan-hero__sub">QR on handlebars or enter number</span>
                  </span>
                </button>
                ${nearbyListHtml(scooters)}
              </div>
            </div>
          </aside>
        </div>
      </div>`
  }

  function historyEntryHtml(entry) {
    if (entry.type === 'purchase') {
      return `
        <li class="history-item history-item--purchase">
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
      <li class="history-item history-item--ride">
        <span class="history-item__icon"><img src="${SCOOTER_ICON}" alt="" /></span>
        <div class="history-item__body">
          <span class="history-item__title">${escapeHtml(entry.scooter_number)}</span>
          <span class="history-item__meta">${totalMin} min · ${tariffLabel(entry.tariff)}${balanceNote} · ${formatDateTime(entry.completed_at)}</span>
        </div>
        <span class="history-item__amount">${costLabel}</span>
      </li>`
  }

  function renderProfile() {
    const history = store.getHistory()
    const stats = store.getHistoryStats()
    const wallet = store.getWallet()
    const historyItems = history.length
      ? history.map(historyEntryHtml).join('')
      : '<li class="history-empty">No rides yet. Scan a scooter to start.</li>'

    return `
      <div class="app-shell app-shell--page">
        ${headerHtml({ showBack: true, service: 'Profile' })}
        <main class="profile-page">
          <div class="profile-user">
            <div class="profile-user__avatar">${ICONS.user}</div>
            <div class="profile-user__info">
              <h1 class="profile-user__name">Demo rider</h1>
              <p class="profile-user__sub">${ZONE.name}</p>
            </div>
          </div>

          <div class="profile-stats">
            <div class="profile-stat profile-stat--highlight">
              <span class="profile-stat__value">${formatCost(stats.totalSpent)}</span>
              <span class="profile-stat__label">Total spent</span>
            </div>
            <div class="profile-stat">
              <span class="profile-stat__value">${stats.rideCount}</span>
              <span class="profile-stat__label">Rides</span>
            </div>
            <div class="profile-stat">
              <span class="profile-stat__value">${stats.totalRideMinutes}</span>
              <span class="profile-stat__label">Minutes ridden</span>
            </div>
            <div class="profile-stat">
              <span class="profile-stat__value">${wallet.prepaid_minutes}</span>
              <span class="profile-stat__label">Balance (min)</span>
            </div>
          </div>

          <section class="profile-history">
            <h2 class="profile-history__title">Rental history</h2>
            <ul class="history-list">${historyItems}</ul>
          </section>
        </main>
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

    let panelBody = ''
    if (status === 'selected') {
      panelBody = `
        ${walletBannerHtml(state.wallet.prepaid_minutes)}
        ${scooterCardHtml(scooter.number, battery, rangeHours, walkMin)}
        <div class="section-label">Tariff</div>
        ${tariffSelectorHtml(scooter.tariffs, tariff)}
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
      panelBody = `
        ${walletBannerHtml(state.wallet.prepaid_minutes)}
        <div class="status-banner status-banner--wait">
          <span>Free wait</span><span class="status-banner__value" id="live-free-wait">${formatFreeWait(session.free_wait_remaining_seconds ?? 0)}</span>
        </div>
        ${scooterCardHtml(scooter.number, battery, rangeHours)}
        ${actionBarHtml([
          { action: 'confirm-cancel', label: 'Cancel', icon: ICONS.xCircle, number },
          { action: 'beep', label: 'Beep', icon: ICONS.volume, number },
          { action: 'stub', label: 'Unlock', icon: ICONS.lock, number },
        ])}
        <button type="button" class="btn-start" data-action="start" data-number="${escapeHtml(number)}">${ICONS.play} Start ride</button>`
    } else if ((status === 'riding' || status === 'paused') && session) {
      const walletHint = session.wallet_minutes_remaining != null
        ? `${session.wallet_minutes_remaining} min on balance`
        : state.wallet.prepaid_minutes > 0 ? `${state.wallet.prepaid_minutes} min on balance` : null
      const timerVal = status === 'paused'
        ? (session.waiting_session_seconds ?? 0)
        : (session.riding_seconds ?? session.elapsed_seconds)
      panelBody = `
        <div class="status-banner status-banner--animated ${status === 'paused' ? 'status-banner--paused' : 'status-banner--ride'}">
          <span id="live-status-text">${status === 'paused' ? 'Waiting' : 'Riding'}${walletHint ? ` · ${walletHint}` : ''} · ${formatTimer(timerVal)}</span>
          <span class="status-banner__value" id="live-status-cost">${session.cost_rub > 0 ? formatCost(session.cost_rub) : '0₽'}</span>
        </div>
        ${scooterCardHtml(scooter.number, battery, rangeHours)}
        ${actionBarHtml(status === 'paused'
          ? [
              { action: 'resume', label: 'Resume', icon: ICONS.play, number },
              { action: 'stub', label: 'Unlock', icon: ICONS.lock, number },
              { action: 'beep', label: 'Beep', icon: ICONS.volume, number },
            ]
          : [
              { action: 'pause', label: 'Pause', icon: ICONS.pause, number },
              { action: 'stub', label: 'Unlock', icon: ICONS.lock, number },
              { action: 'beep', label: 'Beep', icon: ICONS.volume, number },
            ])}
        <button type="button" class="btn-finish" data-action="confirm-finish" data-number="${escapeHtml(number)}">${ICONS.x} End ride</button>`
    }

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

    return `
      <div class="app-shell app-shell--map">
        ${headerHtml({ showBack: true, service: 'Scooters' })}
        <div class="map-layout ${isTall ? 'map-layout--tall' : ''}">
          <div class="map-layout__map">${mapBackgroundHtml({
            scooters: mapScooters, highlightNumber: scooter.number, rentedNumbers,
            mode: 'focus', showUserDot: status === 'riding' || status === 'paused',
            userPosition: { lat_pct: scooter.lat_pct, lng_pct: scooter.lng_pct },
          })}</div>
          <aside class="map-layout__panel">
            <div class="control-panel">
              <div class="control-panel__handle" aria-hidden="true"></div>
              <div class="control-panel__head">
                <div class="control-panel__head-text">
                  <h2 class="control-panel__title">${escapeHtml(t.title)}</h2>
                  ${t.sub ? `<p class="control-panel__subtitle">${escapeHtml(t.sub)}</p>` : ''}
                </div>
              </div>
              <div class="control-panel__content">
                ${rentalSwitcherHtml(state.sessions, number)}
                ${panelBody}
              </div>
            </div>
          </aside>
        </div>
      </div>`
  }

  function renderScan() {
    return `
      <div class="app-shell app-shell--fullscreen">
        <div class="qr-page">
          ${headerHtml({ showBack: true, dark: true, service: 'Scan' })}
          <div class="qr-body">
            <p class="qr-hint">${COPY.scanHint}</p>
            <p class="qr-zone">${ZONE.name} fleet</p>
            <div class="qr-viewport">
              <div id="qr-reader" class="qr-reader"></div>
              <div class="qr-frame" aria-hidden="true"></div>
            </div>
            <p id="qr-error" class="qr-error" hidden></p>
            <div class="qr-controls">
              <button type="button" class="qr-enter-btn qr-enter-btn--prominent" data-action="show-manual">Enter number manually</button>
              <button type="button" class="qr-round-btn" aria-label="Flashlight">${ICONS.flashlight}</button>
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
        <div class="finish-page">
          ${headerHtml({ showBack: true, dark: true, service: 'End ride' })}
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
    return `
      <div class="ride-receipt-backdrop" data-action="close-receipt">
        <div class="ride-receipt" role="dialog">
          <div class="ride-receipt__icon">✓</div>
          <h2 class="ride-receipt__title">Ride complete</h2>
          <p class="ride-receipt__scooter">${escapeHtml(ride.scooter_number)}</p>
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
    return `
      <div class="ride-receipt-backdrop" data-action="close-purchase">
        <div class="ride-receipt ride-receipt--purchase" role="dialog">
          <div class="ride-receipt__icon ride-receipt__icon--purchase">+</div>
          <h2 class="ride-receipt__title">Minutes purchased</h2>
          <p class="ride-receipt__scooter">${tariffLabel(purchase.tariff)}</p>
          <dl class="ride-receipt__rows">
            <div><dt>Added to balance</dt><dd>${purchase.minutes_added} min</dd></div>
            <div><dt>Paid</dt><dd>${formatCost(purchase.price_rub)}</dd></div>
            <div class="ride-receipt__total"><dt>Your balance</dt><dd>${purchase.prepaid_minutes} min</dd></div>
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

  function cleanupPageResources() {
    if (state.qrScanner) {
      state.qrScanner.stop().then(() => state.qrScanner.clear()).catch(() => {})
      state.qrScanner = null
    }
    if (state.cameraStream) {
      state.cameraStream.getTracks().forEach((t) => t.stop())
      state.cameraStream = null
    }
  }

  async function initQrScanner() {
    if (typeof Html5Qrcode === 'undefined') {
      const errEl = document.getElementById('qr-error')
      if (errEl) {
        errEl.textContent = 'QR library failed to load. Enter number manually.'
        errEl.hidden = false
      }
      return
    }
    const scanner = new Html5Qrcode('qr-reader', { verbose: false })
    state.qrScanner = scanner
    const config = {
      fps: 10,
      qrbox: (w, h) => {
        const size = Math.min(w, h, 280) * 0.75
        return { width: size, height: size }
      },
      aspectRatio: 1,
    }
    const onScan = (decoded) => {
      const num = parseScooterNumberFromQr(decoded)
      if (!num) return
      scanner.stop().then(() => openScooter(num)).catch(() => openScooter(num))
    }
    try {
      const cameraId = await pickBackCameraId(() => Html5Qrcode.getCameras())
      if (cameraId) await scanner.start(cameraId, config, onScan, () => {})
      else await scanner.start({ facingMode: 'environment' }, config, onScan, () => {})
    } catch (e) {
      const errEl = document.getElementById('qr-error')
      if (errEl) {
        errEl.textContent = cameraErrorMessage(e)
        errEl.hidden = false
      }
    }
  }

  async function initFinishCamera() {
    const video = document.getElementById('finish-video')
    const msg = document.getElementById('finish-message')
    const skip = document.getElementById('finish-skip')
    if (!video) return
    try {
      const stream = await getCameraStream()
      state.cameraStream = stream
      video.srcObject = stream
      video.classList.add('finish-video--live')
    } catch (e) {
      if (msg) msg.textContent = 'Camera unavailable — you can still finish the ride in demo mode'
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

  function render() {
    cleanupPageResources()
    refreshState()
    const { page, param } = parseRoute()
    const root = document.getElementById('app')
    let html = ''

    if (page === 'scooter' && param) html = renderScooter(param)
    else if (page === 'scan') html = renderScan()
    else if (page === 'finish-photo' && param) html = renderFinishPhoto(param)
    else if (page === 'profile') html = renderProfile()
    else if (!html) html = renderHome()

    root.innerHTML = html
    renderOverlays()

    if (page === 'scan') initQrScanner()
    if (page === 'finish-photo' && param) initFinishCamera()
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

  document.addEventListener('click', (e) => {
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
      showToast('Demo reset')
      render()
      return
    }
    if (action === 'select-tariff') {
      const { page, param } = parseRoute()
      if (page === 'scooter' && param) state.scooterTariff[param.toUpperCase()] = btn.dataset.tariff
      render()
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
      try { apiCall(() => store.start(number)); refreshState(); render() }
      catch (err) { showToast(err.message) }
      return
    }
    if (action === 'pause') {
      try { apiCall(() => store.pause(number)); refreshState(); render() }
      catch (err) { showToast(err.message) }
      return
    }
    if (action === 'resume') {
      try { apiCall(() => store.resume(number)); refreshState(); render() }
      catch (err) { showToast(err.message) }
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
      try { apiCall(() => store.finish(number)); navigate(`finish-photo/${number}`) }
      catch (err) { showToast(err.message); render() }
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
    if (action === 'hide-manual') {
      const overlay = document.getElementById('enter-overlay')
      if (overlay) overlay.hidden = true
    }
  })

  document.getElementById('app').addEventListener('submit', (e) => {
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

  window.addEventListener('hashchange', render)

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
  startTick()
})()
