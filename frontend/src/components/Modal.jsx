import { useEffect, useRef } from 'react'

const focusableSelector = 'input, textarea, select, button, a[href]'

export function Modal({ label, wide = false, onClose, children }) {
  const panel = useRef(null)

  useEffect(() => {
    const node = panel.current
    node.querySelector(focusableSelector)?.focus()

    function onKeyDown(event) {
      if (event.key === 'Escape') {
        onClose()
        return
      }

      if (event.key !== 'Tab') {
        return
      }

      // Фокус заперт внутри модалки: Tab с последнего элемента ведёт на первый и наоборот.
      const focusable = [...node.querySelectorAll(focusableSelector)].filter((element) => !element.disabled)
      if (focusable.length === 0) {
        return
      }

      const [first, last] = [focusable[0], focusable.at(-1)]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  return (
    <div className="scrim" onClick={onClose}>
      <div
        className={wide ? 'modal modal-wide' : 'modal'}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        ref={panel}
        onClick={(event) => event.stopPropagation()}
      >
        {children}
      </div>
    </div>
  )
}
