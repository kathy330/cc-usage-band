# cc-usage-band

A band above the Claude Code prompt that is always on screen:

```
5h ━━━━━━━━ 2% 4h49m  │  7d ━━━━━━━━ 44% 3d20h  │  ≋ ⣿⣿⣿⣿⣿⣿⣿⣿ 43.7K/1M  │  ◎ 71%
```

- **5h / 7d**: share of each rate-limit window used, and time until it resets. The colour is the pace — where usage will land at reset if it keeps this rate: green below 50%, amber 50–85%, red from 85%. In the first 10% of a window the share used is coloured the same way instead.
- **≋**: context window used / window size.
- **◎**: cache hit rate of the last turn (cache reads ÷ all input tokens).

At the right of the footer line under the prompt it adds the model, effort level and output style of the main loop, e.g. `Opus 5.5 · high · default`. Effort is read from the last request sent, so a `/effort` change shows after the next message.

Numbers come from Claude Code's own usage events; nothing is estimated. Drawn in the terminal, and in Claude Code for VS Code and the desktop app once their bundled Claude Code supports mods.

## Install

In a terminal:

```
claude plugin marketplace add kathy330/cc-usage-band
claude plugin install cc-usage-band@cc-usage-band
```

Then start a new Claude Code session.

Or, inside a Claude Code session:

```
/plugin install cc-usage-band --marketplace kathy330/cc-usage-band
```

Answer `y` to add the marketplace, then press Enter for the user scope.

Hide it for the current session with `[-]` at the right end of the band.
