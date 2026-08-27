
import type { RecordingStep } from './recording'

export interface AuthConfig {
  baseUrl: string;
  loginUrl: string;
  username: string;
  password?: string;
  apiBaseUrl?: string; // Target environment API URL for data seeding
}

export type Priority = 'low' | 'medium' | 'high' | 'critical';

// --- New status types ---
export type ProcessingStatus = 'idle' | 'generating' | 'generation_failed';

export type ScenarioAutomationStatus =
  | 'not_generated'
  | 'idle'
  | 'running'
  | 'passed'
  | 'failed'
  | 'partial';

export type TestCaseAutomationStatus =
  | 'not_generated'
  | 'idle'
  | 'running'
  | 'passed'
  | 'failed';

// Old AutomationStatus kept for backward compat (used on AutomationTest.status)
export type AutomationStatus = 'idle' | 'running' | 'pass' | 'fail';

export type AutomationCategory = 'api' | 'e2e' | 'manual';
export type ManualTestStatus = 'passed' | 'failed';

// --- Deprecated old status types ---
/** @deprecated Use ProcessingStatus / ScenarioAutomationStatus instead */
export type TestCaseStatus = 'draft' | 'ready' | 'blocked' | 'deprecated';
/** @deprecated Use ProcessingStatus / ScenarioAutomationStatus instead */
export type ScenarioStatus = 'draft' | 'uploaded' | 'ready' | 'generating' | 'failed';

export interface AutomationTest {
  id: string;
  name: string;
  category?: AutomationCategory;
  framework?: string;
  status: AutomationStatus;
  repoId?: string;
  prompt?: string;
  lastRunAt?: string;
  runDurationMs?: number;
  steps?: RecordingStep[];
  videoUrl?: string;
  screenshotUrl?: string;
  log?: string;
  errorMessage?: string;
}

export interface TestStep {
  id: string;
  order: number;
  action: string;
  data?: string;
  expected: string;
}

export interface TestCase {
  id: string;
  order: number;
  code: string;
  title: string;
  description?: string;
  preCondition?: string;
  steps: TestStep[];
  tags: string[];
  priority: Priority;
  type: string;
  /** @deprecated Use processingStatus / automationStatus instead */
  status: TestCaseStatus;
  processingStatus?: ProcessingStatus;
  automationStatus?: TestCaseAutomationStatus;
  automationType?: AutomationCategory;
  automationTest?: AutomationTest;
  note?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ManualEvidenceFile {
  name: string;
  url: string;
  contentType?: string;
  size?: number;
  uploadedAt: string;
}

export interface ManualTestResult {
  id: string;
  projectId: string;
  scenarioId: string;
  sectionId?: string;
  testCaseId: string;
  status: ManualTestStatus;
  description: string;
  evidence: ManualEvidenceFile[];
  testerId?: number;
  createdAt: string;
  updatedAt: string;
}

export interface TestSection {
  id: string;
  order: number;
  title: string;
  description?: string;
  testCases: TestCase[];
}

export interface ScenarioStats {
  totalSections: number;
  totalTestCases: number;
  totalSteps: number;
  generatedCount: number;
  notGeneratedCount: number;
  generatingCount: number;
  generationFailedCount: number;
  idleCount: number;
  runningCount: number;
  passCount: number;
  failCount: number;
  coveragePercent: number;
  /** @deprecated Use generatedCount */
  automatedCount?: number;
  /** @deprecated Not used in new model */
  draftCount?: number;
}

export interface TestCaseSummary {
  id: string;
  code: string;
  title: string;
  errorMessage?: string;
}

export interface ActiveTestCases {
  generating: TestCaseSummary[];
  running: TestCaseSummary[];
  failedGeneration: TestCaseSummary[];
  failedRun: TestCaseSummary[];
}

export interface TestScenario {
  id: string;
  title: string;
  description?: string;
  sections?: TestSection[];
  projectId?: string;
  projectName?: string;
  issueRepoId?: string;
  specsRepoId?: string;
  sourceType?: string;
  sourcePath?: string;
  sourceSha?: string;
  /** @deprecated Use processingStatus / automationStatus instead */
  status: ScenarioStatus;
  processingStatus?: ProcessingStatus;
  automationStatus?: ScenarioAutomationStatus;
  error?: string;
  stats?: ScenarioStats;
  automationStats?: ScenarioStats;
  activeTestCases?: ActiveTestCases;
  authConfig?: AuthConfig;
  sourceDisplay?: string;
  createdAt: string;
  updatedAt: string;
  creatorId?: number;
}
