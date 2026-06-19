const en = {
  scoreEngine: {
    dimension: {
      ncpCompliance: { name: 'ncp_compliance', weight: 0.25, description: 'NCP Protocol spec coverage' },
      constitution: { name: 'constitution', weight: 0.30, description: 'Constitution rule violations' },
      contractIntegrity: { name: 'contract_integrity', weight: 0.20, description: 'API contract consistency' },
      testCoverage: { name: 'test_coverage', weight: 0.15, description: 'Test file coverage ratio' },
      securityPosture: { name: 'security_posture', weight: 0.10, description: 'Security pattern compliance' },
    },
    tool: {
      compute: {
        name: 'score_compute',
        description: 'Compute NoCowboy Score from dimension data. Each dimension: 0.0-1.0.',
        inputDims: 'Dimension scores (0.0-1.0)',
        outputScore: 'score',
        outputPassed: 'passed',
        outputTrend: 'trend',
      },
      history: {
        name: 'score_history',
        description: 'Show score history over time.',
        inputLimit: 'Max records to return (default 10)',
      },
      badge: {
        name: 'score_badge',
        description: 'Generate an ASCII NoCowboy Score badge.',
        inputScore: 'Score 0-100',
      },
      breakdown: {
        name: 'score_breakdown',
        description: 'Show the score breakdown by dimension with weights.',
      },
    },
    result: {
      trendUp: 'up', trendDown: 'down', trendStable: 'stable',
    },
  },
}
export default en
