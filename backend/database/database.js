const sqlite3 = require('sqlite3').verbose();
const DB_PATH = './drawdb.sqlite'; // Database file will be created in the backend directory

let db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error("Error opening database:", err.message);
  } else {
    console.log('Connected to the SQLite database.');
    initDb(); // Call initialization after connection is established
  }
});

const initDb = (callback = () => {}) => {
  db.serialize(() => {
    // Create diagrams table
    db.run(`CREATE TABLE IF NOT EXISTS diagrams (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      databaseType TEXT,
      tables TEXT,
      relationships TEXT,
      notes TEXT,
      areas TEXT,
      pan TEXT,
      zoom REAL,
      todos TEXT DEFAULT '[]',
      lastModified DATETIME DEFAULT CURRENT_TIMESTAMP
    )`, (err) => {
      if (err) {
        console.error("Error creating diagrams table:", err.message);
        return callback(err);
      }
      console.log("Table 'diagrams' created or already exists.");
    });

    // Create templates table
    db.run(`CREATE TABLE IF NOT EXISTS templates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      databaseType TEXT,
      tables TEXT,
      relationships TEXT,
      notes TEXT,
      subjectAreas TEXT,
      pan TEXT,
      zoom REAL,
      custom INTEGER DEFAULT 1
    )`, (err) => {
      if (err) {
        console.error("Error creating templates table:", err.message);
        return callback(err);
      }
      console.log("Table 'templates' created or already exists.");
      callback(null); // Success
    });
  });
};

// Export the initDb function for server.js and the db instance for API routes
// Helper function to parse JSON fields
const parseDiagramRow = (row) => {
  if (row) {
    try {
      row.tables = JSON.parse(row.tables);
      row.relationships = JSON.parse(row.relationships);
      row.notes = JSON.parse(row.notes);
      row.areas = JSON.parse(row.areas);
      row.pan = JSON.parse(row.pan);
      row.todos = row.todos ? JSON.parse(row.todos) : [];
    } catch (e) {
      console.error("Error parsing JSON fields for row:", row.id, e);
      // Depending on desired behavior, you might want to set them to default values or re-throw
    }
  }
  return row;
};

// --- Diagram CRUD Functions ---

async function createDiagram(data) {
  return new Promise((resolve, reject) => {
    const sql = `INSERT INTO diagrams (name, databaseType, tables, relationships, notes, areas, pan, zoom, todos, lastModified)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`;
    const params = [
      data.name,
      data.databaseType,
      JSON.stringify(data.tables || {}),
      JSON.stringify(data.relationships || []),
      JSON.stringify(data.notes || []),
      JSON.stringify(data.areas || []),
      JSON.stringify(data.pan || { x: 0, y: 0 }),
      data.zoom == null ? 1 : data.zoom, // Provide default for zoom if null/undefined
      JSON.stringify(data.todos || []) // Add todos
    ];
    db.run(sql, params, function(err) {
      if (err) {
        console.error("Error creating diagram:", err.message);
        reject(err);
      } else {
        // Fetch the newly created diagram to get all fields including lastModified
        getDiagramById(this.lastID)
          .then(newDiagram => resolve(newDiagram))
          .catch(fetchErr => {
            console.error("Error fetching newly created diagram:", fetchErr.message);
            // Fallback if fetching fails, though less ideal as lastModified might be from a different source
            resolve({ id: this.lastID, ...data, lastModified: new Date().toISOString() });
          });
      }
    });
  });
}

async function getAllDiagrams() {
  return new Promise((resolve, reject) => {
    const sql = `SELECT * FROM diagrams ORDER BY lastModified DESC`;
    db.all(sql, [], (err, rows) => {
      if (err) {
        console.error("Error getting all diagrams:", err.message);
        reject(err);
      } else {
        resolve(rows.map(parseDiagramRow));
      }
    });
  });
}

