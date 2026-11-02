# PF2E Monster Archetype Bank

Browse 31 reusable PF2E creature archetypes using the carousel. Choose a level from −1 through 24, a physical damage type, and a nonphysical damage type to generate a stat block, tactics, and abilities. Summoner includes its attached minion stat blocks. Fixed damage types retain their listed type.

Use the Monster Compare tab to view an archetype beside a curated published creature of the same level and matching encounter category. Modal archetypes have separate melee and ranged choices. Solid rank colors mark exact creature-building benchmarks; split colors show values between two benchmarks. The published example list is being built gradually.

The Monster Compare Graphs tab shows average published advantage from levels −1 through 24 for Melee+, Ranged+, and Ability archetypes. AC and attack bonus use published minus archetype average; HP and damage use published divided by archetype average. Missing attacks are excluded from attack averages.
Use each graph's Preview Bump buttons to compare the original line with a hypothetical rank increase or decrease. Repeated presses move multiple ranks; values at the ends of a benchmark table stay at their existing rank.

Flavor each creature for your encounter without tying its mechanics to a particular story or appearance.

Generate random encounters as JSON with fully realized monster data:

```sh
npm run --silent realize:encounters -- --count 3 --level 5 > encounters.json
```

Each entry names its encounter variation and includes the party level, XP, and monster groups. Use optional `--physical` and `--nonphysical` flags to choose damage types, as with the monster dump script.

To dump every archetype needed for party level 6 and 10 compositions, run:

```sh
npm run realize:composition-levels
```

This writes one JSON array per creature level (2, 4, 6, 8, 10, and 12) to `output/unit_comparison/`.
