/**
 * Schemas Barrel Exports
 * Clean imports: import { MicrolearningContentSchema, InputSchema } from './schemas';
 *
 * All Zod schemas and their inferred types:
 * - microlearning-schema: Core microlearning structure
 * - generate-language-json-schema: Language generation I/O
 * - create-inbox-structure-schema: Inbox generation I/O
 * - phishing-workflow-schemas: Phishing simulation I/O
 */

// Microlearning schemas
export {
    SceneMetadataSchema,
    SceneSchema,
    MicrolearningMetadataSchema,
    ScientificEvidenceSchema,
    ThemeSchema,
    MicrolearningContentSchema,
    LanguageContentSchema,
    InboxContentSchema,
} from './microlearning-schema';

// Language generation schemas
export {
    GenerateLanguageJsonSchema,
    GenerateLanguageJsonOutputSchema,
} from './generate-language-json-schema';
export type {
    GenerateLanguageJsonInput,
    GenerateLanguageJsonOutput,
} from './generate-language-json-schema';

// Inbox structure schemas
export {
    CreateInboxStructureSchema,
    CreateInboxStructureOutputSchema,
} from './create-inbox-structure-schema';
export type {
    CreateInboxStructureInput,
    CreateInboxStructureOutput,
} from './create-inbox-structure-schema';

export * from './create-phishing-schemas';
// Add Language Workflow Schemas
export * from './add-language-schemas';
export * from './create-microlearning-schemas';
export * from './update-microlearning-schemas';
