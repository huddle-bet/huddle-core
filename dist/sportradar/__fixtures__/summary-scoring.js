/**
 * The `scoring` block from a real closed game in each summary sport, captured 2026-08-01 with
 * the rest of `summary-player-stats.ts` and slimmed to the line score and the team totals.
 *
 * Kept as three REAL arrays rather than a tidy one because all three traps below are in them
 * and a hand-built fixture would have had none:
 *
 *   mlb  numbers 1..6 in order, dense, with genuine 0s
 *   nhl  numbers 3, 2, 1 — REVERSED, so array order is not period order
 *   nba  numbers 1, 2, 3, 4, 1 — the fifth is overtime and repeats `number: 1`,
 *        so `number` is a LABEL within the period type and only `sequence` is a position
 */
export const SUMMARY_SCORING = {
    "mlb": {
        "status": "closed",
        "home": {
            "id": "dd59d49e-caee-4443-9220-f05d0d9bd1e1",
            "abbr": "AL",
            "runs": 5,
            "points": null,
            "hits": 5,
            "errors": 0,
            "scoring": [
                {
                    "number": 1,
                    "sequence": 1,
                    "runs": 0,
                    "hits": 0,
                    "errors": 0,
                    "type": "inning"
                },
                {
                    "number": 2,
                    "sequence": 2,
                    "runs": 0,
                    "hits": 0,
                    "errors": 0,
                    "type": "inning"
                },
                {
                    "number": 3,
                    "sequence": 3,
                    "runs": 3,
                    "hits": 3,
                    "errors": 0,
                    "type": "inning"
                },
                {
                    "number": 4,
                    "sequence": 4,
                    "runs": 0,
                    "hits": 0,
                    "errors": 0,
                    "type": "inning"
                },
                {
                    "number": 5,
                    "sequence": 5,
                    "runs": 2,
                    "hits": 2,
                    "errors": 0,
                    "type": "inning"
                },
                {
                    "number": 6,
                    "sequence": 6,
                    "runs": 0,
                    "hits": 0,
                    "errors": 0,
                    "type": "inning"
                }
            ]
        },
        "away": {
            "id": "3bbb3b39-b5cb-4fc9-bd22-522521f0f329",
            "abbr": "NL",
            "runs": 3,
            "points": null,
            "hits": 10,
            "errors": 0,
            "scoring": [
                {
                    "number": 1,
                    "sequence": 1,
                    "runs": 0,
                    "hits": 1,
                    "errors": 0,
                    "type": "inning"
                },
                {
                    "number": 2,
                    "sequence": 2,
                    "runs": 0,
                    "hits": 0,
                    "errors": 0,
                    "type": "inning"
                },
                {
                    "number": 3,
                    "sequence": 3,
                    "runs": 3,
                    "hits": 4,
                    "errors": 0,
                    "type": "inning"
                },
                {
                    "number": 4,
                    "sequence": 4,
                    "runs": 0,
                    "hits": 1,
                    "errors": 0,
                    "type": "inning"
                },
                {
                    "number": 5,
                    "sequence": 5,
                    "runs": 0,
                    "hits": 0,
                    "errors": 0,
                    "type": "inning"
                },
                {
                    "number": 6,
                    "sequence": 6,
                    "runs": 0,
                    "hits": 1,
                    "errors": 0,
                    "type": "inning"
                }
            ]
        }
    },
    "nba": {
        "status": "closed",
        "home": {
            "id": "583ec87d-fb46-11e1-82cb-f4ce4684ea4c",
            "abbr": null,
            "runs": null,
            "points": 119,
            "hits": null,
            "errors": null,
            "scoring": [
                {
                    "type": "quarter",
                    "number": 1,
                    "sequence": 1,
                    "points": 21
                },
                {
                    "type": "quarter",
                    "number": 2,
                    "sequence": 2,
                    "points": 26
                },
                {
                    "type": "quarter",
                    "number": 3,
                    "sequence": 3,
                    "points": 38
                },
                {
                    "type": "quarter",
                    "number": 4,
                    "sequence": 4,
                    "points": 24
                },
                {
                    "type": "overtime",
                    "number": 1,
                    "sequence": 5,
                    "points": 10
                }
            ]
        },
        "away": {
            "id": "583ec70e-fb46-11e1-82cb-f4ce4684ea4c",
            "abbr": null,
            "runs": null,
            "points": 125,
            "hits": null,
            "errors": null,
            "scoring": [
                {
                    "type": "quarter",
                    "number": 1,
                    "sequence": 1,
                    "points": 30
                },
                {
                    "type": "quarter",
                    "number": 2,
                    "sequence": 2,
                    "points": 30
                },
                {
                    "type": "quarter",
                    "number": 3,
                    "sequence": 3,
                    "points": 25
                },
                {
                    "type": "quarter",
                    "number": 4,
                    "sequence": 4,
                    "points": 24
                },
                {
                    "type": "overtime",
                    "number": 1,
                    "sequence": 5,
                    "points": 16
                }
            ]
        }
    },
    "nhl": {
        "status": "closed",
        "home": {
            "id": "4416d559-0f24-11e2-8525-18a905767e44",
            "abbr": null,
            "runs": null,
            "points": 4,
            "hits": null,
            "errors": null,
            "scoring": [
                {
                    "number": 3,
                    "sequence": 3,
                    "points": 1,
                    "type": "period"
                },
                {
                    "number": 2,
                    "sequence": 2,
                    "points": 2,
                    "type": "period"
                },
                {
                    "number": 1,
                    "sequence": 1,
                    "points": 1,
                    "type": "period"
                }
            ]
        },
        "away": {
            "id": "44182a9d-0f24-11e2-8525-18a905767e44",
            "abbr": null,
            "runs": null,
            "points": 2,
            "hits": null,
            "errors": null,
            "scoring": [
                {
                    "number": 3,
                    "sequence": 3,
                    "points": 2,
                    "type": "period"
                },
                {
                    "number": 2,
                    "sequence": 2,
                    "points": 0,
                    "type": "period"
                },
                {
                    "number": 1,
                    "sequence": 1,
                    "points": 0,
                    "type": "period"
                }
            ]
        }
    }
};
//# sourceMappingURL=summary-scoring.js.map