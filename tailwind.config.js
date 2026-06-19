/** @type {import('tailwindcss').Config} */

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    container: {
      center: true,
    },
    extend: {
      colors: {
        navy: {
          50: '#E8EBF0',
          100: '#C5CBD8',
          200: '#8E9BB5',
          300: '#576C92',
          400: '#2E4270',
          500: '#1B2A4A',
          600: '#162240',
          700: '#111A33',
          800: '#0C1226',
          900: '#070A19',
        },
        slate: {
          25: '#FCFCFD',
          50: '#F5F6FA',
          75: '#EDEEF3',
          100: '#E2E4EB',
        },
        amber: {
          50: '#FDF6EC',
          100: '#F9E8CC',
          200: '#F3D199',
          300: '#EDBA66',
          400: '#D4913D',
          500: '#B87A2E',
          600: '#8C5D23',
        },
        success: {
          50: '#EDFCF2',
          100: '#D3F8E0',
          400: '#34C759',
          500: '#28A745',
          600: '#1E8C38',
        },
        danger: {
          50: '#FEF2F2',
          100: '#FEE2E2',
          400: '#EF4444',
          500: '#DC2626',
          600: '#B91C1C',
        },
      },
      fontFamily: {
        sans: ['"Noto Sans SC"', '"Source Han Sans SC"', '"Microsoft YaHei"', 'sans-serif'],
      },
      fontSize: {
        '2xs': ['11px', { lineHeight: '16px' }],
      },
    },
  },
  plugins: [],
};
