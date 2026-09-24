import { describe, it, expect } from 'vitest';
import { normalizeMarketType, isUsefulMarket } from '../betting/market-types.js';
/**
 * This is the seam where six books with six vocabularies become one canonical
 * type. A miss here doesn't error — the market simply falls through as an
 * unrecognised key, `isUsefulMarket` returns false, and the line is dropped
 * silently. Whole prop categories can disappear from a book without anything
 * turning red, so the mappings are worth pinning explicitly.
 */
describe('normalizeMarketType', () => {
    it('passes canonical names through unchanged', () => {
        for (const t of ['points', 'rebounds', 'assists', 'threes', 'steals', 'blocks']) {
            expect(normalizeMarketType(t)).toBe(t);
        }
    });
    it('is case- and whitespace-insensitive', () => {
        expect(normalizeMarketType('Points')).toBe('points');
        expect(normalizeMarketType('POINTS')).toBe('points');
        expect(normalizeMarketType('Player Points')).toBe(normalizeMarketType('player_points'));
    });
    it('does NOT collapse a bare period-scoped market onto its base stat', () => {
        // `1st_quarter_points` lives in FD_STAT_MAP, which is only consulted after
        // the `player_X_total_` prefix is stripped. A book emitting the bare string
        // gets no mapping, so isUsefulMarket() drops it. Asserted as-is rather than
        // "fixed" — whether 1Q props should be tracked from every book is a product
        // call, not something to change under a test.
        expect(normalizeMarketType('1st_quarter_points')).toBe('1st_quarter_points');
        expect(isUsefulMarket('1st_quarter_points')).toBe(false);
        // Via the FanDuel path it does map.
        expect(normalizeMarketType('player_a_total_1st_quarter_points')).toBe('points');
        expect(isUsefulMarket('player_a_total_1st_quarter_points')).toBe(true);
    });
    describe("FanDuel's player_X_total_ prefix", () => {
        // FD encodes props as player_a_total_points, player_b_alt_total_rebounds,
        // etc. The regex strips the prefix and maps the remaining stat.
        it('strips the prefix and maps the stat', () => {
            expect(normalizeMarketType('player_a_total_points')).toBe('points');
        });
        it('handles the alt- variant', () => {
            expect(normalizeMarketType('player_b_alt_total_points')).toBe('points');
        });
        it.each([
            ['player_a_total_points_+_rebounds', 'pts+rebs'],
            ['player_a_total_points_+_assists', 'pts+asts'],
            ['player_a_total_rebounds_+_assists', 'rebs+asts'],
            ['player_a_total_points_+_rebounds_+_assists', 'pts+rebs+asts'],
            ['player_b_total_pts_+_reb', 'pts+rebs'],
        ])('maps %s to %s', (input, expected) => {
            expect(normalizeMarketType(input)).toBe(expected);
        });
        it('leaves an unmapped stat as the stripped key rather than guessing', () => {
            const out = normalizeMarketType('player_a_total_something_invented');
            expect(typeof out).toBe('string');
            expect(out.length).toBeGreaterThan(0);
        });
    });
    it('returns the normalized key for anything unrecognised', () => {
        // Never throws, never returns undefined — downstream indexes on this.
        expect(normalizeMarketType('totally_unknown_market')).toBe('totally_unknown_market');
        expect(normalizeMarketType('Totally Unknown Market')).toBe('totally_unknown_market');
    });
    it('does not throw on empty input', () => {
        expect(() => normalizeMarketType('')).not.toThrow();
    });
    it('is idempotent', () => {
        for (const t of ['Points', 'player_a_total_points', '1st_quarter_points', 'weird_market']) {
            const once = normalizeMarketType(t);
            expect(normalizeMarketType(once)).toBe(once);
        }
    });
});
describe('isUsefulMarket', () => {
    it('accepts the standard player props', () => {
        for (const t of ['points', 'rebounds', 'assists', 'threes', 'steals', 'blocks']) {
            expect(isUsefulMarket(t)).toBe(true);
        }
    });
    it('accepts a market that only becomes canonical after normalization', () => {
        // The whole point of the gate: FD's raw string is not canonical, but the
        // market behind it is one we track.
        expect(isUsefulMarket('player_a_total_points')).toBe(true);
        expect(isUsefulMarket('player_a_total_points_+_rebounds')).toBe(true);
    });
    it('rejects exotic markets that would inflate the table', () => {
        expect(isUsefulMarket('first_basket_scorer_exact_time')).toBe(false);
        expect(isUsefulMarket('totally_unknown_market')).toBe(false);
    });
    it('agrees with normalizeMarketType — no market is useful whose canonical form is not tracked', () => {
        for (const t of ['points', 'player_a_total_points', 'nonsense_market', '']) {
            expect(isUsefulMarket(t)).toBe(isUsefulMarket(normalizeMarketType(t)));
        }
    });
    it('does not throw on empty input', () => {
        expect(() => isUsefulMarket('')).not.toThrow();
    });
});
/**
 * DraftKings sends U+2212 MINUS SIGN where every other book sends U+002D HYPHEN-MINUS.
 * It renders identically and parses to NaN, and 1,324 of DraftKings' 2,382 live rows
 * carried it on 2026-08-04 — over half its board, invisible to every consumer.
 */
