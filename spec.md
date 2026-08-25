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
- Minion waves spawn in all three lanes for both teams on a repeating timer.
- Every third wave adds a siege unit only in lanes where that team has already destroyed an enemy tower. Before a team destroys a tower, none of its lanes receive siege units.
- Siege access is tracked separately for each team and lane. Destroying a top-lane tower unlocks allied top-lane siege units without changing middle or bottom waves; destroying towers in additional lanes unlocks those lanes too.
- The battlefield has three lanes: top, middle, and bottom. Top climbs north and then bends south; bottom bends south and then climbs north; middle follows a shallower opposing curve.
- Lane minions and bots follow the same curved centerlines shown by the terrain and minimap rather than traveling directly from left to right.
- Each side has two towers in each lane and one final heart structure.
- Towers and hearts are durable, high-damage safe zones that punish unsupported dives.
- Melee, ranged, and siege minions have enough health to sustain a lane fight rather than disappearing in one or two attacks.
- Two Power Relics sit in the rotation space between lanes. Holding one for three uncontested seconds grants 160 shared XP and a 25-second team damage boost.
- Trees in Crownkeep and industrial blocks in Neon Divide are solid terrain. Heroes and lane units slide around their collision boundaries while the marked lane and rotation corridors remain open.
- Targeted basic attacks, including shots from ranged heroes, minions, towers, and hearts, track their chosen target until impact and cannot miss because that target moved. Aimed abilities remain skill shots.
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

Each hero has distinct health, speed, attack power, attack cadence, range, color treatment, and ability names. Tanks, fighters, and assassins use close-range physical basic attacks; marksmen, mages, and supports fire visible projectiles from substantially different preferred ranges. Abilities include aimed shots, dashes, nearby fields, targeted blasts, volleys, and restorative capstone surges.

## Interface rules

- Hero-selection attributes must be shown as exact labeled values, not bars. This avoids implying a normalized rating when the game uses real underlying values.
- Ability rows on the selection screen show each slot, name, description, unlock level, and available choices.
- The battle HUD shows current health, team XP and level, kills, match time, wave number, a compact five-slot ability bar, cooldowns, and a live minimap.
- The ability bar sits near the bottom-left and always shows `Q`, `W`, `E`, `R`, and `T`; empty slots show the level required to open them.
- Ordinary level-ups use a brief notice without stopping the match.
- Ability milestones pause the match and open a compact two-choice panel immediately above the ability bar.
- The minimap shows all three lanes plus the current positions of heroes, minions, towers, and both hearts.
- The minimap shows both Power Relics and the camera's current viewport.
- Battlefield units do not show nameplates; hero identity remains visible in selection and the player HUD.
- Melee minions use a deliberately smaller silhouette than ranged minions and heroes. Crownkeep swordsmen carry a pointed sword with a visible crossguard and grip, a helmet, and a shield; Neon Divide breachers use a riot shield and compact energy blade.
- Ranged minions must be identifiable by silhouette: Crownkeep archers carry a curved bow, drawn string, arrow, and back quiver, while Neon Divide riflemen carry a long rifle.
- Siege minions must read as machinery rather than generic carts: Crownkeep catapults have large wheels, an A-frame, throwing arm, counterweight, bucket, and loaded stone; Neon Divide missile carriers use tracks and paired launch tubes.
- Ranged and siege projectiles reinforce those identities with arrows and stones in Crownkeep and bullets and rockets in Neon Divide.
- Bars are appropriate for live, changing resources such as health and XP. This restriction applies only to static character attributes.
- Controls and progression should be understandable without opening external documentation.

After completing a normal right-click move, the player returns to an idle combat stance and automatically acquires nearby enemies. The move command itself remains uninterrupted, so passing enemies do not pull the hero away before the destination is reached.

## Battlegrounds

### Crownkeep

A medieval frontier with castles, guard towers, swordsmen, archers, and catapults.

### Neon Divide

A modern warzone with command cores, defense grids, riflemen, rocketeers, and missile carriers.

Both battlegrounds use a large, camera-followed world. Lanes are long, wide, and visibly curved, while three broad winding rotation roads create clear travel routes between top, middle, and bottom. Trees and industrial blocks are solid voxel terrain that shape movement outside those corridors.

## Technical constraints

- React and TypeScript rendered through Vite.
- Canvas-based match simulation with React-rendered menus and HUD.
- Units and structures use consistent hard-edged voxel rendering with stable animation phases.
- Simulation positions, displayed unit positions, and the player-follow camera are smoothed independently to prevent visual vibration.
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

## Acceptance criteria for lane siege waves

- No team spawns siege units before destroying an enemy tower.
- If the allied team destroys an enemy top-lane tower, its next siege-eligible wave adds one allied siege unit in top and none in middle or bottom.
- The enemy team does not gain a siege lane when an enemy tower is destroyed; each team's unlocks depend on the towers that team destroys.
- Destroying an enemy tower in another lane adds that lane without removing previously unlocked lanes.

## Acceptance criteria for unit silhouettes

- Crownkeep swordsmen are visibly smaller than heroes and archers while their helmet, shield, and complete sword remain readable at normal match zoom.
- An archer and a melee minion remain distinguishable when viewed at the normal match zoom without labels.
- A Crownkeep catapult visibly includes wheels and a raised throwing arm with a stone bucket.
- The equivalent Neon Divide units remain mechanically identical but use rifle and missile-carrier silhouettes.
