import { defineTeam } from '../team-registry.js';

/**
 * Top esports organizations that appear on sportsbooks.
 * These orgs compete across multiple games — aliases cover all common variants.
 * Teams not listed here will be auto-discovered from scraped data.
 */

// CS2 teams
export const CS2_TEAMS = [
  defineTeam({ id: 'e001-cs2-navi',        name: 'Natus Vincere',     shortName: 'NAVI',         abbreviation: 'NAVI', sport: 'cs2', aliases: ['navi', 'natus vincere', 'na\'vi'] }),
  defineTeam({ id: 'e001-cs2-faze',        name: 'FaZe Clan',         shortName: 'FaZe',         abbreviation: 'FAZE', sport: 'cs2', aliases: ['faze', 'faze clan'] }),
  defineTeam({ id: 'e001-cs2-g2',          name: 'G2 Esports',        shortName: 'G2',           abbreviation: 'G2',   sport: 'cs2', aliases: ['g2', 'g2 esports'] }),
  defineTeam({ id: 'e001-cs2-vitality',    name: 'Team Vitality',     shortName: 'Vitality',     abbreviation: 'VIT',  sport: 'cs2', aliases: ['vitality', 'team vitality'] }),
  defineTeam({ id: 'e001-cs2-spirit',      name: 'Team Spirit',       shortName: 'Spirit',       abbreviation: 'SPR',  sport: 'cs2', aliases: ['spirit', 'team spirit'] }),
  defineTeam({ id: 'e001-cs2-mouz',        name: 'MOUZ',              shortName: 'MOUZ',         abbreviation: 'MOUZ', sport: 'cs2', aliases: ['mouz', 'mousesports'] }),
  defineTeam({ id: 'e001-cs2-heroic',      name: 'Heroic',            shortName: 'Heroic',       abbreviation: 'HRC',  sport: 'cs2', aliases: ['heroic'] }),
  defineTeam({ id: 'e001-cs2-liquid',      name: 'Team Liquid',       shortName: 'Liquid',       abbreviation: 'TL',   sport: 'cs2', aliases: ['liquid', 'team liquid'] }),
  defineTeam({ id: 'e001-cs2-c9',          name: 'Cloud9',            shortName: 'Cloud9',       abbreviation: 'C9',   sport: 'cs2', aliases: ['cloud9', 'c9'] }),
  defineTeam({ id: 'e001-cs2-astralis',    name: 'Astralis',          shortName: 'Astralis',     abbreviation: 'AST',  sport: 'cs2', aliases: ['astralis'] }),
  defineTeam({ id: 'e001-cs2-complexity',  name: 'Complexity Gaming', shortName: 'Complexity',   abbreviation: 'COL',  sport: 'cs2', aliases: ['complexity', 'complexity gaming', 'col'] }),
  defineTeam({ id: 'e001-cs2-eternal',     name: 'Eternal Fire',      shortName: 'Eternal Fire', abbreviation: 'EF',   sport: 'cs2', aliases: ['eternal fire'] }),
  defineTeam({ id: 'e001-cs2-big',         name: 'BIG',               shortName: 'BIG',          abbreviation: 'BIG',  sport: 'cs2', aliases: ['big'] }),
  defineTeam({ id: 'e001-cs2-3dmax',       name: '3DMAX',             shortName: '3DMAX',        abbreviation: '3DM',  sport: 'cs2', aliases: ['3dmax'] }),
  defineTeam({ id: 'e001-cs2-mibr',        name: 'MIBR',              shortName: 'MIBR',         abbreviation: 'MIBR', sport: 'cs2', aliases: ['mibr', 'made in brazil'] }),
  defineTeam({ id: 'e001-cs2-pain',        name: 'paiN Gaming',       shortName: 'paiN',         abbreviation: 'PAIN', sport: 'cs2', aliases: ['pain', 'pain gaming'] }),
  defineTeam({ id: 'e001-cs2-thehuns',     name: 'The MongolZ',       shortName: 'MongolZ',      abbreviation: 'MNG',  sport: 'cs2', aliases: ['the mongolz', 'mongolz'] }),
  defineTeam({ id: 'e001-cs2-wildcard',    name: 'Wildcard',          shortName: 'Wildcard',     abbreviation: 'WC',   sport: 'cs2', aliases: ['wildcard'] }),
];