describe('a combined-player market does not claim the single-player type', () => {
    it('does not reduce combined bases to one batter total bases', () => {
        expect(normalizeMarketType('player_combined_bases')).not.toBe('total_bases');
    });
    it('drops it, and says so through the coverage counter rather than silently', () => {
        // isUsefulMarket false is what routes it to recordDrop, so the coverage line names it.
        expect(isUsefulMarket('player_combined_bases')).toBe(false);
    });
    it('leaves the genuine single-player prop alone', () => {
        expect(normalizeMarketType('total_bases')).toBe('total_bases');
        expect(isUsefulMarket('total_bases')).toBe(true);
    });
    it('treats every sport the same way', () => {
        // BetMGM's NBA form has never had a map entry and has always been dropped. The two
        // disagreeing is what let the MLB one through.
        for (const t of ['player_combined_bases', 'player_combined_points']) {
            expect(isUsefulMarket(t), t).toBe(false);
        }
    });
});
/**
 * A rendered decimal is not the price — but which of the two is rendered differs by book.
 *
 * Measured across the live board 2026-08-09, with DraftKings' U+2212 minus normalised:
 *
 *   book         rows   distinct american / decimal   american mult of 5   gap direction
 *   draftkings   4956            762 / 454                   74%           never above
 *   fanduel      5338            294 / 294                   89%           exact
 *   betmgm       3784            149 / 158                   98%           both ways
 *   underdog     2967            697 / 697                   26%           never below
 *   betrivers     227             99 / 99                    45%           never below
 *
 * Fewer decimals than Americans means the decimal is lossy — DraftKings floors it, and
 * understated the payout by 0.26% on average. More decimals than Americans means the
 * *American* is lossy, and BetMGM is the clear case: 98% of its Americans are multiples of
 * 5 and -110 covers 1.90, 1.91 and 1.93.
 *
 * So this helper is for DraftKings alone, and these pin that it is exact where the book is
 * not.
 */
describe('CS2 map scoping', () => {
    it('gives map 1 its own type, per book spelling', () => {
        // Underdog and PrizePicks spell the same market differently.
        expect(normalizeMarketType('kills_on_map_1')).toBe('kills_map1'); // Underdog
        expect(normalizeMarketType('map_1_kills')).toBe('kills_map1'); // PrizePicks
        expect(normalizeMarketType('headshots_on_map_1')).toBe('headshots_map1');
        expect(normalizeMarketType('map_1_headshots')).toBe('headshots_map1');
    });
    it('keeps the three scopes distinct', () => {
        // The whole point. If any two of these collapse, a map-1 line gets priced against a
        // two-map or full-match projection.
        const scopes = [
            normalizeMarketType('kills_on_map_1'),
            normalizeMarketType('kills_on_maps_1_2'),
            normalizeMarketType('kills_on_maps_1_2_3'),
        ];
        expect(new Set(scopes).size).toBe(3);
        expect(scopes).toEqual(['kills_map1', 'kills_2map', 'kills']);
    });
    it('does not drop the board either book is actually serving', () => {
        // The exact strings measured on the live boards, 2026-08-11.
        for (const t of [
            'kills_on_map_1', 'headshots_on_map_1', // Underdog, 305 markets
            'map_1_kills', 'map_1_headshots', // PrizePicks, 305 markets
        ]) {
            expect(isUsefulMarket(t), t).toBe(true);
        }
    });
});
/**
 * ENG-823 — `fantasy` was up to four different quantities under one canonical type.
 *
 * Hitter and pitcher fantasy score both mapped to `fantasy`, and they are not the same
 * scale: on the PrizePicks board pitcher fantasy runs 7.5-55.5 (median 27.5) against
 * hitters at 1.5-18.5 (median 5.0). `v_prop_candidates` pooled them and served a median
 * across both to the client — 294 mlb candidates, 174 of them at book_count = 2.
 *
 * These pin the split rather than the tidy-up that would undo it. The temptation is to
 * fold all three fantasy spellings back together because they share a word.
 */
