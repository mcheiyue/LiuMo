export type PoetryType = 'shi' | 'ci' | 'qu' | 'modern' | 'prose';

export interface Poetry {
  id: string;
  title: string;
  author: string;
  dynasty: string;
  content: string[];
  type: string; // 'shi' | 'ci' | 'qu' | 'modern' | 'prose'

  // New fields (V7.0)
  layout_strategy?: string;
  content_json?: string;
  display_content?: string;
  tags?: string;
  search_content?: string;
}


export interface PoetryCollection {
  name: string;
  version: string;
  data: Poetry[];
}
