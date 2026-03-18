import type { Team } from '../../types/entities.js';
import { NBA_TEAMS } from './nba-teams.js';
import { NHL_TEAMS } from './nhl-teams.js';

/** All pre-defined team data across all sports */
export const ALL_TEAMS: Team[] = [
  ...NBA_TEAMS,
  ...NHL_TEAMS,
  // NFL, MLB, NCAA, esports teams can be added here
];

export { NBA_TEAMS } from './nba-teams.js';
export { NHL_TEAMS } from './nhl-teams.js';
