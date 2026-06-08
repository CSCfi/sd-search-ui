const eventHandler = (el: HTMLInputElement) => (event: CustomEvent) => {
  el.value = event?.detail ?? null
  el.dispatchEvent(new Event('input', { bubbles: true }))
}

const handlers = new WeakMap<HTMLInputElement, EventListener>()

export const vControl = {
  mounted(el: HTMLInputElement) {
    const handler = eventHandler(el) as EventListener
    handlers.set(el, handler)
    el.addEventListener('changeValue', handler)
  },
  beforeUnmount(el: HTMLInputElement) {
    const handler = handlers.get(el)
    if (handler) {
      el.removeEventListener('changeValue', handler)
      handlers.delete(el)
    }
  },
}
