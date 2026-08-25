# Blockbound Arena

[**Play Blockbound Arena on GitHub Pages →**](https://bishoppawn1.github.io/MOBA/)

A playable block-forged MOBA prototype featuring ten heroes, medieval and modern battlegrounds, shared team XP, a five-ability progression tree, minion waves, towers, and destructible hearts.

The expanded battlefield has three long lanes, open jungle rotations, capturable Power Relics, heavy defensive towers, and distinct melee and ranged hero styles.

## Controls

- Move: right-click the ground
- Attack-move: press `A`, then left-click the ground
- Focus an enemy: press `A`, then left-click that enemy
- Basic attacks fire automatically while attack-moving, focusing a target, or standing near an enemy after moving
- Ability bar: `Q`, `W`, `E`, `R`, and `T`

Heroes begin with one starter ability. At team levels 5, 10, 15, and 20, play pauses briefly so you can choose one of two hero-specific abilities for the next slot.

The current prototype runs a complete 5v5 match with bot-controlled allies and opponents. Online player networking is a future backend milestone.

## Run locally

```bash
npm install
npm run dev
```

Every push to `main` is built and deployed through the included GitHub Pages workflow.
