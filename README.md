# 🚀 Postman Collection Generator

A powerful tool that automatically generates Postman collections from XML/WADL files. This tool supports multiple XML formats and provides both a REST API and a user-friendly web interface.

## ✨ Features

- **Multiple XML Format Support**: REST API XML, WADL (Web Application Description Language), and custom XML formats
- **Intelligent Parsing**: Automatically detects and parses different XML structures
- **Complete Postman Collections**: Generates full collections with requests, headers, parameters, and sample data
- **Environment Variables**: Optionally generates Postman environment files
- **Web Interface**: User-friendly drag-and-drop interface
- **REST API**: Programmatic access for automation
- **Sample Files**: Includes sample XML files for testing
- **TypeScript**: Fully typed codebase for better development experience

## 🏗️ Architecture

```
src/
├── types.ts           # Type definitions
├── xmlParser.ts       # XML parsing logic
├── postmanGenerator.ts # Postman collection generation
├── api.ts            # REST API server
└── extension.ts      # Zoho Code IDE extension entry point

samples/               # Sample XML/WADL files
├── rest-api.xml
├── wadl-example.wadl
└── simple-endpoints.xml

public/
└── index.html        # Web interface
```

## 🚦 Quick Start

### 1. Install Dependencies

>>>terminal
npm install
<<<

### 2. Build the Project

>>>terminal
npm run build
<<<

### 3. Start the API Server

>>>terminal
npm start
<<<

### 4. Access the Web Interface

Open your browser to `http://localhost:3000`

## 🎯 Usage

### Web Interface

1. **Upload Files**: Drag and drop XML/WADL files or click to browse
2. **Configure Options**: Set collection name, base URL, and environment preferences
3. **Generate**: Click "Generate Collection" to create your Postman collection
4. **Download**: Save the generated JSON file and import it into Postman

### REST API Endpoints

#### Generate from Uploaded Files
```bash
POST /api/generate
Content-Type: multipart/form-data

# Form fields:
# - xmlFiles: XML/WADL files (multiple)
# - collectionName: string (optional)
# - baseUrl: string (optional) 
# - includeEnvironment: boolean (optional)
```

#### Generate from XML Content
```bash
POST /api/generate/content
Content-Type: application/json

{
  "xmlContent": "<xml>...</xml>",
  "collectionName": "My API Collection",
  "baseUrl": "https://api.example.com",
  "includeEnvironment": false
}
```

#### Get Sample Files
```bash
GET /api/samples
```

#### Health Check
```bash
GET /health
```

## 📋 Supported XML Formats

### 1. REST API XML Format
```xml
<api>
  <info>
    <title>My API</title>
    <version>1.0.0</version>
  </info>
  <baseUrl>https://api.example.com</baseUrl>
  <endpoints>
    <endpoint>
      <path>/users</path>
      <method>GET</method>
      <description>Get all users</description>
      <parameters>
        <param>
          <name>page</name>
          <type>integer</type>
          <required>false</required>
        </param>
      </parameters>
    </endpoint>
  </endpoints>
</api>
```

### 2. WADL (Web Application Description Language)
```xml
<application xmlns="http://wadl.dev.java.net/2009/02">
  <resources base="https://api.example.com">
    <resource path="users">
      <method name="GET">
        <request>
          <param name="page" style="query" type="int"/>
        </request>
        <response status="200"/>
      </method>
    </resource>
  </resources>
</application>
```

### 3. Simple Endpoints XML
```xml
<endpoints>
  <baseUrl>https://api.example.com</baseUrl>
  <endpoint>
    <path>/users</path>
    <method>GET</method>
    <description>Get users</description>
  </endpoint>
</endpoints>
```

## 🔧 Development

### Development Mode
>>>terminal
# Watch mode for development
npm run dev

# API development with auto-restart
npm run dev-api
<<<

### Building
>>>terminal
# Development build
npm run build

# Production build
npm run production-build
<<<

## 🧪 Testing with Sample Files

The tool includes three sample files for testing:

1. **rest-api.xml** - Complete REST API with CRUD operations
2. **wadl-example.wadl** - WADL format with nested resources
3. **simple-endpoints.xml** - Basic endpoint definitions

## 📊 Generated Collection Features

### Request Structure
- **Method**: HTTP method (GET, POST, PUT, DELETE, etc.)
- **URL**: Complete URL with path parameters
- **Headers**: Content-Type, Accept, and Authorization headers
- **Parameters**: Query parameters with sample values
- **Body**: Request body with JSON examples

### Collection Organization
- **Folders**: Automatic grouping when multiple files or many endpoints
- **Names**: Descriptive names generated from paths and descriptions
- **Documentation**: Preserves descriptions and parameter information

### Environment Variables
- **Base URL**: {{baseUrl}} variable
- **Authentication**: {{token}} and {{apiKey}} placeholders
- **Custom Variables**: Extracted from XML attributes

## 🎨 Customization

### Adding New XML Formats

To support additional XML formats, extend the `XMLParser` class:

```typescript
// Add new parsing method in xmlParser.ts
private parseCustomFormat(data: any): XMLParseResult {
  // Your custom parsing logic
  return {
    baseUrl: 'https://api.example.com',
    endpoints: [...],
    info: { ... }
  };
}

// Update main parsing method to detect your format
async parseXMLFile(filePath: string): Promise<XMLParseResult> {
  // ... existing code ...
  
  if (result.customFormat) {
    return this.parseCustomFormat(result.customFormat);
  }
  
  // ... rest of code ...
}
```

### Custom Collection Templates

Modify the `PostmanGenerator` class to customize the output:

```typescript
// Customize headers in postmanGenerator.ts
private generateHeaders(endpoint: APIEndpoint): Array<HeaderType> {
  return [
    { key: 'X-API-Key', value: '{{apiKey}}', type: 'text' },
    // Add your custom headers
  ];
}
```

## 🚨 Error Handling

The tool provides comprehensive error handling:

- **File Upload Errors**: Invalid file types, size limits
- **XML Parsing Errors**: Malformed XML, unsupported formats
- **Generation Errors**: Missing required fields, invalid data
- **API Errors**: Network issues, server errors

## 📈 Performance

- **File Size Limit**: 10MB per file
- **Multiple Files**: Up to 10 files simultaneously
- **Processing Time**: ~1-2 seconds per MB of XML
- **Memory Usage**: Optimized for large XML files

## 🔒 Security

- **File Validation**: Only XML/WADL files accepted
- **Temporary Files**: Automatically cleaned up after processing
- **Input Sanitization**: All user inputs are validated
- **CORS**: Configurable cross-origin requests

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📝 License

This project is licensed under the MIT License.

## 🆘 Support

For issues and questions:
1. Check the sample files for format examples
2. Verify your XML structure matches supported formats
3. Use the web interface for easier debugging
4. Check browser console for detailed error messages

## 🎯 Roadmap

- [ ] OpenAPI/Swagger XML support
- [ ] GraphQL schema generation
- [ ] Batch processing for directories
- [ ] Custom template system
- [ ] CLI tool
- [ ] Docker containerization
- [ ] Integration with CI/CD pipelines

---

Made with ❤️ for developers who love automation!