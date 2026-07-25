// Иконки нарисованы руками в сетке 24×24: библиотеки иконок в проекте нет, а нужно их
// восемь. Цвет наследуется от текста, размер — от размера шрифта, поэтому одна и та же
// иконка одинаково садится и в чип платформы, и в кнопку шапки.
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
