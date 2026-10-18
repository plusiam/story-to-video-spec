/** @type {import('tailwindcss').Config} */
// 색 체계: 먹(글자) · 한지(작업 면) · 쪽빛(지금 할 일) · 녹청(완료) · 황토(막힘)
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: { DEFAULT: '#22262B', soft: '#545B64', faint: '#7C838C' },
        paper: { DEFAULT: '#FCFCFA', base: '#ECEEF0', line: '#D5D9DE' },
        jjok: { DEFAULT: '#26407A', deep: '#1B2F5C', tint: '#E4E9F4' },
        celadon: { DEFAULT: '#2F7466', tint: '#E1EFEB' },
        ocher: { DEFAULT: '#8C600E', tint: '#F6EED9' },
        danger: { DEFAULT: '#A3352B', tint: '#F7E4E1' },
      },
      fontFamily: {
        sans: ['Pretendard Variable', 'Pretendard', 'system-ui', 'sans-serif'],
        serif: ['"Gowun Batang"', 'serif'],
      },
      maxWidth: { prose: '68ch' },
    },
  },
  plugins: [],
};
