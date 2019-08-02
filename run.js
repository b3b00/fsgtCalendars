const calendars = require('./calendars')

let tbg = calendars.scrapper.getTeamsByGroup(["a", "b", "c", "d", "e", "f", "g"])

console.log(tbg);