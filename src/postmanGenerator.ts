/**
 * @fileoverview Postman collection generator from parsed XML data.
 */

import { v4 as uuidv4 } from 'uuid';
import { PostmanCollection, PostmanItem, APIEndpoint, XMLParseResult } from './types';

export class PostmanGenerator {
  
  /**
   * Generate Postman collection from XML parse results
   */
  generateCollection(
    parseResults: XMLParseResult[], 
    collectionName: string = 'Generated API Collection',
    baseUrl: string = 'https://api.example.com'
  ): PostmanCollection {
    
    const collection: PostmanCollection = {
      info: {
        _postman_id: uuidv4(),
        name: collectionName,
        description: 'Auto-generated Postman collection from XML files',
        schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
      },
      item: []
    };

    // Process each XML file result
    for (const parseResult of parseResults) {
      const folderName = parseResult.info?.title || 'API Endpoints';
      const folderItems: PostmanItem[] = [];

      // Convert each endpoint to Postman item
      for (const endpoint of parseResult.endpoints) {
        const item = this.createPostmanItem(endpoint, parseResult.baseUrl || baseUrl);
        folderItems.push(item);
      }

      // Create folder structure if multiple files or group by tags
      if (parseResults.length > 1 || this.shouldGroupEndpoints(parseResult.endpoints)) {
        const folder = this.createFolder(folderName, folderItems);
        collection.item.push(folder);
      } else {
        collection.item.push(...folderItems);
      }
    }

    return collection;
  }

  /**
   * Create a Postman item from an API endpoint
   */
  private createPostmanItem(endpoint: APIEndpoint, baseUrl: string): PostmanItem {
    const url = this.buildUrl(endpoint.path, baseUrl);
    const parsedUrl = this.parseUrl(url);

    const item: PostmanItem = {
      name: this.generateItemName(endpoint),
      request: {
        method: endpoint.method,
        header: this.generateHeaders(endpoint),
        url: {
          raw: url,
          host: parsedUrl.host,
          path: parsedUrl.path,
          ...(parsedUrl.port && { port: parsedUrl.port }),
          ...(parsedUrl.query && parsedUrl.query.length > 0 && { query: parsedUrl.query })
        }
      },
      response: []
    };

    // Add request body if present
    if (endpoint.requestBody) {
      item.request.body = this.generateRequestBody(endpoint.requestBody);
    }

    // Add query parameters from endpoint parameters
    if (endpoint.parameters) {
      const queryParams = endpoint.parameters
        .filter(param => param.name && !endpoint.path.includes(`{${param.name}}`))
        .map(param => ({
          key: param.name,
          value: this.generateSampleValue(param.type),
          description: param.description
        }));

      if (queryParams.length > 0) {
        item.request.url.query = [...(item.request.url.query || []), ...queryParams];
      }
    }

    return item;
  }

  /**
   * Create a folder structure for grouping endpoints
   */
  private createFolder(name: string, items: PostmanItem[]): any {
    return {
      name,
      item: items,
      description: `API endpoints for ${name}`
    };
  }

  /**
   * Generate item name from endpoint
   */
  private generateItemName(endpoint: APIEndpoint): string {
    if (endpoint.description) {
      return endpoint.description;
    }

    // Generate name from path and method
    const pathParts = endpoint.path.split('/').filter(part => part && !part.startsWith('{'));
    const pathName = pathParts.length > 0 
      ? pathParts[pathParts.length - 1] 
      : 'endpoint';

    return `${endpoint.method} ${pathName}`;
  }

  /**
   * Generate headers for the request
   */
  private generateHeaders(endpoint: APIEndpoint): Array<{ key: string; value: string; type: string }> {
    const headers: Array<{ key: string; value: string; type: string }> = [];

    // Add Content-Type header if there's a request body
    if (endpoint.requestBody) {
      headers.push({
        key: 'Content-Type',
        value: endpoint.requestBody.contentType || 'application/json',
        type: 'text'
      });
    }

    // Add Accept header
    headers.push({
      key: 'Accept',
      value: 'application/json',
      type: 'text'
    });

    // Add Authorization header placeholder
    headers.push({
      key: 'Authorization',
      value: 'Bearer {{token}}',
      type: 'text'
    });

    return headers;
  }

