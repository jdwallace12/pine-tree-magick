export type Option =
  | string
  | {
      text: string;
      image?: string;
      qualities?: Record<string, number>;
      next?: string | number;
    };

export interface Question {
  id: string | number;
  type: 'multiple-choice' | 'text' | 'image-grid' | 'image-row' | 'reveal-grid' | 'reveal-row';
  question: string;
  image?: string;
  options?: Option[]; // for multiple choice, image-grid, or image-row
  answer?: string;
  flip?: boolean;
  hideText?: boolean;
  hideFeedback?: boolean;
  next?: string | number;
}
