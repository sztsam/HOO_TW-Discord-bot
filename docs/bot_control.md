# Bot Control

Bot runners can control the bot on the fly with this command.

In every case there is a sure parameter that has to be true if you really want to make changes in the runtime.
<br>Only the bot developer can use this command!


The command has three subcommands: shutdown, restart, update, script

## Shutdown

Shutdown the bot.

>/bot control shutdown \<sure>

#### Parameters

- sure: *Are you sure you want to shutdown?<br>Required: true, Type: boolean*

## Restart

Restart the bot

>/bot control restart \<sure>

#### Parameters

- sure: *Are you sure you want to shutdown?<br>Required: true, Type: boolean*

## Update

Update the bot with package.
<br>Bot will unpack the update.zip to the src folder.
<br>The update folder must use a file structure like src folder!
<br>Zip the files inside the update folder and apply update

>/bot control update \<package> \<sure>

#### Parameters

- package: *Update package<br>Required: true, Type: attachment*
- sure: *Are you sure you want to shutdown?<br>Required: true, Type: boolean*

## Script

Execute a script that will run and log to the discord interaction as response.
<br>The script must be a .js file!

>/bot control script \<code> \<sure>

#### Parameters

- package: *Script code<br>Required: true, Type: attachment*
- sure: *Are you sure you want to shutdown?<br>Required: true, Type: boolean*