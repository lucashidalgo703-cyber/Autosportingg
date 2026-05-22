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
      }
    },
  },
  corePlugins: {
    preflight: false, // Important: don't reset base styles
  },
  plugins: [],
}