describe('fantasy is split by role, and only where the book states the role', () => {
    it('separates hitter from pitcher', () => {
        expect(normalizeMarketType('hitter_fantasy_score')).toBe('hitter_fantasy');
        expect(normalizeMarketType('pitcher_fantasy_score')).toBe('pitcher_fantasy');
        expect(normalizeMarketType('hitter_fantasy_score'))
            .not.toBe(normalizeMarketType('pitcher_fantasy_score'));
    });
    /**
     * Underdog names neither role nor tier — every row is "<player> Fantasy Points", so a
     * 39.5 pitcher line and a 6.5 hitter line are the same string shape. Mapping it to
     * `hitter_fantasy` would be right for most rows and silently wrong for every starting
     * pitcher, which is worse than leaving it generic.
     */
    it('leaves the book that states no role generic', () => {
        expect(normalizeMarketType('fantasy_points')).toBe('fantasy');
    });
    /**
     * CS2 fantasy is a different market and it RESOLVES — outcome-resolver carries it in
     * ADDITIVE_STATS and reads stats->'fantasy' to sum a series. Folding it into the split,
     * or excluding it alongside the MLB one, removes a working market.
     */
    it('leaves CS2 fantasy alone', () => {
        expect(normalizeMarketType('fantasy')).toBe('fantasy');
        expect(normalizeMarketType('fantasy_score')).toBe('fantasy');
        expect(normalizeMarketType('fantasy_points_on_games_1_2_3')).toBe('fantasy');
        expect(normalizeMarketType('period_1_2_3_fantasy_points')).toBe('fantasy');
    });
    it('keeps all three fantasy types useful, so none is silently dropped', () => {
        for (const m of ['hitter_fantasy', 'pitcher_fantasy', 'fantasy']) {
            expect(isUsefulMarket(m), m).toBe(true);
        }
    });
});
/**
 * ENG-823 — first, last and anytime TD scorer are three different events and shared one
 * canonical type. Every row `anytime_td` has ever held (257 all time, 205 live) is a
 * First TD Scorer market; no genuine anytime row has ever arrived.
 *
 * The prices are what make it unarguable: first-TD implied probabilities top out around
 * 25% and sum to ~1 across a game, because exactly one player scores first. Anytime TD
 * for a workhorse back is 45-60%.
 *
 * Left collapsed, a projection for `anytime_td` would price P(TD >= 1) — north of 40% for
 * a starter — against a market implying 17-25%, and report an enormous edge on all 205
 * rows. These pin the split so that cannot happen by renaming.
 */
describe('TD scorer markets are three events, not one', () => {
    it('keeps first, last and anytime apart', () => {
        expect(normalizeMarketType('anytime_touchdown_scorer')).toBe('anytime_td');
        expect(normalizeMarketType('anytime_td_scorer')).toBe('anytime_td');
        expect(normalizeMarketType('first_touchdown_scorer')).toBe('first_td_scorer');
        expect(normalizeMarketType('last_touchdown_scorer')).toBe('last_td_scorer');
        const types = ['anytime_touchdown_scorer', 'first_touchdown_scorer', 'last_touchdown_scorer']
            .map((m) => normalizeMarketType(m));
        expect(new Set(types).size, 'all three must be distinct').toBe(3);
    });
    /**
     * Underdog's spelling of the GAME's first TD, despite the `period_` prefix on the key.
     * The comment that used to sit beside it said so — "Jalen Hurts First TD Scorer" — while
     * the mapping asserted anytime, and every live row is a game-level First TD Scorer.
     * Giving it a period type would assert a scope the data denies.
     */
    it('treats Underdog period_first_touchdown_scored as the game first TD', () => {
        expect(normalizeMarketType('period_first_touchdown_scored')).toBe('first_td_scorer');
    });
    it('keeps all three useful, so none is silently dropped', () => {
        for (const m of ['anytime_td', 'first_td_scorer', 'last_td_scorer']) {
            expect(isUsefulMarket(m), m).toBe(true);
        }
    });
});
/**
 * ENG-1092 — a CS2 series is scored in maps. Its handicap ("BCA -1.5") and its total ("over 2.5
 * maps") are not the points spread and total every other sport quotes, and not the round
 * handicap or round total of one map. Each needs a type of its own, or the prop matcher builds a
 * consensus across markets that are not comparable.
 */
describe('CS2 series map handicap and total maps', () => {
    it.each([
        ['map_handicap', 'map_handicap'],
        ['maps_handicap', 'map_handicap'],
        ['Map Handicap', 'map_handicap'],
        ['total_maps', 'total_maps'],
        ['maps_total', 'total_maps'],
        ['total_maps_played', 'total_maps'],
    ])('maps %s to %s', (input, expected) => {
        expect(normalizeMarketType(input)).toBe(expected);
    });
    it('keeps them useful, so no book has them dropped', () => {
        expect(isUsefulMarket('map_handicap')).toBe(true);
        expect(isUsefulMarket('total_maps')).toBe(true);
    });
    it('keeps them apart from spread, total and the per-map round total', () => {
        const types = ['map_handicap', 'spread', 'total_maps', 'total', 'total_rounds', 'total_rounds_map1']
            .map((m) => normalizeMarketType(m));
        expect(new Set(types).size).toBe(types.length);
    });
});
//# sourceMappingURL=market-types.test.js.map