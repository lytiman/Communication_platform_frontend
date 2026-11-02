/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        pine: { 50: '#EEF4F1', 100: '#D9E6E0', 600: '#2A6650', 700: '#1B4D3C', 800: '#123A2D', 900: '#0B2A20' },
        sun: { DEFAULT: '#E9B02C', 600: '#C98F10', soft: '#FBF0CF' },
        brick: '#C2452D',
        paper: '#F4F5F2',
        line: '#E2E5E0',
        ink: '#18211D',
        mute: '#66726B',
        leaf: '#2FA36B',
      },
      fontFamily: {
        sans: ['"Onest Variable"', 'system-ui', 'sans-serif'],
        serif: ['"Fraunces Variable"', 'Georgia', 'serif'],
      },
    },
  },
  plugins: [],
};
