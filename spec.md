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
| Use a self-cast ability | Press its `Q`, `W`, `E`, `R`, or `T` key; it fires immediately |
| Aim a directional or ground ability | Press its `Q`, `W`, `E`, `R`, or `T` key |
| Cast an aimed ability | Left-click after its preview appears |
| Move while aiming | Right-click normally; the ability remains armed |
| Cancel ability targeting | `Escape`, the same ability key, or `A` |
| Camera zoom | Mouse wheel, or the `+` and `−` controls beside the minimap |

## Match rules

- Teams contain five heroes. The human controls one allied hero; bots control the other nine heroes.
- Minion waves spawn in all three lanes for both teams on a repeating timer.
- Every third wave adds a siege unit only in lanes where that team has already destroyed an enemy tower. Before a team destroys a tower, none of its lanes receive siege units.
- Siege access is tracked separately for each team and lane. Destroying a top-lane tower unlocks allied top-lane siege units without changing middle or bottom waves; destroying towers in additional lanes unlocks those lanes too.
- The battlefield is 4800×2700 world units, three full camera widths across and three standard viewport heights tall. It has three wide lanes: top, middle, and bottom. All three lanes share a road through each castle gate, fan out only after leaving the base, cross the battlefield on distinct curved routes, and converge all the way back into the opposing gate road.
- Lane minions spawn inside their team's castle gate in a compact formation. They travel along the shared base road before separating onto their assigned top, middle, or bottom path.
- Lane minions and bots follow the same converging curved centerlines shown by the terrain and minimap rather than traveling directly from left to right.
- Each side has two towers in each lane and one final heart structure.
- Towers and hearts are durable, high-damage safe zones that punish unsupported dives.
- Heroes, towers, and hearts acquire opponents by physical proximity regardless of which lane label the opponent last followed. Minions retain lane-locked acquisition so waves remain organized.
- Melee, ranged, and siege minions have enough health to sustain a lane fight rather than disappearing in one or two attacks.
- Two Power Relics sit in the rotation space between lanes. Holding one for three uncontested seconds grants 160 shared XP and a 25-second team damage boost.
- Four gold mercenary camps sit in the jungle between lanes. Neutral mercenaries fight heroes inside their visible camp boundary, stop chasing when a hero leaves it, return home, and recover health.
- Clearing every mercenary in a camp recruits the full squad for the team that lands the final takedown. The captured squad marches down the nearest lane toward enemy units and structures until defeated, then the camp returns as neutral after 35 seconds.
- Trees in Crownkeep and industrial blocks in Neon Divide are solid terrain. Heroes and lane units slide around their collision boundaries while the marked lane and rotation corridors remain open.
- Targeted basic attacks, including shots from ranged heroes, minions, towers, and hearts, track their chosen target until impact and cannot miss because that target moved. Aimed abilities remain skill shots.
- Heroes respawn after being defeated. Lane units and structures do not respawn; cleared mercenary camps follow their separate 35-second return timer after the captured squad is destroyed.
- Destroying the enemy heart produces victory; losing the allied heart produces defeat.
- Crownkeep and Neon Divide share gameplay geometry and balance. Their differences are visual theme and unit/structure naming.

## Shared progression

- Each team has one shared XP total and one shared level, beginning at level 1 and capped at level 20.
- Defeating melee or ranged minions grants 18 XP, each mercenary grants 30 XP, siege units grant 35 XP, heroes grant 90 XP, and towers grant 120 XP.
- Reaching the current XP threshold advances the entire team by one level. The threshold is `200 + (current level × 60)` XP.
- Every level grants each allied hero small combat-stat growth: 2.5% maximum health, 1.8% damage, 0.4% movement speed, and 0.5 armor. Every third level also grants 1.2% attack speed.
- Ordinary level growth never improves health regeneration, cooldown recovery, or any other resource-regeneration speed. Those effects are reserved for explicit special milestone rewards.
- Ordinary levels show a brief, non-blocking on-screen notice and do not interrupt play.
- Ability milestones at levels 5, 10, 15, and 20 keep the match running and present three choices for the newly opened slot.
- Milestone pools mix castable abilities, permanent passive effects, direct stat rewards, and summon abilities. A castable summon creates two temporary voxel escorts; passive and stat rewards apply immediately and cannot be cast.
- Cooldown recovery may appear only as a special milestone option, such as the level-20 Perfect Cycle capstone. It is never part of automatic level growth.
- The level-1 starter is fixed. Each later choice is permanent for that match and fills the corresponding empty slot in the bottom ability bar.
- Milestone prompts are queued if the player leaves an earlier choice open while the match continues.
- Pressing the key for an empty ability slot must do nothing and must not start a cooldown.
- Pressing an available directional, dash, or ground-targeted ability key arms it without casting or starting its cooldown. A live indicator follows the pointer and shows the actual line, cone, dash path, or ground radius that will be affected.
- While an ability is armed, right-click movement remains available and does not dismiss the preview. Left-click confirms the cast from the hero's current position; `Escape`, `A`, or pressing the same key again cancels it.
- Self-centered novas, fields, and surge effects require no target and therefore cast immediately when their ability key is pressed.
- Limited-range previews use a green marker for the actual destination or impact point and a faint red line for maximum range. Dash destinations follow the pointer inside that boundary and clamp to it when the pointer is farther away.
- Pressing the key assigned to a passive or stat reward also does nothing and must not start a cooldown.

