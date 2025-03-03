export function hasItems(items: any[]): boolean {
    return items && items.length > 0;
  }
  
  export async function getShopComponents(bundles: any[] = [], rituals: any[] = [], freebies: any[] = []) {
    // Filter out expired bundles
    const currentDate = new Date();
    const activeBundles = (bundles || []).filter((bundle) => {
      if (!bundle?.data?.expirationDate) return true;
      const [month, day, year] = bundle.data.expirationDate.split('/');
      const expirationDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      return currentDate <= expirationDate;
    });
  
    // Filter out expired rituals
    const activeRituals = (rituals || []).filter((ritual) => {
      if (!ritual?.data?.expirationDate) return true;
      const [month, day, year] = ritual.data.expirationDate.split('/');
      const expirationDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      return currentDate <= expirationDate;
    });
     // Filter out expired freebies
     const activeFreebies = (freebies || []).filter((freebie) => {
      if (!freebie?.data?.expirationDate) return true;
      const [month, day, year] = freebie.data.expirationDate.split('/');
      const expirationDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      return currentDate <= expirationDate;
    });
  
    // Create array of components with their data
    const components = [
      {
        type: 'bundles',
        hasContent: hasItems(activeBundles),
        data: {
          id: "bundles",
          title: "Bundles",
          tagline: "Buy Bundles",
          items: activeBundles
        }
      },
      {
        type: 'rituals',
        hasContent: hasItems(activeRituals),
        data: {
          id: "guidedrituals", 
          title: "Guided Rituals",
          tagline: "Buy Guided Rituals",
          items: activeRituals
        }
      },
      {
        type: 'freebies',
        hasContent: hasItems(activeFreebies),
        data: {
          id: "freebies", 
          title: "Freebies",
          tagline: "Download Freebies",
          items: activeFreebies
        }
      }
    ];
  
    // Filter out empty components and sort by those with content
    return components.filter(comp => comp.hasContent);
  }