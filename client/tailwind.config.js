/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        staynest: {
          bg: '#FAFAF7',
          charcoal: '#1F2421',
          olive: '#3E4F42',
          'olive-light': '#EAEFE9',
          terracotta: '#D05A3F',
          'terracotta-dark': '#B5472F',
          sand: '#F3EFE6',
          border: '#E6E1D8',
          muted: '#687269',
        }
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'Inter', 'system-ui', 'sans-serif'],
        serif: ['Playfair Display', 'Georgia', 'serif'],
      },
      boxShadow: {
        subtle: '0 2px 8px -2px rgba(31, 36, 33, 0.06), 0 1px 4px -1px rgba(31, 36, 33, 0.04)',
        hover: '0 12px 28px -4px rgba(31, 36, 33, 0.12), 0 4px 12px -2px rgba(31, 36, 33, 0.08)',
        modal: '0 20px 40px -10px rgba(31, 36, 33, 0.25)',
      }
    },
  },
  plugins: [],
}
