const cheerio = require('cheerio');

const request = require('sync-request');
const fs = require('fs');

const groupe_url_schema = "http://t2t.29.fsgt.org/groupe/groupe";


const iCalendarGeneration = {

    /*
    * format match name
    */
    getMatchLabel: function (match,team) {
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
    getMatchDate: function (match,team) {
        parts = match.date.split("/");

        dateStr = parts[2] + "" + parts[1] + "" + parts[0] + "T";

        return dateStr;
    },


    /*
    * write a match event to ics file
    */
    getMatchEvent: function (match,team) {
        fs.appendFileSync(calFile, "\r\nBEGIN:VEVENT\r\n");
        date = this.getMatchDate(match,team);
        fs.appendFileSync(calFile, "DTSTART:" + date + "203000Z\r\n");
        fs.appendFileSync(calFile, "DTEND:" + date + "220000Z\r\n");
        lbl = this.getMatchLabel(match,team);
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
                this.getMatchEvent(m,team);
            }
        }
        fs.appendFileSync(calFile, "END:VCALENDAR\r\n");
    }

}


const scrapper = {


    /*
    * from a node (node) extract all child node with name == tagName
    * apply mapping to create an object :
    * mmaping is an associative map int -> attribute name.
    * for each mapping i -> attributeName: select the ith child node and extract 
    * value to attibuteName attribute in the resulting object.
    * Usefull to selectively extract data from a row to an object.
    */
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
    },

    etxractdataFromNodeArray : function(html, selector) {
        values = Array();
        content = cheerio.load(html);
        nodes = content(selector)
        for (i = 0; i < nodes.length; i++) {
            node = nodes[i];
            name = node.childNodes[0].data;
            values.push(name);
        }
        return values;
    }


}

const fsgtScrapper = {


    /*
    * get the teams
    */
    getTeams: function (html) {        
        teams = scrapper.etxractdataFromNodeArray(html,'div#classement table tr td.nom');
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