async function getDiagramById(id) {
  return new Promise((resolve, reject) => {
    const sql = `SELECT * FROM diagrams WHERE id = ?`;
    db.get(sql, [id], (err, row) => {
      if (err) {
        console.error("Error getting diagram by id:", err.message);
        reject(err);
      } else {
        resolve(parseDiagramRow(row));
      }
    });
  });
}

async function updateDiagram(id, data) {
  return new Promise((resolve, reject) => {
    // Build the SET part of the query dynamically
    const fields = [];
    const params = [];

    if (data.name !== undefined) {
      fields.push("name = ?");
      params.push(data.name);
    }
    if (data.databaseType !== undefined) {
      fields.push("databaseType = ?");
      params.push(data.databaseType);
    }
    if (data.tables !== undefined) {
      fields.push("tables = ?");
      params.push(JSON.stringify(data.tables));
    }
    if (data.relationships !== undefined) {
      fields.push("relationships = ?");
      params.push(JSON.stringify(data.relationships));
    }
    if (data.notes !== undefined) {
      fields.push("notes = ?");
      params.push(JSON.stringify(data.notes));
    }
    if (data.areas !== undefined) {
      fields.push("areas = ?");
      params.push(JSON.stringify(data.areas));
    }
    if (data.pan !== undefined) {
      fields.push("pan = ?");
      params.push(JSON.stringify(data.pan));
    }
    if (data.zoom !== undefined) {
      fields.push("zoom = ?");
      params.push(data.zoom);
    }
    if (data.todos !== undefined) {
      fields.push("todos = ?");
      params.push(JSON.stringify(data.todos));
    }

    if (fields.length === 0) {
      // No fields to update, perhaps just fetch and return the current diagram
      return getDiagramById(id).then(resolve).catch(reject);
    }

    fields.push("lastModified = CURRENT_TIMESTAMP"); // Always update lastModified

    const sql = `UPDATE diagrams SET ${fields.join(", ")} WHERE id = ?`;
    params.push(id);

    db.run(sql, params, function(err) {
      if (err) {
        console.error("Error updating diagram:", err.message);
        reject(err);
      } else {
        if (this.changes === 0) {
          resolve(null); // Indicate not found or no changes made
        } else {
          getDiagramById(id) // Fetch the updated diagram
            .then(updatedDiagram => resolve(updatedDiagram))
            .catch(fetchErr => {
                console.error("Error fetching updated diagram:", fetchErr.message);
                reject(fetchErr);
            });
        }
      }
    });
  });
}

async function deleteDiagram(id) {
  return new Promise((resolve, reject) => {
    const sql = `DELETE FROM diagrams WHERE id = ?`;
    db.run(sql, [id], function(err) {
      if (err) {
        console.error("Error deleting diagram:", err.message);
        reject(err);
      } else {
        resolve(this.changes); // Returns the number of rows deleted
      }
    });
  });
}

module.exports = {
  db,
  initDb,
  createDiagram,
  getAllDiagrams,
  getDiagramById,
  updateDiagram,
  deleteDiagram,
  // Template Functions
  createTemplate,
  getAllTemplates,
  getTemplateById,
  updateTemplate,
  deleteTemplate
};

// Helper function to parse JSON fields for Templates
const parseTemplateRow = (row) => {
  if (row) {
    try {
      row.tables = JSON.parse(row.tables);
      row.relationships = JSON.parse(row.relationships);
      row.notes = JSON.parse(row.notes);
      row.subjectAreas = JSON.parse(row.subjectAreas); // Changed from 'areas' to 'subjectAreas'
      row.pan = JSON.parse(row.pan);
    } catch (e) {
      console.error("Error parsing JSON fields for template row:", row.id, e);
    }
  }
  return row;
};

// --- Template CRUD Functions ---

