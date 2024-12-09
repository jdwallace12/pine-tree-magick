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
    //   text: 'Shop',
    //   href: getPermalink('/shop'),
    // },
  ],
  actions: [{          
    text: 'Book a Reading',
    href: '/readings',
    variant: 'primary', 
  }],
};

export const footerData = {
  links: [
    {
      title: 'Explore',
      links: [
        { text: 'Readings', href: '/readings' },
        { text: 'Private Sessions', href: '/private-sessions' },
        { text: 'Book a Written Reading', href: 'book-a-written-reading' },
        { text: 'About', href: '/about' },
        { text: 'Workshops', href: '/workshops' },
      ],
    },
    // {
    //   title: 'Shop',
    //   links: [
    //     { text: 'Guided Rituals', href: '/shop#guidedrituals' },
    //   ],
    // },
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
