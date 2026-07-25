// Иконки нарисованы руками в сетке 24×24: библиотеки иконок в проекте нет. Цвет наследуется
// от текста, размер — от размера шрифта, поэтому одна и та же иконка одинаково садится
// и в чип платформы, и в кнопку шапки, и в панель разметки.
const shapes = {
  backend: (
    <>
      <rect x="3" y="4" width="18" height="7" rx="2" />
      <rect x="3" y="13" width="18" height="7" rx="2" />
      <path d="M6.5 7.5h.01M6.5 16.5h.01" />
    </>
  ),
  web: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18" />
      <ellipse cx="12" cy="12" rx="4.2" ry="9" />
    </>
  ),
  // Четыре плитки логотипа заливкой: обводкой в 12px они слипаются.
  windows: <path fill="currentColor" stroke="none" d="M3 6.3 10 5.3v6.2H3zM11.5 5.1 21 3.8v7.7h-9.5zM3 12.9h7v6.2l-7-1zM11.5 12.9H21v7.7l-9.5-1.3z" />,
  mac: (
    <>
      <rect x="3" y="4.5" width="18" height="12" rx="2" />
      <path d="M2 20h20" />
    </>
  ),
  android: (
    <>
      <path d="M6 13a6 6 0 0 1 12 0v4a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2z" />
      <path d="M8.5 8 7 5M15.5 8 17 5" />
      <path d="M9.5 12h.01M14.5 12h.01" />
    </>
  ),
  iphone: (
    <>
      <rect x="7" y="2.5" width="10" height="19" rx="2.5" />
      <path d="M10.5 5.5h3" />
    </>
  ),
  refresh: (
    <>
      <path d="M20.5 12a8.5 8.5 0 1 1-2.5-6" />
      <path d="M18.5 2.5V6H15" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  // Буквы панели разметки рисуются контуром, как остальные иконки: шрифтовые «B» и «I»
  // рядом с ними смотрелись бы чужеродно и зависели бы от начертания.
  bold: <path d="M7 4h6.5a4 4 0 0 1 0 8H7zM7 12h7.5a4 4 0 0 1 0 8H7z" />,
  italic: <path d="M15 4h-5M14 20H9M14.5 4 9.5 20" />,
  strike: <path d="M5 12h14M8 7.5A3.5 3.5 0 0 1 11.5 4h1a3.5 3.5 0 0 1 3.4 2.7M16 16.5A3.5 3.5 0 0 1 12.5 20h-1a3.5 3.5 0 0 1-3.4-2.7" />,
  code: <path d="m9 17-5-5 5-5M15 7l5 5-5 5" />,
  link: (
    <>
      <path d="M10.5 13.5a4 4 0 0 0 5.7 0l2.6-2.6a4 4 0 0 0-5.7-5.7l-1.4 1.4" />
      <path d="M13.5 10.5a4 4 0 0 0-5.7 0l-2.6 2.6a4 4 0 0 0 5.7 5.7l1.4-1.4" />
    </>
  ),
  list: <path d="M9 6h11M9 12h11M9 18h11M4.5 6h.01M4.5 12h.01M4.5 18h.01" />,
  listNumbered: (
    <>
      <path d="M10 6h10M10 12h10M10 18h10" />
      <path d="M4 5.5 5.5 4.5V9M3.5 14.5a1.5 1.5 0 0 1 3 0c0 1.5-3 2-3 4h3" strokeWidth="1.6" />
    </>
  ),
  checklist: (
    <>
      <path d="M11 6h9M11 12h9M11 18h9" />
      <path d="m3 6 1.5 1.5L7.5 4M3 17l1.5 1.5L7.5 15" strokeWidth="1.6" />
    </>
  ),
  quote: <path d="M6 16h2.5a2 2 0 0 0 2-2v-2a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v6M15.5 16H18a2 2 0 0 0 2-2v-2a2 2 0 0 0-2-2h-2.5a2 2 0 0 0-2 2v6" />,
  image: (
    <>
      <rect x="3" y="4.5" width="18" height="15" rx="2.5" />
      <path d="m3.5 16 4.5-4.5 4 4 3-2.5 5 4.5" />
      <path d="M9 9.5h.01" />
    </>
  ),
}

export function Icon({ name }) {
  return (
    <svg
      className="icon"
      viewBox="0 0 24 24"
      width="1em"
      height="1em"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {shapes[name]}
    </svg>
  )
}
