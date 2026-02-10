import { describe, expect, it } from 'vitest';
import {
  workflowExecutorTool,
  phishingWorkflowExecutorTool,
  smishingWorkflowExecutorTool,
  phishingEditorTool,
  smishingEditorTool,
} from './index';

describe('orchestration/index exports', () => {
  it('exports all orchestration tools', () => {
    const tools = [
      workflowExecutorTool,
      phishingWorkflowExecutorTool,
      smishingWorkflowExecutorTool,
      phishingEditorTool,
      smishingEditorTool,
    ];

    expect(tools).toHaveLength(5);
    tools.forEach((tool) => expect(tool).toBeDefined());
  });

  it('exposes ids on exported tools', () => {
    expect((workflowExecutorTool as any).id).toBeTruthy();
    expect((phishingWorkflowExecutorTool as any).id).toBeTruthy();
    expect((smishingWorkflowExecutorTool as any).id).toBeTruthy();
    expect((phishingEditorTool as any).id).toBeTruthy();
    expect((smishingEditorTool as any).id).toBeTruthy();
  });
});

