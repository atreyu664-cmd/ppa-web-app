const strength = { type: "string", enum: ["unknown", "partial", "strong", "conflicted"] } as const;

export const turnSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    assistantMessage: { type: "string" },
    stage: {
      type: "string",
      enum: ["business_direction", "best_customer", "differentiation", "evidence", "pressure_test", "ready"],
    },
    progress: { type: "integer", minimum: 0, maximum: 100 },
    readyForBlueprint: { type: "boolean" },
    state: {
      type: "object",
      additionalProperties: false,
      properties: {
        stage: {
          type: "string",
          enum: ["business_direction", "best_customer", "differentiation", "evidence", "pressure_test", "ready"],
        },
        progress: { type: "integer", minimum: 0, maximum: 100 },
        questionCount: { type: "integer", minimum: 0, maximum: 60 },
        discovery: {
          type: "object",
          additionalProperties: false,
          properties: {
            businessContext: strength, desiredWork: strength, unwantedWork: strength, economicFit: strength, serviceAreaFit: strength, customerValue: strength,
            businessDirection: strength, bestCustomerPattern: strength, buyingTrigger: strength, whyNow: strength,
            desiredOutcome: strength, buyerFears: strength, decisionCriteria: strength, alternatives: strength,
            premiumBuyingLogic: strength, decisionStructure: strength, leadIntakeSales: strength, projectDelivery: strength, serviceHierarchy: strength, poorFitPattern: strength, choiceReasons: strength, experienceDifferences: strength,
            differentiatorMechanisms: strength, buyerRelevance: strength, differentiatorProof: strength,
            commodityPressure: strength, unwantedIdentity: strength, lostBusinessSignals: strength,
            voiceOfCustomer: strength, trustAssets: strength, competitiveSeparation: strength, competitorSelfAssessment: strength, marketResearch: strength, positioningReadiness: strength
          },
          required: ["businessContext","desiredWork","unwantedWork","economicFit","serviceAreaFit","customerValue","businessDirection","bestCustomerPattern","buyingTrigger","whyNow","desiredOutcome","buyerFears","decisionCriteria","alternatives","premiumBuyingLogic","decisionStructure","leadIntakeSales","projectDelivery","serviceHierarchy","poorFitPattern","choiceReasons","experienceDifferences","differentiatorMechanisms","buyerRelevance","differentiatorProof","commodityPressure","unwantedIdentity","lostBusinessSignals","voiceOfCustomer","trustAssets","competitiveSeparation","competitorSelfAssessment","marketResearch","positioningReadiness"]
        },
        facts: {
          type: "object",
          additionalProperties: false,
          properties: {
            companyName: { type: "string" }, businessSummary: { type: "string" }, geography: { type: "string" }, priorityServiceAreas: { type: "array", items: { type: "string" } },
            currentWork: { type: "array", items: { type: "string" } }, desiredWork: { type: "array", items: { type: "string" } },
            unwantedWork: { type: "array", items: { type: "string" } }, typicalProjectValue: { type: "string" }, idealProjectValue: { type: "string" }, customerAov: { type: "string" }, customerLtv: { type: "string" }, highestValueServices: { type: "array", items: { type: "string" } },
            direction: { type: "string" }, bestCustomerPatterns: { type: "array", items: { type: "string" } },
            buyingTriggers: { type: "array", items: { type: "string" } }, whyNow: { type: "array", items: { type: "string" } },
            desiredOutcomes: { type: "array", items: { type: "string" } }, buyerFears: { type: "array", items: { type: "string" } },
            decisionCriteria: { type: "array", items: { type: "string" } }, alternatives: { type: "array", items: { type: "string" } },
            premiumBuyingLogic: { type: "array", items: { type: "string" } }, decisionStructure: { type: "string" }, leadIntakeSalesProcess: { type: "string" }, projectDeliveryProcess: { type: "string" }, operationalDifferentiators: { type: "array", items: { type: "string" } }, serviceHierarchy: { type: "array", items: { type: "string" } }, qualificationCriteria: { type: "array", items: { type: "string" } }, disqualificationCriteria: { type: "array", items: { type: "string" } }, poorFitPatterns: { type: "array", items: { type: "string" } },
            choiceReasons: { type: "array", items: { type: "string" } }, experienceDifferences: { type: "array", items: { type: "string" } },
            differentiators: { type: "array", items: { type: "string" } }, differentiatorProof: { type: "array", items: { type: "string" } },
            commodityPressure: { type: "array", items: { type: "string" } }, unwantedIdentity: { type: "array", items: { type: "string" } },
            wantedIdentity: { type: "array", items: { type: "string" } }, lostBusinessSignals: { type: "array", items: { type: "string" } },
            voiceOfCustomerExact: { type: "array", items: { type: "string" } }, voiceOfCustomerThemes: { type: "array", items: { type: "string" } },
            trustAssets: { type: "array", items: { type: "string" } }, competitors: { type: "array", items: { type: "string" } }, competitorSelfAssessment: { type: "array", items: { type: "string" } }, researchFindings: { type: "array", items: { type: "string" } },
            sourceNotes: { type: "array", items: { type: "string" } }, unresolved: { type: "array", items: { type: "string" } }
          },
          required: ["companyName","businessSummary","geography","priorityServiceAreas","currentWork","desiredWork","unwantedWork","typicalProjectValue","idealProjectValue","customerAov","customerLtv","highestValueServices","direction","bestCustomerPatterns","buyingTriggers","whyNow","desiredOutcomes","buyerFears","decisionCriteria","alternatives","premiumBuyingLogic","decisionStructure","leadIntakeSalesProcess","projectDeliveryProcess","operationalDifferentiators","serviceHierarchy","qualificationCriteria","disqualificationCriteria","poorFitPatterns","choiceReasons","experienceDifferences","differentiators","differentiatorProof","commodityPressure","unwantedIdentity","wantedIdentity","lostBusinessSignals","voiceOfCustomerExact","voiceOfCustomerThemes","trustAssets","competitors","competitorSelfAssessment","researchFindings","sourceNotes","unresolved"]
        },
        conciseSummary: { type: "string", maxLength: 5000 }
      },
      required: ["stage","progress","questionCount","discovery","facts","conciseSummary"]
    }
  },
  required: ["assistantMessage","stage","progress","readyForBlueprint","state"]
} as const;

