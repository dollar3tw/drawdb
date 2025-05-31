const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, '..', 'drawdb.sqlite'); // Use absolute path

// 設置時區為台北時間
process.env.TZ = 'Asia/Taipei';

// Ensure the directory exists and has proper permissions
const dbDir = path.dirname(DB_PATH);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true, mode: 0o755 });
}

// 獲取台北時間的 ISO 字符串
const getTaipeiTimestamp = () => {
  const now = new Date();
  const taipeiTime = new Date(now.toLocaleString("en-US", {timeZone: "Asia/Taipei"}));
  return taipeiTime.toISOString();
};

let db = new sqlite3.Database(DB_PATH, sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE, (err) => {
  if (err) {
    console.error("Error opening database:", err.message);
  } else {
    console.log('Connected to the SQLite database.');
    
    // Set proper file permissions after creation
    try {
      fs.chmodSync(DB_PATH, 0o664);
      console.log('Database file permissions set successfully.');
    } catch (permErr) {
      console.warn('Warning: Could not set database file permissions:', permErr.message);
    }
    
    // Enable WAL mode for better concurrency
    db.run("PRAGMA journal_mode=WAL;", (err) => {
      if (err) {
        console.warn("Warning: Could not enable WAL mode:", err.message);
      } else {
        console.log("WAL mode enabled for better concurrency.");
      }
    });
    
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
      lastModified DATETIME DEFAULT CURRENT_TIMESTAMP,
      userId INTEGER,
      FOREIGN KEY (userId) REFERENCES users(id)
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
    });

    // Create users table
    db.run(`CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('mitadmin', 'editor', 'user')),
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      lastLogin DATETIME,
      isActive INTEGER DEFAULT 1
    )`, (err) => {
      if (err) {
        console.error("Error creating users table:", err.message);
        return callback(err);
      }
      console.log("Table 'users' created or already exists.");
      
      // Create default mitadmin user if not exists
      db.get("SELECT id FROM users WHERE username = 'mitadmin'", (err, row) => {
        if (err) {
          console.error("Error checking for mitadmin user:", err.message);
        } else if (!row) {
          // Create default mitadmin user
          const bcrypt = require('bcrypt');
          const defaultPassword = 'mitadmin123'; // 預設密碼，建議首次登入後更改
          bcrypt.hash(defaultPassword, 10, (err, hashedPassword) => {
            if (err) {
              console.error("Error hashing default password:", err.message);
            } else {
              db.run(`INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, ?)`,
                ['mitadmin', 'mitadmin@mit.edu', hashedPassword, 'mitadmin'], (err) => {
                  if (err) {
                    console.error("Error creating default mitadmin user:", err.message);
                  } else {
                    console.log("Default mitadmin user created successfully.");
                  }
                });
            }
          });
        }
      });
    });

    // Create user sessions table
    db.run(`CREATE TABLE IF NOT EXISTS user_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER NOT NULL,
      token TEXT UNIQUE NOT NULL,
      expiresAt DATETIME NOT NULL,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
    )`, (err) => {
      if (err) {
        console.error("Error creating user_sessions table:", err.message);
        return callback(err);
      }
      console.log("Table 'user_sessions' created or already exists.");
    });

    // Create revision history table
    db.run(`CREATE TABLE IF NOT EXISTS revision_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      diagramId INTEGER NOT NULL,
      userId INTEGER NOT NULL,
      username TEXT NOT NULL,
      action TEXT NOT NULL,
      element TEXT NOT NULL,
      message TEXT NOT NULL,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (diagramId) REFERENCES diagrams(id) ON DELETE CASCADE,
      FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
    )`, (err) => {
      if (err) {
        console.error("Error creating revision_history table:", err.message);
        return callback(err);
      }
      console.log("Table 'revision_history' created or already exists.");
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
    const taipeiTimestamp = getTaipeiTimestamp();
    const sql = `INSERT INTO diagrams (name, databaseType, tables, relationships, notes, areas, pan, zoom, userId, lastModified)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
    const params = [
      data.name,
      data.databaseType,
      JSON.stringify(data.tables || {}),
      JSON.stringify(data.relationships || []),
      JSON.stringify(data.notes || []),
      JSON.stringify(data.areas || []),
      JSON.stringify(data.pan || { x: 0, y: 0 }),
      data.zoom == null ? 1 : data.zoom, // Provide default for zoom if null/undefined
      data.userId, // Add userId parameter
      taipeiTimestamp
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

    if (fields.length === 0) {
      // No fields to update, perhaps just fetch and return the current diagram
      return getDiagramById(id).then(resolve).catch(reject);
    }

    const taipeiTimestamp = getTaipeiTimestamp();
    fields.push("lastModified = ?"); // Always update lastModified
    params.push(taipeiTimestamp);

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
  deleteTemplate,
  // User Functions
  createUser,
  getUserById,
  getUserByUsername,
  getUserByEmail,
  updateUser,
  deleteUser,
  getAllUsers,
  // Session Functions
  createSession,
  getSessionByToken,
  deleteSession,
  deleteExpiredSessions,
  // Diagram with User Functions
  getDiagramsByUserId,
  deleteDiagramByAdmin,
  // Revision History Functions
  createRevisionHistory,
  getRevisionHistoryByDiagramId,
  deleteRevisionHistoryByDiagramId
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

// --- User CRUD Functions ---

async function createUser(data) {
  return new Promise((resolve, reject) => {
    const sql = `INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, ?)`;
    const params = [
      data.username,
      data.email,
      data.password, // Should be hashed before calling this function
      data.role || 'user'
    ];
    
    db.run(sql, params, function(err) {
      if (err) {
        console.error("Error creating user:", err.message);
        reject(err);
      } else {
        getUserById(this.lastID)
          .then(newUser => {
            // Remove password from response
            delete newUser.password;
            resolve(newUser);
          })
          .catch(fetchErr => {
            console.error("Error fetching newly created user:", fetchErr.message);
            reject(fetchErr);
          });
      }
    });
  });
}

async function getUserById(id) {
  return new Promise((resolve, reject) => {
    const sql = `SELECT * FROM users WHERE id = ?`;
    db.get(sql, [id], (err, row) => {
      if (err) {
        console.error("Error getting user by id:", err.message);
        reject(err);
      } else {
        resolve(row);
      }
    });
  });
}

async function getUserByUsername(username) {
  return new Promise((resolve, reject) => {
    const sql = `SELECT * FROM users WHERE username = ? AND isActive = 1`;
    db.get(sql, [username], (err, row) => {
      if (err) {
        console.error("Error getting user by username:", err.message);
        reject(err);
      } else {
        resolve(row);
      }
    });
  });
}

async function getUserByEmail(email) {
  return new Promise((resolve, reject) => {
    const sql = `SELECT * FROM users WHERE email = ? AND isActive = 1`;
    db.get(sql, [email], (err, row) => {
      if (err) {
        console.error("Error getting user by email:", err.message);
        reject(err);
      } else {
        resolve(row);
      }
    });
  });
}

async function updateUser(id, data) {
  return new Promise((resolve, reject) => {
    const fields = [];
    const params = [];

    if (data.username !== undefined) {
      fields.push("username = ?");
      params.push(data.username);
    }
    if (data.email !== undefined) {
      fields.push("email = ?");
      params.push(data.email);
    }
    if (data.password !== undefined) {
      fields.push("password = ?");
      params.push(data.password); // Should be hashed before calling this function
    }
    if (data.role !== undefined) {
      fields.push("role = ?");
      params.push(data.role);
    }
    if (data.lastLogin !== undefined) {
      fields.push("lastLogin = ?");
      params.push(data.lastLogin);
    }
    if (data.isActive !== undefined) {
      fields.push("isActive = ?");
      params.push(data.isActive);
    }

    if (fields.length === 0) {
      return getUserById(id).then(user => {
        delete user.password;
        resolve(user);
      }).catch(reject);
    }

    const sql = `UPDATE users SET ${fields.join(", ")} WHERE id = ?`;
    params.push(id);

    db.run(sql, params, function(err) {
      if (err) {
        console.error("Error updating user:", err.message);
        reject(err);
      } else {
        if (this.changes === 0) {
          resolve(null);
        } else {
          getUserById(id)
            .then(updatedUser => {
              delete updatedUser.password;
              resolve(updatedUser);
            })
            .catch(fetchErr => {
              console.error("Error fetching updated user:", fetchErr.message);
              reject(fetchErr);
            });
        }
      }
    });
  });
}

async function deleteUser(id) {
  return new Promise((resolve, reject) => {
    const sql = `DELETE FROM users WHERE id = ?`;
    db.run(sql, [id], function(err) {
      if (err) {
        console.error("Error deleting user:", err.message);
        reject(err);
      } else {
        resolve(this.changes);
      }
    });
  });
}

async function getAllUsers() {
  return new Promise((resolve, reject) => {
    const sql = `SELECT id, username, email, role, createdAt, lastLogin, isActive FROM users ORDER BY createdAt DESC`;
    db.all(sql, [], (err, rows) => {
      if (err) {
        console.error("Error getting all users:", err.message);
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
}

// --- Session Functions ---

async function createSession(userId, token, expiresAt) {
  return new Promise((resolve, reject) => {
    const sql = `INSERT INTO user_sessions (userId, token, expiresAt) VALUES (?, ?, ?)`;
    db.run(sql, [userId, token, expiresAt], function(err) {
      if (err) {
        console.error("Error creating session:", err.message);
        reject(err);
      } else {
        resolve({ id: this.lastID, userId, token, expiresAt });
      }
    });
  });
}

async function getSessionByToken(token) {
  return new Promise((resolve, reject) => {
    const sql = `
      SELECT s.*, u.id as userId, u.username, u.email, u.role 
      FROM user_sessions s 
      JOIN users u ON s.userId = u.id 
      WHERE s.token = ? AND s.expiresAt > datetime('now') AND u.isActive = 1
    `;
    db.get(sql, [token], (err, row) => {
      if (err) {
        console.error("Error getting session by token:", err.message);
        reject(err);
      } else {
        resolve(row);
      }
    });
  });
}

async function deleteSession(token) {
  return new Promise((resolve, reject) => {
    const sql = `DELETE FROM user_sessions WHERE token = ?`;
    db.run(sql, [token], function(err) {
      if (err) {
        console.error("Error deleting session:", err.message);
        reject(err);
      } else {
        resolve(this.changes);
      }
    });
  });
}

async function deleteExpiredSessions() {
  return new Promise((resolve, reject) => {
    const sql = `DELETE FROM user_sessions WHERE expiresAt <= datetime('now')`;
    db.run(sql, [], function(err) {
      if (err) {
        console.error("Error deleting expired sessions:", err.message);
        reject(err);
      } else {
        resolve(this.changes);
      }
    });
  });
}

// --- Diagram with User Functions ---

async function getDiagramsByUserId(userId) {
  return new Promise((resolve, reject) => {
    const sql = `SELECT * FROM diagrams WHERE userId = ? ORDER BY lastModified DESC`;
    db.all(sql, [userId], (err, rows) => {
      if (err) {
        console.error("Error getting diagrams by user id:", err.message);
        reject(err);
      } else {
        resolve(rows.map(parseDiagramRow));
      }
    });
  });
}

async function deleteDiagramByAdmin(diagramId, adminUserId) {
  return new Promise((resolve, reject) => {
    // First check if the admin user has mitadmin role
    getUserById(adminUserId)
      .then(admin => {
        if (!admin || admin.role !== 'mitadmin') {
          reject(new Error('Unauthorized: Only mitadmin can delete diagrams'));
          return;
        }
        
        // If authorized, delete the diagram
        const sql = `DELETE FROM diagrams WHERE id = ?`;
        db.run(sql, [diagramId], function(err) {
          if (err) {
            console.error("Error deleting diagram by admin:", err.message);
            reject(err);
          } else {
            resolve(this.changes);
          }
        });
      })
      .catch(err => {
        console.error("Error checking admin authorization:", err.message);
        reject(err);
      });
  });
}

// --- Revision History Functions ---

async function createRevisionHistory(diagramId, userId, username, action, element, message) {
  return new Promise((resolve, reject) => {
    const taipeiTimestamp = getTaipeiTimestamp();
    const sql = `INSERT INTO revision_history (diagramId, userId, username, action, element, message, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?)`;
    const params = [
      diagramId,
      userId,
      username,
      action,
      element,
      message,
      taipeiTimestamp
    ];
    db.run(sql, params, function(err) {
      if (err) {
        console.error("Error creating revision history:", err.message);
        reject(err);
      } else {
        resolve(this.lastID);
      }
    });
  });
}

async function getRevisionHistoryByDiagramId(diagramId) {
  return new Promise((resolve, reject) => {
    const sql = `SELECT * FROM revision_history WHERE diagramId = ? ORDER BY timestamp DESC`;
    db.all(sql, [diagramId], (err, rows) => {
      if (err) {
        console.error("Error getting revision history by diagram id:", err.message);
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
}

async function deleteRevisionHistoryByDiagramId(diagramId) {
  return new Promise((resolve, reject) => {
    const sql = `DELETE FROM revision_history WHERE diagramId = ?`;
    db.run(sql, [diagramId], function(err) {
      if (err) {
        console.error("Error deleting revision history by diagram id:", err.message);
        reject(err);
      } else {
        resolve(this.changes);
      }
    });
  });
}
