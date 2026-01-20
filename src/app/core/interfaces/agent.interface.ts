interface AgentIntent {
  type: string;
  confidence: number;
}

interface AgentAction {
  id: string;
  type: string;
  description: string;
  status: 'PENDING' | 'RUNNING' | 'DONE' | 'FAILED';
}
