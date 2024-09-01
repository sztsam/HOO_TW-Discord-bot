# Coord info

*You need "Manage Channels" or "Administrator" permissions to use these commands.*

This command shows information about villages.
It works without using any command by enabling it. 

The bot first checks all messages for possible coordinates in the following format: 500|500

These coordinates can be inside bigger texts or even several coordinates in one message. The coords are separated by players.

Remember, the bot first checks the channel world, then the global world!

![info_village](images/info/coord.jpg "info_village")

The command has three subcommands: set channel, delete channel, activate


## Set channel

Set server to a channel.

>/coord info set channel \<server> \<channel>

#### Parameters

- server: *Choose a server from the currently running servers.<br>If the server you want not in the list your market is not enabled. Please contact me.  <br>syntax: {market}{server} example: en121<br>Required: true, Type: string, Autocomplete: true*
- channel: *Channel ID where ennoblement notifications sent to<br>syntax: {channel_id} example: "123123123"<br>Required: false, Type: channel, Default: interaction channel ID*

## Delete channel

Delete auto coord info on a channel or all the set channels.

>/coord info delete channel \<channel> \<all>

#### Parameters

- channel: *Channel ID where ennoblement notifications sent to<br>syntax: {channel_id} example: "123123123"<br>Required: false, Type: channel, Default: interaction channel ID*
- all: *Delete all set channels from the server.<br>Required: false, Type: boolean*

## Activate

Coordinate info activation/deactivation on the server

>/coord info activate \<active>

#### Parameters

- active: *Coordinate info activation/deactivation on the server<br>Required: true, Type: boolean*