export const blueprintSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    title: { type: "string" },
    executivePositioningSummary: { type: "string" },
    businessIdentity: { type: "string" },
    idealCustomer: { type: "string" },
    whyCustomersChooseYou: { type: "string" },
    coreDifferentiators: { type: "array", items: { type: "object", additionalProperties: false, properties: {
      title: { type: "string" }, difference: { type: "string" }, buyerRelevance: { type: "string" }, reasonToBelieve: { type: "string" }
    }, required: ["title","difference","buyerRelevance","reasonToBelieve"] } },
    marketPosition: { type: "string" },
    positioningStatement: { type: "string" },
    competitiveContextSnapshot: { type: "array", maxItems: 3, items: { type: "object", additionalProperties: false, properties: {
      competitor: { type: "string" }, theirPositioning: { type: "string" }, apparentStrengths: { type: "string" }, apparentWeaknesses: { type: "string" }, clientOpportunity: { type: "string" }
    }, required: ["competitor","theirPositioning","apparentStrengths","apparentWeaknesses","clientOpportunity"] } },
    marketResearchSignals: { type: "array", items: { type: "string" } },
    voiceOfCustomerHighlights: { type: "array", items: { type: "object", additionalProperties: false, properties: {
      label: { type: "string" }, content: { type: "string" }, kind: { type: "string", enum: ["exact","paraphrase","theme"] }
    }, required: ["label","content","kind"] } },
    trustAndProofSnapshot: { type: "array", items: { type: "string" } },
    strategicPriorities: { type: "array", minItems: 3, maxItems: 3, items: { type: "object", additionalProperties: false, properties: {
      title: { type: "string" }, focus: { type: "string" }, whyItMatters: { type: "string" }
    }, required: ["title","focus","whyItMatters"] } },
    openQuestions: { type: "array", items: { type: "string" } },
    nextStep: { type: "string" }
  },
  required: ["title","executivePositioningSummary","businessIdentity","idealCustomer","whyCustomersChooseYou","coreDifferentiators","marketPosition","positioningStatement","competitiveContextSnapshot","marketResearchSignals","voiceOfCustomerHighlights","trustAndProofSnapshot","strategicPriorities","openQuestions","nextStep"]
} as const;