### Ability unlock cadence

| Team level | Slot | Behavior |
| --- | --- | --- |
| 1 | `Q` | Fixed starter ability |
| 5 | `W` | Choose one of three rewards: two hero abilities or Reinforced Core (stat) |
| 10 | `E` | Choose one of three rewards: two hero abilities or a hero-themed Vanguard summon |
| 15 | `R` | Choose one of three rewards: two mastery abilities or Predator Rhythm (passive) |
| 20 | `T` | Choose one of three rewards: two capstone abilities or Perfect Cycle (special passive) |

The hero-selection screen previews the starter and all three options at each later milestone. During a match, empty ability slots show their required level. Milestone choices appear at the lower-left edge of the battlefield, directly above the ability bar, without covering or pausing the entire match.

## Heroes

| Hero | Role | Level 1 starter | Level 5 choices | Level 10 choices | Level 15 choices | Level 20 choices |
| --- | --- | --- | --- | --- | --- | --- |
| Bastion | Tank | Shield Rush | Fault Line / Bulwark Slam / Reinforced Core | Citadel / Rampart March / Bastion Vanguard | Shield Rush Barrage / Iron Dominion / Predator Rhythm | Ascendant Citadel / Last Bastion / Perfect Cycle |
| Volt | Assassin | Arc Blink | Static Fan / Lightning Step / Reinforced Core | Overcharge / Chain Storm / Volt Vanguard | Arc Blink Barrage / Flashpoint / Predator Rhythm | Ascendant Overcharge / Absolute Voltage / Perfect Cycle |
| Nyx | Mage | Void Lance | Gravity Well / Phase Rift / Reinforced Core | Black Star / Umbral Cascade / Nyx Vanguard | Void Lance Barrage / Event Horizon / Predator Rhythm | Ascendant Black Star / Endless Night / Perfect Cycle |
| Briar | Support | Seedshot | Bramble Ring / Vinewalk / Reinforced Core | Verdant Dawn / Thornwake / Briar Vanguard | Seedshot Barrage / Ancient Grove / Predator Rhythm | Ascendant Verdant Dawn / Worldroot / Perfect Cycle |
| Rook | Marksman | Longshot | Combat Roll / Quickdraw / Reinforced Core | Full Salvo / Ricochet / Rook Vanguard | Longshot Barrage / Kill Zone / Predator Rhythm | Ascendant Full Salvo / Deadeye Protocol / Perfect Cycle |
| Ember | Mage | Cinder Bolt | Flame Ring / Ash Step / Reinforced Core | Wildfire / Meteor Brand / Ember Vanguard | Cinder Bolt Barrage / Firestorm / Predator Rhythm | Ascendant Wildfire / Phoenix Dawn / Perfect Cycle |
| Tide | Tank | Riptide | Undertow / Breakwater / Reinforced Core | Maelstrom / Tidal Surge / Tide Vanguard | Riptide Barrage / Drowning Field / Predator Rhythm | Ascendant Maelstrom / Leviathan / Perfect Cycle |
| Kestrel | Assassin | Vault | Blade Fan / Windstep / Reinforced Core | Final Flight / Razor Cyclone / Kestrel Vanguard | Vault Barrage / Skyfall / Predator Rhythm | Ascendant Final Flight / Apex Predator / Perfect Cycle |
| Forge | Fighter | Hammerfall | Molten Ring / Anvil Charge / Reinforced Core | Redline / Furnace Blast / Forge Vanguard | Hammerfall Barrage / Iron Tempest / Predator Rhythm | Ascendant Redline / Worldbreaker / Perfect Cycle |
| Echo | Support | Soundbite | Pulse Field / Refrain / Reinforced Core | Resonance / Sonic Boom / Echo Vanguard | Soundbite Barrage / Chorus Field / Predator Rhythm | Ascendant Resonance / Grand Crescendo / Perfect Cycle |

