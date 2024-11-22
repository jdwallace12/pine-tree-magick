import { getPermalink, getAsset } from './utils/permalinks';

export const headerData = {
  links: [
    {
      text: 'Readings',
      links: [
        {
          text: 'Written Readings',
          href: getPermalink('/readings'),
        },
        {
          text: 'Live Session',
          href: getPermalink('/live-session'),
        },
      ],
    },
    {
      text: 'About',
      href: getPermalink('/about'),
    },
    {
      text: 'Workshops',
      href: getPermalink('/workshops'),
    },
    {
      text: 'Substack',
      href: getPermalink('#substack'),
    },
  ],
  actions: [{          
    text: 'Book a Reading',
    href: '/book-a-reading',
    variant: 'primary', 
  }],
};

export const footerData = {
  links: [
    {
      title: 'Explore',
      links: [
        { text: 'Readings', href: '/readings' },
        { text: 'About', href: '/about' },
        { text: 'Workshops', href: '/workshops' },
        { text: 'Substack', href: '#' },
      ],
    },
  ],
  secondaryLinks: [
    { text: 'Terms', href: getPermalink('/terms') },
    { text: 'Privacy Policy', href: getPermalink('/privacy') },
  ],
  socialLinks: [
    { ariaLabel: 'Instagram', icon: 'tabler:brand-instagram', href: '#' },
    { ariaLabel: 'Facebook', icon: 'tabler:brand-facebook', href: '#' },
    { ariaLabel: 'RSS', icon: 'tabler:rss', href: getAsset('/rss.xml') },
  ],
  footNote: `Pine Tree Magick All rights reserved.
  `,
};
