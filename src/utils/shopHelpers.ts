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
    }).sort((a, b) => {
      // Custom order first, then newest first
      const aOrder = a.data.order ?? 999;
      const bOrder = b.data.order ?? 999;
      
      if (aOrder !== bOrder) {
        return aOrder - bOrder;
      }
      
      const aTime = a.data.updatedAt || a.data.createdAt || 0;
      const bTime = b.data.updatedAt || b.data.createdAt || 0;
      return new Date(bTime).getTime() - new Date(aTime).getTime();
    });
  
    // Filter out expired rituals
    const activeRituals = (rituals || []).filter((ritual) => {
      if (!ritual?.data?.expirationDate) return true;
      const [month, day, year] = ritual.data.expirationDate.split('/');
      const expirationDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      return currentDate <= expirationDate;
    }).sort((a, b) => {
      // Custom order first, then newest first
      const aOrder = a.data.order ?? 999;
      const bOrder = b.data.order ?? 999;
      
      if (aOrder !== bOrder) {
        return aOrder - bOrder;
      }
      
      const aTime = a.data.updatedAt || a.data.createdAt || 0;
      const bTime = b.data.updatedAt || b.data.createdAt || 0;
      return new Date(bTime).getTime() - new Date(aTime).getTime();
    });
     // Filter out expired freebies
     const activeFreebies = (freebies || []).filter((freebie) => {
      if (!freebie?.data?.expirationDate) return true;
      const [month, day, year] = freebie.data.expirationDate.split('/');
      const expirationDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      return currentDate <= expirationDate;
    }).sort((a, b) => {
      // Custom order first, then newest first
      const aOrder = a.data.order ?? 999;
      const bOrder = b.data.order ?? 999;
      
      if (aOrder !== bOrder) {
        return aOrder - bOrder;
      }
      
      const aTime = a.data.updatedAt || a.data.createdAt || 0;
      const bTime = b.data.updatedAt || b.data.createdAt || 0;
      return new Date(bTime).getTime() - new Date(aTime).getTime();
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
    const result = components.filter(comp => comp.hasContent);
    
    // Log the final result for debugging
    console.log('getShopComponents returning:', {
      bundles: result.find(c => c.type === 'bundles')?.data?.items?.map((i: any) => i.slug) || [],
      rituals: result.find(c => c.type === 'rituals')?.data?.items?.map((i: any) => i.slug) || [],
      freebies: result.find(c => c.type === 'freebies')?.data?.items?.map((i: any) => i.slug) || []
    });
    
    return result;
  }