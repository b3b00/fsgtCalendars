const calendars = require('./calendars')
const fs = require('fs');

let tbg = calendars.scrapper.getTeamsByGroup(["f"]);//, "b", "c", "d", "e", "f", "g"])

const groups = Object.keys(tbg);
for(i = 0; i < groups.length; i++) {
    let group = groups[i];
    console.log("downloading group "+group);
    let teams = tbg[group];
    for (j = 0; j < teams.length; j++) {
        let team = teams[j].Name;
        console.log("\tdownloading team "+team);
        let ics = calendars.GetCalendar(group,team);        
    }

    let cal = calendars.GetCalendar("f","PLABENNEC 4")
    fs.writeFileSync("./cal-plab-4.ics",cal);    
    console.log(cal);
}



console.log(tbg);