export interface LookupValue {
  id: string;
  category: string;
  value: string;
  displayText: string;
  sortOrder: number;
}

export interface CreateLookupValueRequest {
  category: string;
  value: string;
  displayText: string;
  sortOrder?: number;
}
