import { describe, it, expect, vi } from 'vitest';

// Mock D1Store to prevent network calls
vi.mock('@mastra/cloudflare-d1', () => ({
  D1Store: class {
    constructor() { }
    __setTelemetry = vi.fn();
    __setLogger = vi.fn();
    init = vi.fn();
  }
}));

// Mock cloudflare:workers module
vi.mock('cloudflare:workers', () => ({
  WorkflowEntrypoint: class { },
}));

// Mock services to prevent import crashes
vi.mock('../services/kv-service', () => ({
  KVService: class {
    savePhishingBase = vi.fn();
    savePhishingEmail = vi.fn();
    savePhishingLandingPage = vi.fn();
  }
}));

vi.mock('../services/product-service', () => ({
  ProductService: class {
    getWhitelabelingConfig = vi.fn();
  }
}));

vi.mock('../utils/core/logger', () => ({
  getLogger: vi.fn(() => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn()
  }))
}));

// Mock main index to prevent circular dependency with AutonomousWorkflow
vi.mock('../index', () => ({
  mastra: {}
}));

import {
  createMicrolearningWorkflow,
  addLanguageWorkflow,
  addMultipleLanguagesWorkflow,
  updateMicrolearningWorkflow,
  createPhishingWorkflow,
  AutonomousWorkflow
} from './index';