Each hero has distinct health, speed, attack power, attack cadence, range, color treatment, and ability names. Tanks, fighters, and assassins use close-range physical basic attacks; marksmen, mages, and supports fire visible projectiles from substantially different preferred ranges. Abilities include aimed shots, dashes, nearby fields, targeted blasts, volleys, and restorative capstone surges.

## Interface rules

- Hero-selection attributes must be shown as exact labeled values, not bars. This avoids implying a normalized rating when the game uses real underlying values.
- Ability rows on the selection screen show each slot, name, description, unlock level, and available choices.
- The battle HUD shows current health, team XP and level, kills, match time, wave number, a compact five-slot ability bar, cooldowns, and a live minimap.
- The ability bar sits near the bottom-left and always shows `Q`, `W`, `E`, `R`, and `T`; empty slots show the level required to open them.
- The currently armed ability is highlighted in the ability bar, and the command banner identifies it while reminding the player how to cast, move, or cancel.
- Ordinary level-ups use a brief notice without stopping the match.
- Ability milestones keep the match live and open a compact three-choice panel immediately above the ability bar.
- Each choice identifies itself as active, passive, summon, or stat, and learned passives remain visibly marked in their ability-bar slot.
- The minimap shows all three lanes plus the current positions of heroes, minions, mercenaries, towers, and both hearts.
- The minimap shows both Power Relics and the camera's current viewport.
- The mouse wheel and visible `+`/`−` buttons zoom the camera between a useful close view and a broad battlefield view; the minimap viewport updates with the zoom level.
- The battlefield and minimap both show all three lane paths meeting at each castle.
- The minimap marks all four mercenary camp sites, their current team color, and whether they are waiting to respawn.
- Battlefield units do not show nameplates; hero identity remains visible in selection and the player HUD.
- Melee minions use a deliberately smaller silhouette than ranged minions and heroes. Crownkeep swordsmen carry a pointed sword with a visible crossguard and grip, a helmet, and a shield; Neon Divide breachers use a riot shield and compact energy blade.
- Neon Divide close-range heroes have role-specific equipment rather than a generic upright bar: tanks carry broad powered riot shields, while fighters and assassins carry forward-facing energy blades or heavy gauntlets.
- Ranged minions must be identifiable by silhouette: Crownkeep archers carry a curved bow, drawn string, arrow, and back quiver, while Neon Divide riflemen carry a long rifle.
- Siege minions must read as machinery rather than generic carts: Crownkeep catapults have large wheels, an A-frame, throwing arm, counterweight, bucket, and loaded stone; their chassis faces downlane while the loaded bucket rests to the rear. Neon Divide missile carriers use tracks and paired forward-facing launch tubes.
- Ranged and siege projectiles reinforce those identities with arrows and stones in Crownkeep and bullets and rockets in Neon Divide. Every projectile, including hero energy shots, is assembled from a small cluster of glowing cubes rather than lines, polygons, or a single large cube.
- Bars are appropriate for live, changing resources such as health and XP. This restriction applies only to static character attributes.
- Controls and progression should be understandable without opening external documentation.

After completing a normal right-click move, the player returns to an idle combat stance and automatically acquires nearby enemies. The move command itself remains uninterrupted, so passing enemies do not pull the hero away before the destination is reached.

## Battlegrounds

### Crownkeep

A medieval frontier with castles, guard towers, swordsmen, archers, and catapults.

### Neon Divide

A modern warzone with command cores, defense grids, riflemen, rocketeers, and missile carriers.

