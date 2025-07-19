"use strict";
/**
 * @fileoverview Postman collection generator from parsed XML data.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.PostmanGenerator = void 0;
const uuid_1 = require("uuid");
class PostmanGenerator {
    /**
     * Generate Postman collection from XML parse results
     */
    generateCollection(parseResults, collectionName = 'Generated API Collection', baseUrl = 'https://api.example.com') {
        var _a;
        const collection = {
            info: {
                _postman_id: (0, uuid_1.v4)(),
                name: collectionName,
                description: 'Auto-generated Postman collection from XML files',
                schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
            },
            item: []
        };
        // Process each XML file result
        for (const parseResult of parseResults) {
            const folderName = ((_a = parseResult.info) === null || _a === void 0 ? void 0 : _a.title) || 'API Endpoints';
            const folderItems = [];
            // Convert each endpoint to Postman item
            for (const endpoint of parseResult.endpoints) {
                const item = this.createPostmanItem(endpoint, parseResult.baseUrl || baseUrl);
                folderItems.push(item);
            }
            // Create folder structure if multiple files or group by tags
            if (parseResults.length > 1 || this.shouldGroupEndpoints(parseResult.endpoints)) {
                const folder = this.createFolder(folderName, folderItems);
                collection.item.push(folder);
            }
            else {
                collection.item.push(...folderItems);
            }
        }
        return collection;
    }
    /**
     * Create a Postman item from an API endpoint
     */
    createPostmanItem(endpoint, baseUrl) {
        const url = this.buildUrl(endpoint.path, baseUrl);
        const parsedUrl = this.parseUrl(url);
        const item = {
            name: this.generateItemName(endpoint),
            request: {
                method: endpoint.method,
                header: this.generateHeaders(endpoint),
                url: Object.assign(Object.assign({ raw: url, host: parsedUrl.host, path: parsedUrl.path }, (parsedUrl.port && { port: parsedUrl.port })), (parsedUrl.query && parsedUrl.query.length > 0 && { query: parsedUrl.query }))
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
    createFolder(name, items) {
        return {
            name,
            item: items,
            description: `API endpoints for ${name}`
        };
    }
    /**
     * Generate item name from endpoint
     */
    generateItemName(endpoint) {
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
    generateHeaders(endpoint) {
        const headers = [];
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
    generateRequestBody(requestBody) {
        const body = {
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
        }
        else if (requestBody.schema) {
            body.raw = JSON.stringify(this.generateSampleFromSchema(requestBody.schema), null, 2);
        }
        else {
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
    buildUrl(path, baseUrl) {
        // Clean up base URL
        const cleanBaseUrl = baseUrl.replace(/\/$/, '');
        // Clean up path
        const cleanPath = path.startsWith('/') ? path : `/${path}`;
        return `${cleanBaseUrl}${cleanPath}`;
    }
    /**
     * Parse URL into components
     */
    parseUrl(url) {
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
        }
        catch (error) {
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
    generateSampleValue(type) {
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
                return (0, uuid_1.v4)();
            case 'string':
            default:
                return 'sample_value';
        }
    }
    /**
     * Generate sample data from schema
     */
    generateSampleFromSchema(schema) {
        if (!schema || typeof schema !== 'object') {
            return { example: 'value' };
        }
        const sample = {};
        if (schema.properties) {
            for (const [key, prop] of Object.entries(schema.properties)) {
                const propSchema = prop;
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
    shouldGroupEndpoints(endpoints) {
        // Group if there are more than 5 endpoints or if they have tags
        return endpoints.length > 5 || endpoints.some(ep => ep.tags && ep.tags.length > 0);
    }
    /**
     * Generate collection with environment variables
     */
    generateCollectionWithEnvironment(parseResults, collectionName = 'Generated API Collection', environmentName = 'API Environment') {
        const collection = this.generateCollection(parseResults, collectionName);
        // Extract unique base URLs for environment variables
        const baseUrls = [...new Set(parseResults.map(result => result.baseUrl).filter(Boolean))];
        const environment = {
            id: (0, uuid_1.v4)(),
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
exports.PostmanGenerator = PostmanGenerator;
//# sourceMappingURL=postmanGenerator.js.map