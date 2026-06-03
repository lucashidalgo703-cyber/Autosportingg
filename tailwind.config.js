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
          topbar: '#161619',
          sidebar: '#161619',
          surface: '#1E1E24',
          'surface-raised': '#28282E',
          border: '#33333A',
          'border-strong': '#4A4A52',
          fg: '#FAFAFA',
          'fg-muted': '#A1A1AA',
          'fg-subtle': '#71717A',
          red: '#EF3329',
          'red-brand': '#E63027',
          'red-hover': '#C42620',
          'red-soft': '#F87171',
          success: '#10B981',
          warning: '#F59E0B',
          info: '#3B82F6',
          purple: '#8B5CF6'
        }
      },
      backgroundImage: {
        'crm-red-gradient': 'linear-gradient(135deg, #EF3329 0%, #C42620 100%)',
      },
      boxShadow: {
        'crm-shadow-red': '0 12px 40px rgba(239, 51, 41, 0.35), 0 0 0 1px rgba(239, 51, 41, 0.45)',
      }
    },
  },
  corePlugins: {
    preflight: false, // Important: don't reset base styles
  },
  plugins: [],
}
