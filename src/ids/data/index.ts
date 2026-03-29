import type { Team } from '../../types/entities.js';
import { NBA_TEAMS } from './nba-teams.js';
import { NHL_TEAMS } from './nhl-teams.js';
import { NFL_TEAMS } from './nfl-teams.js';
import { MLB_TEAMS } from './mlb-teams.js';
import { WNBA_TEAMS } from './wnba-teams.js';
import { NCAAM_TEAMS } from './ncaam-teams.js';
import { ESPORTS_TEAMS } from './esports-teams.js';

/** All pre-defined team data across all sports */
export const ALL_TEAMS: Team[] = [
  ...NBA_TEAMS,
  ...NHL_TEAMS,
  ...NFL_TEAMS,
  ...MLB_TEAMS,
  ...WNBA_TEAMS,
  ...NCAAM_TEAMS,
  ...ESPORTS_TEAMS,
];

export { NBA_TEAMS } from './nba-teams.js';
export { NHL_TEAMS } from './nhl-teams.js';
export { NFL_TEAMS } from './nfl-teams.js';
export { MLB_TEAMS } from './mlb-teams.js';
export { WNBA_TEAMS } from './wnba-teams.js';
export { NCAAM_TEAMS } from './ncaam-teams.js';
export {
  ESPORTS_TEAMS,
  CS2_TEAMS,
  VALORANT_TEAMS,
  LOL_TEAMS,
  DOTA2_TEAMS,
  COD_TEAMS,
  RL_TEAMS,
} from './esports-teams.js';
