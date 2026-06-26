/** Mobile bottom-sheet: drag handle, snap expanded / collapsed */
;(function (global) {
  'use strict'

  const SNAP_THRESHOLD = 0.42
  const VELOCITY_THRESHOLD = 0.45
  const SPRING_STIFFNESS = 92
  const SPRING_DAMPING = 16

  function isMobileLayout() {
    return window.matchMedia('(max-width: 899px)').matches
  }

  function getSnaps() {
    if (!global.__sheetSnaps) global.__sheetSnaps = {}
    return global.__sheetSnaps
  }

  function clamp01(value) {
    return Math.max(0, Math.min(1, value))
  }

  function isInteractiveTarget(target) {
    return Boolean(target.closest('button, a, input, textarea, select, label'))
  }

  function runSpring({ from, to, velocity = 0, onUpdate, onComplete }) {
    let x = from
    let v = velocity
    let last = performance.now()
    let raf = 0

    const step = (now) => {
      const dt = Math.min((now - last) / 1000, 0.032)
      last = now
      const force = -SPRING_STIFFNESS * (x - to) - SPRING_DAMPING * v
      v += force * dt
      x += v * dt
      onUpdate(x)
      if (Math.abs(x - to) < 0.0025 && Math.abs(v) < 0.012) {
        onUpdate(to)
        onComplete()
        return
      }
      raf = requestAnimationFrame(step)
    }

    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }

  function allowsInternalScroll(sheetId) {
    return sheetId === 'home'
  }

  function syncMapPanelLayout(panel) {
    if (!isMobileLayout()) return
    const mapLayout = panel.closest('.map-layout')
    if (!mapLayout) return
    const panelOuter = mapLayout.querySelector('.map-layout__panel')
    const dock = document.getElementById('dock')
    const vh = window.visualViewport?.height ?? window.innerHeight
    const dockH = dock && !dock.hidden ? dock.getBoundingClientRect().height : 0
    const panelH = panelOuter?.getBoundingClientRect().height ?? 0
    const mapH = Math.max(72, Math.floor(vh - panelH - dockH))
    mapLayout.style.setProperty('--map-area-height', `${mapH}px`)
  }

  function setupBottomSheet(panel) {
    const extra = panel.querySelector('[data-sheet-extra]')
    const dragZone = panel.querySelector('[data-sheet-handle]')
    if (!extra || !dragZone) return

    let wrap = extra.parentElement
    if (!wrap.matches('[data-sheet-extra-wrap]')) {
      wrap = document.createElement('div')
      wrap.className = 'control-panel__sheet-extra-wrap'
      wrap.dataset.sheetExtraWrap = ''
      extra.parentNode.insertBefore(wrap, extra)
      wrap.appendChild(extra)
    }

    const sheetId = panel.dataset.sheetId || 'default'
    const snaps = getSnaps()
    let fullHeight = 0
    let progress = typeof snaps[sheetId] === 'number' ? snaps[sheetId] : 1
    let dragging = false
    let snapping = false
    let startY = 0
    let startProgress = 0
    let pointerId = null
    let lastY = 0
    let lastT = 0
    let velocity = 0
    let cancelSpring = null

    const stopSpring = () => {
      if (cancelSpring) {
        cancelSpring()
        cancelSpring = null
      }
      snapping = false
      wrap.classList.remove('is-snapping')
    }

    const measure = () => {
      const prevHeight = wrap.style.height
      wrap.style.height = 'auto'
      fullHeight = extra.offsetHeight
      wrap.style.height = prevHeight
      return fullHeight
    }

    const core = panel.querySelector('.control-panel__sheet-core')

    const getMaxWrapHeight = () => {
      if (!core) return fullHeight
      const vh = window.visualViewport?.height ?? window.innerHeight
      const dock = document.getElementById('dock')
      const dockH = dock && !dock.hidden ? dock.getBoundingClientRect().height : 0
      const wrapTop = core.getBoundingClientRect().bottom
      return Math.max(96, Math.floor(vh - wrapTop - dockH - 72))
    }

    let mapSyncRaf = 0
    const scheduleMapSync = () => {
      cancelAnimationFrame(mapSyncRaf)
      mapSyncRaf = requestAnimationFrame(() => syncMapPanelLayout(panel))
    }

    const applyHeight = (value) => {
      progress = clamp01(value)
      snaps[sheetId] = progress
      const cap = getMaxWrapHeight()
      const useScroll = allowsInternalScroll(sheetId) && fullHeight > cap + 1
      const expandedH = useScroll ? Math.min(fullHeight, cap) : fullHeight
      const h = progress * expandedH
      wrap.style.height = h > 0.5 ? `${h}px` : '0px'
      const scrollable = useScroll && progress > 0.98
      extra.classList.toggle('is-sheet-scrollable', scrollable)
      wrap.classList.toggle('is-sheet-scrollable', scrollable)
      panel.dataset.sheetSnap = progress < 0.5 ? 'collapsed' : 'expanded'
      scheduleMapSync()
    }

    const snapTo = (target, initialVelocity = 0) => {
      stopSpring()
      if (Math.abs(progress - target) < 0.002) {
        applyHeight(target)
        return
      }

      snapping = true
      wrap.classList.add('is-snapping')

      cancelSpring = runSpring({
        from: progress,
        to: target,
        velocity: initialVelocity,
        onUpdate: (value) => applyHeight(value),
        onComplete: () => {
          cancelSpring = null
          snapping = false
          wrap.classList.remove('is-snapping')
          applyHeight(target)
        },
      })
    }

    const remeasure = () => {
      if (dragging || snapping) return
      const was = progress
      measure()
      applyHeight(was)
    }

    const onPointerDown = (e) => {
      if (!isMobileLayout()) return
      if (e.pointerType === 'mouse' && e.button !== 0) return
      if (isInteractiveTarget(e.target)) return
      stopSpring()
      dragging = true
      pointerId = e.pointerId
      startY = e.clientY
      lastY = e.clientY
      lastT = e.timeStamp
      velocity = 0
      startProgress = progress
      dragZone.setPointerCapture(e.pointerId)
      panel.classList.add('is-sheet-dragging')
      e.preventDefault()
    }

    const onPointerMove = (e) => {
      if (!dragging || e.pointerId !== pointerId) return
      const dt = Math.max(e.timeStamp - lastT, 1)
      velocity = (e.clientY - lastY) / dt
      lastY = e.clientY
      lastT = e.timeStamp
      const delta = e.clientY - startY
      const dragRange = Math.max(fullHeight, 160)
      applyHeight(startProgress - delta / dragRange)
    }

    const finishDrag = (e) => {
      if (!dragging || (e && e.pointerId !== pointerId)) return
      dragging = false
      panel.classList.remove('is-sheet-dragging')
      try { dragZone.releasePointerCapture(pointerId) } catch { /* ignore */ }
      pointerId = null

      let target
      if (velocity > VELOCITY_THRESHOLD) target = 0
      else if (velocity < -VELOCITY_THRESHOLD) target = 1
      else target = progress >= SNAP_THRESHOLD ? 1 : 0

      const dragRange = Math.max(fullHeight, 160)
      const springVelocity = (-velocity * 1000) / dragRange * 0.28
      snapTo(target, springVelocity)
    }

    dragZone.addEventListener('pointerdown', onPointerDown)
    dragZone.addEventListener('pointermove', onPointerMove)
    dragZone.addEventListener('pointerup', finishDrag)
    dragZone.addEventListener('pointercancel', finishDrag)

    dragZone.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        snapTo(progress < 0.5 ? 1 : 0)
      }
    })

    if (panel.__sheetResizeObserver) panel.__sheetResizeObserver.disconnect()
    const ro = new ResizeObserver(() => remeasure())
    ro.observe(extra)
    panel.__sheetResizeObserver = ro

    if (panel.__sheetViewportHandler) {
      window.visualViewport?.removeEventListener('resize', panel.__sheetViewportHandler)
      window.visualViewport?.removeEventListener('scroll', panel.__sheetViewportHandler)
    }
    const onViewportChange = () => {
      if (dragging || snapping) return
      const was = progress
      measure()
      applyHeight(was)
    }
    panel.__sheetViewportHandler = onViewportChange
    window.visualViewport?.addEventListener('resize', onViewportChange)
    window.visualViewport?.addEventListener('scroll', onViewportChange)

    measure()
    applyHeight(progress)
  }

  function initBottomSheets() {
    if (!isMobileLayout()) return
    document.querySelectorAll('[data-bottom-sheet]').forEach(setupBottomSheet)
  }

  function initBottomSheetsDeferred() {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => initBottomSheets())
    })
  }

  global.sheet = { initBottomSheets, initBottomSheetsDeferred, getSnaps }
})(window)
