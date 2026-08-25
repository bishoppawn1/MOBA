# Blockbound Arena

[**Play Blockbound Arena on GitHub Pages →**](https://bishoppawn1.github.io/MOBA/)

A playable block-forged MOBA prototype featuring ten heroes, medieval and modern battlegrounds, shared team XP, a five-ability progression tree, minion waves, recruitable mercenaries, towers, and destructible hearts.

The expanded battlefield has three long winding lanes, collision-based jungle terrain, capturable Power Relics, leash-based mercenary camps that become temporary lane-push squads, heavy defensive towers, guaranteed targeted attacks, and distinct melee and ranged hero styles.

## Controls

- Move: right-click the ground
- Attack-move: press `A`, then left-click the ground
- Focus an enemy: press `A`, then left-click that enemy
- Basic attacks fire automatically while attack-moving, focusing a target, or standing near an enemy after moving
- Ability targeting: press `Q`, `W`, `E`, `R`, or `T` to preview the hit zone, then left-click to cast
- Movement remains available while aiming; right-click to move or press `Escape` to cancel without using the cooldown

Heroes begin with one starter ability. At team levels 5, 10, 15, and 20, play pauses briefly so you can choose one of two hero-specific abilities for the next slot.

The current prototype runs a complete 5v5 match with bot-controlled allies and opponents. Online player networking is a future backend milestone.

## Run locally

```bash
npm install
npm run dev
```

Every push to `main` is built and deployed through the included GitHub Pages workflow.
