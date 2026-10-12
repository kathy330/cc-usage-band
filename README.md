# cc-usage-band

A band above the Claude Code prompt that is always on screen:

```
5h ━━━━━━━━ 2% 4h49m  │  7d ━━━━━━━━ 44% 3d20h  │  ≋ ⣿⣿⣿⣿⣿⣿⣿⣿ 43.7K/1M  │  ◎ 71%
```

- **5h / 7d**: share of each rate-limit window used, and time until it resets. The `┃` on the bar is where even use would be by now. The colour is the pace — where usage will land at reset if it keeps this rate: green below 85%, amber 85–100%, red once it would run out or 90% is already used. In the first 10% of a window it uses plain thresholds (teal under 50%, amber to 80%, red above).
- **≋**: context window used / window size.
- **◎**: cache hit rate of the last turn (cache reads ÷ all input tokens).

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
