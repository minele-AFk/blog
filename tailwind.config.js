/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#a855f7',
        secondary: '#06b6d4',
        accent: '#ec4899',
        background: '#0a0a12',
        'background-secondary': '#12121f',
        'background-card': 'rgba(20, 20, 35, 0.7)',
        foreground: '#f0f0f5',
        'foreground-muted': '#8888aa',
        border: 'rgba(168, 85, 247, 0.25)',
      },
    },
  },
}
