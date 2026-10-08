export type Strength = "unknown" | "partial" | "strong" | "conflicted";

export type PpaStage =
  | "business_direction"
  | "best_customer"
  | "differentiation"
  | "evidence"
  | "pressure_test"
  | "ready";

export type DiscoveryMap = {
  businessContext: Strength;
  desiredWork: Strength;
  unwantedWork: Strength;
  economicFit: Strength;
  businessDirection: Strength;
  bestCustomerPattern: Strength;
  buyingTrigger: Strength;
  whyNow: Strength;
  desiredOutcome: Strength;
  buyerFears: Strength;
  decisionCriteria: Strength;
  alternatives: Strength;
  premiumBuyingLogic: Strength;
  poorFitPattern: Strength;
  choiceReasons: Strength;
  experienceDifferences: Strength;
  differentiatorMechanisms: Strength;
  buyerRelevance: Strength;
  differentiatorProof: Strength;
  commodityPressure: Strength;
  unwantedIdentity: Strength;
  lostBusinessSignals: Strength;
  voiceOfCustomer: Strength;
  trustAssets: Strength;
  competitiveSeparation: Strength;
  positioningReadiness: Strength;
};

export type PpaFacts = {
  companyName: string;
  businessSummary: string;
  geography: string;
  currentWork: string[];
  desiredWork: string[];
  unwantedWork: string[];
  typicalProjectValue: string;
  idealProjectValue: string;
  direction: string;
  bestCustomerPatterns: string[];
  buyingTriggers: string[];
  whyNow: string[];
  desiredOutcomes: string[];
  buyerFears: string[];
  decisionCriteria: string[];
  alternatives: string[];
  premiumBuyingLogic: string[];
  poorFitPatterns: string[];
  choiceReasons: string[];
  experienceDifferences: string[];
  differentiators: string[];
  differentiatorProof: string[];
  commodityPressure: string[];
  unwantedIdentity: string[];
  wantedIdentity: string[];
  lostBusinessSignals: string[];
  voiceOfCustomerExact: string[];
  voiceOfCustomerThemes: string[];
  trustAssets: string[];
  competitors: string[];
  sourceNotes: string[];
  unresolved: string[];
};

export type PpaState = {
  stage: PpaStage;
  progress: number;
  questionCount: number;
  discovery: DiscoveryMap;
  facts: PpaFacts;
  conciseSummary: string;
};

export type TurnMessage = {
  role: "assistant" | "user";
  content: string;
};

export type TurnResponse = {
  assistantMessage: string;
  stage: PpaStage;
  progress: number;
  readyForBlueprint: boolean;
  state: PpaState;
};
