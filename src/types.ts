/**
 * @fileoverview Type definitions for Postman collection generation.
 */

export interface PostmanItem {
  name: string;
  request: {
    method: string;
    header: Array<{
      key: string;
      value: string;
      type: string;
    }>;
    body?: {
      mode: string;
      raw?: string;
      options?: {
        raw: {
          language: string;
        };
      };
    };
    url: {
      raw: string;
      host: string[];
      port?: string;
      path: string[];
      query?: Array<{
        key: string;
        value: string;
      }>;
    };
  };
  response: any[];
}

export interface PostmanCollection {
  info: {
    _postman_id: string;
    name: string;
    description: string;
    schema: string;
  };
  item: PostmanItem[];
}

export interface APIEndpoint {
  path: string;
  method: string;
  description?: string;
  parameters?: Array<{
    name: string;
    type: string;
    required: boolean;
    description?: string;
  }>;
  requestBody?: {
    contentType: string;
    schema?: any;
    example?: string;
  };
  responses?: {
    [statusCode: string]: {
      description: string;
      example?: any;
    };
  };
  tags?: string[];
}

export interface XMLParseResult {
  baseUrl?: string;
  endpoints: APIEndpoint[];
  info?: {
    title?: string;
    version?: string;
    description?: string;
  };
}