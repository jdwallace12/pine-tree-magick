import defaultTheme from 'tailwindcss/defaultTheme';
import typographyPlugin from '@tailwindcss/typography';

module.exports = {
  content: ['./src/**/*.{astro,html,js,jsx,json,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      colors: {
        primary: 'var(--aw-color-primary)',
        secondary: 'var(--aw-color-secondary)',
        accent: 'var(--aw-color-accent)',
        dark: 'var(--aw-color-bg-page)',
        default: 'var(--aw-color-text-default)',
        muted: 'var(--aw-color-text-muted)',
        green: {
          dark: 'var(--ptm-dark-green)',
          medium: '#9acac6',
          light: '#c9fde5',
        },
      },
      fontFamily: {
        sans: ['var(--aw-font-sans, ui-sans-serif)', ...defaultTheme.fontFamily.sans],
        serif: ['var(--aw-font-serif, ui-serif)', ...defaultTheme.fontFamily.serif],
        heading: ['var(--aw-font-heading, ui-sans-serif)', ...defaultTheme.fontFamily.sans],
      },
    },
  },
  plugins: [
    typographyPlugin,
    function ({ addUtilities }) {
      addUtilities({
        '.curved-hero': {
          clipPath: 'ellipse(100% 100% at 50% 0%)',
        },
        '@screen sm': {
          '.curved-hero': {
            clipPath: 'ellipse(50% 100% at 50% 0%)', // Mobile-specific
          },
        },
      });
    },
  ],
  darkMode: 'class',
};
