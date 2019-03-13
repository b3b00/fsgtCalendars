const cheerio = require('cheerio');

const request = require('sync-request');
const fs = require('fs');

const groupe_url_schema = "http://t2t.29.fsgt.org/groupe/groupe";


const iCalendarGeneration = {

    /*
    * format match name
    */
    getMatchLabel: function (match) {
        if (match.local == team) {
            return match.day.replace("\t", "") + " " + match.remote.replace("\t", "") + " (dom.)";
        }
        else {
            return match.day.replace("\t", "") + " " + match.local.replace("\t", "") + " (ext.)";
        }
    },

    /*
    * format match date 
    */
    getMatchDate: function (match) {
        parts = match.date.split("/");

        dateStr = parts[2] + "" + parts[1] + "" + parts[0] + "T";

        return dateStr;
    },


    /*
    * write a match event to ics file
    */
    getMatchEvent: function (match) {
        fs.appendFileSync(calFile, "\r\nBEGIN:VEVENT\r\n");
        date = this.getMatchDate(match);
        fs.appendFileSync(calFile, "DTSTART:" + date + "203000Z\r\n");
        fs.appendFileSync(calFile, "DTEND:" + date + "220000Z\r\n");
        lbl = this.getMatchLabel(match);
        fs.appendFileSync(calFile, "SUMMARY:" + lbl + "\r\n");
        fs.appendFileSync(calFile, "DESCRIPTION:" + lbl + "\r\n");
        fs.appendFileSync(calFile, "END:VEVENT\r\n");
    },

    /*
    * write ics file for a team
    */
    writeCalendar: function (matches, group, team) {

        calFile = "calendars/" + group + "/" + team.replace(" ", "").toLocaleLowerCase() + ".ics"

        dir = './calendars'

        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir);
        }

        dir = './calendars/' + group;

        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir);
        }

        fs.writeFileSync(calFile, "BEGIN:VCALENDAR\r\n");
        fs.appendFileSync(calFile, "VERSION:2.0\r\n");
        for (l = 0; l < matches.length; l++) {
            m = matches[l];
            if (m.local == team || m.remote == team) {
                this.getMatchEvent(m);
            }
        }
        fs.appendFileSync(calFile, "END:VCALENDAR\r\n");
    }

}


const scrapper = {




    extractInnerTagsValueToObject: function (tagName, mapping, node) {
        object = {}

        chs = node.childNodes;

        for (j = 0; j < chs.length; j++) {
            child = chs[j];
            if (child.type == "tag" && child.name == tagName) {
                if (!(mapping["" + k] == undefined)) {
                    if (child.childNodes[0] != undefined && child.childNodes[0] != null) {
                        object[mapping["" + k]] = child.childNodes[0].data;
                    }
                    else {
                        j = j++;
                        object = null;
                        return null;
                    }
                }
                k++;
            }
        }
        return object;
    }
}

const fsgtScrapper = {


    /*
    * get the teams
    */
    getTeams: function (html) {
        teams = Array();
        content = cheerio.load(html);
        htmlteams = content('div#classement table tr td.nom')
        for (i = 0; i < htmlteams.length; i++) {
            team = htmlteams[i];
            name = team.childNodes[0].data;
            teams.push(name);
        }
        return teams;
    },

    extractMatchFromRow: function (row) {

        mapping = {
            "0": "day",
            "1": "date",
            "5": "local",
            "8": "remote"
        }

        match = scrapper.extractInnerTagsValueToObject("td", mapping, row);

        // for (j = 0; j < chs.length; j++) {
        //     child = chs[j];
        //     if (child.type == "tag" && child.name == "td") {
        //         if (!(mapping[""+k] == undefined)) {
        //             if (child.childNodes[0] != undefined && child.childNodes[0] != null) {
        //                 match[mapping[""+k]] = child.childNodes[0].data;
        //             }
        //             else {
        //                 j = j++;
        //                 match = null;       
        //                 return null;                 
        //             }
        //         }
        //         k++;
        //     }            
        // }
        return match;
    },

    /*
    * get the matches
    */
    getMatches: function (html) {
        content = cheerio.load(html);
        matches = content('div#matchs table.matchs tr.match')
        matchArray = Array();

        for (i = 0; i < matches.length; i++) {
            day = matches[i];
            chs = day.children;
            k = 0;
            match = {}

            match = this.extractMatchFromRow(day)

            if (match != null) {
                matchArray.push(match);
            }
        }
        return matchArray;
    }

}

/*
* main call
*/

groups = ["a", "b", "c", "d", "e", "f", "g"];


downloadGroup = function (group) {
    url = groupe_url_schema + "-" + group


    if (group == "a") {
        url = groupe_url_schema;
        ;
    }

    res = request("GET", url);

    if (res.statusCode == 200) {
        html = res.getBody();

        //request.getSync(url, (error, response, html) => {



        teams = fsgtScrapper.getTeams(html);

        matchArray = fsgtScrapper.getMatches(html);

        for (t = 0; t < teams.length; t++) {
            iCalendarGeneration.writeCalendar(matchArray, group, teams[t]);
        }

    }
    else {
        console.log("error on (" + group + ") : " + url);
    }
    //}
    ;
}

for (g = 0; g < groups.length; g++) {

    group = groups[g];
    console.log("donwloading calendar for group [" + group + "]");
    downloadGroup(group);

}

