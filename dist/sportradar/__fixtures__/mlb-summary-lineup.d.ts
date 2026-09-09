/**
 * MIN at DET, 2026-09-08 (`061815ce`), closed — Sportradar's own `summary.json`, slimmed to
 * ids, names, positions and the lineup. Captured rather than hand-built: the question
 * `mlbStarterIds` answers is what `inning` means on a substitution, and a fixture without one
 * cannot answer it. This has seven, plus a starter who changed position and a substitute who
 * appears twice.
 *
 * A `.ts` module rather than a `.json` file because `tsc` does not copy JSON into `dist/`, and
 * CI runs the compiled tests — a JSON fixture passes locally and fails there with ENOENT.
 */
export declare const MLB_SUMMARY_LINEUP: {
    readonly game: {
        readonly id: "061815ce-c230-475f-92a4-1bb19fc59832";
        readonly status: "closed";
        readonly home: {
            readonly id: "575c19b7-4052-41c2-9f0a-1c5813d02f99";
            readonly abbr: "DET";
            readonly market: "Detroit";
            readonly name: "Tigers";
            readonly starting_pitcher: {
                readonly id: "9186e5cf-98cf-4191-b070-282357135748";
                readonly full_name: "Drew Anderson";
            };
            readonly lineup: readonly [{
                readonly id: "7bf4c47d-0b2d-4eb2-8cd2-4b0e82994193";
                readonly inning: 0;
                readonly order: 9;
                readonly position: 9;
                readonly sequence: 1;
            }, {
                readonly id: "d390fc53-d908-41d8-9a5a-6210c50b59b2";
                readonly inning: 0;
                readonly order: 8;
                readonly position: 5;
                readonly sequence: 2;
            }, {
                readonly id: "c3d2ee24-1aa5-409f-90bc-0768e201bfc2";
                readonly inning: 0;
                readonly order: 7;
                readonly position: 8;
                readonly sequence: 3;
            }, {
                readonly id: "4ab26465-763e-4a3d-ad8a-8f2140737e0e";
                readonly inning: 0;
                readonly order: 6;
                readonly position: 7;
                readonly sequence: 4;
            }, {
                readonly id: "adb0f520-802f-4902-a897-23dfff8e17ca";
                readonly inning: 0;
                readonly order: 5;
                readonly position: 2;
                readonly sequence: 5;
            }, {
                readonly id: "c2689320-b989-4bbc-9afb-28e06aa31077";
                readonly inning: 0;
                readonly order: 4;
                readonly position: 10;
                readonly sequence: 6;
            }, {
                readonly id: "73cbdd41-98c4-4dec-8c8a-1a6e1be959d9";
                readonly inning: 0;
                readonly order: 3;
                readonly position: 3;
                readonly sequence: 7;
            }, {
                readonly id: "781d3396-df55-4b42-bea4-5c9cad9dcad0";
                readonly inning: 0;
                readonly order: 2;
                readonly position: 4;
                readonly sequence: 8;
            }, {
                readonly id: "538f0693-6b00-4fba-ad5c-5953aa0c680f";
                readonly inning: 0;
                readonly order: 1;
                readonly position: 6;
                readonly sequence: 9;
            }, {
                readonly id: "9186e5cf-98cf-4191-b070-282357135748";
                readonly inning: 0;
                readonly order: 0;
                readonly position: 1;
                readonly sequence: 10;
            }, {
                readonly id: "0d9babdc-80b5-40c2-a71d-068219b9337b";
                readonly inning: 6;
                readonly order: 0;
                readonly position: 1;
                readonly sequence: 11;
            }, {
                readonly id: "12085747-6898-4d08-9ceb-c6860dd35f6d";
                readonly inning: 6;
                readonly order: 3;
                readonly position: 11;
                readonly sequence: 12;
            }, {
                readonly id: "12085747-6898-4d08-9ceb-c6860dd35f6d";
                readonly inning: 7;
                readonly order: 3;
                readonly position: 3;
                readonly sequence: 13;
            }, {
                readonly id: "130a605b-20ed-4628-af30-ad53528182c2";
                readonly inning: 7;
                readonly order: 6;
                readonly position: 11;
                readonly sequence: 14;
            }, {
                readonly id: "130a605b-20ed-4628-af30-ad53528182c2";
                readonly inning: 8;
                readonly order: 6;
                readonly position: 7;
                readonly sequence: 15;
            }, {
                readonly id: "5558a5b1-026b-437e-8ca5-fa431bd53cae";
                readonly inning: 8;
                readonly order: 0;
                readonly position: 1;
                readonly sequence: 16;
            }, {
                readonly id: "55de0f7b-e342-4292-a9f2-226b3ed55018";
                readonly inning: 9;
                readonly order: 0;
                readonly position: 1;
                readonly sequence: 17;
            }];
            readonly players: readonly [{
                readonly id: "0d9babdc-80b5-40c2-a71d-068219b9337b";
                readonly full_name: "Beau Brieske";
                readonly position: "P";
            }, {
                readonly id: "12085747-6898-4d08-9ceb-c6860dd35f6d";
                readonly full_name: "Spencer Torkelson";
                readonly position: "IF";
            }, {
                readonly id: "130a605b-20ed-4628-af30-ad53528182c2";
                readonly full_name: "Ben Malgeri";
                readonly position: "OF";
            }, {
                readonly id: "4ab26465-763e-4a3d-ad8a-8f2140737e0e";
                readonly full_name: "Brett Callahan";
                readonly position: "OF";
            }, {
                readonly id: "538f0693-6b00-4fba-ad5c-5953aa0c680f";
                readonly full_name: "Kevin McGonigle";
                readonly position: "IF";
            }, {
                readonly id: "5558a5b1-026b-437e-8ca5-fa431bd53cae";
                readonly full_name: "Brant Hurter";
                readonly position: "P";
            }, {
                readonly id: "55de0f7b-e342-4292-a9f2-226b3ed55018";
                readonly full_name: "Yilber Díaz";
                readonly position: "P";
            }, {
                readonly id: "73cbdd41-98c4-4dec-8c8a-1a6e1be959d9";
                readonly full_name: "Colt Keith";
                readonly position: "IF";
            }, {
                readonly id: "781d3396-df55-4b42-bea4-5c9cad9dcad0";
                readonly full_name: "Gleyber Torres";
                readonly position: "IF";
            }, {
                readonly id: "7bf4c47d-0b2d-4eb2-8cd2-4b0e82994193";
                readonly full_name: "Zach McKinstry";
                readonly position: "OF";
            }, {
                readonly id: "9186e5cf-98cf-4191-b070-282357135748";
                readonly full_name: "Drew Anderson";
                readonly position: "P";
            }, {
                readonly id: "adb0f520-802f-4902-a897-23dfff8e17ca";
                readonly full_name: "Eduardo Valencia";
                readonly position: "DH";
            }, {
                readonly id: "c2689320-b989-4bbc-9afb-28e06aa31077";
                readonly full_name: "Riley Greene";
                readonly position: "OF";
            }, {
                readonly id: "c3d2ee24-1aa5-409f-90bc-0768e201bfc2";
                readonly full_name: "Max Clark";
                readonly position: "OF";
            }, {
                readonly id: "d390fc53-d908-41d8-9a5a-6210c50b59b2";
                readonly full_name: "Hao-Yu Lee";
                readonly position: "IF";
            }];
        };
        readonly away: {
            readonly id: "aa34e0ed-f342-4ec6-b774-c79b47b60e2d";
            readonly abbr: "MIN";
            readonly market: "Minnesota";
            readonly name: "Twins";
            readonly starting_pitcher: {
                readonly id: "dba3e740-244b-487e-8122-2adc89c206f1";
                readonly full_name: "Dean Kremer";
            };
            readonly lineup: readonly [{
                readonly id: "dba3e740-244b-487e-8122-2adc89c206f1";
                readonly inning: 0;
                readonly order: 0;
                readonly position: 1;
                readonly sequence: 1;
            }, {
                readonly id: "00ce18c4-c489-4350-a550-06a6d3948581";
                readonly inning: 0;
                readonly order: 1;
                readonly position: 9;
                readonly sequence: 2;
            }, {
                readonly id: "aef9f47e-bd19-419e-9fec-73271850bd39";
                readonly inning: 0;
                readonly order: 2;
                readonly position: 5;
                readonly sequence: 3;
            }, {
                readonly id: "a4630a73-2fd8-4558-b4ca-87a6b305497c";
                readonly inning: 0;
                readonly order: 3;
                readonly position: 4;
                readonly sequence: 4;
            }, {
                readonly id: "005c0339-91b9-4b00-a373-105e761382eb";
                readonly inning: 0;
                readonly order: 4;
                readonly position: 2;
                readonly sequence: 5;
            }, {
                readonly id: "49edaec4-ea7c-455b-ac2c-92961b4261f0";
                readonly inning: 0;
                readonly order: 5;
                readonly position: 10;
                readonly sequence: 6;
            }, {
                readonly id: "01776cda-8dd8-465b-8635-d314fb002c1a";
                readonly inning: 0;
                readonly order: 6;
                readonly position: 3;
                readonly sequence: 7;
            }, {
                readonly id: "21f3e083-3f20-4890-86bb-c4675415d8d3";
                readonly inning: 0;
                readonly order: 7;
                readonly position: 7;
                readonly sequence: 8;
            }, {
                readonly id: "9c6e288c-aa75-4d4b-b4c5-2dd2731908d9";
                readonly inning: 0;
                readonly order: 8;
                readonly position: 6;
                readonly sequence: 9;
            }, {
                readonly id: "34849ec2-aafa-4408-96f4-b2c4c780ff7e";
                readonly inning: 0;
                readonly order: 9;
                readonly position: 8;
                readonly sequence: 10;
            }, {
                readonly id: "e1cbb2df-986d-4fab-bf1e-7192c54bdae9";
                readonly inning: 6;
                readonly order: 0;
                readonly position: 1;
                readonly sequence: 11;
            }, {
                readonly id: "a4630a73-2fd8-4558-b4ca-87a6b305497c";
                readonly inning: 7;
                readonly order: 3;
                readonly position: 7;
                readonly sequence: 12;
            }, {
                readonly id: "9ea2890d-ab51-4876-bf64-ec0398bf5f8e";
                readonly inning: 7;
                readonly order: 7;
                readonly position: 4;
                readonly sequence: 13;
            }, {
                readonly id: "935a41f8-6267-4a0d-b9cf-623b56da86d6";
                readonly inning: 7;
                readonly order: 0;
                readonly position: 1;
                readonly sequence: 14;
            }, {
                readonly id: "d2b49c9d-1c9f-44b4-b9b9-c4222dc0c089";
                readonly inning: 8;
                readonly order: 0;
                readonly position: 1;
                readonly sequence: 15;
            }, {
                readonly id: "829b6ae4-4c11-45ec-a364-36650bcda040";
                readonly inning: 9;
                readonly order: 0;
                readonly position: 1;
                readonly sequence: 16;
            }];
            readonly players: readonly [{
                readonly id: "005c0339-91b9-4b00-a373-105e761382eb";
                readonly full_name: "Ryan Jeffers";
                readonly position: "C";
            }, {
                readonly id: "00ce18c4-c489-4350-a550-06a6d3948581";
                readonly full_name: "Luke Keaschall";
                readonly position: "IF";
            }, {
                readonly id: "01776cda-8dd8-465b-8635-d314fb002c1a";
                readonly full_name: "Royce Lewis";
                readonly position: "IF";
            }, {
                readonly id: "21f3e083-3f20-4890-86bb-c4675415d8d3";
                readonly full_name: "Trevor Larnach";
                readonly position: "OF";
            }, {
                readonly id: "34849ec2-aafa-4408-96f4-b2c4c780ff7e";
                readonly full_name: "Walker Jenkins";
                readonly position: "OF";
            }, {
                readonly id: "49edaec4-ea7c-455b-ac2c-92961b4261f0";
                readonly full_name: "Josh Bell";
                readonly position: "DH";
            }, {
                readonly id: "829b6ae4-4c11-45ec-a364-36650bcda040";
                readonly full_name: "Yoendrys Gómez";
                readonly position: "P";
            }, {
                readonly id: "935a41f8-6267-4a0d-b9cf-623b56da86d6";
                readonly full_name: "Andrew Morris";
                readonly position: "P";
            }, {
                readonly id: "9c6e288c-aa75-4d4b-b4c5-2dd2731908d9";
                readonly full_name: "Kaelen Culpepper";
                readonly position: "IF";
            }, {
                readonly id: "9ea2890d-ab51-4876-bf64-ec0398bf5f8e";
                readonly full_name: "Ryan Kreidler";
                readonly position: "IF";
            }, {
                readonly id: "a4630a73-2fd8-4558-b4ca-87a6b305497c";
                readonly full_name: "Kody Clemens";
                readonly position: "IF";
            }, {
                readonly id: "aef9f47e-bd19-419e-9fec-73271850bd39";
                readonly full_name: "Brooks Lee";
                readonly position: "IF";
            }, {
                readonly id: "d2b49c9d-1c9f-44b4-b9b9-c4222dc0c089";
                readonly full_name: "Jeff Hoffman";
                readonly position: "P";
            }, {
                readonly id: "dba3e740-244b-487e-8122-2adc89c206f1";
                readonly full_name: "Dean Kremer";
                readonly position: "P";
            }, {
                readonly id: "e1cbb2df-986d-4fab-bf1e-7192c54bdae9";
                readonly full_name: "A.J. Minter";
                readonly position: "P";
            }];
        };
    };
};
//# sourceMappingURL=mlb-summary-lineup.d.ts.map