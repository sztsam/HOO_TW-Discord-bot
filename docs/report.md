# Report

With this command you can browse the report store database and view specific report or multiple reports of a village.
You can get good information about the village without seeing the report.

To store a report, you simply need to post the public share url/s or mass report format ([report][/report]) format in the chat and the bot will pick it up and store it.

After posting the public share url the bot will send an action row to know whether to save attacker or defender information or just generate a report image without saving into the database.
<br>Only the author can select the type!
<br>![report_type](images/report/report_type.jpg)

Remember, the bot first checks the channel world, then the global world!

Report generation does not support multiple languages, only market language!


>/report \<coord> \<report> \<last x>

#### Parameters

- coord: *Choose a coordinate from the currently stored coordinates. You can search by typing or simply paste the coordinate.<br>syntax: {x}|{y} example: 500|500<br>Required: true, Type: string, Autocomplete: true, Default: undefined*
- report: *Choose a report from the currently stored reports.<br>syntax: {report timestamp} example: 1726645859972<br>Required: false, Type: string, Autocomplete: true, Default: last 5 reports*
- last x: *Choose how many reports you want to see from the village. You can type any number between 1-25.<br>syntax: {number} example: 5<br>Required: false, Type: number, Autocomplete: false, choices: true, Default: last 5 reports*

![browse_report](images/report/browse_report.jpg)

![report](images/report/report.jpg)