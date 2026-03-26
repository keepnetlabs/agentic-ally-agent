import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const warnMock = vi.hoisted(() => vi.fn());

vi.mock('./logger', () => ({
  getLogger: () => ({ warn: warnMock, info: vi.fn(), error: vi.fn(), debug: vi.fn() }),
}));

import { emitToolProgress, emitWorkflowStep, createWorkflowProgress } from './stream-progress';

describe('emitToolProgress', () => {
  beforeEach(() => {
    warnMock.mockClear();
  });

  it('no-ops when writer is undefined', async () => {
    await emitToolProgress(undefined, {
      toolCallId: 'c1',
      toolName: 't',
      status: 'running',
    });
    expect(warnMock).not.toHaveBeenCalled();
  });

  it('warns when writer.write rejects', async () => {
    const writer = { write: vi.fn().mockRejectedValue(new Error('write failed')) };
    await emitToolProgress(writer, {
      toolCallId: 'c1',
      toolName: 'my-tool',
      status: 'running',
    });
    expect(warnMock).toHaveBeenCalledWith(
      'Failed to emit tool progress',
      expect.objectContaining({ toolName: 'my-tool', error: 'Error: write failed' })
    );
  });
});

describe('emitWorkflowStep', () => {
  beforeEach(() => {
    warnMock.mockClear();
  });

  it('warns when writer.write rejects', async () => {
    const writer = { write: vi.fn().mockRejectedValue(new Error('step fail')) };
    await emitWorkflowStep(writer, {
      workflowRunId: 'wr1',
      workflowName: 'wf',
      stepIndex: 0,
      totalSteps: 1,
      stepName: 's',
      status: 'running',
    });
    expect(warnMock).toHaveBeenCalledWith(
      'Failed to emit workflow step',
      expect.objectContaining({ stepName: 's', error: 'Error: step fail' })
    );
  });
});

describe('createWorkflowProgress', () => {
  beforeEach(() => {
    warnMock.mockClear();
    vi.spyOn(crypto, 'randomUUID').mockReturnValue('aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('step and complete emit workflow events with cached step name', async () => {
    const write = vi.fn().mockResolvedValue(undefined);
    const progress = createWorkflowProgress({ write }, 'create-test', 3);

    await progress.step(1, 'Generate', 'working…');
    await progress.complete(1, 'done');

    expect(write).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        type: 'data-workflow-step',
        data: expect.objectContaining({
          workflowRunId: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
          workflowName: 'create-test',
          stepIndex: 1,
          totalSteps: 3,
          stepName: 'Generate',
          status: 'running',
          message: 'working…',
        }),
      })
    );
    expect(write).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        type: 'data-workflow-step',
        data: expect.objectContaining({
          stepIndex: 1,
          stepName: 'Generate',
          status: 'completed',
          message: 'done',
        }),
      })
    );
  });
});
