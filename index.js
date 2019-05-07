const cheerio = require('cheerio');

const request = require('sync-request');
const fs = require('fs');

const groupe_url_schema = "http://t2t.29.fsgt.org/groupe/groupe";

const team_url_schema = "http://t2t.29.fsgt.org/equipe";

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
        let parts = match.date.split("/");

        let dateStr = parts[2] + "" + parts[1] + "" + parts[0] + "T";

        return dateStr;
    },


    /*
    * write a match event to ics file
    */
    getMatchEvent: function (match,team) {
        fs.appendFileSync(calFile, "\r\nBEGIN:VEVENT\r\n");
        let date = this.getMatchDate(match,team);
        fs.appendFileSync(calFile, "DTSTART:" + date + "203000Z\r\n");
        fs.appendFileSync(calFile, "DTEND:" + date + "220000Z\r\n");
        let lbl = this.getMatchLabel(match,team);
        fs.appendFileSync(calFile, "SUMMARY:" + lbl + "\r\n");
        fs.appendFileSync(calFile, "DESCRIPTION:" + lbl + "\r\n");
        fs.appendFileSync(calFile, "END:VEVENT\r\n");
    },

    /*
    * write ics file for a team
    */
    writeCalendar: function (matches, group, team) {

        let calFile = "calendars/" + group + "/" + team.Name.replace(" ", "").toLocaleLowerCase() + ".ics"

        let dir = './calendars'

        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir);
        }

        dir = './calendars/' + group;

        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir);
        }

        fs.writeFileSync(calFile, "BEGIN:VCALENDAR\r\n");
        fs.appendFileSync(calFile, "VERSION:2.0\r\n");
        for (let l = 0; l < matches.length; l++) {
            let m = matches[l];
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
    extractInnerTagsValueToObject: function (tagName, mapping, node, acceptMissingItems) {
        let object = {}

        let chs = node.childNodes;

        for (let j = 0; j < chs.length; j++) {
            let child = chs[j];
            let k = 0;
            if (child.type == "tag" && child.name == tagName) {
                if (mapping["" + k] !== undefined) {
                    if (child.childNodes[0] != undefined && child.childNodes[0] != null) {
                        object[mapping["" + k]] = child.childNodes[0].data;
                    }
                    else {
                        j++;
                        if (!acceptMissingItems) {
                            // object = null;
                            return null;
                        }
                    }
                }
                k++;
            }
        }
        return object;
    },

    etxractdataFromNodeArray : function(html, selector) {
        let values = Array();
        let content = cheerio.load(html);
        let nodes = content(selector)
        for (let i = 0; i < nodes.length; i++) {
            let node = nodes[i];
            name = node.childNodes[0].data;
            values.push(name);
        }
        return values;
    }


}

const fsgtScrapper = {


    getTeamDay : function(teamName) {
        let teamId = teamName.replace(" ", "-").toLocaleLowerCase()
        let url = team_url_schema+"/"+teamId;

        let res = request("GET", url);

        if (res.statusCode == 200) {
            //let html = res.getBody();

            return "someday";
        }    
        return "never";

    },

    /*
    * get the teams
    */
    getTeams: function (html) {        
        let teamNames = scrapper.etxractdataFromNodeArray(html,'div#classement table tr td.nom');
        let teams = [];
        
        for (let i = 0; i < teamNames.length; i++) {
            let team = {}
            team.Name = teamNames[i];
            team.Day = fsgtScrapper.getTeamDay(team.Name);
            teams.push(team);
        }

        return teams;
    },

    
    extractMatchFromRow: function (row) {

        let mapping = {
            "0": "day",
            "1": "date",
            "5": "local",
            "8": "remote"
        }

        let match = scrapper.extractInnerTagsValueToObject("td", mapping, row,false);

        return match;
    },

    /*
    * get the matches
    */
    getMatches: function (html) {
        let content = cheerio.load(html);
        let matches = content('div#matchs table.matchs tr.match')
        let matchArray = Array();

        for (let i = 0; i < matches.length; i++) {
            let day = matches[i];            
            let match = {}

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

let groups = ["a", "b", "c", "d", "e", "f", "g"];


let downloadGroup = function (group) {
    let url = groupe_url_schema + "-" + group


    if (group == "a") {
        url = groupe_url_schema;
    }

    let res = request("GET", url);

    if (res.statusCode == 200) {
        let html = res.getBody();

        //request.getSync(url, (error, response, html) => {



        let teams = fsgtScrapper.getTeams(html);

        let matchArray = fsgtScrapper.getMatches(html);

        for (let t = 0; t < teams.length; t++) {
            iCalendarGeneration.writeCalendar(matchArray, group, teams[t]);
        }

    }
    else {
        console.log("error on (" + group + ") : " + url);
    }
}

for (let g = 0; g < groups.length; g++) {

    let group = groups[g];
    console.log("donwloading calendar for group [" + group + "]");
    downloadGroup(group);

}