async function createTemplate(data) {
  return new Promise((resolve, reject) => {
    const sql = `INSERT INTO templates (title, databaseType, tables, relationships, notes, subjectAreas, pan, zoom, custom)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;
    const params = [
      data.title,
      data.databaseType,
      JSON.stringify(data.tables || {}),
      JSON.stringify(data.relationships || []),
      JSON.stringify(data.notes || []),
      JSON.stringify(data.subjectAreas || []), // Changed from 'areas'
      JSON.stringify(data.pan || { x: 0, y: 0 }),
      data.zoom == null ? 1 : data.zoom,
      data.custom == null ? 1 : data.custom // Default custom to 1 (true)
    ];
    db.run(sql, params, function(err) {
      if (err) {
        console.error("Error creating template:", err.message);
        reject(err);
      } else {
        getTemplateById(this.lastID)
          .then(newTemplate => resolve(newTemplate))
          .catch(fetchErr => {
            console.error("Error fetching newly created template:", fetchErr.message);
            // Fallback if fetching fails
            resolve({ id: this.lastID, ...data });
          });
      }
    });
  });
}

async function getAllTemplates() {
  return new Promise((resolve, reject) => {
    // Optionally, filter by custom=1: const sql = `SELECT * FROM templates WHERE custom = 1 ORDER BY title ASC`;
    const sql = `SELECT * FROM templates ORDER BY title ASC`;
    db.all(sql, [], (err, rows) => {
      if (err) {
        console.error("Error getting all templates:", err.message);
        reject(err);
      } else {
        resolve(rows.map(parseTemplateRow));
      }
    });
  });
}

async function getTemplateById(id) {
  return new Promise((resolve, reject) => {
    const sql = `SELECT * FROM templates WHERE id = ?`;
    db.get(sql, [id], (err, row) => {
      if (err) {
        console.error("Error getting template by id:", err.message);
        reject(err);
      } else {
        resolve(parseTemplateRow(row));
      }
    });
  });
}

async function updateTemplate(id, data) {
  return new Promise((resolve, reject) => {
    const fields = [];
    const params = [];

    if (data.title !== undefined) {
      fields.push("title = ?");
      params.push(data.title);
    }
    if (data.databaseType !== undefined) {
      fields.push("databaseType = ?");
      params.push(data.databaseType);
    }
    if (data.tables !== undefined) {
      fields.push("tables = ?");
      params.push(JSON.stringify(data.tables));
    }
    if (data.relationships !== undefined) {
      fields.push("relationships = ?");
      params.push(JSON.stringify(data.relationships));
    }
    if (data.notes !== undefined) {
      fields.push("notes = ?");
      params.push(JSON.stringify(data.notes));
    }
    if (data.subjectAreas !== undefined) { // Changed from 'areas'
      fields.push("subjectAreas = ?");
      params.push(JSON.stringify(data.subjectAreas));
    }
    if (data.pan !== undefined) {
      fields.push("pan = ?");
      params.push(JSON.stringify(data.pan));
    }
    if (data.zoom !== undefined) {
      fields.push("zoom = ?");
      params.push(data.zoom);
    }
    if (data.custom !== undefined) {
      fields.push("custom = ?");
      params.push(data.custom);
    }

    if (fields.length === 0) {
      return getTemplateById(id).then(resolve).catch(reject);
    }

    const sql = `UPDATE templates SET ${fields.join(", ")} WHERE id = ?`;
    params.push(id);

    db.run(sql, params, function(err) {
      if (err) {
        console.error("Error updating template:", err.message);
        reject(err);
      } else {
        if (this.changes === 0) {
          resolve(null); 
        } else {
          getTemplateById(id)
            .then(updatedTemplate => resolve(updatedTemplate))
            .catch(fetchErr => {
                console.error("Error fetching updated template:", fetchErr.message);
                reject(fetchErr);
            });
        }
      }
    });
  });
}

async function deleteTemplate(id) {
  return new Promise((resolve, reject) => {
    const sql = `DELETE FROM templates WHERE id = ?`;
    db.run(sql, [id], function(err) {
      if (err) {
        console.error("Error deleting template:", err.message);
        reject(err);
      } else {
        resolve(this.changes); // Returns the number of rows deleted
      }
    });
  });
}
