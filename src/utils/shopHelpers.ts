export function hasItems(items: any[]): boolean {
    return items && items.length > 0;
  }
  
  export async function getShopComponents(bundles: any[] = [], rituals: any[] = [], courses: any[] = [], freebies: any[] = []) {
    // Filter out expired bundles
    const currentDate = new Date();
    const activeBundles = (bundles || []).filter((bundle) => {
      if (!bundle?.data?.expirationDate) return true;
      const [month, day, year] = bundle.data.expirationDate.split('/');
      const expirationDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      return currentDate <= expirationDate;
    }).sort((a, b) => {
      const aOrder = a.data.order ?? 999;
      const bOrder = b.data.order ?? 999;
      if (aOrder !== bOrder) return aOrder - bOrder;
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
      const aOrder = a.data.order ?? 999;
      const bOrder = b.data.order ?? 999;
      if (aOrder !== bOrder) return aOrder - bOrder;
      const aTime = a.data.updatedAt || a.data.createdAt || 0;
      const bTime = b.data.updatedAt || b.data.createdAt || 0;
      return new Date(bTime).getTime() - new Date(aTime).getTime();
    });

    // Courses don't usually expire, but we sort them
    const activeCourses = (courses || []).sort((a, b) => {
      const aOrder = a.data.order ?? 999;
      const bOrder = b.data.order ?? 999;
      if (aOrder !== bOrder) return aOrder - bOrder;
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
      const aOrder = a.data.order ?? 999;
      const bOrder = b.data.order ?? 999;
      if (aOrder !== bOrder) return aOrder - bOrder;
      const aTime = a.data.updatedAt || a.data.createdAt || 0;
      const bTime = b.data.updatedAt || b.data.createdAt || 0;
      return new Date(bTime).getTime() - new Date(aTime).getTime();
    });
  
    // Create array of components with their data
    const components = [
      {
        type: 'courses',
        hasContent: hasItems(activeCourses),
        data: {
          id: "courses",
          title: "Online Courses",
          tagline: "Lifetime Access Courses",
          items: activeCourses
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
  
    const result = components.filter(comp => comp.hasContent);
    
    console.log('getShopComponents returning:', {
      bundles: result.find(c => c.type === 'bundles')?.data?.items?.map((i: any) => i.slug) || [],
      rituals: result.find(c => c.type === 'rituals')?.data?.items?.map((i: any) => i.slug) || [],
      courses: result.find(c => c.type === 'courses')?.data?.items?.map((i: any) => i.slug) || [],
      freebies: result.find(c => c.type === 'freebies')?.data?.items?.map((i: any) => i.slug) || []
    });
    
    return result;
  }