// Valorant teams
export const VALORANT_TEAMS = [
  defineTeam({ id: 'e002-val-sen',         name: 'Sentinels',         shortName: 'Sentinels',    abbreviation: 'SEN',  sport: 'valorant', aliases: ['sentinels', 'sen'] }),
  defineTeam({ id: 'e002-val-loud',        name: 'LOUD',              shortName: 'LOUD',         abbreviation: 'LOUD', sport: 'valorant', aliases: ['loud'] }),
  defineTeam({ id: 'e002-val-drx',         name: 'DRX',               shortName: 'DRX',          abbreviation: 'DRX',  sport: 'valorant', aliases: ['drx'] }),
  defineTeam({ id: 'e002-val-fnatic',      name: 'Fnatic',            shortName: 'Fnatic',       abbreviation: 'FNC',  sport: 'valorant', aliases: ['fnatic', 'fnc'] }),
  defineTeam({ id: 'e002-val-nrg',         name: 'NRG Esports',       shortName: 'NRG',          abbreviation: 'NRG',  sport: 'valorant', aliases: ['nrg', 'nrg esports'] }),
  defineTeam({ id: 'e002-val-100t',        name: '100 Thieves',       shortName: '100T',         abbreviation: '100T', sport: 'valorant', aliases: ['100 thieves', '100t'] }),
  defineTeam({ id: 'e002-val-edg',         name: 'EDward Gaming',     shortName: 'EDG',          abbreviation: 'EDG',  sport: 'valorant', aliases: ['edward gaming', 'edg'] }),
  defineTeam({ id: 'e002-val-geng',        name: 'Gen.G Esports',     shortName: 'Gen.G',        abbreviation: 'GENG', sport: 'valorant', aliases: ['gen.g', 'gen.g esports', 'geng'] }),
  defineTeam({ id: 'e002-val-t1',          name: 'T1',                shortName: 'T1',           abbreviation: 'T1',   sport: 'valorant', aliases: ['t1'] }),
  defineTeam({ id: 'e002-val-prx',         name: 'Paper Rex',         shortName: 'Paper Rex',    abbreviation: 'PRX',  sport: 'valorant', aliases: ['paper rex', 'prx'] }),
  defineTeam({ id: 'e002-val-th',          name: 'Team Heretics',     shortName: 'Heretics',     abbreviation: 'TH',   sport: 'valorant', aliases: ['heretics', 'team heretics'] }),
  defineTeam({ id: 'e002-val-leviatán',    name: 'Leviatán',          shortName: 'Leviatán',     abbreviation: 'LEV',  sport: 'valorant', aliases: ['leviatan', 'leviatán', 'lev'] }),
  defineTeam({ id: 'e002-val-g2',          name: 'G2 Esports',        shortName: 'G2',           abbreviation: 'G2',   sport: 'valorant', aliases: ['g2', 'g2 esports'] }),
];

// LoL teams
export const LOL_TEAMS = [
  defineTeam({ id: 'e003-lol-t1',          name: 'T1',                shortName: 'T1',           abbreviation: 'T1',   sport: 'lol', aliases: ['t1', 'sk telecom t1', 'skt'] }),
  defineTeam({ id: 'e003-lol-geng',        name: 'Gen.G Esports',     shortName: 'Gen.G',        abbreviation: 'GEN',  sport: 'lol', aliases: ['gen.g', 'geng'] }),
  defineTeam({ id: 'e003-lol-hle',         name: 'Hanwha Life Esports', shortName: 'HLE',        abbreviation: 'HLE',  sport: 'lol', aliases: ['hanwha life', 'hle'] }),
  defineTeam({ id: 'e003-lol-dk',          name: 'Dplus KIA',         shortName: 'DK',           abbreviation: 'DK',   sport: 'lol', aliases: ['dplus kia', 'dk', 'damwon', 'dwg'] }),
  defineTeam({ id: 'e003-lol-blg',         name: 'BILIBILI GAMING',   shortName: 'BLG',          abbreviation: 'BLG',  sport: 'lol', aliases: ['bilibili gaming', 'blg'] }),
  defineTeam({ id: 'e003-lol-jdg',         name: 'JDG Esports',       shortName: 'JDG',          abbreviation: 'JDG',  sport: 'lol', aliases: ['jdg', 'jd gaming'] }),
  defineTeam({ id: 'e003-lol-tes',         name: 'Top Esports',       shortName: 'TES',          abbreviation: 'TES',  sport: 'lol', aliases: ['top esports', 'tes'] }),
  defineTeam({ id: 'e003-lol-g2',          name: 'G2 Esports',        shortName: 'G2',           abbreviation: 'G2',   sport: 'lol', aliases: ['g2', 'g2 esports'] }),
  defineTeam({ id: 'e003-lol-fnc',         name: 'Fnatic',            shortName: 'Fnatic',       abbreviation: 'FNC',  sport: 'lol', aliases: ['fnatic', 'fnc'] }),
  defineTeam({ id: 'e003-lol-c9',          name: 'Cloud9',            shortName: 'Cloud9',       abbreviation: 'C9',   sport: 'lol', aliases: ['cloud9', 'c9'] }),
  defineTeam({ id: 'e003-lol-100t',        name: '100 Thieves',       shortName: '100T',         abbreviation: '100T', sport: 'lol', aliases: ['100 thieves', '100t'] }),
  defineTeam({ id: 'e003-lol-fly',         name: 'FlyQuest',          shortName: 'FlyQuest',     abbreviation: 'FLY',  sport: 'lol', aliases: ['flyquest', 'fly'] }),
  defineTeam({ id: 'e003-lol-wbg',         name: 'Weibo Gaming',      shortName: 'WBG',          abbreviation: 'WBG',  sport: 'lol', aliases: ['weibo gaming', 'wbg'] }),
  defineTeam({ id: 'e003-lol-lng',         name: 'LNG Esports',       shortName: 'LNG',          abbreviation: 'LNG',  sport: 'lol', aliases: ['lng', 'lng esports'] }),
];

