/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        green: {
          DEFAULT: '#1B5E20',
          dark: '#154716',
          light: '#2E7D32',
        },
        gold: {
          DEFAULT: '#C9952A',
          pale: '#FFF8E1',
        },
        brown: '#5D4037',
      },
      fontFamily: {
        cairo: ['Cairo_400Regular'],
        'cairo-bold': ['Cairo_700Bold'],
        amiri: ['Amiri_400Regular'],
        'amiri-bold': ['Amiri_700Bold'],
      },
      borderRadius: {
        card: '12px',
        btn: '8px',
      },
    },
  },
  plugins: [],
};
