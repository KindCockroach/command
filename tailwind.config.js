/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        cosmic: '#171C3A',
        nebula: '#5A4FCF',
        aurora: '#D98AB7',
        ember: '#F2A65A',
        softlight: '#F5EFE6',
        'nebula-light': '#EDEAFC',
        'aurora-light': '#FAF0F5',
        'ember-light': '#FEF5EA',
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', 'Inter', 'Segoe UI', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
