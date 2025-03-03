import { getPermalink, getAsset } from './utils/permalinks';
import { getCollection } from 'astro:content';

async function getActiveShopLinks() {
  const currentDate = new Date();
  
  // Get collections
  const bundles = await getCollection('bundle');
  const rituals = await getCollection('ritual');
  const freebies = await getCollection('freebie');

  // Check for active items
  const hasActiveBundles = bundles.some(bundle => {
    if (!bundle.data.expirationDate) return true;
    const [month, day, year] = bundle.data.expirationDate.split('/');
    const expirationDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    return currentDate <= expirationDate;
  });

  const hasActiveRituals = rituals.some(ritual => {
    if (!ritual.data.expirationDate) return true;
    const [month, day, year] = ritual.data.expirationDate.split('/');
    const expirationDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    return currentDate <= expirationDate;
  });

  const hasActiveFreebies = freebies.some(freebie => {
    if (!freebie.data.expirationDate) return true;
    const [month, day, year] = freebie.data.expirationDate.split('/');
    const expirationDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    return currentDate <= expirationDate;
  });

  // Build links array based on active items
  const shopLinks = [];
  if (hasActiveRituals) {
    shopLinks.push({ text: 'Guided Rituals', href: '/shop#guidedrituals' });
  }
  if (hasActiveBundles) {
    shopLinks.push({ text: 'Bundles', href: '/shop#bundles' });
  }
  if (hasActiveFreebies) {
    shopLinks.push({ text: 'Freebies', href: '/shop#freebies' });
  }


  return shopLinks;
}

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
    {
      text: 'Shop',
      href: getPermalink('/shop'),
    },
  ],
  actions: [{          
    text: 'Book a Reading',
    href: '/readings',
    variant: 'primary', 
  }],
};

export const getFooterData = async () => {
  const shopLinks = await getActiveShopLinks();
  
  return {
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
      ...(shopLinks.length > 0 ? [{
        title: 'Shop',
        links: shopLinks,
      }] : []),
      {
        title: 'Get In Touch',
        links: [
          { text: 'Contact Us', href: '/contact' },
          { text: 'Instagram', href: 'https://www.instagram.com/pinetreemagick/' },
          { text: 'TikTok', href: 'https://www.tiktok.com/@pinetreemagick?lang=en' },
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
    footNote: `Pine Tree Magick All rights reserved.`,
  };
};
