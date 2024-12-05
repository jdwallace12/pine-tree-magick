import { getPermalink, getAsset } from './utils/permalinks';

export const headerData = {
  links: [
    {
      text: 'Readings',
      href: getPermalink('/readings')
    },
    {
      text: 'About',
      href: getPermalink('/about'),
    },
    {
      text: 'Workshops',
      href: getPermalink('/workshops'),
    },
    // {
    //   text: 'Substack',
    //   href: getPermalink('#substack'),
    // },
  ],
  actions: [{          
    text: 'Book a Private Session',
    href: '/private-sessions',
    variant: 'primary', 
  }],
};

export const footerData = {
  links: [
    {
      title: 'Explore',
      links: [
        { text: 'Readings', href: '/eadings' },
        { text: 'Private Sessions', href: '/private-sessions' },
        { text: 'About', href: '/about' },
        { text: 'Workshops', href: '/workshops' },
        // { text: 'Substack', href: '#' },
      ],
    },
  ],
  secondaryLinks: [
    { text: 'Disclaimer', href: getPermalink('/disclaimer') },
    { text: 'Privacy Policy', href: getPermalink('/privacy') },
  ],
  socialLinks: [
    { ariaLabel: 'Instagram', icon: 'tabler:brand-instagram', href: 'https://www.instagram.com/pinetreemagick/'},
    { ariaLabel: 'TikTok', icon: 'tabler:brand-tiktok', href: 'https://www.tiktok.com/@pinetreemagick?lang=en'},
  ],
  footNote: `Pine Tree Magick All rights reserved.
  `,
};
