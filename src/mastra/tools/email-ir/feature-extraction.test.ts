import { describe, it, expect } from 'vitest';
import { featureExtractionTool, featureExtractionInputSchema, featureExtractionOutputSchema } from './feature-extraction';

describe('featureExtractionTool', () => {
  it('should be defined', () => {
    expect(featureExtractionTool).toBeDefined();
  });

  it('should have correct ID', () => {
    expect(featureExtractionTool.id).toBe('email-ir-feature-extraction-tool');
  });

  it('should have correct description', () => {
    expect(featureExtractionTool.description).toContain('feature set');
  });

  it('should have input schema defined', () => {
    expect(featureExtractionInputSchema).toBeDefined();
  });

  it('should have output schema defined', () => {
    expect(featureExtractionOutputSchema).toBeDefined();
  });

  it('should output include engine_indicators_present field', () => {
    const fields = featureExtractionOutputSchema.shape;
    expect(fields.engine_indicators_present).toBeDefined();
  });

  it('should output include intent field', () => {
    const fields = featureExtractionOutputSchema.shape;
    expect(fields.intent).toBeDefined();
  });

  it('should output include analysis_summary field', () => {
    const fields = featureExtractionOutputSchema.shape;
    expect(fields.analysis_summary).toBeDefined();
  });

  it('should have execute function', () => {
    expect(featureExtractionTool.execute).toBeDefined();
    expect(typeof featureExtractionTool.execute).toBe('function');
  });

  it('should pass through original email in output', () => {
    const fields = featureExtractionOutputSchema.shape;
    expect(fields.original_email).toBeDefined();
    expect(fields.triage_result).toBeDefined();
    expect(fields.header_analysis).toBeDefined();
    expect(fields.behavioral_analysis).toBeDefined();
    expect(fields.intent_analysis).toBeDefined();
  });
});
