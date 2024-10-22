# Info

This command shows information about ally, player and village.
<br>For all subcommands server parameter is optional! If you did not set a global server to a channel or server then it is required!

The command has four subcommands: player, ally, village, server

## Player

Show information about the player.

>/info player \<player> \<server>

#### Parameters

- player: *Choose a player from the list.<br>syntax: {player name} example: -Sam<br>Required: true, Type: string, Autocomplete: true*
- server: *Choose a server from the currently running servers.<br>If the server you want not in the list your market is not enabled. Please contact me.  <br>syntax: {market}{server} example: en121<br>Required: false, Type: string, Autocomplete: true*

![info_player](images/info/player.jpg "info_player")

## Ally

Show information about the ally.

>/info ally \<ally> \<server>

#### Parameters

- ally: *Choose an ally from the list.<br>syntax: {ally id} example: 12<br>Required: true, Type: string, Autocomplete: true*
- server: *Choose a server from the currently running servers.<br>If the server you want not in the list your market is not enabled. Please contact me.  <br>syntax: {market}{server} example: en121<br>Required: false, Type: string, Autocomplete: true*

![info_ally](images/info/ally.jpg "info_ally")

## Village

Show information about the village.

These coordinates can be inside bigger texts or even several coordinates in one message.
<br>The coords are separated by players.

>/info village \<coord> \<server>

#### Parameters

- coord: *Village coordinate.<br>syntax: {coord} example: 500|500<br>Required: true, Type: string, Autocomplete: false*
- server: *Choose a server from the currently running servers.<br>If the server you want not in the list your market is not enabled. Please contact me.  <br>syntax: {market}{server} example: en121<br>Required: false, Type: string, Autocomplete: true*

![info_village](images/info/coord.jpg "info_village")

## Server

Show information about the server settings.
<br>You can view server configuration translated to your language!

>/info server \<server>

#### Parameters

- server: *Choose a server from the currently running servers.<br>If the server you want not in the list your market is not enabled. Please contact me.  <br>syntax: {market}{server} example: en121<br>Required: false, Type: string, Autocomplete: true*

![info_server](images/info/server.jpg "info_server")