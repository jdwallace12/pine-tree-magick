import { z, defineCollection } from 'astro:content';

const metadataDefinition = () =>
  z
    .object({
      title: z.string().optional(),
      ignoreTitleTemplate: z.boolean().optional(),

      canonical: z.string().url().optional(),

      robots: z
        .object({
          index: z.boolean().optional(),
          follow: z.boolean().optional(),
        })
        .optional(),

      description: z.string().optional(),

      openGraph: z
        .object({
          url: z.string().optional(),
          siteName: z.string().optional(),
          images: z
            .array(
              z.object({
                url: z.string(),
                width: z.number().optional(),
                height: z.number().optional(),
              })
            )
            .optional(),
          locale: z.string().optional(),
          type: z.string().optional(),
        })
        .optional(),

      twitter: z
        .object({
          handle: z.string().optional(),
          site: z.string().optional(),
          cardType: z.string().optional(),
        })
        .optional(),
    })
    .optional();

const postCollection = defineCollection({
  schema: z.object({
    publishDate: z.date().optional(),
    updateDate: z.date().optional(),
    draft: z.boolean().optional(),

    title: z.string(),
    excerpt: z.string().optional(),
    image: z.string().optional(),

    category: z.string().optional(),
    tags: z.array(z.string()).optional(),
    author: z.string().optional(),

    metadata: metadataDefinition(),
  }),
});

const workshopCollection = defineCollection({
  schema: z.object({
    title: z.string(),
    description: z.string(),
    excerpt: z.string(),
    image: z.string(),
    date: z.string(),
    time: z.string(),
    price: z.number(),
    location: z.string(),
    signupLink: z.string(),
    maxParticipants: z.number(),
    category: z.string().optional(),
    tags: z.array(z.string()).optional(),
    metadata: metadataDefinition(),
  }),
});

const ritualCollection = defineCollection({
  schema: z.object({
    title: z.string(),
    description: z.string(),
    image: z.string(),
    price: z.number(),
    payPalButtonId: z.string(),
    expirationDate: z.string().optional(),
    metadata: metadataDefinition(),
  }),
});

const bundleCollection = defineCollection({
  schema: z.object({
    title: z.string(),
    description: z.string(),
    image: z.string(),
    price: z.number(),
    payPalButtonId: z.string(),
    expirationDate: z.string().optional(),
    metadata: metadataDefinition(),
  }),
});

const freebieCollection = defineCollection({
  schema: z.object({
    title: z.string(),
    description: z.string(),
    image: z.string(),
    expirationDate: z.string().optional(),
    pdfUrl: z.string(),
    metadata: metadataDefinition(),
  }),
});

const courseCollection = defineCollection({
  schema: z.object({
    title: z.string(),
    description: z.string(),
    excerpt: z.string(),
    image: z.string(),
    price: z.number(),
    duration: z.string(), // e.g., "8 weeks", "3 months"
    level: z.enum(['beginner', 'intermediate', 'advanced']),
    category: z.string(),
    tags: z.array(z.string()).optional(),
    lessons: z.array(z.object({
      title: z.string(),
      description: z.string(),
      duration: z.string(), // e.g., "45 minutes"
      videoUrl: z.string().optional(),
      content: z.string().optional(), // MDX content
      resources: z.array(z.object({
        name: z.string(),
        type: z.enum(['pdf', 'video', 'audio', 'link']),
        url: z.string(),
      })).optional(),
    })),
    requirements: z.array(z.string()).optional(),
    outcomes: z.array(z.string()).optional(),
    instructor: z.string(),
    publishDate: z.date().optional(),
    updateDate: z.date().optional(),
    draft: z.boolean().optional(),
    metadata: metadataDefinition(),
  }),
});

export const collections = {
  post: postCollection,
  workshop: workshopCollection,
  ritual: ritualCollection,
  bundle: bundleCollection,
  freebie: freebieCollection,
  course: courseCollection,
};
