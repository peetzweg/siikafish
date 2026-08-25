Require node

Set Shell "zsh"
Set Width 800
Set Height 480
Set FontSize 16
Set Padding 24
Set Framerate 45
Set TypingSpeed 55ms

# Run the working-tree CLI while presenting the same command users run.
Hide
Type "function npx() { shift; node bin/cli.js $@; }"
Enter
Type "clear"
Enter
Show

Type "npx siikafish"
Sleep 400ms
Enter
Sleep 13s

Type "npx siikafish 'ship on friday?'"
Sleep 400ms
Enter
Sleep 13s

Type "npx siikafish 'ship it' 'sleep on it'"
Sleep 400ms
Enter
Sleep 13s