// Dota 2 teams
export const DOTA2_TEAMS = [
  defineTeam({ id: 'e004-dota-spirit',     name: 'Team Spirit',       shortName: 'Spirit',       abbreviation: 'SPR',  sport: 'dota2', aliases: ['spirit', 'team spirit'] }),
  defineTeam({ id: 'e004-dota-tundra',     name: 'Tundra Esports',    shortName: 'Tundra',       abbreviation: 'TUN',  sport: 'dota2', aliases: ['tundra', 'tundra esports'] }),
  defineTeam({ id: 'e004-dota-gaimin',     name: 'Gaimin Gladiators', shortName: 'GG',           abbreviation: 'GG',   sport: 'dota2', aliases: ['gaimin gladiators', 'gaimin', 'gg'] }),
  defineTeam({ id: 'e004-dota-liquid',     name: 'Team Liquid',       shortName: 'Liquid',       abbreviation: 'TL',   sport: 'dota2', aliases: ['liquid', 'team liquid'] }),
  defineTeam({ id: 'e004-dota-falcons',    name: 'Team Falcons',      shortName: 'Falcons',      abbreviation: 'FAL',  sport: 'dota2', aliases: ['falcons', 'team falcons'] }),
  defineTeam({ id: 'e004-dota-bb',         name: 'BetBoom Team',      shortName: 'BetBoom',      abbreviation: 'BB',   sport: 'dota2', aliases: ['betboom', 'betboom team'] }),
  defineTeam({ id: 'e004-dota-1win',       name: '1win',              shortName: '1win',         abbreviation: '1W',   sport: 'dota2', aliases: ['1win'] }),
  defineTeam({ id: 'e004-dota-navi',       name: 'Natus Vincere',     shortName: 'NAVI',         abbreviation: 'NAVI', sport: 'dota2', aliases: ['navi', 'natus vincere'] }),
  defineTeam({ id: 'e004-dota-nigma',      name: 'Nigma Galaxy',      shortName: 'Nigma',        abbreviation: 'NGX',  sport: 'dota2', aliases: ['nigma', 'nigma galaxy'] }),
  defineTeam({ id: 'e004-dota-og',         name: 'OG',                shortName: 'OG',           abbreviation: 'OG',   sport: 'dota2', aliases: ['og'] }),
];

