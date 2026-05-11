export type RouteLabel = 'SIMPLE' | 'COMPLEX' | 'TOOL';
export type Source = 'line' | 'simulation';

export interface RequestLog {
  id: number;
  created_at: string;
  source: Source;
  user_id: string;
  message_text: string | null;
  attachment_type: string | null;
  route_label: RouteLabel;
  classifier_model: string;
  response_model: string;
  classifier_input_tokens: number;
  classifier_output_tokens: number;
  response_input_tokens: number;
  response_output_tokens: number;
  total_cost_usd: number;
  response_time_ms: number;
  response_text: string | null;
  error: string | null;
}

export interface PaginatedLogs {
  logs: RequestLog[];
  total: number;
  page: number;
  per_page: number;
}
