const express = require('express');
const router = express.Router();
const dbHelpers = require('../database/database');

// POST /api/templates - Create Template
router.post('/', async (req, res) => {
  try {
    const templateData = req.body;
    // server.js uses express.json(), req.body should be parsed
    // createTemplate in database.js handles JSON stringification
    const newTemplate = await dbHelpers.createTemplate(templateData);
    res.status(201).json(newTemplate);
  } catch (error) {
    console.error("Error creating template:", error);
    res.status(500).json({ error: 'Failed to create template' });
  }
});

// GET /api/templates - List All Templates
router.get('/', async (req, res) => {
  try {
    const templates = await dbHelpers.getAllTemplates();
    // getAllTemplates in database.js handles parsing of JSON fields
    res.status(200).json(templates);
  } catch (error) {
    console.error("Error listing templates:", error);
    res.status(500).json({ error: 'Failed to retrieve templates' });
  }
});

// GET /api/templates/:id - Get Specific Template
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const template = await dbHelpers.getTemplateById(id);
    // getTemplateById in database.js handles parsing of JSON fields
    if (template) {
      res.status(200).json(template);
    } else {
      res.status(404).json({ error: 'Template not found' });
    }
  } catch (error) {
    console.error("Error getting template by ID:", error);
    res.status(500).json({ error: 'Failed to retrieve template' });
  }
});

// PUT /api/templates/:id - Update Template
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const templateData = req.body;
    // updateTemplate in database.js handles JSON stringification
    const updatedTemplate = await dbHelpers.updateTemplate(id, templateData);
    if (updatedTemplate) {
      res.status(200).json(updatedTemplate);
    } else {
      res.status(404).json({ error: 'Template not found or no changes made' });
    }
  } catch (error) {
    console.error("Error updating template:", error);
    res.status(500).json({ error: 'Failed to update template' });
  }
});

// DELETE /api/templates/:id - Delete Template
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const changes = await dbHelpers.deleteTemplate(id);
    if (changes > 0) {
      res.status(204).send(); // No Content
    } else {
      res.status(404).json({ error: 'Template not found' });
    }
  } catch (error) {
    console.error("Error deleting template:", error);
    res.status(500).json({ error: 'Failed to delete template' });
  }
});

module.exports = router;
