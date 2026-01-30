// Data Model Definition (V8.0)
import type { LayoutStrategy } from '../utils/layoutEngine/types';

export interface Poetry {
  id: string;
  title: string;
  author: string;
  dynasty: string;
  
  // V8.0 Core Fields
  layout_strategy: LayoutStrategy;
  content_json: string; // JSON string to be parsed
  
  // Auxiliary
  tags: string[];
  source: string;
}
