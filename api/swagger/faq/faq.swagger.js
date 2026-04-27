// faq.swagger.js
const faqSwaggerDoc = {
  components: {
    schemas: {
      faq: {
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
          question: {
            type: 'string',
            description: 'The question text for the FAQ',
          },
          answer: {
            type: 'string',
            description: 'The answer text for the FAQ',
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
    '/admin/api/faq': {
      post: {
        summary: 'Add a new FAQ',
        tags: ['FAQs'],
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['category', 'question', 'answer'],
                properties: {
                  category: {
                    type: 'string',
                    description: 'The ID of the associated FAQ category',
                  },
                  question: {
                    type: 'string',
                    description: 'The question text for the FAQ',
                  },
                  answer: {
                    type: 'string',
                    description: 'The answer text for the FAQ',
                  },
                },
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'Successfully created the FAQ',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/faq' },
              },
            },
          },
          '400': {
            description: 'Bad request, possibly due to validation errors',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    message: { type: 'string', example: 'Validation error message' },
                  },
                },
              },
            },
          },
          '401': {
            description: 'Unauthorized, authentication required',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    message: { type: 'string', example: 'Unauthorized' },
                  },
                },
              },
            },
          },
          '500': {
            description: 'Internal server error',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    message: { type: 'string', example: 'An error occurred while creating the FAQ' },
                  },
                },
              },
            },
          },
        },
      },
      get: {
        summary: 'Retrieve all FAQs',
        tags: ['FAQs'],
        security: [{ bearerAuth: [] }],
        responses: {
          '200': {
            description: 'A list of FAQs',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: { $ref: '#/components/schemas/faq' },
                },
              },
            },
          },
          '401': {
            description: 'Unauthorized, authentication required',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    message: { type: 'string', example: 'Unauthorized' },
                  },
                },
              },
            },
          },
          '500': {
            description: 'Internal server error',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    message: { type: 'string', example: 'An error occurred while retrieving the FAQs' },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/admin/api/faq/{id}': {
      get: {
        summary: 'Retrieve a specific FAQ by ID',
        tags: ['FAQs'],
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: {
              type: 'string',
            },
            description: 'The ID of the FAQ to retrieve',
          },
        ],
        responses: {
          '200': {
            description: 'Successfully retrieved the FAQ',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/faq' },
              },
            },
          },
          '404': {
            description: 'FAQ not found',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    message: { type: 'string', example: 'FAQ not found' },
                  },
                },
              },
            },
          },
          '500': {
            description: 'Internal server error',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    message: { type: 'string', example: 'An error occurred while retrieving the FAQ' },
                  },
                },
              },
            },
          },
        },
      },
      put: {
        summary: 'Update an existing FAQ by ID',
        tags: ['FAQs'],
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: {
              type: 'string',
            },
            description: 'The ID of the FAQ to update',
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
                    description: 'The ID of the associated FAQ category',
                  },
                  question: {
                    type: 'string',
                    description: 'The question text for the FAQ',
                  },
                  answer: {
                    type: 'string',
                    description: 'The answer text for the FAQ',
                  },
                  isActive: {
                    type: 'boolean',
                    description: 'Indicates if the FAQ is active',
                  },
                  isDeleted: {
                    type: 'boolean',
                    description: 'Indicates if the FAQ is deleted',
                  },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Successfully updated the FAQ',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/faq' },
              },
            },
          },
          '404': {
            description: 'FAQ not found',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    message: { type: 'string', example: 'FAQ not found' },
                  },
                },
              },
            },
          },
          '500': {
            description: 'Internal server error',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    message: { type: 'string', example: 'An error occurred while updating the FAQ' },
                  },
                },
              },
            },
          },
        },
      },
      delete: {
        summary: 'Delete an FAQ by ID',
        tags: ['FAQs'],
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: {
              type: 'string',
            },
            description: 'The ID of the FAQ to delete',
          },
        ],
        responses: {
          '204': {
            description: 'Successfully deleted the FAQ',
          },
          '404': {
            description: 'FAQ not found',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    message: { type: 'string', example: 'FAQ not found' },
                  },
                },
              },
            },
          },
          '500': {
            description: 'Internal server error',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    message: { type: 'string', example: 'An error occurred while deleting the FAQ' },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
};

module.exports = faqSwaggerDoc;