  /**
   * Generate request body
   */
  private generateRequestBody(requestBody: any): any {
    const body: any = {
      mode: 'raw',
      options: {
        raw: {
          language: 'json'
        }
      }
    };

    if (requestBody.example) {
      body.raw = typeof requestBody.example === 'string' 
        ? requestBody.example 
        : JSON.stringify(requestBody.example, null, 2);
    } else if (requestBody.schema) {
      body.raw = JSON.stringify(this.generateSampleFromSchema(requestBody.schema), null, 2);
    } else {
      body.raw = JSON.stringify({
        // Generate a basic sample
        "example": "value"
      }, null, 2);
    }

    return body;
  }

  /**
   * Build full URL from path and base URL
   */
  private buildUrl(path: string, baseUrl: string): string {
    // Clean up base URL
    const cleanBaseUrl = baseUrl.replace(/\/$/, '');
    
    // Clean up path
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    
    return `${cleanBaseUrl}${cleanPath}`;
  }

  /**
   * Parse URL into components
   */
  private parseUrl(url: string): any {
    try {
      const urlObj = new URL(url);
      
      return {
        host: urlObj.hostname.split('.'),
        port: urlObj.port || undefined,
        path: urlObj.pathname.split('/').filter(segment => segment),
        query: Array.from(urlObj.searchParams.entries()).map(([key, value]) => ({
          key,
          value
        }))
      };
    } catch (error) {
      // Fallback parsing
      const parts = url.split('/');
      return {
        host: ['api', 'example', 'com'],
        path: parts.slice(3).filter(segment => segment),
        query: []
      };
    }
  }

  /**
   * Generate sample value based on parameter type
   */
  private generateSampleValue(type: string): string {
    switch (type.toLowerCase()) {
      case 'integer':
      case 'int':
      case 'number':
        return '123';
      case 'boolean':
      case 'bool':
        return 'true';
      case 'date':
        return '2024-01-01';
      case 'datetime':
        return '2024-01-01T00:00:00Z';
      case 'email':
        return 'user@example.com';
      case 'uuid':
        return uuidv4();
      case 'string':
      default:
        return 'sample_value';
    }
  }

  /**
   * Generate sample data from schema
   */
  private generateSampleFromSchema(schema: any): any {
    if (!schema || typeof schema !== 'object') {
      return { example: 'value' };
    }

    const sample: any = {};
    
    if (schema.properties) {
      for (const [key, prop] of Object.entries(schema.properties)) {
        const propSchema = prop as any;
        switch (propSchema.type) {
          case 'string':
            sample[key] = propSchema.example || this.generateSampleValue('string');
            break;
          case 'integer':
          case 'number':
            sample[key] = propSchema.example || 123;
            break;
          case 'boolean':
            sample[key] = propSchema.example || true;
            break;
          case 'array':
            sample[key] = propSchema.example || ['item1', 'item2'];
            break;
          case 'object':
            sample[key] = propSchema.example || this.generateSampleFromSchema(propSchema);
            break;
          default:
            sample[key] = propSchema.example || 'value';
        }
      }
    }

    return Object.keys(sample).length > 0 ? sample : { example: 'value' };
  }

  /**
   * Check if endpoints should be grouped
   */
  private shouldGroupEndpoints(endpoints: APIEndpoint[]): boolean {
    // Group if there are more than 5 endpoints or if they have tags
    return endpoints.length > 5 || endpoints.some(ep => ep.tags && ep.tags.length > 0);
  }

  /**
   * Generate collection with environment variables
   */
  generateCollectionWithEnvironment(
    parseResults: XMLParseResult[], 
    collectionName: string = 'Generated API Collection',
    environmentName: string = 'API Environment'
  ): { collection: PostmanCollection; environment: any } {
    
    const collection = this.generateCollection(parseResults, collectionName);
    
    // Extract unique base URLs for environment variables
    const baseUrls = [...new Set(parseResults.map(result => result.baseUrl).filter(Boolean))];
    
    const environment = {
      id: uuidv4(),
      name: environmentName,
      values: [
        {
          key: 'baseUrl',
          value: baseUrls[0] || 'https://api.example.com',
          enabled: true
        },
        {
          key: 'token',
          value: 'your-api-token-here',
          enabled: true
        },
        {
          key: 'apiKey',
          value: 'your-api-key-here',
          enabled: true
        }
      ]
    };

    return { collection, environment };
  }
}