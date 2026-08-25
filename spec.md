# Blockbound Arena Game Specification

## Product summary

Blockbound Arena is a fast, block-styled 5v5 MOBA prototype for desktop browsers. The player chooses one of ten heroes, joins four allied bots, pushes three contested lanes against five enemy bots, destroys defensive towers, and wins by shattering the opposing team heart.

The prototype is a self-contained static React/Vite game. Online matchmaking and player networking are future work, not part of the current playable scope.

## Player experience

The intended match loop is:

1. Open the landing screen and enter the 5v5 demo.
2. Choose a hero and one of two battleground presentations.
3. Issue move and attack commands and use the abilities chosen for the current match.
4. Defeat enemy units and structures to earn shared team XP.
5. Level up as a team and shape a five-ability loadout through milestone choices.
6. Break through towers and destroy the enemy heart before the allied heart falls.

## Controls

| Action | Input |
| --- | --- |
| Move | Right-click the ground |
| Attack-move | Press `A`, then left-click the ground |
| Focus attack | Press `A`, then left-click an enemy |
| Basic attack | Automatic while attack-moving, focusing a target, or idle near an enemy |
| Ability slots | `Q`, `W`, `E`, `R`, `T` |

## Match rules

- Teams contain five heroes. The human controls one allied hero; bots control the other nine heroes.
- Minion waves spawn in all three lanes for both teams on a repeating timer. Every third wave includes a siege unit.
- The battlefield has three lanes: top, middle, and bottom.
- Each side has two towers in each lane and one final heart structure.
- Towers and hearts attack enemies in range.
- Heroes respawn after being defeated. Other destroyed units and structures do not respawn.
- Destroying the enemy heart produces victory; losing the allied heart produces defeat.
- Crownkeep and Neon Divide share gameplay geometry and balance. Their differences are visual theme and unit/structure naming.

## Shared progression

- Each team has one shared XP total and one shared level, beginning at level 1 and capped at level 20.
- Defeating melee or ranged minions grants 18 XP, siege units grant 35 XP, heroes grant 90 XP, and towers grant 120 XP.
- Reaching the current XP threshold advances the entire team by one level. The threshold is `200 + (current level × 60)` XP.
- Every level grants allied heroes base health and attack growth.
- Ordinary levels show a brief, non-blocking on-screen notice and do not interrupt play.
- Ability milestones at levels 5, 10, 15, and 20 pause the match and present two hero-flavored choices for the newly opened slot.
- The level-1 starter is fixed. Each later choice is permanent for that match and fills the corresponding empty slot in the bottom ability bar.
- Pressing the key for an empty ability slot must do nothing and must not start a cooldown.

### Ability unlock cadence

| Team level | Slot | Behavior |
| --- | --- | --- |
| 1 | `Q` | Fixed starter ability |
| 5 | `W` | Choose one of two abilities |
| 10 | `E` | Choose one of two abilities |
| 15 | `R` | Choose one of two mastery abilities |
| 20 | `T` | Choose one of two capstone abilities |

The hero-selection screen previews the starter and both options at each later milestone. During a match, empty ability slots show their required level. Milestone choices appear at the lower-left edge of the battlefield, directly above the ability bar.

## Heroes