// CoD teams (CDL)
export const COD_TEAMS = [
  defineTeam({ id: 'e005-cod-optic',       name: 'OpTic Texas',       shortName: 'OpTic',        abbreviation: 'OPT',  sport: 'cod', aliases: ['optic', 'optic texas', 'optic gaming'] }),
  defineTeam({ id: 'e005-cod-faze',        name: 'Atlanta FaZe',      shortName: 'FaZe',         abbreviation: 'ATL',  sport: 'cod', aliases: ['atlanta faze', 'faze'] }),
  defineTeam({ id: 'e005-cod-100t',        name: 'Los Angeles Thieves', shortName: 'Thieves',    abbreviation: 'LAT',  sport: 'cod', aliases: ['la thieves', 'los angeles thieves', '100 thieves'] }),
  defineTeam({ id: 'e005-cod-surge',       name: 'Seattle Surge',     shortName: 'Surge',        abbreviation: 'SEA',  sport: 'cod', aliases: ['seattle surge', 'surge'] }),
  defineTeam({ id: 'e005-cod-rokkr',       name: 'Minnesota ROKKR',   shortName: 'ROKKR',        abbreviation: 'MIN',  sport: 'cod', aliases: ['minnesota rokkr', 'rokkr'] }),
  defineTeam({ id: 'e005-cod-breach',      name: 'Boston Breach',     shortName: 'Breach',       abbreviation: 'BOS',  sport: 'cod', aliases: ['boston breach', 'breach'] }),
  defineTeam({ id: 'e005-cod-nysl',        name: 'New York Subliners', shortName: 'Subliners',   abbreviation: 'NYSL', sport: 'cod', aliases: ['ny subliners', 'new york subliners', 'nysl'] }),
  defineTeam({ id: 'e005-cod-ultra',       name: 'Toronto Ultra',     shortName: 'Ultra',        abbreviation: 'TOR',  sport: 'cod', aliases: ['toronto ultra', 'ultra'] }),
  defineTeam({ id: 'e005-cod-guerrillas',  name: 'Los Angeles Guerrillas', shortName: 'Guerrillas', abbreviation: 'LAG', sport: 'cod', aliases: ['la guerrillas', 'guerrillas', 'lag'] }),
  defineTeam({ id: 'e005-cod-ravens',      name: 'London Royal Ravens', shortName: 'Ravens',     abbreviation: 'LDN',  sport: 'cod', aliases: ['london royal ravens', 'royal ravens'] }),
  defineTeam({ id: 'e005-cod-legion',      name: 'Vegas Legion',      shortName: 'Legion',       abbreviation: 'VEG',  sport: 'cod', aliases: ['vegas legion', 'legion', 'las vegas legion'] }),
  defineTeam({ id: 'e005-cod-mutineers',   name: 'Florida Mutineers', shortName: 'Mutineers',    abbreviation: 'FLA',  sport: 'cod', aliases: ['florida mutineers', 'mutineers'] }),
  defineTeam({ id: 'e005-cod-ravens2',     name: 'Carolina Black Claw', shortName: 'Black Claw', abbreviation: 'CAR',  sport: 'cod', aliases: ['carolina black claw', 'black claw'] }),
];

// Rocket League teams
export const RL_TEAMS = [
  defineTeam({ id: 'e006-rl-geng',         name: 'Gen.G Mobil1 Racing', shortName: 'Gen.G',     abbreviation: 'GENG', sport: 'rl', aliases: ['gen.g', 'geng', 'gen.g mobil1 racing'] }),
  defineTeam({ id: 'e006-rl-faze',         name: 'FaZe Clan',         shortName: 'FaZe',         abbreviation: 'FAZE', sport: 'rl', aliases: ['faze', 'faze clan'] }),
  defineTeam({ id: 'e006-rl-g2',           name: 'G2 Stride',         shortName: 'G2',           abbreviation: 'G2',   sport: 'rl', aliases: ['g2', 'g2 stride', 'g2 esports'] }),
  defineTeam({ id: 'e006-rl-optic',        name: 'OpTic Gaming',      shortName: 'OpTic',        abbreviation: 'OPT',  sport: 'rl', aliases: ['optic', 'optic gaming'] }),
  defineTeam({ id: 'e006-rl-vitality',     name: 'Team Vitality',     shortName: 'Vitality',     abbreviation: 'VIT',  sport: 'rl', aliases: ['vitality', 'team vitality'] }),
  defineTeam({ id: 'e006-rl-falcons',      name: 'Team Falcons',      shortName: 'Falcons',      abbreviation: 'FAL',  sport: 'rl', aliases: ['falcons', 'team falcons'] }),
  defineTeam({ id: 'e006-rl-karmine',      name: 'Karmine Corp',      shortName: 'KC',           abbreviation: 'KC',   sport: 'rl', aliases: ['karmine corp', 'kc', 'karmine'] }),
  defineTeam({ id: 'e006-rl-dignitas',     name: 'Dignitas',          shortName: 'Dignitas',     abbreviation: 'DIG',  sport: 'rl', aliases: ['dignitas', 'dig'] }),
];

/** All esports teams */
export const ESPORTS_TEAMS = [
  ...CS2_TEAMS,
  ...VALORANT_TEAMS,
  ...LOL_TEAMS,
  ...DOTA2_TEAMS,
  ...COD_TEAMS,
  ...RL_TEAMS,
];
