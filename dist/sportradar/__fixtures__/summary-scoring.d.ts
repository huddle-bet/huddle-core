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
export declare const SUMMARY_SCORING: {
    readonly mlb: {
        readonly status: "closed";
        readonly home: {
            readonly id: "dd59d49e-caee-4443-9220-f05d0d9bd1e1";
            readonly abbr: "AL";
            readonly runs: 5;
            readonly points: null;
            readonly hits: 5;
            readonly errors: 0;
            readonly scoring: readonly [{
                readonly number: 1;
                readonly sequence: 1;
                readonly runs: 0;
                readonly hits: 0;
                readonly errors: 0;
                readonly type: "inning";
            }, {
                readonly number: 2;
                readonly sequence: 2;
                readonly runs: 0;
                readonly hits: 0;
                readonly errors: 0;
                readonly type: "inning";
            }, {
                readonly number: 3;
                readonly sequence: 3;
                readonly runs: 3;
                readonly hits: 3;
                readonly errors: 0;
                readonly type: "inning";
            }, {
                readonly number: 4;
                readonly sequence: 4;
                readonly runs: 0;
                readonly hits: 0;
                readonly errors: 0;
                readonly type: "inning";
            }, {
                readonly number: 5;
                readonly sequence: 5;
                readonly runs: 2;
                readonly hits: 2;
                readonly errors: 0;
                readonly type: "inning";
            }, {
                readonly number: 6;
                readonly sequence: 6;
                readonly runs: 0;
                readonly hits: 0;
                readonly errors: 0;
                readonly type: "inning";
            }];
        };
        readonly away: {
            readonly id: "3bbb3b39-b5cb-4fc9-bd22-522521f0f329";
            readonly abbr: "NL";
            readonly runs: 3;
            readonly points: null;
            readonly hits: 10;
            readonly errors: 0;
            readonly scoring: readonly [{
                readonly number: 1;
                readonly sequence: 1;
                readonly runs: 0;
                readonly hits: 1;
                readonly errors: 0;
                readonly type: "inning";
            }, {
                readonly number: 2;
                readonly sequence: 2;
                readonly runs: 0;
                readonly hits: 0;
                readonly errors: 0;
                readonly type: "inning";
            }, {
                readonly number: 3;
                readonly sequence: 3;
                readonly runs: 3;
                readonly hits: 4;
                readonly errors: 0;
                readonly type: "inning";
            }, {
                readonly number: 4;
                readonly sequence: 4;
                readonly runs: 0;
                readonly hits: 1;
                readonly errors: 0;
                readonly type: "inning";
            }, {
                readonly number: 5;
                readonly sequence: 5;
                readonly runs: 0;
                readonly hits: 0;
                readonly errors: 0;
                readonly type: "inning";
            }, {
                readonly number: 6;
                readonly sequence: 6;
                readonly runs: 0;
                readonly hits: 1;
                readonly errors: 0;
                readonly type: "inning";
            }];
        };
    };
    readonly nba: {
        readonly status: "closed";
        readonly home: {
            readonly id: "583ec87d-fb46-11e1-82cb-f4ce4684ea4c";
            readonly abbr: null;
            readonly runs: null;
            readonly points: 119;
            readonly hits: null;
            readonly errors: null;
            readonly scoring: readonly [{
                readonly type: "quarter";
                readonly number: 1;
                readonly sequence: 1;
                readonly points: 21;
            }, {
                readonly type: "quarter";
                readonly number: 2;
                readonly sequence: 2;
                readonly points: 26;
            }, {
                readonly type: "quarter";
                readonly number: 3;
                readonly sequence: 3;
                readonly points: 38;
            }, {
                readonly type: "quarter";
                readonly number: 4;
                readonly sequence: 4;
                readonly points: 24;
            }, {
                readonly type: "overtime";
                readonly number: 1;
                readonly sequence: 5;
                readonly points: 10;
            }];
        };
        readonly away: {
            readonly id: "583ec70e-fb46-11e1-82cb-f4ce4684ea4c";
            readonly abbr: null;
            readonly runs: null;
            readonly points: 125;
            readonly hits: null;
            readonly errors: null;
            readonly scoring: readonly [{
                readonly type: "quarter";
                readonly number: 1;
                readonly sequence: 1;
                readonly points: 30;
            }, {
                readonly type: "quarter";
                readonly number: 2;
                readonly sequence: 2;
                readonly points: 30;
            }, {
                readonly type: "quarter";
                readonly number: 3;
                readonly sequence: 3;
                readonly points: 25;
            }, {
                readonly type: "quarter";
                readonly number: 4;
                readonly sequence: 4;
                readonly points: 24;
            }, {
                readonly type: "overtime";
                readonly number: 1;
                readonly sequence: 5;
                readonly points: 16;
            }];
        };
    };
    readonly nhl: {
        readonly status: "closed";
        readonly home: {
            readonly id: "4416d559-0f24-11e2-8525-18a905767e44";
            readonly abbr: null;
            readonly runs: null;
            readonly points: 4;
            readonly hits: null;
            readonly errors: null;
            readonly scoring: readonly [{
                readonly number: 3;
                readonly sequence: 3;
                readonly points: 1;
                readonly type: "period";
            }, {
                readonly number: 2;
                readonly sequence: 2;
                readonly points: 2;
                readonly type: "period";
            }, {
                readonly number: 1;
                readonly sequence: 1;
                readonly points: 1;
                readonly type: "period";
            }];
        };
        readonly away: {
            readonly id: "44182a9d-0f24-11e2-8525-18a905767e44";
            readonly abbr: null;
            readonly runs: null;
            readonly points: 2;
            readonly hits: null;
            readonly errors: null;
            readonly scoring: readonly [{
                readonly number: 3;
                readonly sequence: 3;
                readonly points: 2;
                readonly type: "period";
            }, {
                readonly number: 2;
                readonly sequence: 2;
                readonly points: 0;
                readonly type: "period";
            }, {
                readonly number: 1;
                readonly sequence: 1;
                readonly points: 0;
                readonly type: "period";
            }];
        };
    };
};
//# sourceMappingURL=summary-scoring.d.ts.map