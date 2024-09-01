# Ally family

TribalWars community can set ally families for each server. This will affect some of the commands if ally family is enabled.

Remember, everyone can set ally families! Please use it with care!

The command has three subcommands: add, delete, list


## Add

Add ally family to global config.

>/ally family add \<server> \<custom list>

#### Parameters

- server: *Choose a server from the currently running servers.<br>If the server you want not in the list your market is not enabled. Please contact me.  <br>syntax: {market}{server} example: en121<br>Required: true, Type: string, Autocomplete: true*
- custom list: *This should be set to the tribe(s) tag. <br>Separated by & you can select more than one<br>syntax: {ally1&ally2} example: HELL&HELL2<br>Required: true, Type: string, Autocomplete: true*

## Delete

Delete ally family from global config.

>/ally family delete \<server> \<family>

#### Parameters

- server: *Choose a server from the currently running servers.<br>If the server you want not in the list your market is not enabled. Please contact me.  <br>syntax: {market}{server} example: en121<br>Required: true, Type: string, Autocomplete: true*
- family: *This should be set to the tribe(s) tag. <br>Separated by & you can select more than one<br>syntax: {ally1&ally2} example: HELL&HELL2<br>Required: true, Type: string, Autocomplete: true*

## List

List ally family from global config.

>/ally family list \<server>

#### Parameters

- server: *Choose a server from the currently running servers.<br>If the server you want not in the list your market is not enabled. Please contact me.  <br>syntax: {market}{server} example: en121<br>Required: true, Type: string, Autocomplete: true*

![list](images/ally_family/info.jpg "ally_family_list")