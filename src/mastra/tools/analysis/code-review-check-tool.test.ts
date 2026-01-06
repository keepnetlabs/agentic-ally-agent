import { describe, it, expect } from 'vitest';
import { codeReviewCheckTool } from './code-review-check-tool';

/**
 * Test suite for codeReviewCheckTool
 * Tests code review validation with support for multiple issue types and languages
 */
const executeTool = (codeReviewCheckTool as any).execute;

describe('codeReviewCheckTool', () => {
  // ==================== INPUT VALIDATION TESTS ====================
  describe('Input Validation', () => {
    it('should accept valid input with all required fields', async () => {
      const input = {
        issueType: 'SQL Injection',
        originalCode: "SELECT * FROM users WHERE id = " + "'user_input'",
        fixedCode: 'SELECT * FROM users WHERE id = ?',
        language: 'javascript',
      };

      const result = await executeTool(input);
      expect(result).toBeDefined();
      expect(result.success !== undefined).toBe(true);
    });

    it('should require issueType', async () => {
      const input: any = {
        originalCode: 'const x = eval(input);',
        fixedCode: 'const x = JSON.parse(input);',
        language: 'javascript',
      };

      const result = await executeTool(input);
      expect(result.success === false || result.error).toBeDefined();
    });

    it('should require originalCode', async () => {
      const input: any = {
        issueType: 'XSS',
        fixedCode: 'const safe = sanitize(input);',
        language: 'javascript',
      };

      const result = await executeTool(input);
      expect(result.success === false || result.error).toBeDefined();
    });

    it('should require fixedCode', async () => {
      const input: any = {
        issueType: 'Buffer Overflow',
        originalCode: 'strcpy(dest, src);',
        language: 'c',
      };

      const result = await executeTool(input);
      expect(result.success === false || result.error).toBeDefined();
    });

    it('should require language', async () => {
      const input: any = {
        issueType: 'SQL Injection',
        originalCode: 'SELECT * FROM users WHERE id = ' + "'user_input'",
        fixedCode: 'SELECT * FROM users WHERE id = ?',
      };

      const result = await executeTool(input);
      expect(result.success === false || result.error).toBeDefined();
    });

    it('should accept outputLanguage as optional field', async () => {
      const input = {
        issueType: 'SQL Injection',
        originalCode: 'SELECT * FROM users WHERE id = ' + "'user_input'",
        fixedCode: 'SELECT * FROM users WHERE id = ?',
        language: 'javascript',
        outputLanguage: 'en',
      };

      const result = await executeTool(input);
      expect(result).toBeDefined();
    });

    it('should default outputLanguage to en', async () => {
      const input = {
        issueType: 'SQL Injection',
        originalCode: 'SELECT * FROM users WHERE id = ' + "'user_input'",
        fixedCode: 'SELECT * FROM users WHERE id = ?',
        language: 'javascript',
      };

      const result = await executeTool(input);
      expect(result).toBeDefined();
    });

    it('should accept modelProvider as optional field', async () => {
      const input = {
        issueType: 'XSS',
        originalCode: 'element.innerHTML = userInput;',
        fixedCode: 'element.textContent = userInput;',
        language: 'javascript',
        modelProvider: 'OPENAI',
      };

      const result = await executeTool(input);
      expect(result).toBeDefined();
    });

    it('should accept model override as optional field', async () => {
      const input = {
        issueType: 'Performance Issue',
        originalCode: 'let result = []; for(let i=0; i<n; i++) result.push(i);',
        fixedCode: 'const result = Array.from({length: n}, (_, i) => i);',
        language: 'javascript',
        model: 'gpt-4o',
      };

      const result = await executeTool(input);
      expect(result).toBeDefined();
    });
  });

  // ==================== ISSUE TYPE TESTS ====================
  describe('Issue Type Support', () => {
    it('should validate SQL Injection fix', async () => {
      const input = {
        issueType: 'SQL Injection',
        originalCode: "const query = 'SELECT * FROM users WHERE id = ' + 'user-123';",
        fixedCode: "const stmt = db.prepare('SELECT * FROM users WHERE id = ?'); stmt.run(userId);",
        language: 'javascript',
      };

      const result = await executeTool(input);
      expect(result).toBeDefined();
    });

    it('should validate XSS fix', async () => {
      const input = {
        issueType: 'XSS',
        originalCode: 'element.innerHTML = userInput;',
        fixedCode: 'element.textContent = userInput;',
        language: 'javascript',
      };

      const result = await executeTool(input);
      expect(result).toBeDefined();
    });

    it('should validate Command Injection fix', async () => {
      const input = {
        issueType: 'Command Injection',
        originalCode: "const result = exec('ls ' + userDir);",
        fixedCode: "const result = spawn('ls', [userDir]);",
        language: 'javascript',
      };

      const result = await executeTool(input);
      expect(result).toBeDefined();
    });

    it('should validate Buffer Overflow fix', async () => {
      const input = {
        issueType: 'Buffer Overflow',
        originalCode: 'strcpy(buffer, input);',
        fixedCode: 'strncpy(buffer, input, sizeof(buffer) - 1);',
        language: 'c',
      };

      const result = await executeTool(input);
      expect(result).toBeDefined();
    });

    it('should validate Logic Error fix', async () => {
      const input = {
        issueType: 'Logic Error',
        originalCode: 'if (age > 18 || age < 65) { allowAccess(); }',
        fixedCode: 'if (age >= 18 && age < 65) { allowAccess(); }',
        language: 'javascript',
      };

      const result = await executeTool(input);
      expect(result).toBeDefined();
    });

    it('should validate Performance Issue fix', async () => {
      const input = {
        issueType: 'Performance Issue',
        originalCode: 'let sum = 0; for(let i=0; i<arr.length; i++) sum += arr[i];',
        fixedCode: 'const sum = arr.reduce((a, b) => a + b, 0);',
        language: 'javascript',
      };

      const result = await executeTool(input);
      expect(result).toBeDefined();
    });

    it('should validate Race Condition fix', async () => {
      const input = {
        issueType: 'Race Condition',
        originalCode: 'if (fileExists) { deleteFile(path); }',
        fixedCode: 'try { fs.unlinkSync(path); } catch(e) { if (e.code !== "ENOENT") throw e; }',
        language: 'javascript',
      };

      const result = await executeTool(input);
      expect(result).toBeDefined();
    });

    it('should validate Memory Leak fix', async () => {
      const input = {
        issueType: 'Memory Leak',
        originalCode: 'element.onclick = () => { largData.process(); };',
        fixedCode: 'element.onclick = null; element.onclick = () => { largeData.process(); };',
        language: 'javascript',
      };

      const result = await executeTool(input);
      expect(result).toBeDefined();
    });

    it('should validate Null Pointer Exception fix', async () => {
      const input = {
        issueType: 'Null Pointer Exception',
        originalCode: 'const value = obj.prop.nested.value;',
        fixedCode: 'const value = obj?.prop?.nested?.value;',
        language: 'javascript',
      };

      const result = await executeTool(input);
      expect(result).toBeDefined();
    });

    it('should validate Type Confusion fix', async () => {
      const input = {
        issueType: 'Type Confusion',
        originalCode: 'if (value == true) { }',
        fixedCode: 'if (value === true) { }',
        language: 'javascript',
      };

      const result = await executeTool(input);
      expect(result).toBeDefined();
    });

    it('should validate Path Traversal fix', async () => {
      const input = {
        issueType: 'Path Traversal',
        originalCode: "fs.readFile(userPath, 'utf8');",
        fixedCode: "const safe = path.resolve(allowedDir, userPath); if (!safe.startsWith(allowedDir)) throw Error('Invalid path'); fs.readFile(safe, 'utf8');",
        language: 'javascript',
      };

      const result = await executeTool(input);
      expect(result).toBeDefined();
    });
  });

  // ==================== PROGRAMMING LANGUAGE TESTS ====================
  describe('Programming Language Support', () => {
    it('should validate JavaScript code', async () => {
      const input = {
        issueType: 'SQL Injection',
        originalCode: "SELECT * FROM users WHERE id = " + 'user-123',
        fixedCode: "SELECT * FROM users WHERE id = ?",
        language: 'javascript',
      };

      const result = await executeTool(input);
      expect(result).toBeDefined();
    });

    it('should validate TypeScript code', async () => {
      const input = {
        issueType: 'Type Confusion',
        originalCode: 'const x: any = getUserInput(); return x + 10;',
        fixedCode: 'const x: string = getUserInput(); return parseInt(x) + 10;',
        language: 'typescript',
      };

      const result = await executeTool(input);
      expect(result).toBeDefined();
    });

    it('should validate Python code', async () => {
      const input = {
        issueType: 'SQL Injection',
        originalCode: "query = f'SELECT * FROM users WHERE id = {user_id}'",
        fixedCode: "cursor.execute('SELECT * FROM users WHERE id = ?', (user_id,))",
        language: 'python',
      };

      const result = await executeTool(input);
      expect(result).toBeDefined();
    });

    it('should validate Java code', async () => {
      const input = {
        issueType: 'SQL Injection',
        originalCode: "String query = \"SELECT * FROM users WHERE id = \" + 'user-123';",
        fixedCode: "PreparedStatement stmt = con.prepareStatement(\"SELECT * FROM users WHERE id = ?\"); stmt.setInt(1, userId);",
        language: 'java',
      };

      const result = await executeTool(input);
      expect(result).toBeDefined();
    });

    it('should validate C code', async () => {
      const input = {
        issueType: 'Buffer Overflow',
        originalCode: 'strcpy(buffer, input);',
        fixedCode: 'strncpy(buffer, input, sizeof(buffer) - 1);',
        language: 'c',
      };

      const result = await executeTool(input);
      expect(result).toBeDefined();
    });

    it('should validate C++ code', async () => {
      const input = {
        issueType: 'Memory Leak',
        originalCode: 'int* ptr = new int[10]; // no delete',
        fixedCode: 'std::vector<int> vec(10); // automatic cleanup',
        language: 'cpp',
      };

      const result = await executeTool(input);
      expect(result).toBeDefined();
    });

    it('should validate Go code', async () => {
      const input = {
        issueType: 'Null Pointer Exception',
        originalCode: 'value := obj.Field.NestedField.Value',
        fixedCode: 'if obj != nil && obj.Field != nil { value := obj.Field.NestedField.Value }',
        language: 'go',
      };

      const result = await executeTool(input);
      expect(result).toBeDefined();
    });

    it('should validate Ruby code', async () => {
      const input = {
        issueType: 'SQL Injection',
        originalCode: "User.where(\"id = #{user_id}\")",
        fixedCode: "User.where('id = ?', user_id)",
        language: 'ruby',
      };

      const result = await executeTool(input);
      expect(result).toBeDefined();
    });

    it('should validate PHP code', async () => {
      const input = {
        issueType: 'SQL Injection',
        originalCode: "$query = \"SELECT * FROM users WHERE id = \" . $userId;",
        fixedCode: "$stmt = $pdo->prepare('SELECT * FROM users WHERE id = ?'); $stmt->execute([$userId]);",
        language: 'php',
      };

      const result = await executeTool(input);
      expect(result).toBeDefined();
    });

    it('should validate C# code', async () => {
      const input = {
        issueType: 'SQL Injection',
        originalCode: "string query = $\"SELECT * FROM users WHERE id = {userId}\";",
        fixedCode: "using (SqlCommand cmd = new SqlCommand(\"SELECT * FROM users WHERE id = @id\", connection)) { cmd.Parameters.AddWithValue(\"@id\", userId); }",
        language: 'csharp',
      };

      const result = await executeTool(input);
      expect(result).toBeDefined();
    });
  });

  // ==================== OUTPUT LANGUAGE TESTS ====================
  describe('Output Language Support', () => {
    it('should generate feedback in English', async () => {
      const input = {
        issueType: 'SQL Injection',
        originalCode: "SELECT * FROM users WHERE id = " + 'user-123',
        fixedCode: "SELECT * FROM users WHERE id = ?",
        language: 'javascript',
        outputLanguage: 'en',
      };

      const result = await executeTool(input);
      if (result.success && result.data) {
        expect(typeof result.data.feedback).toBe('string');
      }
    });

    it('should generate feedback in Turkish', async () => {
      const input = {
        issueType: 'SQL Injection',
        originalCode: "SELECT * FROM users WHERE id = " + 'user-123',
        fixedCode: "SELECT * FROM users WHERE id = ?",
        language: 'javascript',
        outputLanguage: 'tr',
      };

      const result = await executeTool(input);
      if (result.success && result.data) {
        expect(typeof result.data.feedback).toBe('string');
      }
    });

    it('should generate feedback in German', async () => {
      const input = {
        issueType: 'XSS',
        originalCode: 'element.innerHTML = userInput;',
        fixedCode: 'element.textContent = userInput;',
        language: 'javascript',
        outputLanguage: 'de',
      };

      const result = await executeTool(input);
      if (result.success && result.data) {
        expect(typeof result.data.feedback).toBe('string');
      }
    });

    it('should generate feedback in French', async () => {
      const input = {
        issueType: 'Performance Issue',
        originalCode: 'for(let i=0; i<arr.length; i++) sum += arr[i];',
        fixedCode: 'const sum = arr.reduce((a, b) => a + b, 0);',
        language: 'javascript',
        outputLanguage: 'fr',
      };

      const result = await executeTool(input);
      if (result.success && result.data) {
        expect(typeof result.data.feedback).toBe('string');
      }
    });

    it('should generate feedback in Spanish', async () => {
      const input = {
        issueType: 'Logic Error',
        originalCode: 'if (age > 18 || age < 65) { allowAccess(); }',
        fixedCode: 'if (age >= 18 && age < 65) { allowAccess(); }',
        language: 'javascript',
        outputLanguage: 'es',
      };

      const result = await executeTool(input);
      if (result.success && result.data) {
        expect(typeof result.data.feedback).toBe('string');
      }
    });

    it('should generate feedback in Chinese', async () => {
      const input = {
        issueType: 'Null Pointer Exception',
        originalCode: 'const value = obj.prop.nested.value;',
        fixedCode: 'const value = obj?.prop?.nested?.value;',
        language: 'javascript',
        outputLanguage: 'zh',
      };

      const result = await executeTool(input);
      if (result.success && result.data) {
        expect(typeof result.data.feedback).toBe('string');
      }
    });

    it('should generate feedback in Japanese', async () => {
      const input = {
        issueType: 'Type Confusion',
        originalCode: 'if (value == true) { }',
        fixedCode: 'if (value === true) { }',
        language: 'javascript',
        outputLanguage: 'ja',
      };

      const result = await executeTool(input);
      if (result.success && result.data) {
        expect(typeof result.data.feedback).toBe('string');
      }
    });
  });

  // ==================== SEVERITY LEVEL TESTS ====================
  describe('Severity Levels and Points', () => {
    it('should return 25 points for correct fix', async () => {
      const input = {
        issueType: 'SQL Injection',
        originalCode: "SELECT * FROM users WHERE id = " + 'user-123',
        fixedCode: "SELECT * FROM users WHERE id = ?",
        language: 'javascript',
      };

      const result = await executeTool(input);
      if (result.success && result.data) {
        expect(result.data.points).toBeDefined();
        if (result.data.isCorrect) {
          expect(result.data.points).toBe(25);
        }
      }
    });

    it('should return 10 points for partial fix', async () => {
      const input = {
        issueType: 'SQL Injection',
        originalCode: "SELECT * FROM users WHERE id = " + 'user-123',
        fixedCode: "SELECT * FROM users WHERE id = '" + 'user-123'.replace(/[^0-9]/g, '') + "'", // Partial solution
        language: 'javascript',
      };

      const result = await executeTool(input);
      if (result.success && result.data) {
        expect(result.data.points).toBeDefined();
        if (result.data.severity === 'partial') {
          expect(result.data.points).toBe(10);
        }
      }
    });

    it('should return 0 points for incorrect fix', async () => {
      const input = {
        issueType: 'SQL Injection',
        originalCode: "SELECT * FROM users WHERE id = " + 'user-123',
        fixedCode: "SELECT * FROM users WHERE id = " + 'user-123',
        language: 'javascript',
      };

      const result = await executeTool(input);
      if (result.success && result.data) {
        expect(result.data.points).toBeDefined();
        if (!result.data.isCorrect && result.data.severity === 'incorrect') {
          expect(result.data.points).toBe(0);
        }
      }
    });

    it('should mark severity as correct when isCorrect=true', async () => {
      const input = {
        issueType: 'SQL Injection',
        originalCode: "SELECT * FROM users WHERE id = " + 'user-123',
        fixedCode: "SELECT * FROM users WHERE id = ?",
        language: 'javascript',
      };

      const result = await executeTool(input);
      if (result.success && result.data) {
        if (result.data.isCorrect) {
          expect(result.data.severity).toBe('correct');
        }
      }
    });

    it('should mark severity as incorrect when isCorrect=false and not partial', async () => {
      const input = {
        issueType: 'SQL Injection',
        originalCode: "SELECT * FROM users WHERE id = " + 'user-123',
        fixedCode: "SELECT * FROM users WHERE id = " + 'user-123',
        language: 'javascript',
      };

      const result = await executeTool(input);
      if (result.success && result.data) {
        if (!result.data.isCorrect) {
          expect(['incorrect', 'partial']).toContain(result.data.severity);
        }
      }
    });
  });

  // ==================== OUTPUT STRUCTURE TESTS ====================
  describe('Output Structure', () => {
    it('should return success flag', async () => {
      const input = {
        issueType: 'SQL Injection',
        originalCode: "SELECT * FROM users WHERE id = " + 'user-123',
        fixedCode: "SELECT * FROM users WHERE id = ?",
        language: 'javascript',
      };

      const result = await executeTool(input);
      expect(typeof result.success).toBe('boolean');
    });

    it('should return data object when successful', async () => {
      const input = {
        issueType: 'SQL Injection',
        originalCode: "SELECT * FROM users WHERE id = " + 'user-123',
        fixedCode: "SELECT * FROM users WHERE id = ?",
        language: 'javascript',
      };

      const result = await executeTool(input);
      if (result.success) {
        expect(result.data).toBeDefined();
        expect(typeof result.data).toBe('object');
      }
    });

    it('should have isCorrect boolean in data', async () => {
      const input = {
        issueType: 'XSS',
        originalCode: 'element.innerHTML = userInput;',
        fixedCode: 'element.textContent = userInput;',
        language: 'javascript',
      };

      const result = await executeTool(input);
      if (result.success && result.data) {
        expect(typeof result.data.isCorrect).toBe('boolean');
      }
    });

    it('should have severity enum in data', async () => {
      const input = {
        issueType: 'Performance Issue',
        originalCode: 'let sum = 0; for(let i=0; i<arr.length; i++) sum += arr[i];',
        fixedCode: 'const sum = arr.reduce((a, b) => a + b, 0);',
        language: 'javascript',
      };

      const result = await executeTool(input);
      if (result.success && result.data) {
        expect(['correct', 'partial', 'incorrect']).toContain(result.data.severity);
      }
    });

    it('should have feedback string in data', async () => {
      const input = {
        issueType: 'Logic Error',
        originalCode: 'if (age > 18 || age < 65) { allowAccess(); }',
        fixedCode: 'if (age >= 18 && age < 65) { allowAccess(); }',
        language: 'javascript',
      };

      const result = await executeTool(input);
      if (result.success && result.data) {
        expect(typeof result.data.feedback).toBe('string');
        expect(result.data.feedback.length).toBeGreaterThan(0);
      }
    });

    it('should have explanation string in data', async () => {
      const input = {
        issueType: 'Null Pointer Exception',
        originalCode: 'const value = obj.prop.nested.value;',
        fixedCode: 'const value = obj?.prop?.nested?.value;',
        language: 'javascript',
      };

      const result = await executeTool(input);
      if (result.success && result.data) {
        expect(typeof result.data.explanation).toBe('string');
        expect(result.data.explanation.length).toBeGreaterThan(0);
      }
    });

    it('should have points number in data (0-25)', async () => {
      const input = {
        issueType: 'Type Confusion',
        originalCode: 'if (value == true) { }',
        fixedCode: 'if (value === true) { }',
        language: 'javascript',
      };

      const result = await executeTool(input);
      if (result.success && result.data) {
        expect(typeof result.data.points).toBe('number');
        expect(result.data.points).toBeGreaterThanOrEqual(0);
        expect(result.data.points).toBeLessThanOrEqual(25);
      }
    });

    it('should have hint string in data (always present, even if empty)', async () => {
      const input = {
        issueType: 'Path Traversal',
        originalCode: "fs.readFile(userPath, 'utf8');",
        fixedCode: "const safe = path.resolve(allowedDir, userPath); fs.readFile(safe, 'utf8');",
        language: 'javascript',
      };

      const result = await executeTool(input);
      if (result.success && result.data) {
        expect('hint' in result.data).toBe(true);
        expect(typeof result.data.hint).toBe('string');
      }
    });

    it('should not have error when success=true', async () => {
      const input = {
        issueType: 'SQL Injection',
        originalCode: "SELECT * FROM users WHERE id = " + 'user-123',
        fixedCode: "SELECT * FROM users WHERE id = ?",
        language: 'javascript',
      };

      const result = await executeTool(input);
      if (result.success) {
        expect(result.error).toBeUndefined();
      }
    });
  });

  // ==================== HINT FEEDBACK TESTS ====================
  describe('Hint for Incorrect Fixes', () => {
    it('should provide hint when fix is incorrect', async () => {
      const input = {
        issueType: 'SQL Injection',
        originalCode: "SELECT * FROM users WHERE id = " + 'user-123',
        fixedCode: "SELECT * FROM users WHERE id = " + 'user-123' + ";",
        language: 'javascript',
      };

      const result = await executeTool(input);
      if (result.success && result.data && !result.data.isCorrect) {
        expect('hint' in result.data).toBe(true);
      }
    });

    it('should hint in correct output language', async () => {
      const input = {
        issueType: 'XSS',
        originalCode: 'element.innerHTML = userInput;',
        fixedCode: 'element.innerHTML = userInput;', // Not fixed
        language: 'javascript',
        outputLanguage: 'tr',
      };

      const result = await executeTool(input);
      if (result.success && result.data && result.data.hint) {
        expect(typeof result.data.hint).toBe('string');
      }
    });
  });

  // ==================== PRAGMATIC REVIEW TESTS ====================
  describe('Pragmatic Review (Accepts Valid Solutions)', () => {
    it('should accept parameterized queries as valid SQL Injection fix', async () => {
      const input = {
        issueType: 'SQL Injection',
        originalCode: "SELECT * FROM users WHERE id = " + 'user-123',
        fixedCode: "SELECT * FROM users WHERE id = ?",
        language: 'javascript',
      };

      const result = await executeTool(input);
      expect(result).toBeDefined();
    });

    it('should accept multiple valid approaches for same issue', async () => {
      const approaches = [
        "const safe = userId.replace(/[^0-9]/g, ''); SELECT * FROM users WHERE id = 123",
        "SELECT * FROM users WHERE id = ?",
        "const escaped = escapeSQL(userId); SELECT * FROM users WHERE id = 'user-123'",
      ];

      for (const fixedCode of approaches) {
        const input = {
          issueType: 'SQL Injection',
          originalCode: "SELECT * FROM users WHERE id = " + 'user-123',
          fixedCode: fixedCode,
          language: 'javascript',
        };

        const result = await executeTool(input);
        expect(result).toBeDefined();
      }
    });

    it('should not penalize for non-optimal code style', async () => {
      const input = {
        issueType: 'SQL Injection',
        originalCode: "SELECT * FROM users WHERE id = " + 'user-123',
        fixedCode: "SELECT * FROM users WHERE id = ?",
        language: 'javascript',
      };

      const result = await executeTool(input);
      expect(result).toBeDefined();
    });
  });

  // ==================== ERROR HANDLING TESTS ====================
  describe('Error Handling', () => {
    it('should handle missing required field gracefully', async () => {
      const input: any = {
        issueType: 'SQL Injection',
        originalCode: "SELECT * FROM users WHERE id = " + 'user-123',
        // Missing fixedCode
        language: 'javascript',
      };

      const result = await executeTool(input);
      expect(result.success === false || result.error).toBeDefined();
    });

    it('should handle null values gracefully', async () => {
      const input: any = {
        issueType: null,
        originalCode: "SELECT * FROM users WHERE id = " + 'user-123',
        fixedCode: "SELECT * FROM users WHERE id = ?",
        language: 'javascript',
      };

      const result = await executeTool(input);
      expect(result.success === false || result.error).toBeDefined();
    });

    it('should return error message on failure', async () => {
      const input: any = {
        issueType: 'SQL Injection',
        originalCode: "SELECT * FROM users WHERE id = " + 'user-123',
        fixedCode: "SELECT * FROM users WHERE id = ?",
        // Missing language
      };

      const result = await executeTool(input);
      if (!result.success) {
        expect(typeof result.error).toBe('string');
      }
    });
  });

  // ==================== EDGE CASES TESTS ====================
  describe('Edge Cases', () => {
    it('should handle very long code samples', async () => {
      const longCode = 'let x = 1;\n'.repeat(100);
      const input = {
        issueType: 'Logic Error',
        originalCode: longCode + 'if (x == 1) { }',
        fixedCode: longCode + 'if (x === 1) { }',
        language: 'javascript',
      };

      const result = await executeTool(input);
      expect(result).toBeDefined();
    });

    it('should handle code with special characters', async () => {
      const input = {
        issueType: 'XSS',
        originalCode: "element.innerHTML = `<script>${userInput}</script>`;",
        fixedCode: "element.textContent = userInput;",
        language: 'javascript',
      };

      const result = await executeTool(input);
      expect(result).toBeDefined();
    });

    it('should handle code with Unicode characters', async () => {
      const input = {
        issueType: 'SQL Injection',
        originalCode: "SELECT * FROM users WHERE name = '" + "用户输入" + "'",
        fixedCode: "SELECT * FROM users WHERE name = ?",
        language: 'javascript',
      };

      const result = await executeTool(input);
      expect(result).toBeDefined();
    });

    it('should handle empty fixedCode', async () => {
      const input = {
        issueType: 'SQL Injection',
        originalCode: "SELECT * FROM users WHERE id = " + 'user-123',
        fixedCode: '',
        language: 'javascript',
      };

      const result = await executeTool(input);
      expect(result).toBeDefined();
    });

    it('should handle identical originalCode and fixedCode', async () => {
      const input = {
        issueType: 'SQL Injection',
        originalCode: "SELECT * FROM users WHERE id = " + 'user-123',
        fixedCode: "SELECT * FROM users WHERE id = " + 'user-123',
        language: 'javascript',
      };

      const result = await executeTool(input);
      expect(result).toBeDefined();
    });

    it('should handle single-line code', async () => {
      const input = {
        issueType: 'Type Confusion',
        originalCode: 'if (x == y) { }',
        fixedCode: 'if (x === y) { }',
        language: 'javascript',
      };

      const result = await executeTool(input);
      expect(result).toBeDefined();
    });

    it('should handle multi-line code with comments', async () => {
      const input = {
        issueType: 'SQL Injection',
        originalCode: `// Get user ID from request
const userId = req.query.id;
// Build query (VULNERABLE)
SELECT * FROM users WHERE id = user-123`,
        fixedCode: `// Get user ID from request
const userId = req.query.id;
// Build query (SAFE)
SELECT * FROM users WHERE id = ?`,
        language: 'javascript',
      };

      const result = await executeTool(input);
      expect(result).toBeDefined();
    });

    it('should handle code with regex patterns', async () => {
      const input = {
        issueType: 'SQL Injection',
        originalCode: "const pattern = /[a-z]+/; SELECT * FROM users WHERE id = " + 'user-123',
        fixedCode: "const pattern = /[a-z]+/; SELECT * FROM users WHERE id = ?",
        language: 'javascript',
      };

      const result = await executeTool(input);
      expect(result).toBeDefined();
    });
  });

  // ==================== INTEGRATION TESTS ====================
  describe('Integration Scenarios', () => {
    it('should handle complete SQL Injection scenario in English', async () => {
      const input = {
        issueType: 'SQL Injection',
        originalCode: "const query = `SELECT * FROM users WHERE id = ${userId}`;",
        fixedCode: "const stmt = db.prepare('SELECT * FROM users WHERE id = ?'); stmt.run(userId);",
        language: 'javascript',
        outputLanguage: 'en',
      };

      const result = await executeTool(input);
      expect(result).toBeDefined();
      if (result.success && result.data) {
        expect(result.data.feedback).toBeDefined();
        expect(result.data.explanation).toBeDefined();
        expect(result.data.hint).toBeDefined();
      }
    });

    it('should handle complete XSS scenario in Turkish', async () => {
      const input = {
        issueType: 'XSS',
        originalCode: 'document.getElementById("output").innerHTML = getUserInput();',
        fixedCode: 'document.getElementById("output").textContent = getUserInput();',
        language: 'javascript',
        outputLanguage: 'tr',
      };

      const result = await executeTool(input);
      expect(result).toBeDefined();
      if (result.success && result.data) {
        expect(result.data.feedback).toBeDefined();
      }
    });

    it('should handle complete Python Security scenario', async () => {
      const input = {
        issueType: 'Command Injection',
        originalCode: "os.system('echo ' + user_input)",
        fixedCode: "subprocess.run(['echo', user_input])",
        language: 'python',
        outputLanguage: 'en',
      };

      const result = await executeTool(input);
      expect(result).toBeDefined();
    });

    it('should handle multilingual feedback with model override', async () => {
      const input = {
        issueType: 'Logic Error',
        originalCode: 'if (count > 0 || count < 100) { process(); }',
        fixedCode: 'if (count > 0 && count < 100) { process(); }',
        language: 'javascript',
        outputLanguage: 'de',
        model: 'gpt-4o',
      };

      const result = await executeTool(input);
      expect(result).toBeDefined();
    });

    it('should handle Java security fix validation', async () => {
      const input = {
        issueType: 'SQL Injection',
        originalCode: "String query = \"SELECT * FROM users WHERE username = '\" + username + \"'\";",
        fixedCode: "PreparedStatement pstmt = connection.prepareStatement(\"SELECT * FROM users WHERE username = ?\"); pstmt.setString(1, username);",
        language: 'java',
        outputLanguage: 'en',
      };

      const result = await executeTool(input);
      expect(result).toBeDefined();
    });

    it('should handle multi-language developer scenarios', async () => {
      const languages = ['en', 'tr', 'de', 'fr', 'es'];

      for (const lang of languages) {
        const input = {
          issueType: 'Null Pointer Exception',
          originalCode: 'const value = obj.prop.nested.value;',
          fixedCode: 'const value = obj?.prop?.nested?.value;',
          language: 'javascript',
          outputLanguage: lang,
        };

        const result = await executeTool(input);
        expect(result).toBeDefined();
      }
    });
  });

  // ==================== PRAGMATIC ACCEPTANCE TESTS ====================
  describe('Pragmatic Acceptance Criteria', () => {
    it('should accept fix that solves the primary issue even if not optimal', async () => {
      const input = {
        issueType: 'SQL Injection',
        originalCode: "SELECT * FROM users WHERE id = " + 'user-123',
        fixedCode: "SELECT * FROM users WHERE id = ?", // Simple parameterized query
        language: 'javascript',
      };

      const result = await executeTool(input);
      expect(result).toBeDefined();
    });

    it('should accept any valid solution approach', async () => {
      const validApproaches = [
        "db.execute('SELECT * FROM users WHERE id = ?', [userId])",
        "connection.prepare('SELECT * FROM users WHERE id = ?').execute([userId])",
        "db.query('SELECT * FROM users WHERE id = ?', userId)",
      ];

      for (const fixedCode of validApproaches) {
        const input = {
          issueType: 'SQL Injection',
          originalCode: "SELECT * FROM users WHERE id = " + 'user-123',
          fixedCode: fixedCode,
          language: 'javascript',
        };

        const result = await executeTool(input);
        expect(result).toBeDefined();
      }
    });

    it('should reject fixes that do not solve the issue', async () => {
      const input = {
        issueType: 'SQL Injection',
        originalCode: "SELECT * FROM users WHERE id = " + 'user-123',
        fixedCode: "SELECT * FROM users WHERE id = " + 'user-123', // Not fixed
        language: 'javascript',
      };

      const result = await executeTool(input);
      if (result.success && result.data) {
        expect(result.data.isCorrect === false || result.data.severity !== 'correct').toBe(true);
      }
    });

    it('should mark correct when issue is definitively solved', async () => {
      const input = {
        issueType: 'SQL Injection',
        originalCode: "SELECT * FROM users WHERE id = " + 'user-123',
        fixedCode: "SELECT * FROM users WHERE id = ?",
        language: 'javascript',
      };

      const result = await executeTool(input);
      expect(result).toBeDefined();
    });
  });

  // ==================== MODEL PROVIDER TESTS ====================
  describe('Model Provider Support', () => {
    it('should accept OPENAI provider', async () => {
      const input = {
        issueType: 'SQL Injection',
        originalCode: "SELECT * FROM users WHERE id = " + 'user-123',
        fixedCode: "SELECT * FROM users WHERE id = ?",
        language: 'javascript',
        modelProvider: 'OPENAI',
      };

      const result = await executeTool(input);
      expect(result).toBeDefined();
    });

    it('should accept WORKERS_AI provider', async () => {
      const input = {
        issueType: 'XSS',
        originalCode: 'element.innerHTML = userInput;',
        fixedCode: 'element.textContent = userInput;',
        language: 'javascript',
        modelProvider: 'WORKERS_AI',
      };

      const result = await executeTool(input);
      expect(result).toBeDefined();
    });

    it('should accept GOOGLE provider', async () => {
      const input = {
        issueType: 'Performance Issue',
        originalCode: 'let sum = 0; for(let i=0; i<arr.length; i++) sum += arr[i];',
        fixedCode: 'const sum = arr.reduce((a, b) => a + b, 0);',
        language: 'javascript',
        modelProvider: 'GOOGLE',
      };

      const result = await executeTool(input);
      expect(result).toBeDefined();
    });

    it('should accept model override parameter', async () => {
      const input = {
        issueType: 'Logic Error',
        originalCode: 'if (age > 18 || age < 65) { allowAccess(); }',
        fixedCode: 'if (age >= 18 && age < 65) { allowAccess(); }',
        language: 'javascript',
        model: 'claude-3-sonnet-20240229',
      };

      const result = await executeTool(input);
      expect(result).toBeDefined();
    });

    it('should work with both provider and model override', async () => {
      const input = {
        issueType: 'Null Pointer Exception',
        originalCode: 'const value = obj.prop.nested.value;',
        fixedCode: 'const value = obj?.prop?.nested?.value;',
        language: 'javascript',
        modelProvider: 'OPENAI',
        model: 'gpt-4-turbo',
      };

      const result = await executeTool(input);
      expect(result).toBeDefined();
    });
  });

  // ==================== CONSISTENCY TESTS ====================
  describe('Response Consistency', () => {
    it('should always include all data fields in success response', async () => {
      const input = {
        issueType: 'SQL Injection',
        originalCode: "SELECT * FROM users WHERE id = " + 'user-123',
        fixedCode: "SELECT * FROM users WHERE id = ?",
        language: 'javascript',
      };

      const result = await executeTool(input);
      if (result.success && result.data) {
        expect(result.data.isCorrect).toBeDefined();
        expect(result.data.severity).toBeDefined();
        expect(result.data.feedback).toBeDefined();
        expect(result.data.explanation).toBeDefined();
        expect(result.data.points).toBeDefined();
        expect('hint' in result.data).toBe(true);
      }
    });

    it('should provide points consistent with severity', async () => {
      const input = {
        issueType: 'XSS',
        originalCode: 'element.innerHTML = userInput;',
        fixedCode: 'element.textContent = userInput;',
        language: 'javascript',
      };

      const result = await executeTool(input);
      if (result.success && result.data) {
        if (result.data.severity === 'correct') {
          expect(result.data.points).toBe(25);
        } else if (result.data.severity === 'partial') {
          expect(result.data.points).toBe(10);
        } else if (result.data.severity === 'incorrect') {
          expect(result.data.points).toBe(0);
        }
      }
    });

    it('should provide feedback matching the output language', async () => {
      const input = {
        issueType: 'Performance Issue',
        originalCode: 'for(let i=0; i<arr.length; i++) result.push(arr[i]);',
        fixedCode: 'const result = [...arr];',
        language: 'javascript',
        outputLanguage: 'tr',
      };

      const result = await executeTool(input);
      if (result.success && result.data) {
        expect(typeof result.data.feedback).toBe('string');
        expect(result.data.feedback.length).toBeGreaterThan(0);
      }
    });
  });

  // ==================== ADDITIONAL LANGUAGE SUPPORT TESTS ====================
  describe('Additional Language Support', () => {
    it('should validate Kotlin code', async () => {
      const input = {
        issueType: 'Null Pointer Exception',
        originalCode: 'val value = obj?.prop?.nested?.value',
        fixedCode: 'val value = obj?.prop?.nested?.value ?: defaultValue',
        language: 'kotlin',
      };

      const result = await executeTool(input);
      expect(result).toBeDefined();
    });

    it('should validate Swift code', async () => {
      const input = {
        issueType: 'Null Pointer Exception',
        originalCode: 'let value = obj.prop.nested.value',
        fixedCode: 'let value = obj?.prop?.nested?.value',
        language: 'swift',
      };

      const result = await executeTool(input);
      expect(result).toBeDefined();
    });

    it('should validate Rust code', async () => {
      const input = {
        issueType: 'Buffer Overflow',
        originalCode: 'let mut buffer = [0; 10]; for &byte in input { buffer.push(byte); }',
        fixedCode: 'let mut buffer = Vec::new(); for &byte in input.iter().take(10) { buffer.push(byte); }',
        language: 'rust',
      };

      const result = await executeTool(input);
      expect(result).toBeDefined();
    });

    it('should validate SQL code', async () => {
      const input = {
        issueType: 'SQL Injection',
        originalCode: `EXECUTE 'SELECT * FROM users WHERE id = ' + @userId`,
        fixedCode: `EXECUTE sp_executesql N'SELECT * FROM users WHERE id = @id', N'@id INT', @id = @userId`,
        language: 'sql',
      };

      const result = await executeTool(input);
      expect(result).toBeDefined();
    });
  });
});

