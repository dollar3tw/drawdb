const express = require('express');
const router = express.Router();
const dbHelpers = require('../database/database');

// POST /api/diagrams - Create Diagram
router.post('/', async (req, res) => {
  try {
    const diagramData = req.body;
    // server.js already uses express.json(), so req.body should be parsed
    // The createDiagram function in database.js expects JSON fields to be stringified internally
    const newDiagram = await dbHelpers.createDiagram(diagramData);
    res.status(201).json(newDiagram);
  } catch (error) {
    console.error("Error creating diagram:", error);
    res.status(500).json({ error: 'Failed to create diagram' });
  }
});

// GET /api/diagrams - List All Diagrams
router.get('/', async (req, res) => {
  try {
    const diagrams = await dbHelpers.getAllDiagrams();
    // getAllDiagrams in database.js already parses JSON fields
    res.status(200).json(diagrams);
  } catch (error) < {
    console.error("Error listing diagrams:", error);
    res.status(500).json({ error: 'Failed to retrieve diagrams' });
  }
});

// GET /api/diagrams/:id - Get Specific Diagram
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const diagram = await dbHelpers.getDiagramById(id);
    // getDiagramById in database.js already parses JSON fields
    if (diagram) {
      res.status(200).json(diagram);
    } else {
      res.status(404).json({ error: 'Diagram not found' });
    }
  } catch (error) {
    console.error("Error getting diagram by ID:", error);
    res.status(500).json({ error: 'Failed to retrieve diagram' });
  }
});

// PUT /api/diagrams/:id - Update Diagram
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const diagramData = req.body;
    // The updateDiagram function in database.js handles JSON stringification internally
    const updatedDiagram = await dbHelpers.updateDiagram(id, diagramData);
    if (updatedDiagram) {
      res.status(200).json(updatedDiagram);
    } else {
      res.status(404).json({ error: 'Diagram not found or no changes made' });
    }
  } catch (error) {
    console.error("Error updating diagram:", error);
    res.status(500).json({ error: 'Failed to update diagram' });
  }
});

// DELETE /api/diagrams/:id - Delete Diagram
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const changes = await dbHelpers.deleteDiagram(id);
    if (changes > 0) {
      res.status(204).send(); // No Content
    } else {
      res.status(404).json({ error: 'Diagram not found' });
    }
  } catch (error) {
    console.error("Error deleting diagram:", error);
    res.status(500).json({ error: 'Failed to delete diagram' });
  }
});

module.exports = router;