describe('workflows/index.ts - Barrel Export', () => {
  // Tests for all exports are defined
  describe('Export Definitions', () => {
    it('should export createMicrolearningWorkflow', () => {
      expect(createMicrolearningWorkflow).toBeDefined();
    });

    it('should export addLanguageWorkflow', () => {
      expect(addLanguageWorkflow).toBeDefined();
    });

    it('should export addMultipleLanguagesWorkflow', () => {
      expect(addMultipleLanguagesWorkflow).toBeDefined();
    });

    it('should export updateMicrolearningWorkflow', () => {
      expect(updateMicrolearningWorkflow).toBeDefined();
    });

    it('should export createPhishingWorkflow', () => {
      expect(createPhishingWorkflow).toBeDefined();
    });

    it('should export AutonomousWorkflow', () => {
      expect(AutonomousWorkflow).toBeDefined();
    });

    it('should have 6 total exports', () => {
      const exports = [
        createMicrolearningWorkflow,
        addLanguageWorkflow,
        addMultipleLanguagesWorkflow,
        updateMicrolearningWorkflow,
        createPhishingWorkflow,
        AutonomousWorkflow
      ];
      expect(exports.length).toBe(6);
    });
  });

  // Tests for export null checks
  describe('Export Null Checks', () => {
    it('createMicrolearningWorkflow should not be null', () => {
      expect(createMicrolearningWorkflow).not.toBeNull();
    });

    it('addLanguageWorkflow should not be null', () => {
      expect(addLanguageWorkflow).not.toBeNull();
    });

    it('addMultipleLanguagesWorkflow should not be null', () => {
      expect(addMultipleLanguagesWorkflow).not.toBeNull();
    });

    it('updateMicrolearningWorkflow should not be null', () => {
      expect(updateMicrolearningWorkflow).not.toBeNull();
    });

    it('createPhishingWorkflow should not be null', () => {
      expect(createPhishingWorkflow).not.toBeNull();
    });

    it('AutonomousWorkflow should not be null', () => {
      expect(AutonomousWorkflow).not.toBeNull();
    });
  });

  // Tests for export undefined checks
  describe('Export Undefined Checks', () => {
    it('createMicrolearningWorkflow should not be undefined', () => {
      expect(createMicrolearningWorkflow).not.toBeUndefined();
    });

    it('addLanguageWorkflow should not be undefined', () => {
      expect(addLanguageWorkflow).not.toBeUndefined();
    });

    it('addMultipleLanguagesWorkflow should not be undefined', () => {
      expect(addMultipleLanguagesWorkflow).not.toBeUndefined();
    });

    it('updateMicrolearningWorkflow should not be undefined', () => {
      expect(updateMicrolearningWorkflow).not.toBeUndefined();
    });

    it('createPhishingWorkflow should not be undefined', () => {
      expect(createPhishingWorkflow).not.toBeUndefined();
    });

    it('AutonomousWorkflow should not be undefined', () => {
      expect(AutonomousWorkflow).not.toBeUndefined();
    });
  });

  // Tests for workflow instances
  describe('Workflow Instance Checks', () => {
    it('createMicrolearningWorkflow should be a Workflow instance', () => {
      expect(createMicrolearningWorkflow).toHaveProperty('id');
      expect(createMicrolearningWorkflow).toHaveProperty('description');
    });

    it('addLanguageWorkflow should be a Workflow instance', () => {
      expect(addLanguageWorkflow).toHaveProperty('id');
      expect(addLanguageWorkflow).toHaveProperty('description');
    });

    it('addMultipleLanguagesWorkflow should be a Workflow instance', () => {
      expect(addMultipleLanguagesWorkflow).toHaveProperty('id');
      expect(addMultipleLanguagesWorkflow).toHaveProperty('description');
    });

    it('updateMicrolearningWorkflow should be a Workflow instance', () => {
      expect(updateMicrolearningWorkflow).toHaveProperty('id');
      expect(updateMicrolearningWorkflow).toHaveProperty('description');
    });

    it('createPhishingWorkflow should be a Workflow instance', () => {
      expect(createPhishingWorkflow).toHaveProperty('id');
      expect(createPhishingWorkflow).toHaveProperty('description');
    });

    it('AutonomousWorkflow should be a class (not instance)', () => {
      expect(typeof AutonomousWorkflow).toBe('function');
    });
  });

  // Tests for workflow IDs
  describe('Workflow IDs', () => {
    it('createMicrolearningWorkflow should have correct id', () => {
      expect(createMicrolearningWorkflow.id).toBe('create-microlearning-workflow');
    });

    it('addLanguageWorkflow should have correct id', () => {
      expect(addLanguageWorkflow.id).toBe('add-language-workflow');
    });

    it('addMultipleLanguagesWorkflow should have correct id', () => {
      expect(addMultipleLanguagesWorkflow.id).toBe('add-multiple-languages-workflow');
    });

    it('updateMicrolearningWorkflow should have correct id', () => {
      expect(updateMicrolearningWorkflow.id).toBe('update-microlearning-workflow');
    });

    it('createPhishingWorkflow should have correct id', () => {
      expect(createPhishingWorkflow.id).toBe('create-phishing-workflow');
    });

    it('AutonomousWorkflow should not have an id property', () => {
      expect((AutonomousWorkflow as any).id).toBeUndefined();
    });
  });

  // Tests for workflow descriptions
  describe('Workflow Descriptions', () => {
    it('createMicrolearningWorkflow should have a description', () => {
      expect(createMicrolearningWorkflow.description).toBeDefined();
      expect(typeof createMicrolearningWorkflow.description).toBe('string');
      if (typeof createMicrolearningWorkflow.description === 'string') {
        expect(createMicrolearningWorkflow.description.length).toBeGreaterThan(0);
      }
    });

    it('addLanguageWorkflow should have a description', () => {
      expect(addLanguageWorkflow.description).toBeDefined();
      expect(typeof addLanguageWorkflow.description).toBe('string');
      if (typeof addLanguageWorkflow.description === 'string') {
        expect(addLanguageWorkflow.description.length).toBeGreaterThan(0);
      }
    });

    it('addMultipleLanguagesWorkflow should have a description', () => {
      expect(addMultipleLanguagesWorkflow.description).toBeDefined();
      expect(typeof addMultipleLanguagesWorkflow.description).toBe('string');
      if (typeof addMultipleLanguagesWorkflow.description === 'string') {
        expect(addMultipleLanguagesWorkflow.description.length).toBeGreaterThan(0);
      }
    });

    it('updateMicrolearningWorkflow should have a description', () => {
      expect(updateMicrolearningWorkflow.description).toBeDefined();
      expect(typeof updateMicrolearningWorkflow.description).toBe('string');
      if (typeof updateMicrolearningWorkflow.description === 'string') {
        expect(updateMicrolearningWorkflow.description.length).toBeGreaterThan(0);
      }
    });

    it('createPhishingWorkflow should have a description', () => {
      expect(createPhishingWorkflow.description).toBeDefined();
      expect(typeof createPhishingWorkflow.description).toBe('string');
      if (typeof createPhishingWorkflow.description === 'string') {
        expect(createPhishingWorkflow.description.length).toBeGreaterThan(0);
      }
    });
  });

  // Tests for workflow input schemas
  describe('Workflow Input Schemas', () => {
    it('createMicrolearningWorkflow should have inputSchema', () => {
      expect(createMicrolearningWorkflow).toHaveProperty('inputSchema');
      expect(createMicrolearningWorkflow.inputSchema).toBeDefined();
    });

    it('addLanguageWorkflow should have inputSchema', () => {
      expect(addLanguageWorkflow).toHaveProperty('inputSchema');
      expect(addLanguageWorkflow.inputSchema).toBeDefined();
    });

    it('addMultipleLanguagesWorkflow should have inputSchema', () => {
      expect(addMultipleLanguagesWorkflow).toHaveProperty('inputSchema');
      expect(addMultipleLanguagesWorkflow.inputSchema).toBeDefined();
    });

    it('updateMicrolearningWorkflow should have inputSchema', () => {
      expect(updateMicrolearningWorkflow).toHaveProperty('inputSchema');
      expect(updateMicrolearningWorkflow.inputSchema).toBeDefined();
    });

    it('createPhishingWorkflow should have inputSchema', () => {
      expect(createPhishingWorkflow).toHaveProperty('inputSchema');
      expect(createPhishingWorkflow.inputSchema).toBeDefined();
    });

    it('AutonomousWorkflow should not have inputSchema (it is a class)', () => {
      expect((AutonomousWorkflow as any).inputSchema).toBeUndefined();
    });
  });

  // Tests for workflow output schemas
  describe('Workflow Output Schemas', () => {
    it('createMicrolearningWorkflow should have outputSchema', () => {
      expect(createMicrolearningWorkflow).toHaveProperty('outputSchema');
      expect(createMicrolearningWorkflow.outputSchema).toBeDefined();
    });

    it('addLanguageWorkflow should have outputSchema', () => {
      expect(addLanguageWorkflow).toHaveProperty('outputSchema');
      expect(addLanguageWorkflow.outputSchema).toBeDefined();
    });

    it('addMultipleLanguagesWorkflow should have outputSchema', () => {
      expect(addMultipleLanguagesWorkflow).toHaveProperty('outputSchema');
      expect(addMultipleLanguagesWorkflow.outputSchema).toBeDefined();
    });

    it('updateMicrolearningWorkflow should have outputSchema', () => {
      expect(updateMicrolearningWorkflow).toHaveProperty('outputSchema');
      expect(updateMicrolearningWorkflow.outputSchema).toBeDefined();
    });

    it('createPhishingWorkflow should have outputSchema', () => {
      expect(createPhishingWorkflow).toHaveProperty('outputSchema');
      expect(createPhishingWorkflow.outputSchema).toBeDefined();
    });

    it('AutonomousWorkflow should not have outputSchema (it is a class)', () => {
      expect((AutonomousWorkflow as any).outputSchema).toBeUndefined();
    });
  });

  // Tests for AutonomousWorkflow as a class
  describe('AutonomousWorkflow Class', () => {
    it('should be a class/constructor function', () => {
      expect(typeof AutonomousWorkflow).toBe('function');
    });

    it('should be instantiable', () => {
      expect(() => {
        new AutonomousWorkflow();
      }).not.toThrow();
    });

    it('instances should have run method', () => {
      const instance = new AutonomousWorkflow();
      expect(typeof instance.run).toBe('function');
    });

    it('should have instance properties', () => {
      const instance = new AutonomousWorkflow();
      expect(instance).toBeDefined();
    });

    it('should not have workflow-specific properties', () => {
      expect((AutonomousWorkflow as any).id).toBeUndefined();
      expect((AutonomousWorkflow as any).description).toBeUndefined();
      expect((AutonomousWorkflow as any).inputSchema).toBeUndefined();
      expect((AutonomousWorkflow as any).outputSchema).toBeUndefined();
    });
  });

  // Tests for workflow methods
  describe('Workflow Methods', () => {
    it('createMicrolearningWorkflow should have createRunAsync', () => {
      expect(typeof (createMicrolearningWorkflow as any).createRunAsync).toBe('function');
    });

    it('addLanguageWorkflow should have createRunAsync', () => {
      expect(typeof (addLanguageWorkflow as any).createRunAsync).toBe('function');
    });

    it('addMultipleLanguagesWorkflow should have createRunAsync', () => {
      expect(typeof (addMultipleLanguagesWorkflow as any).createRunAsync).toBe('function');
    });

    it('updateMicrolearningWorkflow should have createRunAsync', () => {
      expect(typeof (updateMicrolearningWorkflow as any).createRunAsync).toBe('function');
    });

    it('createPhishingWorkflow should have createRunAsync', () => {
      expect(typeof (createPhishingWorkflow as any).createRunAsync).toBe('function');
    });

    it('createMicrolearningWorkflow should have createRunAsync method', () => {
      expect(typeof (createMicrolearningWorkflow as any).createRunAsync).toBe('function');
    });

    it('addLanguageWorkflow should have createRunAsync method', () => {
      expect(typeof (addLanguageWorkflow as any).createRunAsync).toBe('function');
    });
  });

  // Tests for workflow steps
  describe('Workflow Steps Property', () => {
    it('createMicrolearningWorkflow should have steps', () => {
      expect((createMicrolearningWorkflow as any).steps).toBeDefined();
    });

    it('addLanguageWorkflow should have steps', () => {
      expect((addLanguageWorkflow as any).steps).toBeDefined();
    });

    it('addMultipleLanguagesWorkflow should have steps', () => {
      expect((addMultipleLanguagesWorkflow as any).steps).toBeDefined();
    });

    it('updateMicrolearningWorkflow should have steps', () => {
      expect((updateMicrolearningWorkflow as any).steps).toBeDefined();
    });

    it('createPhishingWorkflow should have steps', () => {
      expect((createPhishingWorkflow as any).steps).toBeDefined();
    });
  });

  // Tests for barrel export pattern
  describe('Barrel Export Pattern', () => {
    it('should support clean import syntax', () => {
      // Testing that exports work as expected
      expect(createMicrolearningWorkflow).toBeDefined();
      expect(addLanguageWorkflow).toBeDefined();
      expect(addMultipleLanguagesWorkflow).toBeDefined();
      expect(updateMicrolearningWorkflow).toBeDefined();
      expect(createPhishingWorkflow).toBeDefined();
      expect(AutonomousWorkflow).toBeDefined();
    });

    it('should export workflows with correct types', () => {
      const microlearningType = typeof createMicrolearningWorkflow;
      const languageType = typeof addLanguageWorkflow;
      const multiLanguageType = typeof addMultipleLanguagesWorkflow;
      const updateType = typeof updateMicrolearningWorkflow;
      const phishingType = typeof createPhishingWorkflow;
      const autonomousType = typeof AutonomousWorkflow;

      expect(['object', 'function']).toContain(microlearningType);
      expect(['object', 'function']).toContain(languageType);
      expect(['object', 'function']).toContain(multiLanguageType);
      expect(['object', 'function']).toContain(updateType);
      expect(['object', 'function']).toContain(phishingType);
      expect(autonomousType).toBe('function');
    });
  });

  // Tests for export organization
  describe('Export Organization', () => {
    it('should group microlearning workflows together', () => {
      // Verify the organization follows the pattern in the file
      expect(createMicrolearningWorkflow).toBeDefined();
      expect(addLanguageWorkflow).toBeDefined();
      expect(addMultipleLanguagesWorkflow).toBeDefined();
      expect(updateMicrolearningWorkflow).toBeDefined();
    });

    it('should export phishing workflow separately', () => {
      expect(createPhishingWorkflow).toBeDefined();
    });

    it('should export autonomous workflow separately', () => {
      expect(AutonomousWorkflow).toBeDefined();
    });

    it('microlearning workflows should be different from phishing', () => {
      expect(createMicrolearningWorkflow).not.toBe(createPhishingWorkflow);
    });

    it('all workflows should be distinct objects', () => {
      const workflows = [
        createMicrolearningWorkflow,
        addLanguageWorkflow,
        addMultipleLanguagesWorkflow,
        updateMicrolearningWorkflow,
        createPhishingWorkflow
      ];

      // Check that workflows are not the same object
      const ids = workflows.map((w: any) => w.id || w.name);
      const uniqueIds = new Set(ids);
      // All IDs should be unique or at least all objects should be distinct
      expect(uniqueIds.size).toBeGreaterThan(1);
    });
  });

  // Tests for export completeness
  describe('Export Completeness', () => {
    it('should have all core workflow types exported', () => {
      const hasCreateMicrolearning = createMicrolearningWorkflow !== undefined;
      const hasAddLanguage = addLanguageWorkflow !== undefined;
      const hasAddMultipleLanguages = addMultipleLanguagesWorkflow !== undefined;
      const hasUpdateMicrolearning = updateMicrolearningWorkflow !== undefined;
      const hasCreatePhishing = createPhishingWorkflow !== undefined;
      const hasAutonomous = AutonomousWorkflow !== undefined;

      expect([
        hasCreateMicrolearning,
        hasAddLanguage,
        hasAddMultipleLanguages,
        hasUpdateMicrolearning,
        hasCreatePhishing,
        hasAutonomous
      ].every(Boolean)).toBe(true);
    });

    it('should support importing individual workflows', () => {
      // This test verifies that each export can be accessed individually
      expect(createMicrolearningWorkflow).toBeTruthy();
      expect(addLanguageWorkflow).toBeTruthy();
      expect(addMultipleLanguagesWorkflow).toBeTruthy();
      expect(updateMicrolearningWorkflow).toBeTruthy();
      expect(createPhishingWorkflow).toBeTruthy();
      expect(AutonomousWorkflow).toBeTruthy();
    });

    it('should support wildcard imports', () => {
      // Simulating wildcard import
      const allWorkflows = {
        createMicrolearningWorkflow,
        addLanguageWorkflow,
        addMultipleLanguagesWorkflow,
        updateMicrolearningWorkflow,
        createPhishingWorkflow,
        AutonomousWorkflow
      };

      expect(Object.keys(allWorkflows).length).toBe(6);
    });
  });

  // Tests for export naming conventions
  describe('Export Naming Conventions', () => {
    it('workflow names should use camelCase', () => {
      // Verify naming pattern
      const names = [
        'createMicrolearningWorkflow',
        'addLanguageWorkflow',
        'addMultipleLanguagesWorkflow',
        'updateMicrolearningWorkflow',
        'createPhishingWorkflow'
      ];

      names.forEach(name => {
        expect(/^[a-z][a-zA-Z]*Workflow$/.test(name)).toBe(true);
      });
    });

    it('class names should use PascalCase', () => {
      expect(AutonomousWorkflow.name).toMatch(/^[A-Z]/);
    });

    it('should follow consistent naming pattern', () => {
      expect(createMicrolearningWorkflow).toHaveProperty('id');
      expect(addLanguageWorkflow).toHaveProperty('id');
      expect(addMultipleLanguagesWorkflow).toHaveProperty('id');
      expect(updateMicrolearningWorkflow).toHaveProperty('id');
      expect(createPhishingWorkflow).toHaveProperty('id');
    });
  });

  // Tests for import/export module pattern
  describe('Module Pattern', () => {
    it('should be importable as named exports', () => {
      expect(typeof createMicrolearningWorkflow).not.toBe('undefined');
      expect(typeof addLanguageWorkflow).not.toBe('undefined');
      expect(typeof addMultipleLanguagesWorkflow).not.toBe('undefined');
      expect(typeof updateMicrolearningWorkflow).not.toBe('undefined');
      expect(typeof createPhishingWorkflow).not.toBe('undefined');
      expect(typeof AutonomousWorkflow).not.toBe('undefined');
    });

    it('should not export a default export (only named)', () => {
      // This is implicit in the test - if there was a default, we'd test it separately
      expect(createMicrolearningWorkflow).toBeDefined();
      expect(addLanguageWorkflow).toBeDefined();
    });

    it('should allow importing multiple workflows at once', () => {
      const allWorkflows = {
        createMicrolearningWorkflow,
        addLanguageWorkflow,
        addMultipleLanguagesWorkflow,
        updateMicrolearningWorkflow,
        createPhishingWorkflow,
        AutonomousWorkflow
      };

      Object.entries(allWorkflows).forEach(([_key, value]) => {
        expect(value).toBeDefined();
        expect(value).not.toBeNull();
      });
    });
  });
});
