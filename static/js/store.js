/** In-memory demo store — port of backend/store.py */
;(function (global) {
  'use strict'

  const PER_MINUTE_RATE = 8.99
  const FREE_WAIT_SECONDS = 600

  const PACKAGE_TARIFFS = {
    package_30: [30, 215.0],
    package_50: [50, 350.0],
    package_100: [100, 650.0],
    package_300: [300, 1800.0],
  }

  const RENTED_STATUSES = new Set(['reserved', 'riding', 'paused', 'finish_photo'])
  const BILLED_STATUSES = new Set(['riding', 'paused', 'finish_photo'])

  const TARIFFS = [
    { id: 'per_minute', label: 'Go anywhere', subtitle: '₽8.99/min', price: '₽8.99/min' },
    { id: 'package_30', label: '30 min', subtitle: 'valid 1 day', price: '₽215', original_price: '₽270' },
    { id: 'package_50', label: '50 min', subtitle: 'valid 1 day', price: '₽350', original_price: '₽450' },
    { id: 'package_100', label: '100 min', subtitle: 'valid 1 day', price: '₽650', original_price: '₽900' },
    { id: 'package_300', label: '300 min', subtitle: 'valid 1 day', price: '₽1800', original_price: '₽2700' },
  ]

  const HISTORY_KEY = 'yandexgo_scooter_history'

  function loadHistory() {
    try {
      const raw = localStorage.getItem(HISTORY_KEY)
      return raw ? JSON.parse(raw) : []
    } catch {
      return []
    }
  }

  function saveHistory(entries) {
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(entries))
    } catch {
      // storage unavailable
    }
  }

  function seedScooters() {
    const items = [
      { id: 's1', number: 'HA538P', battery: 98, lat_pct: 52.0, lng_pct: 48.0, range_hours: 4.0, available: true },
      { id: 's2', number: 'HA539B', battery: 85, lat_pct: 38.0, lng_pct: 55.0, range_hours: 3.5, available: true },
      { id: 's3', number: 'HA541K', battery: 72, lat_pct: 65.0, lng_pct: 42.0, range_hours: 3.0, available: true },
      { id: 's4', number: 'HA544M', battery: 91, lat_pct: 45.0, lng_pct: 62.0, range_hours: 3.8, available: true },
      { id: 's5', number: 'HA547R', battery: 64, lat_pct: 58.0, lng_pct: 35.0, range_hours: 2.5, available: true },
    ]
    const map = {}
    for (const s of items) map[s.number.toUpperCase()] = { ...s }
    return map
  }

  class StoreError extends Error {
    constructor(status, message) {
      super(message)
      this.status = status
    }
  }

  class InMemoryStore {
    constructor() {
      this.scooters = seedScooters()
      this.sessions = {}
      this.prepaid_seconds = 0
      this.history = loadHistory()
    }

    getWallet() {
      const now = new Date()
      const remaining = this._walletSecondsRemaining(now)
      return { prepaid_seconds: remaining, prepaid_minutes: Math.floor(remaining / 60) }
    }

    purchasePackage(tariff) {
      if (tariff === 'per_minute') throw new StoreError(400, 'Only minute packages can be purchased')
      if (!PACKAGE_TARIFFS[tariff]) throw new StoreError(400, 'Unknown package')
      const [minutes, price] = PACKAGE_TARIFFS[tariff]
      const addedSeconds = minutes * 60
      this.prepaid_seconds += addedSeconds
      const result = {
        tariff,
        minutes_added: minutes,
        price_rub: price,
        prepaid_seconds: this.prepaid_seconds,
        prepaid_minutes: Math.floor(this.prepaid_seconds / 60),
      }
      this._addHistoryEntry({
        type: 'purchase',
        completed_at: new Date().toISOString(),
        tariff,
        minutes_added: minutes,
        price_rub: price,
      })
      return result
    }

    _rentedIds() {
      const ids = new Set()
      for (const [sid, sess] of Object.entries(this.sessions)) {
        if (RENTED_STATUSES.has(sess.status)) ids.add(sid)
      }
      return ids
    }

    listScooters() {
      const rented = this._rentedIds()
      return Object.values(this.scooters)
        .filter((s) => !rented.has(s.id) && s.available)
        .map((s) => this._toSummary(s))
    }

    listRentedScooters() {
      const result = []
      for (const [scooterId, sess] of Object.entries(this.sessions)) {
        if (!RENTED_STATUSES.has(sess.status)) continue
        const scooter = this._getScooterById(scooterId)
        result.push(this._toSummary(scooter, false))
      }
      return result
    }

    getScooter(number) {
      const scooter = this._getScooter(number)
      const rented = this._rentedIds().has(scooter.id)
      return {
        id: scooter.id,
        number: scooter.number,
        battery: scooter.battery,
        lat_pct: scooter.lat_pct,
        lng_pct: scooter.lng_pct,
        available: scooter.available && !rented,
        range_hours: scooter.range_hours,
        tariffs: TARIFFS,
      }
    }

    listSessions() {
      return Object.values(this.sessions).map((s) => this._buildSessionResponse(s))
    }

    getSession(number) {
      const scooter = this._getScooter(number)
      const sess = this.sessions[scooter.id]
      if (!sess) return null
      return this._buildSessionResponse(sess)
    }

    reset() {
      this.scooters = seedScooters()
      this.sessions = {}
      this.prepaid_seconds = 0
      this.history = []
      saveHistory([])
      return { status: 'reset' }
    }

    getHistory() {
      return [...this.history].sort((a, b) => new Date(b.completed_at) - new Date(a.completed_at))
    }

    getHistoryStats() {
      let totalSpent = 0
      let rideCount = 0
      let totalRideMinutes = 0
      for (const entry of this.history) {
        if (entry.type === 'ride') {
          rideCount += 1
          totalSpent += entry.cost_rub || 0
          totalRideMinutes += Math.round(
            ((entry.riding_seconds || 0) + (entry.waiting_total_seconds || 0)) / 60,
          )
        } else if (entry.type === 'purchase') {
          totalSpent += entry.price_rub || 0
        }
      }
      return { totalSpent, rideCount, totalRideMinutes }
    }

    _addHistoryEntry(entry) {
      this.history.unshift({ id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, ...entry })
      saveHistory(this.history)
    }

    _clearOtherSelected(exceptScooterId = null) {
      for (const [scooterId, sess] of Object.entries(this.sessions)) {
        if (sess.status !== 'selected') continue
        if (exceptScooterId && scooterId === exceptScooterId) continue
        delete this.sessions[scooterId]
      }
    }

    selectScooter(number) {
      const scooter = this._getScooter(number)
      const existing = this.sessions[scooter.id]
      if (existing) {
        this._clearOtherSelected(scooter.id)
        return this._buildSessionResponse(existing)
      }
      if (this._rentedIds().has(scooter.id)) throw new StoreError(409, 'Scooter is already rented')
      this._clearOtherSelected(scooter.id)
      this.sessions[scooter.id] = {
        scooter_id: scooter.id,
        status: 'selected',
        tariff: 'per_minute',
        reserved_at: null,
        riding_started_at: null,
        paused_at: null,
        accumulated_riding_seconds: 0,
        accumulated_waiting_seconds: 0,
        finish_requested_at: null,
      }
      return this._buildSessionResponse(this.sessions[scooter.id])
    }

    reserve(number, tariff) {
      if (tariff !== 'per_minute') {
        throw new StoreError(400, 'Reserve uses per-minute billing. Buy minute packages separately.')
      }
      const sess = this._sessionForNumber(number)
      this._ensureSessionStatus(sess, 'selected')
      const scooter = this._getScooter(number)
      const now = new Date()
      sess.status = 'reserved'
      sess.tariff = tariff
      sess.reserved_at = now
      scooter.available = false
      return this._buildSessionResponse(sess)
    }

    start(number) {
      const sess = this._sessionForNumber(number)
      this._ensureSessionStatus(sess, 'reserved')
      sess.status = 'riding'
      sess.riding_started_at = new Date()
      return this._buildSessionResponse(sess)
    }

    pause(number) {
      const sess = this._sessionForNumber(number)
      this._ensureSessionStatus(sess, 'riding')
      const now = new Date()
      sess.accumulated_riding_seconds = this._ridingSeconds(sess, now)
      sess.paused_at = now
      sess.status = 'paused'
      sess.riding_started_at = null
      return this._buildSessionResponse(sess)
    }

    resume(number) {
      const sess = this._sessionForNumber(number)
      this._ensureSessionStatus(sess, 'paused')
      const now = new Date()
      if (sess.paused_at) {
        sess.accumulated_waiting_seconds += Math.floor((now - sess.paused_at) / 1000)
      }
      sess.status = 'riding'
      sess.riding_started_at = now
      sess.paused_at = null
      return this._buildSessionResponse(sess)
    }

    cancel(number) {
      const sess = this._sessionForNumber(number)
      this._ensureSessionStatus(sess, 'reserved')
      this._releaseScooter(sess)
      delete this.sessions[sess.scooter_id]
    }

    finish(number) {
      const sess = this._sessionForNumber(number)
      this._ensureSessionStatus(sess, 'riding', 'paused')
      const now = new Date()
      if (sess.status === 'riding') {
        sess.accumulated_riding_seconds = this._ridingSeconds(sess, now)
      } else if (sess.status === 'paused' && sess.paused_at) {
        sess.accumulated_waiting_seconds += Math.floor((now - sess.paused_at) / 1000)
      }
      sess.status = 'finish_photo'
      sess.finish_requested_at = now
      sess.riding_started_at = null
      sess.paused_at = null
      return this._buildSessionResponse(sess)
    }

    complete(number) {
      const sess = this._sessionForNumber(number)
      this._ensureSessionStatus(sess, 'finish_photo')
      const now = new Date()
      const ridingSeconds = this._ridingSeconds(sess, now)
      const waitingTotal = this._waitingTotalSeconds(sess, now)
      const billable = ridingSeconds + waitingTotal
      const items = this._activeBilledSessions(now)
      const totalBillable = items.reduce((sum, [, b]) => sum + b, 0)
      const otherBillable = totalBillable - billable
      const costs = this._sessionCosts(now)
      const cost = costs[sess.scooter_id] || 0
      const prepaidUsed = Math.min(billable, this.prepaid_seconds)
      const scooter = this._getScooterById(sess.scooter_id)
      const summary = {
        scooter_number: scooter.number,
        riding_seconds: ridingSeconds,
        waiting_total_seconds: waitingTotal,
        cost_rub: cost,
        tariff: sess.tariff,
        prepaid_minutes_used: Math.floor(prepaidUsed / 60),
      }
      this.prepaid_seconds = Math.max(0, this.prepaid_seconds - billable)
      sess.accumulated_riding_seconds = ridingSeconds
      this._releaseScooter(sess)
      delete this.sessions[sess.scooter_id]
      this._addHistoryEntry({
        type: 'ride',
        completed_at: now.toISOString(),
        ...summary,
      })
      return summary
    }

    beep(number) {
      const sess = this._sessionForNumber(number)
      if (!RENTED_STATUSES.has(sess.status)) throw new StoreError(400, 'Scooter is not rented')
      return { message: 'Beep sent' }
    }

    _releaseScooter(sess) {
      const scooter = this._getScooterById(sess.scooter_id)
      scooter.available = true
      if (sess.accumulated_riding_seconds > 0) {
        const drain = Math.min(25, Math.floor(sess.accumulated_riding_seconds / 60))
        scooter.battery = Math.max(10, scooter.battery - drain)
      }
    }

    _toSummary(scooter, available = true) {
      return {
        id: scooter.id,
        number: scooter.number,
        battery: scooter.battery,
        lat_pct: scooter.lat_pct,
        lng_pct: scooter.lng_pct,
        available: available && scooter.available,
      }
    }

    _getScooter(number) {
      const scooter = this.scooters[number.toUpperCase()]
      if (!scooter) throw new StoreError(404, `Scooter ${number} not found`)
      return scooter
    }

    _getScooterById(scooterId) {
      for (const scooter of Object.values(this.scooters)) {
        if (scooter.id === scooterId) return scooter
      }
      throw new StoreError(404, 'Scooter not found')
    }

    _sessionForNumber(number) {
      const scooter = this._getScooter(number)
      const sess = this.sessions[scooter.id]
      if (!sess) throw new StoreError(404, 'No session for this scooter')
      return sess
    }

    _ensureSessionStatus(sess, ...allowed) {
      if (!allowed.includes(sess.status)) {
        throw new StoreError(400, `Invalid transition from ${sess.status}`)
      }
    }

    _ridingSeconds(sess, now) {
      let total = sess.accumulated_riding_seconds
      if (sess.status === 'riding' && sess.riding_started_at) {
        total += Math.floor((now - sess.riding_started_at) / 1000)
      }
      return total
    }

    _waitingSessionSeconds(sess, now) {
      if (sess.status === 'paused' && sess.paused_at) {
        return Math.floor((now - sess.paused_at) / 1000)
      }
      return 0
    }

    _waitingTotalSeconds(sess, now) {
      let total = sess.accumulated_waiting_seconds
      if (sess.status === 'paused' && sess.paused_at) {
        total += Math.floor((now - sess.paused_at) / 1000)
      }
      return total
    }

    _billableForSession(sess, now) {
      return this._ridingSeconds(sess, now) + this._waitingTotalSeconds(sess, now)
    }

    _activeBilledSessions(now) {
      const items = []
      for (const sess of (Object.values(this.sessions))) {
        if (!BILLED_STATUSES.has(sess.status)) continue
        items.push([sess, this._billableForSession(sess, now)])
      }
      return items
    }

    _walletSecondsRemaining(now) {
      const totalBillable = this._activeBilledSessions(now).reduce((sum, [, b]) => sum + b, 0)
      return Math.max(0, this.prepaid_seconds - totalBillable)
    }

    _sessionCosts(now) {
      const items = this._activeBilledSessions(now)
      const totalBillable = items.reduce((sum, [, b]) => sum + b, 0)
      if (totalBillable <= 0) return {}
      const overflow = Math.max(0, totalBillable - this.prepaid_seconds)
      const costs = {}
      for (const [sess, billable] of items) {
        const share = billable / totalBillable
        const overflowSeconds = overflow * share
        costs[sess.scooter_id] = Math.round((overflowSeconds / 60) * PER_MINUTE_RATE * 100) / 100
      }
      return costs
    }

    _buildSessionResponse(sess) {
      const scooter = this._getScooterById(sess.scooter_id)
      const now = new Date()
      let ridingSeconds = 0
      let waitingTotal = 0
      let waitingSession = 0
      let cost = 0
      let freeWaitRemaining = null
      let walletMinutesRemaining = null

      if (sess.status === 'reserved' && sess.reserved_at) {
        const elapsed = Math.floor((now - sess.reserved_at) / 1000)
        freeWaitRemaining = Math.max(0, FREE_WAIT_SECONDS - elapsed)
        if (this.prepaid_seconds > 0) {
          walletMinutesRemaining = Math.floor(this.prepaid_seconds / 60)
        }
      } else if (BILLED_STATUSES.has(sess.status)) {
        ridingSeconds = this._ridingSeconds(sess, now)
        waitingTotal = this._waitingTotalSeconds(sess, now)
        waitingSession = this._waitingSessionSeconds(sess, now)
        const costs = this._sessionCosts(now)
        cost = costs[sess.scooter_id] || 0
        walletMinutesRemaining = Math.floor(this._walletSecondsRemaining(now) / 60)
      }

      let battery = scooter.battery
      if (sess.status === 'riding' && ridingSeconds > 0) {
        battery = Math.max(10, scooter.battery - Math.floor(ridingSeconds / 120))
      }

      const rangeHours = Math.max(0.5, scooter.range_hours - ridingSeconds / 3600)

      return {
        status: sess.status,
        scooter_number: scooter.number,
        scooter_id: scooter.id,
        battery,
        range_hours: Math.round(rangeHours * 10) / 10,
        lat_pct: scooter.lat_pct,
        lng_pct: scooter.lng_pct,
        tariff: sess.tariff,
        elapsed_seconds: ridingSeconds,
        riding_seconds: ridingSeconds,
        waiting_total_seconds: waitingTotal,
        waiting_session_seconds: waitingSession,
        cost_rub: cost,
        free_wait_remaining_seconds: freeWaitRemaining,
        wallet_minutes_remaining: walletMinutesRemaining,
        server_time: now.toISOString(),
      }
    }
  }

  global.StoreError = StoreError
  global.store = new InMemoryStore()
})(window)
