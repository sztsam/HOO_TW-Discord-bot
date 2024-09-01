# Swear words

*You need "Administrator" permission to use these commands.*

This command allows you to punish swearing people on your server or just have fun trolling them.

The command has two subcommands: modify, list

## Modify

Modify basic swear words punishment settings

>/swear words modify \<enable> \<use default> \<use ai chat> \<use react emoji> \<add words> \<detele words> \<add emoji> \<delete emoji> \<ai chat ratio> \<react emoji ratio>

#### Parameters

- enable: *Enable/disable swear words punishment<br>Required: false, Type: boolean*
- use default: *Use the default settings<br>Required: false, Type: boolean*
- use ai chat: *Enable/disable AI chat<br>Required: false, Type: boolean*
- use react emoji: *Enable/disable react emoji<br>Required: false, Type: boolean*
- add words: *Add swear words to punish. use , separator.<br>syntax: {word1,word2} example: word1,word2<br>Required: false, Type: string*
- delete words: *Delete swear words to punish. use , separator.<br>syntax: {word1,word2} example: word1,word2<br>Required: false, Type: string*
- add emoji: *Add emojis to react. use , separator.<br>syntax: {emoji1,emoji2} example: emoji1,emoji2<br>Required: false, Type: string*
- delete emoji: *Delete emojis to react. use , separator.<br>syntax: {emoji1,emoji2} example: emoji1,emoji2<br>Required: false, Type: string*
- ai chat ratio: *Set ai chat occurrence ratio<br>Required: false, Type: number, Value: 0-100*
- react emoji ratio: *Set react emoji occurrence ratio<br>Required: false, Type: number, Value: 0-100*

## List

Shows current setting of swear words punishment if there is no parameter added

If you Add/remove to lists then all parameters are required!

black list: never punish
<br>white list: punish with occurrence
<br>force list: punish always

>/swear words list \<action> \<type> \<user>

#### Parameters

- action: *Action to perform with lists<br>add, delete, reset<br>Required: false, Type: string*
- type: *list type<br>black list, white list, force list<br>Required: false, Type: string*
- user: *User to add/delete to list<br>Required: false, Type: user*