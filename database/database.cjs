const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, '..', 'drawdb.sqlite'); // Use absolute path

// Ensure the directory exists and has proper permissions
const dbDir = path.dirname(DB_PATH);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true, mode: 0o755 });
}

// 獲取當前系統時區的時間戳記
const getCurrentTimestamp = () => {
  return new Date().toISOString();
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
      enums TEXT DEFAULT '[]',
      types TEXT DEFAULT '[]',
      pan TEXT,
      zoom REAL,
      lastModified DATETIME DEFAULT CURRENT_TIMESTAMP,
      userId INTEGER,
      is_collaborative INTEGER DEFAULT 0,
      promoted_by INTEGER,
      promoted_at DATETIME,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (userId) REFERENCES users(id),
      FOREIGN KEY (promoted_by) REFERENCES users(id)
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
      role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'editor', 'user')),
      display_name TEXT,
      auth_source TEXT DEFAULT 'LocalDB' CHECK (auth_source IN ('LocalDB', 'SSO', 'LDAP')),
      sso_id TEXT,
      must_change_password INTEGER DEFAULT 0,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      lastLogin DATETIME,
      isActive INTEGER DEFAULT 1
    )`, (err) => {
      if (err) {
        console.error("Error creating users table:", err.message);
        return callback(err);
      }
      console.log("Table 'users' created or already exists.");
      
      // Create default admin user if not exists
      db.get("SELECT id FROM users WHERE role = 'admin'", (err, row) => {
        if (err) {
          console.error("Error checking for admin user:", err.message);
        } else if (!row) {
          // Create default admin user
          const bcrypt = require('bcrypt');
          const defaultPassword = process.env.ADMIN_DEFAULT_PASSWORD; // 從環境變數讀取預設密碼
          bcrypt.hash(defaultPassword, 10, (err, hashedPassword) => {
            if (err) {
              console.error("Error hashing default password:", err.message);
            } else {
              db.run(`INSERT INTO users (username, email, password, role, display_name, auth_source, must_change_password) VALUES (?, ?, ?, ?, ?, ?, ?)`,
                ['admin', 'admin@mitdb.local', hashedPassword, 'admin', 'Administrator', 'LocalDB', 1], (err) => {
                  if (err) {
                    console.error("Error creating default admin user:", err.message);
                  } else {
                    console.log("Default admin user created successfully.");
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

    // Create diagram permissions table
    db.run(`CREATE TABLE IF NOT EXISTS diagram_permissions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      diagram_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      permission_type TEXT NOT NULL CHECK (permission_type IN ('owner', 'editor', 'viewer')),
      granted_by INTEGER NOT NULL,
      granted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (diagram_id) REFERENCES diagrams(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (granted_by) REFERENCES users(id),
      UNIQUE(diagram_id, user_id)
    )`, (err) => {
      if (err) {
        console.error("Error creating diagram_permissions table:", err.message);
        return callback(err);
      }
      console.log("Table 'diagram_permissions' created or already exists.");
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
    });

    // Create collaboration history table if not exists
    db.run(`CREATE TABLE IF NOT EXISTS collaboration_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      diagram_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      action TEXT NOT NULL,
      target_type TEXT,
      target_id TEXT,
      changes TEXT,
      details TEXT,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (diagram_id) REFERENCES diagrams(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )`, (err) => {
      if (err) {
        console.error("Error creating collaboration_history table:", err.message);
        return callback(err);
      }
      console.log("Table 'collaboration_history' created or already exists.");
      callback(null);
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
      row.enums = row.enums ? JSON.parse(row.enums) : [];
      row.types = row.types ? JSON.parse(row.types) : [];
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
    const currentTimestamp = getCurrentTimestamp();
    const sql = `INSERT INTO diagrams (name, databaseType, tables, relationships, notes, areas, enums, types, pan, zoom, userId, lastModified)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
    const params = [
      data.name,
      data.databaseType,
      JSON.stringify(data.tables || {}),
      JSON.stringify(data.relationships || []),
      JSON.stringify(data.notes || []),
      JSON.stringify(data.areas || []),
      JSON.stringify(data.enums || []),
      JSON.stringify(data.types || []),
      JSON.stringify(data.pan || { x: 0, y: 0 }),
      data.zoom == null ? 1 : data.zoom, // Provide default for zoom if null/undefined
      data.userId, // Add userId parameter
      currentTimestamp
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
    if (data.enums !== undefined) {
      fields.push("enums = ?");
      params.push(JSON.stringify(data.enums));
    }
    if (data.types !== undefined) {
      fields.push("types = ?");
      params.push(JSON.stringify(data.types));
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

    const currentTimestamp = getCurrentTimestamp();
    fields.push("lastModified = ?"); // Always update lastModified
    params.push(currentTimestamp);

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
  deleteRevisionHistoryByDiagramId,
  // Permission Functions
  createDiagramPermission,
  getDiagramPermission,
  getDiagramPermissions,
  getDiagramCollaborators,
  updateDiagramPermission,
  deleteDiagramPermission,
  getUserDiagramsByPermission,
  // Collaboration Functions
  createCollaborationHistory,
  getCollaborationHistory,
  promoteDiagramToCollaborative
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
    const sql = `INSERT INTO users (username, email, password, role, auth_source, display_name, sso_id) VALUES (?, ?, ?, ?, ?, ?, ?)`;
    const params = [
      data.username,
      data.email,
      data.password, // Should be hashed before calling this function
      data.role || 'user',
      data.auth_source || 'LocalDB',
      data.display_name || data.username,
      data.sso_id || null
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
  return new Promise(async (resolve, reject) => {
    try {
      // 開始事務
      await new Promise((resolve, reject) => {
        db.run('BEGIN TRANSACTION', (err) => {
          if (err) reject(err);
          else resolve();
        });
      });

      // 1. 找到 root 使用者 ID
      const rootUser = await new Promise((resolve, reject) => {
        db.get(`SELECT id FROM users WHERE role = 'admin' LIMIT 1`, (err, row) => {
          if (err) reject(err);
          else resolve(row);
        });
      });

      if (!rootUser) {
        throw new Error('找不到 root 使用者，無法轉移協作圖表擁有權');
      }

      // 2. 將該使用者擁有的協作圖表轉移給 root
      await new Promise((resolve, reject) => {
        const transferOwnershipSql = `
          UPDATE diagram_permissions 
          SET user_id = ?, granted_by = ?
          WHERE user_id = ? 
            AND permission_type = 'owner' 
            AND diagram_id IN (
              SELECT id FROM diagrams WHERE is_collaborative = 1
            )
        `;
        db.run(transferOwnershipSql, [rootUser.id, rootUser.id, id], function(err) {
          if (err) reject(err);
          else {
            console.log(`轉移了 ${this.changes} 個協作圖表的擁有權給 root`);
            resolve(this.changes);
          }
        });
      });

      // 3. 刪除該使用者的其他圖表權限（非擁有者權限）
      await new Promise((resolve, reject) => {
        const deletePermissionsSql = `
          DELETE FROM diagram_permissions 
          WHERE user_id = ? AND permission_type != 'owner'
        `;
        db.run(deletePermissionsSql, [id], function(err) {
          if (err) reject(err);
          else {
            console.log(`刪除了 ${this.changes} 個非擁有者權限記錄`);
            resolve(this.changes);
          }
        });
      });

      // 4. 刪除該使用者擁有的個人圖表
      await new Promise((resolve, reject) => {
        const deletePersonalDiagramsSql = `
          DELETE FROM diagrams 
          WHERE id IN (
            SELECT dp.diagram_id 
            FROM diagram_permissions dp
            JOIN diagrams d ON dp.diagram_id = d.id
            WHERE dp.user_id = ? 
              AND dp.permission_type = 'owner' 
              AND (d.is_collaborative = 0 OR d.is_collaborative IS NULL)
          )
        `;
        db.run(deletePersonalDiagramsSql, [id], function(err) {
          if (err) reject(err);
          else {
            console.log(`刪除了 ${this.changes} 個個人圖表`);
            resolve(this.changes);
          }
        });
      });

      // 5. 刪除剩餘的權限記錄
      await new Promise((resolve, reject) => {
        const deleteRemainingPermissionsSql = `DELETE FROM diagram_permissions WHERE user_id = ?`;
        db.run(deleteRemainingPermissionsSql, [id], function(err) {
          if (err) reject(err);
          else resolve(this.changes);
        });
      });

      // 6. 刪除使用者會話
      await new Promise((resolve, reject) => {
        const deleteSessionsSql = `DELETE FROM user_sessions WHERE user_id = ?`;
        db.run(deleteSessionsSql, [id], function(err) {
          if (err) reject(err);
          else resolve(this.changes);
        });
      });

      // 7. 最後刪除使用者
      const userChanges = await new Promise((resolve, reject) => {
        const deleteUserSql = `DELETE FROM users WHERE id = ?`;
        db.run(deleteUserSql, [id], function(err) {
          if (err) reject(err);
          else resolve(this.changes);
        });
      });

      // 提交事務
      await new Promise((resolve, reject) => {
        db.run('COMMIT', (err) => {
          if (err) reject(err);
          else resolve();
        });
      });

      console.log(`成功刪除使用者 ${id}，協作圖表已轉移給 root`);
      resolve(userChanges);

    } catch (error) {
      // 回滾事務
      await new Promise((resolve) => {
        db.run('ROLLBACK', () => resolve());
      });
      console.error("Error deleting user:", error.message);
      reject(error);
    }
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
        if (!admin || admin.role !== 'admin') {
          reject(new Error('Unauthorized: Only root can delete diagrams'));
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
    const currentTimestamp = getCurrentTimestamp();
    const sql = `INSERT INTO revision_history (diagramId, userId, username, action, element, message, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?)`;
    const params = [
      diagramId,
      userId,
      username,
      action,
      element,
      message,
      currentTimestamp
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

// --- Permission Management Functions ---

async function createDiagramPermission(diagramId, userId, permissionType, grantedBy) {
  return new Promise((resolve, reject) => {
    const sql = `INSERT INTO diagram_permissions (diagram_id, user_id, permission_type, granted_by) VALUES (?, ?, ?, ?)`;
    const params = [diagramId, userId, permissionType, grantedBy];
    
    db.run(sql, params, function(err) {
      if (err) {
        console.error("Error creating diagram permission:", err.message);
        reject(err);
      } else {
        resolve({ id: this.lastID, diagramId, userId, permissionType, grantedBy });
      }
    });
  });
}

async function getDiagramPermission(diagramId, userId) {
  return new Promise((resolve, reject) => {
    const sql = `SELECT * FROM diagram_permissions WHERE diagram_id = ? AND user_id = ?`;
    db.get(sql, [diagramId, userId], (err, row) => {
      if (err) {
        console.error("Error getting diagram permission:", err.message);
        reject(err);
      } else {
        resolve(row);
      }
    });
  });
}

async function getDiagramPermissions(diagramId) {
  return new Promise((resolve, reject) => {
    const sql = `
      SELECT dp.*, u.username, u.email, u.display_name 
      FROM diagram_permissions dp
      JOIN users u ON dp.user_id = u.id
      WHERE dp.diagram_id = ?
      ORDER BY dp.granted_at DESC
    `;
    db.all(sql, [diagramId], (err, rows) => {
      if (err) {
        console.error("Error getting diagram permissions:", err.message);
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
}

async function getDiagramCollaborators(diagramId) {
  return new Promise((resolve, reject) => {
    const sql = `
      SELECT u.id, u.username, u.email, u.display_name, dp.permission_type
      FROM diagram_permissions dp
      JOIN users u ON dp.user_id = u.id
      WHERE dp.diagram_id = ?
      ORDER BY 
        CASE dp.permission_type 
          WHEN 'owner' THEN 1 
          WHEN 'editor' THEN 2 
          WHEN 'viewer' THEN 3 
        END,
        dp.granted_at ASC
    `;
    db.all(sql, [diagramId], (err, rows) => {
      if (err) {
        console.error("Error getting diagram collaborators:", err.message);
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
}

async function updateDiagramPermission(diagramId, userId, permissionType) {
  return new Promise((resolve, reject) => {
    const sql = `UPDATE diagram_permissions SET permission_type = ? WHERE diagram_id = ? AND user_id = ?`;
    db.run(sql, [permissionType, diagramId, userId], function(err) {
      if (err) {
        console.error("Error updating diagram permission:", err.message);
        reject(err);
      } else {
        resolve(this.changes);
      }
    });
  });
}

async function deleteDiagramPermission(diagramId, userId) {
  return new Promise((resolve, reject) => {
    const sql = `DELETE FROM diagram_permissions WHERE diagram_id = ? AND user_id = ?`;
    db.run(sql, [diagramId, userId], function(err) {
      if (err) {
        console.error("Error deleting diagram permission:", err.message);
        reject(err);
      } else {
        resolve(this.changes);
      }
    });
  });
}

async function getUserDiagramsByPermission(userId) {
  return new Promise((resolve, reject) => {
    const sql = `
      SELECT d.*, dp.permission_type 
      FROM diagrams d
      JOIN diagram_permissions dp ON d.id = dp.diagram_id
      WHERE dp.user_id = ?
      ORDER BY d.lastModified DESC
    `;
    db.all(sql, [userId], async (err, rows) => {
      if (err) {
        console.error("Error getting user diagrams by permission:", err.message);
        reject(err);
      } else {
        // 解析 JSON 欄位並保留 permission_type
        const diagrams = rows.map(row => {
          const parsed = parseDiagramRow(row);
          parsed.permission_type = row.permission_type;
          return parsed;
        });
        
        // 對於協作圖表，獲取所有協作者
        for (const diagram of diagrams) {
          if (diagram.is_collaborative) {
            try {
              const collaborators = await getDiagramCollaborators(diagram.id);
              diagram.collaborators = collaborators;
            } catch (error) {
              console.error(`Error fetching collaborators for diagram ${diagram.id}:`, error);
              diagram.collaborators = [];
            }
          } else {
            diagram.collaborators = [];
          }
        }
        
        resolve(diagrams);
      }
    });
  });
}

// --- Collaboration History Functions ---

async function createCollaborationHistory(diagramId, userId, action, targetType, targetId, changes) {
  return new Promise((resolve, reject) => {
    const sql = `
      INSERT INTO collaboration_history (diagram_id, user_id, action, target_type, target_id, changes) 
      VALUES (?, ?, ?, ?, ?, ?)
    `;
    const params = [
      diagramId,
      userId,
      action,
      targetType,
      targetId,
      JSON.stringify(changes || {})
    ];
    
    db.run(sql, params, function(err) {
      if (err) {
        console.error("Error creating collaboration history:", err.message);
        reject(err);
      } else {
        resolve(this.lastID);
      }
    });
  });
}

async function getCollaborationHistory(diagramId, limit = 100) {
  return new Promise((resolve, reject) => {
    const sql = `
      SELECT ch.*, u.username, u.display_name 
      FROM collaboration_history ch
      JOIN users u ON ch.user_id = u.id
      WHERE ch.diagram_id = ?
      ORDER BY ch.timestamp DESC
      LIMIT ?
    `;
    db.all(sql, [diagramId, limit], (err, rows) => {
      if (err) {
        console.error("Error getting collaboration history:", err.message);
        reject(err);
      } else {
        // Parse changes JSON
        rows.forEach(row => {
          try {
            row.changes = JSON.parse(row.changes);
          } catch (e) {
            row.changes = {};
          }
        });
        resolve(rows);
      }
    });
  });
}

async function promoteDiagramToCollaborative(diagramId, promotedBy) {
  return new Promise((resolve, reject) => {
    const currentTimestamp = getCurrentTimestamp();
    const sql = `
      UPDATE diagrams 
      SET is_collaborative = 1, promoted_by = ?, promoted_at = ? 
      WHERE id = ?
    `;
    db.run(sql, [promotedBy, currentTimestamp, diagramId], function(err) {
      if (err) {
        console.error("Error promoting diagram to collaborative:", err.message);
        reject(err);
      } else {
        resolve(this.changes);
      }
    });
  });
}
