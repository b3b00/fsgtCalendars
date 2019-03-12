const cheerio = require('cheerio');
var request = require('request');
const fs = require('fs');

var groupe = "f";
var groupe_url = "http://t2t.29.fsgt.org/groupe/groupe-" + groupe

var calFile = "";

// the complete match list
matcheArray = Array();

/*
* format match name
*/
var matchLabel = function (match) {
    if (match.local == team) {
        return match.day.replace("\t", "") + " " + match.remote.replace("\t", "") + " (dom.)";
    }
    else {
        return match.day.replace("\t", "") + " " + match.local.replace("\t", "") + " (ext.)";
    }
}

/*
* format match date 
*/
var matchDate = function (match) {
    parts = match.date.split("/");
    date = new Date(parseInt(parts[2], 10),
        parseInt(parts[1], 10) - 1,
        parseInt(parts[0], 10));

    var dateStr = parts[2] + "" + parts[1] + "" + parts[0] + "T";

    return dateStr;
}


/*
* write a match event to ics file
*/
var matchEvent = function (match) {
    fs.appendFile(calFile, "BEGIN:VEVENT\n");
    date = matchDate(match);
    fs.appendFile(calFile, "DTSTART:" + date + "203000Z\n");
    fs.appendFile(calFile, "DTEND:" + date + "220000Z\n");
    lbl = matchLabel(match);
    fs.appendFile(calFile, "SUMMARY:" + lbl + "\n");
    fs.appendFile(calFile, "DESCRIPTION:" + lbl + "\n");
    fs.appendFile(calFile, "END:VEVENT\n");
}

/*
* write ics file for a team
*/
var jsonToCal = function (matches, team) {

    calFile = team.replace(" ", "").toLocaleLowerCase() + ".ics"
    fs.writeFile(calFile, "BEGIN:VCALENDAR\n");
    fs.appendFile(calFile, "VERSION:2.0\n");
    for (l = 0; l < matches.length; l++) {
        m = matches[l];
        if (m.local == team || m.remote == team) {
            matchEvent(m);
        }
    }
    fs.appendFile(calFile, "END:VCALENDAR\n");
}


/*
* get the teams
*/
getTeams = function (html) {
    teams = Array();
    content = cheerio.load(html);
    htmlteams = content('div#classement table tr td.nom')
    for (i = 0; i < htmlteams.length; i++) {
        team = htmlteams[i];
        name = team.childNodes[0].data;        
        teams.push(name);
    }
    return teams;
}

/*
* get the matches
*/
getMatches = function(html) {
    content = cheerio.load(html);
    matches = content('div#matchs table.matchs tr.match')
    matchArray = Array();

    for (i = 0; i < matches.length; i++) {
        day = matches[i];        
        chs = day.children;
        k = 0;
        match = {}
        for (j = 0; j < chs.length; j++) {
            child = chs[j];
            if (child.type == "tag" && child.name == "td") {
                switch (k) {
                    case 0: {
                        match["day"] = child.childNodes[0].data;
                        break;
                    }
                    case 1: {
                        match["date"] = child.childNodes[0].data;
                        break;
                    }
                    case 5: {
                        match["local"] = child.childNodes[0].data;
                        break;
                    }
                    case 8: {
                        match["remote"] = child.childNodes[0].data;
                        break;
                    }
                }
                k++;
            }
        }
        matchArray.push(match);
    }
    return matchArray;
}


/*
* main call
*/
request.get(groupe_url, (error, response, html) => {

    teams = getTeams(html);

    matchArray = getMatches(html);

    for (t = 0 ; t < teams.length; t++) {
        jsonToCal(matchArray,teams[t]);
    }

}
);