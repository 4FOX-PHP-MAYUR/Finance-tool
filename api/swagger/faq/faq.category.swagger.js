// faq.swagger.js
const faqCategorySwaggerDoc = {
  components: {
    schemas: {
      faqCategory: {
        type: 'object',
        required: ['category', 'question', 'answer'],
        properties: {
          _id: {
            type: 'string',
            description: 'The auto-generated ID of the FAQ',
          },
          category: {
            type: 'string',
            description: 'The ID of the associated FAQ category',
          },
         
          isActive: {
            type: 'boolean',
            description: 'Indicates if the FAQ is active',
            default: true,
          },
          isDeleted: {
            type: 'boolean',
            description: 'Indicates if the FAQ is deleted',
            default: false,
          },
          createdAt: {
            type: 'string',
            format: 'date-time',
            description: 'The date and time when the FAQ was created',
          },
          updatedAt: {
            type: 'string',
            format: 'date-time',
            description: 'The date and time when the FAQ was last updated',
          },
        },
      },
    },
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },
  },
  paths: {
    '/admin/api/faq/category': {
      post: {
        summary: 'Add a new FAQ category',
        tags: ['FAQ Categories'],
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['category'],
                properties: {
                  category: {
                    type: 'string',
                    description: 'The name of the FAQ category',
                    example: 'General',
                  },
                },
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'Successfully created the FAQ category',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/faqCategory' },
              },
            },
          },
          '400': {
            description: 'Bad request, possibly due to validation errors',
          },
          '401': {
            description: 'Unauthorized, authentication required',
          },
          '500': {
            description: 'Internal server error',
          },
        },
      },
      get: {
        summary: 'Get all FAQ categories',
        tags: ['FAQ Categories'],
        security: [{ bearerAuth: [] }],
        responses: {
          '200': {
            description: 'A list of all FAQ categories',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: { $ref: '#/components/schemas/faqCategory' },
                },
              },
            },
          },
          '401': {
            description: 'Unauthorized, authentication required',
          },
          '500': {
            description: 'Internal server error',
          },
        },
      },
    },
    '/admin/api/faq/category/{categoryId}': {
      get: {
        summary: 'Get a specific FAQ category by ID',
        tags: ['FAQ Categories'],
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: {
              type: 'string',
            },
            description: 'The ID of the FAQ category to retrieve',
          },
        ],
        responses: {
          '200': {
            description: 'Details of the specified FAQ category',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/faqCategory' },
              },
            },
          },
          '404': {
            description: 'FAQ category not found',
          },
          '401': {
            description: 'Unauthorized, authentication required',
          },
          '500': {
            description: 'Internal server error',
          },
        },
      },
      patch: {
        summary: 'Update a specific FAQ category by ID',
        tags: ['FAQ Categories'],
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: {
              type: 'string',
            },
            description: 'The ID of the FAQ category to update',
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  category: {
                    type: 'string',
                    description: 'The updated name of the FAQ category',
                  },
                  question: {
                    type: 'string',
                    description: 'The updated question text',
                  },
                  answer: {
                    type: 'string',
                    description: 'The updated answer text',
                  },
                  isActive: {
                    type: 'boolean',
                    description: 'Whether the FAQ is active',
                  },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Successfully updated the FAQ category',
          },
          '400': {
            description: 'Bad request, possibly due to validation errors',
          },
          '404': {
            description: 'FAQ category not found',
          },
          '401': {
            description: 'Unauthorized, authentication required',
          },
          '500': {
            description: 'Internal server error',
          },
        },
      },
      delete: {
        summary: 'Delete a specific FAQ category by ID',
        tags: ['FAQ Categories'],
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: {
              type: 'string',
            },
            description: 'The ID of the FAQ category to delete',
          },
        ],
        responses: {
          '204': {
            description: 'Successfully deleted the FAQ category',
          },
          '404': {
            description: 'FAQ category not found',
          },
          '401': {
            description: 'Unauthorized, authentication required',
          },
          '500': {
            description: 'Internal server error',
          },
        },
      },
    },
    '/admin/api/faq/category/update-status{categoryId}': {
     
      patch: {
        summary: 'Update status of a specific FAQ category by ID',
        tags: ['FAQ Categories'],
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: {
              type: 'string',
            },
            description: 'The ID of the FAQ category to update status',
          },
        ],
       
        responses: {
          '200': {
            description: 'Successfully updated the status FAQ category',
          },
          '400': {
            description: 'Bad request, possibly due to validation errors',
          },
          '404': {
            description: 'FAQ category not found',
          },
          '401': {
            description: 'Unauthorized, authentication required',
          },
          '500': {
            description: 'Internal server error',
          },
        },
      },
      
    },
  },
};

module.exports = faqCategorySwaggerDoc;
