```
                                    #########
   @@@                           ###         ###
   @@@@@@@@@            $@@@@@@@@@@@@@@@@@@@@@@@@@$$$$#*!
   @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@-@@@$$$@$$$$$$$##@#*!;
   @@@@@@@@@@@@@@@!$$@@@$$@$$$$#$$-$$-$$-$#-##*###$##*****!=#:-
   @@@@@@@@@@@@@@@@=!**#######*###*##!**;******=**!=!!!==;;:#-
   @@@@@@@@@            ---~~~:::::::::::::::::~~~-------
   @@@                                 ~~~~~~~~~
```

## Usage

```
npx siikafish                    # ask the fish a yes/no question
npx siikafish "ship on friday?"  # ...with the question on screen (optional)
npx siikafish apple banana       # spin to pick one of two options
npx siikafish swim               # just watch the fish swim forever
```

By default the fish spins like a coin with real momentum — it whirls, slows
under friction, and wobbles to a stop pointing **left for YES** or **right for
NO**, with the verdict spelled out in big letters on that side, and confetti
for a YES.

Pass **two arguments** and it becomes a duel between them — the first is the
left outcome, the second the right. The options stay hidden while it spins;
once the fish commits to a side, the winner is revealed in big ASCII art (a
block font for short words, a bordered box for longer phrases — picked to fit,
with a little per-run variety) in your terminal's own text colour, and confetti
rains on whichever side won. The answer is also printed to stdout on exit, so
it's scriptable:

```
[ "$(npx siikafish | tail -1)" = YES ] && echo "doing it"
```

Press `q` or `Ctrl-C` to quit at any time.
