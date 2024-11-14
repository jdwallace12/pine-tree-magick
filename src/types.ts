export interface Workshop {
  title: string;
  excerpt: string;
  image: string;
  publishDate?: Date;
  price: number;
  duration: string;
  maxParticipants: number;
  instructor: string;
  category?: string;
  tags?: string[];
} 