Both battlegrounds use the same 4800×2700 camera-followed world. Lanes are long, wide, and visibly curved; the top road rises toward the north edge before bending back down, while the bottom road mirrors that route through the south. Three broad winding rotation roads create clear travel routes between top, middle, and bottom. Trees and industrial blocks are solid voxel terrain that shape movement outside those corridors.

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
- Levels 5, 10, 15, and 20 keep play running and present three choices for the new slot.
- Each milestone offers a mixture of hero actions and a stat, summon, or passive alternative as defined in the cadence table.
- Choosing a reward closes the current panel and fills its slot; the match never needs to resume because it never pauses.
- Direct stat and passive choices apply once, stay visible in the ability bar, and cannot be activated or consume cooldowns.
- Automatic level growth increases health, damage, movement speed, armor, and sometimes attack speed without changing regeneration or cooldown recovery.
- Empty-slot inputs do not consume cooldowns.
- Pressing an available aimed ability key shows its targeting preview but does not deal damage, move the hero, launch projectiles, or consume its cooldown until left-click confirms it.
- Pressing an available self-cast nova, field, or surge key activates the ability immediately and starts its cooldown without requiring a left-click.
- Directional bolts and volleys preview every projectile path; dashes preview their travel path and green landing marker; ground blasts preview their green impact radius. Limited-range previews show a faint red maximum-range boundary.
- A dash aimed inside its maximum range ends at the green pointer marker; a dash aimed beyond maximum range ends where that marker is clamped to the red boundary.
- Right-clicking while an ability is armed moves the hero while keeping the ability armed, and the preview updates from the hero's new position.
- `Escape`, `A`, or pressing the armed ability key again cancels targeting without consuming a cooldown.
- Ember starts with Cinder Bolt, then gains a third alternative alongside Flame Ring/Ash Step at level 5, Wildfire/Meteor Brand at level 10, Cinder Bolt Barrage/Firestorm at level 15, and Ascendant Wildfire/Phoenix Dawn at level 20.
- Hero selection and the in-match HUD communicate the same slots, choices, and milestone levels.

## Acceptance criteria for zoom and projectiles

- Scrolling over the battlefield and using the visible `+`/`−` controls both change the camera zoom within the same supported range.
- Pointer aiming and world clicks remain aligned with the cursor at every zoom level.
- The minimap viewport grows when zooming out and shrinks when zooming in.
- Energy shots, arrows, stones, bullets, and rockets are recognizable voxel clusters made only from small cubes and use glow to remain readable in motion.

## Acceptance criteria for lane siege waves

- No team spawns siege units before destroying an enemy tower.
- If the allied team destroys an enemy top-lane tower, its next siege-eligible wave adds one allied siege unit in top and none in middle or bottom.
- The enemy team does not gain a siege lane when an enemy tower is destroyed; each team's unlocks depend on the towers that team destroys.
- Destroying an enemy tower in another lane adds that lane without removing previously unlocked lanes.

## Acceptance criteria for unit silhouettes

- Crownkeep swordsmen are visibly smaller than heroes and archers while their helmet, shield, and complete sword remain readable at normal match zoom.
- An archer and a melee minion remain distinguishable when viewed at the normal match zoom without labels.
- A Crownkeep catapult visibly includes wheels and a raised throwing arm with a stone bucket.
- Allied catapult chassis face toward the enemy castle and enemy catapults mirror toward the allied castle.
- The equivalent Neon Divide units remain mechanically identical but use rifle and missile-carrier silhouettes.
- Neon Divide tank heroes read as carrying a wide riot shield, and its fighter and assassin heroes read as carrying a forward-facing weapon rather than a thin vertical plank.

## Acceptance criteria for castle lane routing

- The battlefield spans 4800×2700 world units, so a normal 1600×900 camera exposes no more than one third of the full map in either dimension.
- All three rendered lane roads overlap at each castle, remain shared through the gate, and visibly separate outside the base.
- Every newly spawned minion begins within its team's castle gate rather than appearing independently in its destination lane.
- Top-, middle-, and bottom-lane minions follow the shared exit before branching onto their assigned lane.
- The opposing castle uses the same convergence and spawn behavior in mirrored form.
- The minimap paths match the battlefield roads and show both three-way castle junctions.

## Acceptance criteria for combat awareness

- A hero entering from another lane is attacked when physically inside an enemy hero's awareness radius; lane metadata cannot make the nearby hero invisible to combat AI.
- Towers and hearts attack eligible opponents inside their actual range regardless of the opponent's lane metadata.
- Minions remain lane-disciplined and do not abandon their wave merely because another lane passes nearby.

## Acceptance criteria for mercenary camps

- Four neutral camps appear in the jungle and remain visible on the battlefield and minimap.
- Neutral mercenaries engage heroes inside their camp boundary but do not chase beyond it; disengaged mercenaries return home and recover.
- Defeating only part of a camp does not recruit it. Defeating the entire camp immediately restores that squad as units belonging to the team that lands the final takedown.
- Captured mercenaries leave their camp, join the nearest lane, and attack enemy units and structures without attacking other neutral camps.
- After every captured mercenary in a squad is defeated, its camp shows a 35-second return timer and then respawns as neutral.
