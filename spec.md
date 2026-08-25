# Blockbound Arena Game Specification

## Product summary

Blockbound Arena is a fast, block-styled 5v5 MOBA prototype for desktop browsers. The player chooses one of ten heroes, joins four allied bots, pushes a single contested lane against five enemy bots, destroys defensive towers, and wins by shattering the opposing team heart.

The prototype is a self-contained static React/Vite game. Online matchmaking and player networking are future work, not part of the current playable scope.

## Player experience

The intended match loop is:

1. Open the landing screen and enter the 5v5 demo.
2. Choose a hero and one of two battleground presentations.
3. Move, aim, basic-attack, and use unlocked hero abilities.
4. Defeat enemy units and structures to earn shared team XP.
5. Level up as a team, unlock abilities, and choose hero-specific upgrades.
6. Break through towers and destroy the enemy heart before the allied heart falls.

## Controls

| Action | Input |
| --- | --- |
| Move | `WASD` or arrow keys |
| Aim | Mouse movement |
| Basic attack | Left click |
| First ability | `Q` |
| Second ability | `E` |
| Ultimate ability | `R` |

## Match rules

- Teams contain five heroes. The human controls one allied hero; bots control the other nine heroes.
- Minion waves spawn for both teams on a repeating timer. Every third wave includes a siege unit.
- Each side has two lane towers and one final heart structure.
- Towers and hearts attack enemies in range.
- Heroes respawn after being defeated. Other destroyed units and structures do not respawn.
- Destroying the enemy heart produces victory; losing the allied heart produces defeat.
- Crownkeep and Neon Divide share gameplay geometry and balance. Their differences are visual theme and unit/structure naming.

## Shared progression

- Each team has one shared XP total and one shared level, beginning at level 1.
- Defeating melee or ranged minions grants 18 XP, siege units grant 35 XP, heroes grant 90 XP, and towers grant 120 XP.
- Reaching the current XP threshold advances the entire team by one level, up to level 10. The threshold is `current level × 220` XP.
- Every team level grants all allied heroes base health and attack growth. The human player also chooses one of their hero's three upgrades.
- The match simulation pauses while the level-up panel is open and resumes after the player chooses an upgrade.
- Ability access is tied to team level. Pressing a key for a locked ability must do nothing and must not start its cooldown.

### Ability unlock cadence

| Team level | Unlock |
| --- | --- |
| 1 | First ability (`Q`) |
| 3 | Second ability (`E`) |
| 5 | Ultimate ability (`R`) |

The hero-selection screen must state each ability's unlock level. During a match, locked ability slots must show the required level. A level-up that unlocks an ability must identify the newly available ability in the level-up panel.

## Heroes

| Hero | Role | `Q` — level 1 | `E` — level 3 | `R` — level 5 |
| --- | --- | --- | --- | --- |
| Bastion | Tank | Shield Rush | Fault Line | Citadel |
| Volt | Assassin | Arc Blink | Static Fan | Overcharge |
| Nyx | Mage | Void Lance | Gravity Well | Black Star |
| Briar | Support | Seedshot | Bramble Ring | Verdant Dawn |
| Rook | Marksman | Longshot | Combat Roll | Full Salvo |
| Ember | Mage | Cinder Bolt | Flame Ring | Wildfire |
| Tide | Tank | Riptide | Undertow | Maelstrom |
| Kestrel | Assassin | Vault | Blade Fan | Final Flight |
| Forge | Fighter | Hammerfall | Molten Ring | Redline |
| Echo | Support | Soundbite | Pulse Field | Resonance |

Each hero has a distinct health, speed, attack-power, range, color treatment, ability set, and three upgrade choices. Current abilities share a small set of prototype combat patterns—aimed projectiles or movement on `Q`, a nearby area effect on `E`, and a large targeted area effect on `R`—with support and defensive heroes adding healing where applicable.

## Interface rules

- Hero-selection attributes must be shown as exact labeled values, not bars. This avoids implying a normalized rating when the game uses real underlying values.
- Ability rows on the selection screen show their input, name, description, and unlock level.
- The battle HUD shows current health, team XP and level, kills, match time, wave number, cooldowns, locked abilities, and a minimap.
- Bars are appropriate for live, changing resources such as health and XP. This restriction applies only to static character attributes.
- Controls and progression should be understandable without opening external documentation.

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
- `E` cannot be cast before level 3 and becomes available at level 3.
- `R` cannot be cast before level 5 and becomes available at level 5.
- Locked inputs do not consume cooldowns.
- Ember follows the same cadence: Cinder Bolt at level 1, Flame Ring at level 3, and Wildfire at level 5.
- Selection and in-match UI communicate the same unlock levels.
