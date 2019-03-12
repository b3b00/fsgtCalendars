const cheerio = require('cheerio');
//var request = require('request');
var request = require('sync-request');
const fs = require('fs');

var groupe_url_schema = "http://t2t.29.fsgt.org/groupe/groupe";

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

    dateStr = parts[2] + "" + parts[1] + "" + parts[0] + "T";

    return dateStr;
}


/*
* write a match event to ics file
*/
var matchEvent = function (match) {
    fs.appendFileSync(calFile, "\r\nBEGIN:VEVENT\r\n");
    date = matchDate(match);
    fs.appendFileSync(calFile, "DTSTART:" + date + "203000Z\r\n");
    fs.appendFileSync(calFile, "DTEND:" + date + "220000Z\r\n");
    lbl = matchLabel(match);
    fs.appendFileSync(calFile, "SUMMARY:" + lbl + "\r\n");
    fs.appendFileSync(calFile, "DESCRIPTION:" + lbl + "\r\n");
    fs.appendFileSync(calFile, "END:VEVENT\r\n");
}

/*
* write ics file for a team
*/
var jsonToCal = function (matches, group, team) {

    calFile = group + "/" + team.replace(" ", "").toLocaleLowerCase() + ".ics"

    dir = './' + group;

    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir);
    }

    fs.writeFileSync(calFile, "BEGIN:VCALENDAR\r\n");
    fs.appendFileSync(calFile, "VERSION:2.0\r\n");
    for (l = 0; l < matches.length; l++) {
        m = matches[l];
        if (m.local == team || m.remote == team) {
            matchEvent(m);
        }
    }
    fs.appendFileSync(calFile, "END:VCALENDAR\r\n");
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
getMatches = function (html) {
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
                        if (child.childNodes[0] != undefined && child.childNodes[0] != null ) {
                            match["day"] = child.childNodes[0].data;
                        }
                        else {
                            j = j++;
                            match = null;
                        }
                        break;
                    }
                    case 1: {
                        if (child.childNodes[0] != undefined && child.childNodes[0] != null ) {
                            match["date"] = child.childNodes[0].data;
                        }
                        else {
                            j = j++;
                            match = null;
                        }
                        break;
                    }
                    case 5: {
                        if (child.childNodes[0] != undefined && child.childNodes[0] != null ) {
                            match["local"] = child.childNodes[0].data;
                        }
                        else {
                            j = j++;
                            match = null;
                        }
                        break;
                    }
                    case 8: {
                        if (child.childNodes[0] != undefined && child.childNodes[0] != null ) {
                            match["remote"] = child.childNodes[0].data;
                        }
                        else {
                            j = j++;
                            match = null;
                        }
                        break;
                    }
                }
                if (match == null) {
                    break;
                }
                k++;
            }
        }
        if (match != null) {
            matchArray.push(match);
        }
    }
    return matchArray;
}


/*
* main call
*/

groups = ["a", "b", "c", "d", "e", "f", "g"];


downloadGroup = function (group) {
    url = groupe_url_schema +"-"+group

    
    if (group == "a") {
        url = groupe_url_schema;
        ;
    }

    res = request("GET",url);
    
    if (res.statusCode  == 200) {
        html = res.getBody();

    //request.getSync(url, (error, response, html) => {


       
        teams = getTeams(html);

        matchArray = getMatches(html);

        for (t = 0; t < teams.length; t++) {
            jsonToCal(matchArray, group, teams[t]);
        }

    }
    else {
        console.log("error on ("+group+") : "+url);
    }
    //}
    ;
}

for (g = 0; g < groups.length; g++) {

    group = groups[g];
    downloadGroup(group);

}