| Hero | Role | Level 1 starter | Level 5 choices | Level 10 choices | Level 15 choices | Level 20 choices |
| --- | --- | --- | --- | --- | --- | --- |
| Bastion | Tank | Shield Rush | Fault Line / Bulwark Slam | Citadel / Rampart March | Shield Rush Barrage / Iron Dominion | Ascendant Citadel / Last Bastion |
| Volt | Assassin | Arc Blink | Static Fan / Lightning Step | Overcharge / Chain Storm | Arc Blink Barrage / Flashpoint | Ascendant Overcharge / Absolute Voltage |
| Nyx | Mage | Void Lance | Gravity Well / Phase Rift | Black Star / Umbral Cascade | Void Lance Barrage / Event Horizon | Ascendant Black Star / Endless Night |
| Briar | Support | Seedshot | Bramble Ring / Vinewalk | Verdant Dawn / Thornwake | Seedshot Barrage / Ancient Grove | Ascendant Verdant Dawn / Worldroot |
| Rook | Marksman | Longshot | Combat Roll / Quickdraw | Full Salvo / Ricochet | Longshot Barrage / Kill Zone | Ascendant Full Salvo / Deadeye Protocol |
| Ember | Mage | Cinder Bolt | Flame Ring / Ash Step | Wildfire / Meteor Brand | Cinder Bolt Barrage / Firestorm | Ascendant Wildfire / Phoenix Dawn |
| Tide | Tank | Riptide | Undertow / Breakwater | Maelstrom / Tidal Surge | Riptide Barrage / Drowning Field | Ascendant Maelstrom / Leviathan |
| Kestrel | Assassin | Vault | Blade Fan / Windstep | Final Flight / Razor Cyclone | Vault Barrage / Skyfall | Ascendant Final Flight / Apex Predator |
| Forge | Fighter | Hammerfall | Molten Ring / Anvil Charge | Redline / Furnace Blast | Hammerfall Barrage / Iron Tempest | Ascendant Redline / Worldbreaker |
| Echo | Support | Soundbite | Pulse Field / Refrain | Resonance / Sonic Boom | Soundbite Barrage / Chorus Field | Ascendant Resonance / Grand Crescendo |

Each hero has distinct health, speed, attack power, range, color treatment, and milestone choices. The prototype combat patterns include aimed shots, dashes, nearby fields, targeted blasts, volleys, and restorative capstone surges.

## Interface rules

- Hero-selection attributes must be shown as exact labeled values, not bars. This avoids implying a normalized rating when the game uses real underlying values.
- Ability rows on the selection screen show each slot, name, description, unlock level, and available choices.
- The battle HUD shows current health, team XP and level, kills, match time, wave number, a compact five-slot ability bar, cooldowns, and a live minimap.
- The ability bar sits near the bottom-left and always shows `Q`, `W`, `E`, `R`, and `T`; empty slots show the level required to open them.
- Ordinary level-ups use a brief notice without stopping the match.
- Ability milestones pause the match and open a compact two-choice panel immediately above the ability bar.
- The minimap shows all three lanes plus the current positions of heroes, minions, towers, and both hearts.
- Battlefield units do not show nameplates; hero identity remains visible in selection and the player HUD.
- Bars are appropriate for live, changing resources such as health and XP. This restriction applies only to static character attributes.
- Controls and progression should be understandable without opening external documentation.

After completing a normal right-click move, the player returns to an idle combat stance and automatically acquires nearby enemies. The move command itself remains uninterrupted, so passing enemies do not pull the hero away before the destination is reached.

## Battlegrounds

### Crownkeep

A medieval frontier with castles, guard towers, swordsmen, archers, and catapults.

### Neon Divide

A modern warzone with command cores, defense grids, riflemen, rocketeers, and missile carriers.

## Technical constraints

- React and TypeScript rendered through Vite.
- Canvas-based match simulation with React-rendered menus and HUD.
- Static output must build into `dist/` with `npm run build` and run on GitHub Pages under `/MOBA/`.
- No backend, login, database, or mandatory third-party service.
- Desktop keyboard and mouse are the primary supported controls for the playable match.

## Acceptance criteria for progression

- A new match starts at team level 1 with only `Q` available.
- The ability bar contains five slots, with four visibly empty at the start.
- Ordinary levels show a non-blocking notice and do not pause play.
- Levels 5, 10, 15, and 20 pause play and present two choices for the new slot.
- Choosing an ability closes the panel, fills its slot, and resumes the match.
- Empty-slot inputs do not consume cooldowns.
- Ember starts with Cinder Bolt, then chooses between Flame Ring and Ash Step at level 5, Wildfire and Meteor Brand at level 10, Cinder Bolt Barrage and Firestorm at level 15, and Ascendant Wildfire and Phoenix Dawn at level 20.
- Hero selection and the in-match HUD communicate the same slots, choices, and milestone levels.
