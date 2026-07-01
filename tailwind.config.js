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
          bg: 'var(--crm-bg)',
          topbar: 'var(--crm-topbar)',
          sidebar: 'var(--crm-sidebar)',
          surface: 'var(--crm-surface)',
          'surface-raised': 'var(--crm-surface-raised)',
          border: 'var(--crm-border)',
          'border-strong': 'var(--crm-border-strong)',
          fg: 'var(--crm-fg)',
          'fg-muted': 'var(--crm-fg-muted)',
          'fg-subtle': 'var(--crm-fg-subtle)',
          red: 'var(--crm-red)',
          'red-brand': 'var(--crm-red-brand)',
          'red-hover': 'var(--crm-red-hover)',
          'red-soft': 'var(--crm-red-soft)',
          success: 'var(--crm-success)',
          warning: 'var(--crm-warning)',
          info: 'var(--crm-info)',
          purple: 'var(--crm-purple)'
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
