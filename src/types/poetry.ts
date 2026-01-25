export type PoetryType = 'shi' | 'ci' | 'qu' | 'modern' | 'prose';

export interface Poetry {
  id: string;
  title: string;
  author: string;
  dynasty?: string; // e.g., "唐", "宋", "现代"
  content: string[]; // Each string is a line or paragraph
  type: PoetryType;
  intro?: string; // Brief introduction or translation
  tags?: string[];
}

export interface PoetryCollection {
  name: string;
  version: string;
  data: Poetry[];
}
