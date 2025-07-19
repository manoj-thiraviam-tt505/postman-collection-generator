/**
 * @fileoverview XML parser for extracting API endpoints from XML files.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as xml2js from 'xml2js';
import { APIEndpoint, XMLParseResult } from './types';

export class XMLParser {
  
  /**
   * Parse XML file and extract API endpoints
   */
  async parseXMLFile(filePath: string): Promise<XMLParseResult> {
    try {
      const xmlContent = fs.readFileSync(filePath, 'utf8');
      const parser = new xml2js.Parser({ explicitArray: false, ignoreAttrs: false });
      
      const result = await parser.parseStringPromise(xmlContent);
      
      // Handle different XML formats
      if (result.wadl) {
        return this.parseWADL(result.wadl);
      } else if (result.application) {
        return this.parseWADLApplication(result.application);
      } else if (result.api) {
        return this.parseGenericAPI(result.api);
      } else if (result.endpoints || result.resources) {
        return this.parseGenericEndpoints(result);
      } else {
        // Try to extract endpoints from any structure
        return this.parseGenericStructure(result);
      }
      
    } catch (error) {
      throw new Error(`Failed to parse XML file: ${error.message}`);
    }
  }

  /**
   * Parse WADL (Web Application Description Language) format
   */
  private parseWADL(wadl: any): XMLParseResult {
    const endpoints: APIEndpoint[] = [];
    const baseUrl = wadl.$ && wadl.$.base ? wadl.$.base : '';
    
    if (wadl.resources) {
      const resources = Array.isArray(wadl.resources) ? wadl.resources : [wadl.resources];
      
      for (const resourceGroup of resources) {
        if (resourceGroup.resource) {
          const resourceList = Array.isArray(resourceGroup.resource) 
            ? resourceGroup.resource 
            : [resourceGroup.resource];
            
          for (const resource of resourceList) {
            endpoints.push(...this.parseWADLResource(resource, ''));
          }
        }
      }
    }
    
    return {
      baseUrl,
      endpoints,
      info: {
        title: wadl.$ && wadl.$.title ? wadl.$.title : 'API Documentation',
        description: 'Generated from WADL XML'
      }
    };
  }

  /**
   * Parse WADL Application format
   */
  private parseWADLApplication(application: any): XMLParseResult {
    return this.parseWADL({ resources: application });
  }

  /**
   * Parse WADL resource recursively
   */
  private parseWADLResource(resource: any, basePath: string): APIEndpoint[] {
    const endpoints: APIEndpoint[] = [];
    const currentPath = basePath + (resource.$ && resource.$.path ? resource.$.path : '');
    
    // Parse methods for this resource
    if (resource.method) {
      const methods = Array.isArray(resource.method) ? resource.method : [resource.method];
      
      for (const method of methods) {
        const endpoint: APIEndpoint = {
          path: currentPath,
          method: method.$ && method.$.name ? method.$.name.toUpperCase() : 'GET',
          description: method.$ && method.$.id ? method.$.id : undefined,
          parameters: [],
          responses: {}
        };
        
        // Parse parameters
        if (method.request && method.request.param) {
          const params = Array.isArray(method.request.param) 
            ? method.request.param 
            : [method.request.param];
            
          for (const param of params) {
            if (param.$) {
              endpoint.parameters!.push({
                name: param.$.name,
                type: param.$.type || 'string',
                required: param.$.required === 'true',
                description: param.$.doc || undefined
              });
            }
          }
        }
        
        // Parse responses
        if (method.response) {
          const responses = Array.isArray(method.response) 
            ? method.response 
            : [method.response];
            
          for (const response of responses) {
            const status = response.$ && response.$.status ? response.$.status : '200';
            endpoint.responses![status] = {
              description: response.$ && response.$.doc ? response.$.doc : 'Success'
            };
          }
        }
        
        endpoints.push(endpoint);
      }
    }
    
    // Parse nested resources
    if (resource.resource) {
      const nestedResources = Array.isArray(resource.resource) 
        ? resource.resource 
        : [resource.resource];
        
      for (const nested of nestedResources) {
        endpoints.push(...this.parseWADLResource(nested, currentPath));
      }
    }
    
    return endpoints;
  }

  /**
   * Parse generic API format
   */
  private parseGenericAPI(api: any): XMLParseResult {
    const endpoints: APIEndpoint[] = [];
    
    if (api.endpoints && api.endpoints.endpoint) {
      const endpointList = Array.isArray(api.endpoints.endpoint) 
        ? api.endpoints.endpoint 
        : [api.endpoints.endpoint];
        
      for (const endpoint of endpointList) {
        endpoints.push(this.parseGenericEndpoint(endpoint));
      }
    }
    
    return {
      baseUrl: api.baseUrl || api.host || '',
      endpoints,
      info: {
        title: api.name || api.title || 'API Documentation',
        version: api.version || '1.0.0',
        description: api.description || 'Generated from XML'
      }
    };
  }

  /**
   * Parse generic endpoints format
   */
  private parseGenericEndpoints(data: any): XMLParseResult {
    const endpoints: APIEndpoint[] = [];
    
    const endpointSources = [
      data.endpoints?.endpoint,
      data.resources?.resource,
      data.endpoint,
      data.resource
    ].filter(Boolean);
    
    for (const source of endpointSources) {
      const items = Array.isArray(source) ? source : [source];
      for (const item of items) {
        endpoints.push(this.parseGenericEndpoint(item));
      }
    }
    
    return {
      baseUrl: data.baseUrl || data.host || '',
      endpoints,
      info: {
        title: data.name || data.title || 'API Documentation',
        version: data.version || '1.0.0',
        description: data.description || 'Generated from XML'
      }
    };
  }

  /**
   * Parse generic structure by looking for common patterns
   */
  private parseGenericStructure(data: any): XMLParseResult {
    const endpoints: APIEndpoint[] = [];
    
    // Recursively search for endpoint-like structures
    this.findEndpoints(data, endpoints);
    
    return {
      baseUrl: '',
      endpoints,
      info: {
        title: 'API Documentation',
        version: '1.0.0',
        description: 'Generated from XML structure'
      }
    };
  }

  /**
   * Recursively find endpoints in any structure
   */
  private findEndpoints(obj: any, endpoints: APIEndpoint[], path: string = ''): void {
    if (!obj || typeof obj !== 'object') return;
    
    // Check if current object looks like an endpoint
    if (this.looksLikeEndpoint(obj)) {
      endpoints.push(this.parseGenericEndpoint(obj, path));
    }
    
    // Recursively search in nested objects
    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'object') {
        const newPath = path ? `${path}/${key}` : key;
        if (Array.isArray(value)) {
          value.forEach((item, index) => {
            this.findEndpoints(item, endpoints, `${newPath}[${index}]`);
          });
        } else {
          this.findEndpoints(value, endpoints, newPath);
        }
      }
    }
  }

  /**
   * Check if object looks like an endpoint definition
   */
  private looksLikeEndpoint(obj: any): boolean {
    const hasPath = obj.path || obj.url || obj.endpoint || obj.uri;
    const hasMethod = obj.method || obj.verb || obj.httpMethod;
    const hasEndpointLikeProps = obj.request || obj.response || obj.parameters;
    
    return Boolean(hasPath || hasMethod || hasEndpointLikeProps);
  }

  /**
   * Parse a generic endpoint object
   */
  private parseGenericEndpoint(endpoint: any, fallbackPath: string = ''): APIEndpoint {
    const path = endpoint.path || endpoint.url || endpoint.endpoint || endpoint.uri || fallbackPath || '/';
    const method = endpoint.method || endpoint.verb || endpoint.httpMethod || 'GET';
    
    const result: APIEndpoint = {
      path: path.toString(),
      method: method.toString().toUpperCase(),
      description: endpoint.description || endpoint.summary || endpoint.doc,
      parameters: [],
      responses: {}
    };
    
    // Parse parameters
    if (endpoint.parameters || endpoint.params) {
      const params = endpoint.parameters || endpoint.params;
      const paramList = Array.isArray(params) ? params : [params];
      
      for (const param of paramList) {
        if (param) {
          result.parameters!.push({
            name: param.name || param.key || 'param',
            type: param.type || param.dataType || 'string',
            required: param.required === true || param.required === 'true',
            description: param.description || param.doc
          });
        }
      }
    }
    
    // Parse request body
    if (endpoint.requestBody || endpoint.body || endpoint.payload) {
      const body = endpoint.requestBody || endpoint.body || endpoint.payload;
      result.requestBody = {
        contentType: body.contentType || 'application/json',
        schema: body.schema,
        example: body.example
      };
    }
    
    // Parse responses
    if (endpoint.responses || endpoint.response) {
      const responses = endpoint.responses || endpoint.response;
      if (Array.isArray(responses)) {
        responses.forEach(resp => {
          const status = resp.status || resp.statusCode || '200';
          result.responses![status] = {
            description: resp.description || 'Response',
            example: resp.example
          };
        });
      } else if (typeof responses === 'object') {
        for (const [status, resp] of Object.entries(responses)) {
          result.responses![status] = {
            description: (resp as any).description || 'Response',
            example: (resp as any).example
          };
        }
      }
    }
    
    return result;
  }

  /**
   * Parse multiple XML files from a directory
   */
  async parseDirectory(dirPath: string): Promise<XMLParseResult[]> {
    const results: XMLParseResult[] = [];
    
    try {
      const files = fs.readdirSync(dirPath);
      const xmlFiles = files.filter(file => 
        file.toLowerCase().endsWith('.xml') || 
        file.toLowerCase().endsWith('.wadl')
      );
      
      for (const file of xmlFiles) {
        const filePath = path.join(dirPath, file);
        try {
          const result = await this.parseXMLFile(filePath);
          results.push(result);
        } catch (error) {
          console.error(`Failed to parse ${file}:`, error.message);
        }
      }
      
    } catch (error) {
      throw new Error(`Failed to read directory: ${error.message}`);
    }
    
    return results;
  }
}