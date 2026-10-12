# cc-usage-band

A band above the Claude Code prompt that is always on screen:

```
5h ━━━━━━━━ 2% 4h49m  │  7d ━━━━━━━━ 44% 3d20h  │  ≋ ⣿⣿⣿⣿⣿⣿⣿⣿ 43.7K/1M  │  ◎ 71%
```

- **5h / 7d**: share of each rate-limit window used, and time until it resets. Teal under 50%, amber to 80%, red above.
- **≋**: context window used / window size.
- **◎**: cache hit rate of the last turn (cache reads ÷ all input tokens).

Numbers come from Claude Code's own usage events; nothing is estimated. Works in the terminal. The desktop app shows it once its bundled Claude Code supports mods.

## Install

In a terminal:

```
claude plugin marketplace add kathy330/cc-usage-band
claude plugin install cc-usage-band@cc-usage-band
```

Then start a new Claude Code session.

Hide it for the current session with `[-]` at the right end of the band.
