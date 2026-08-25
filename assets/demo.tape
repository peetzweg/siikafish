Output assets/demo.gif

Require node

Set Shell "zsh"
Set Width 1000
Set Height 600
Set FontSize 18
Set Padding 24
Set Framerate 30
Set TypingSpeed 55ms
Set Theme "Catppuccin Mocha"

# Run the working-tree CLI while presenting the same command users run.
Hide
Type "function npx() { node bin/cli.js ship wait; }"
Enter
Type "clear"
Enter
Show

Type "npx siikafish ship wait"
Sleep 400ms
Enter
Sleep 14s
