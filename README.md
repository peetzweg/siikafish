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
npx siikafish swim               # just watch the fish swim forever
```

By default the fish spins like a coin with real momentum — it whirls, slows
under friction, and wobbles to a stop pointing **left for YES** or **right for
NO**, with the verdict spelled out in big letters on that side. The answer is
also printed to stdout on exit, so it's scriptable:

```
[ "$(npx siikafish | tail -1)" = YES ] && echo "doing it"
```

Press `q` or `Ctrl-C` to quit at any time.
