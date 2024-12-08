/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      typography: {
        DEFAULT: {
          css: {
            'h1, h2, h3, h4': {
              fontWeight: '700',
              fontFamily: 'var(--font-heading)',
              color: 'var(--tw-prose-headings)',
            },
            'ul > li': {
              '&::before': {
                backgroundColor: 'var(--tw-prose-bullets)',
              },
            },
            'a': {
              color: 'var(--tw-prose-links)',
              '&:hover': {
                color: 'var(--tw-prose-links-hover)',
              },
            },
            'p': {
              marginTop: '1.25em',
              marginBottom: '1.25em',
            },
          },
        },
      },
    },
  },
  plugins: [require('@tailwindcss/typography')],
} 