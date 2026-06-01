/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/views/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#EB2628',
        'primary-dark': '#c01c1e',
        carbon: '#111',
        crm: {
          bg: '#0B0B0D',
          sidebar: '#161619',
          surface: '#1E1E24',
          'surface-raised': '#28282E',
          border: '#33333A',
          fg: '#FAFAFA',
          muted: '#A1A1AA',
          subtle: '#71717A',
          red: '#EF3329',
          'red-strong': '#E63027',
          'red-hover': '#C42620',
        }
      }
    },
  },
  corePlugins: {
    preflight: false, // Important: don't reset base styles
  },
  plugins: [],
}
