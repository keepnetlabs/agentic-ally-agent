import { describe, it, expect, vi, beforeEach } from 'vitest';
import { routeToCSAgent } from './cs-orchestration-helpers';
import { CS_AGENT_NAMES } from '../agents/customer-service/cs-constants';
import '../../__tests__/setup';

vi.mock('./core/logger', () => ({
  getLogger: vi.fn().mockReturnValue({
    info: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
    error: vi.fn(),
  }),
}));

const mockRoute = vi.fn();
vi.mock('../services/cs-agent-router', () => ({
  CSAgentRouter: vi.fn().mockImplementation(function (this: any) {
    return { route: mockRoute };
  }),
}));

describe('routeToCSAgent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return routing result from CSAgentRouter', async () => {
    mockRoute.mockResolvedValue({
      agentName: CS_AGENT_NAMES.COMPANY_SEARCH,
      taskContext: 'Find companies in healthcare',
    });

    const result = await routeToCSAgent({} as any, 'Show me healthcare companies');

    expect(result.agentName).toBe(CS_AGENT_NAMES.COMPANY_SEARCH);
    expect(result.taskContext).toBe('Find companies in healthcare');
    expect(mockRoute).toHaveBeenCalledWith('Show me healthcare companies');
  });

  it('should pass through training stats routing', async () => {
    mockRoute.mockResolvedValue({
      agentName: CS_AGENT_NAMES.TRAINING_STATS,
      taskContext: 'Training stats for company',
    });

    const result = await routeToCSAgent({} as any, 'How many trainings in English?');

    expect(result.agentName).toBe(CS_AGENT_NAMES.TRAINING_STATS);
  });
});
