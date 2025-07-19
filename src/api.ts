/**
 * @fileoverview REST API server for Postman collection generation.
 */

import express from 'express';
import * as fs from 'fs';
import * as path from 'path';
import multer from 'multer';
import { XMLParser } from './xmlParser';
import { PostmanGenerator } from './postmanGenerator';

const app = express();
const PORT = process.env.PORT || 3000;

// Configure multer for file uploads
const upload = multer({
  dest: 'uploads/',
  fileFilter: (req, file, cb) => {
    // Accept XML and WADL files
    const allowedExtensions = ['.xml', '.wadl'];
    const ext = path.extname(file.originalname).toLowerCase();
    
    if (allowedExtensions.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Only XML and WADL files are allowed'));
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

// Middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// CORS middleware
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

// Initialize services
const xmlParser = new XMLParser();
const postmanGenerator = new PostmanGenerator();

/**
 * Health check endpoint
 */
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    service: 'Postman Collection Generator'
  });
});

/**
 * Get API information
 */
app.get('/api/info', (req, res) => {
  res.json({
    name: 'Postman Collection Generator API',
    version: '1.0.0',
    description: 'Generate Postman collections from XML/WADL files',
    endpoints: {
      'POST /api/generate': 'Generate collection from uploaded XML files',
      'POST /api/generate/url': 'Generate collection from XML content via URL',
      'POST /api/generate/content': 'Generate collection from XML content',
      'GET /api/samples': 'Get sample XML files'
    }
  });
});

/**
 * Generate Postman collection from uploaded XML files
 */
app.post('/api/generate', upload.array('xmlFiles', 10), async (req, res) => {
  try {
    const files = req.files as Express.Multer.File[];
    
    if (!files || files.length === 0) {
      return res.status(400).json({ 
        error: 'No XML files provided',
        message: 'Please upload at least one XML or WADL file'
      });
    }

    const { collectionName, baseUrl, includeEnvironment } = req.body;
    
    // Parse all uploaded XML files
    const parseResults = [];
    const errors = [];

    for (const file of files) {
      try {
        const result = await xmlParser.parseXMLFile(file.path);
        parseResults.push(result);
      } catch (error) {
        errors.push({
          file: file.originalname,
          error: error.message
        });
      }
      
      // Clean up uploaded file
      fs.unlinkSync(file.path);
    }

    if (parseResults.length === 0) {
      return res.status(400).json({
        error: 'Failed to parse any XML files',
        details: errors
      });
    }

    // Generate Postman collection
    const finalCollectionName = collectionName || 'Generated API Collection';
    
    if (includeEnvironment === 'true') {
      const result = postmanGenerator.generateCollectionWithEnvironment(
        parseResults,
        finalCollectionName,
        `${finalCollectionName} Environment`
      );
      
      res.json({
        success: true,
        collection: result.collection,
        environment: result.environment,
        summary: {
          totalEndpoints: parseResults.reduce((sum, result) => sum + result.endpoints.length, 0),
          filesProcessed: parseResults.length,
          errors: errors.length > 0 ? errors : undefined
        }
      });
    } else {
      const collection = postmanGenerator.generateCollection(
        parseResults,
        finalCollectionName,
        baseUrl
      );
      
      res.json({
        success: true,
        collection,
        summary: {
          totalEndpoints: parseResults.reduce((sum, result) => sum + result.endpoints.length, 0),
          filesProcessed: parseResults.length,
          errors: errors.length > 0 ? errors : undefined
        }
      });
    }

  } catch (error) {
    console.error('Generation error:', error);
    res.status(500).json({
      error: 'Failed to generate collection',
      message: error.message
    });
  }
});

/**
 * Generate collection from XML content provided directly
 */
app.post('/api/generate/content', async (req, res) => {
  try {
    const { xmlContent, collectionName, baseUrl, includeEnvironment } = req.body;
    
    if (!xmlContent) {
      return res.status(400).json({
        error: 'No XML content provided',
        message: 'Please provide XML content in the request body'
      });
    }

    // Create temporary file
    const tempFile = path.join(__dirname, '../temp', `temp_${Date.now()}.xml`);
    const tempDir = path.dirname(tempFile);
    
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    
    fs.writeFileSync(tempFile, xmlContent);

    try {
      // Parse XML content
      const parseResult = await xmlParser.parseXMLFile(tempFile);
      
      // Generate collection
      const finalCollectionName = collectionName || 'Generated API Collection';
      
      if (includeEnvironment) {
        const result = postmanGenerator.generateCollectionWithEnvironment(
          [parseResult],
          finalCollectionName,
          `${finalCollectionName} Environment`
        );
        
        res.json({
          success: true,
          collection: result.collection,
          environment: result.environment,
          summary: {
            totalEndpoints: parseResult.endpoints.length
          }
        });
      } else {
        const collection = postmanGenerator.generateCollection(
          [parseResult],
          finalCollectionName,
          baseUrl
        );
        
        res.json({
          success: true,
          collection,
          summary: {
            totalEndpoints: parseResult.endpoints.length
          }
        });
      }

    } finally {
      // Clean up temp file
      if (fs.existsSync(tempFile)) {
        fs.unlinkSync(tempFile);
      }
    }

  } catch (error) {
    console.error('Content generation error:', error);
    res.status(500).json({
      error: 'Failed to generate collection from content',
      message: error.message
    });
  }
});

/**
 * Get sample XML files for testing
 */
app.get('/api/samples', (req, res) => {
  const samplesDir = path.join(__dirname, '../samples');
  
  try {
    const files = fs.readdirSync(samplesDir).filter(file => 
      file.endsWith('.xml') || file.endsWith('.wadl')
    );
    
    const samples = files.map(file => {
      const filePath = path.join(samplesDir, file);
      const content = fs.readFileSync(filePath, 'utf8');
      
      return {
        name: file,
        description: `Sample ${path.extname(file).toUpperCase()} file`,
        content: content
      };
    });
    
    res.json({
      success: true,
      samples
    });
    
  } catch (error) {
    res.json({
      success: true,
      samples: [],
      message: 'No sample files available'
    });
  }
});

/**
 * Download generated collection as JSON file
 */
app.post('/api/download', (req, res) => {
  try {
    const { collection, filename } = req.body;
    
    if (!collection) {
      return res.status(400).json({
        error: 'No collection provided'
      });
    }
    
    const fileName = filename || `postman-collection-${Date.now()}.json`;
    
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.setHeader('Content-Type', 'application/json');
    res.send(JSON.stringify(collection, null, 2));
    
  } catch (error) {
    res.status(500).json({
      error: 'Failed to prepare download',
      message: error.message
    });
  }
});

// Error handling middleware
app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled error:', error);
  
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        error: 'File too large',
        message: 'Maximum file size is 10MB'
      });
    }
    return res.status(400).json({
      error: 'File upload error',
      message: error.message
    });
  }
  
  res.status(500).json({
    error: 'Internal server error',
    message: error.message
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not found',
    message: `Endpoint ${req.method} ${req.path} not found`
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Postman Collection Generator API running on port ${PORT}`);
  console.log(`📖 API Documentation available at http://localhost:${PORT}/api/info`);
  console.log(`🏥 Health check available at http://localhost:${PORT}/health`);
});

export default app;