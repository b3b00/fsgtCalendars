const cheerio = require("cheerio");
const moment = require("moment");

const request = require("sync-request");
const fs = require("fs");

const groupe_url_schema = "http://t2t.29.fsgt.org/groupe/groupe";

const team_url_schema = "http://t2t.29.fsgt.org/equipe";

// http://www.onicos.com/staff/iz/amuse/javascript/expert/utf.txt

/* utf.js - UTF-8 <=> UTF-16 convertion
 *
 * Copyright (C) 1999 Masanao Izumo <iz@onicos.co.jp>
 * Version: 1.0
 * LastModified: Dec 25 1999
 * This library is free.  You can redistribute it and/or modify it.
 */

const Utf8ArrayToStr = function(array) {
  var out, i, len, c;
  var char2, char3;

  out = "";
  len = array.length;
  i = 0;
  while (i < len) {
    c = array[i++];
    switch (c >> 4) {
      case 0:
      case 1:
      case 2:
      case 3:
      case 4:
      case 5:
      case 6:
      case 7:
        // 0xxxxxxx
        out += String.fromCharCode(c);
        break;
      case 12:
      case 13:
        // 110x xxxx   10xx xxxx
        char2 = array[i++];
        out += String.fromCharCode(((c & 0x1f) << 6) | (char2 & 0x3f));
        break;
      case 14:
        // 1110 xxxx  10xx xxxx  10xx xxxx
        char2 = array[i++];
        char3 = array[i++];
        out += String.fromCharCode(
          ((c & 0x0f) << 12) | ((char2 & 0x3f) << 6) | ((char3 & 0x3f) << 0)
        );
        break;
    }
  }
  return out;
};

const iCalendarGeneration = {
  /*
   * format match name
   */
  getMatchLabel: function(match, team) {
    if (match.local == team.Name) {
      return (
        "FSGT : "+(match.day.replace("\t", "") +
        " " +
        match.remote.replace("\t", "") +
        " (dom.)")
      );
    } else {
      return (
        "FSGT : "+(match.day.replace("\t", "") +
        " " +
        match.local.replace("\t", "") +
        " (ext.)")
      );
    }
  },

  getTeam: function(teams, teamName) {
    for (let i = 0; i < teams.length; i++) {
      if (
        teams[i].Name == teamName ||
        fsgtScrapper.shortName(teams[i]) == teamName
      ) {
        return teams[i];
      }
    }
    return null;
  },

  getLocalTeamWeekDay: function(day) {
    let mapping = {
      lundi: 0,
      mardi: 1,
      mercredi: 2,
      jeudi: 3,
      vendredi: 4,
      samedi: 5,
      dimanche: 6
    };
    return mapping[day];
  },

  /*
   * format match date
   */
  getMatchDate: function(match, teams) {
    let localTeam = this.getTeam(teams, match.local);
    let d = moment(match.date, "DD/MM/YYYY");
    let dayInWeek = d.weekday();
    let localTeamDay = this.getLocalTeamWeekDay(localTeam.Day);
    if (dayInWeek < localTeamDay) {
      d.add(localTeamDay - dayInWeek + 1, "days");
    } else if (dayInWeek > localTeamDay) {
      d.subtract(dayInWeek - localTeamDay - 1, "days");
    }

    let dateStr = d.format("YYYYMMDDT");

    return dateStr;
  },

  /*
   * write a match event to ics file
   */
  writeMatchEvent: function(calFile, match, teams, team) {
    fs.appendFileSync(calFile, "\r\nBEGIN:VEVENT\r\n");
    let date = this.getMatchDate(match, teams);
    fs.appendFileSync(calFile, "DTSTART:" + date + "203000Z\r\n");
    fs.appendFileSync(calFile, "DTEND:" + date + "220000Z\r\n");
    let lbl = this.getMatchLabel(match, team);
    fs.appendFileSync(calFile, "SUMMARY:" + lbl + "\r\n");
    fs.appendFileSync(calFile, "DESCRIPTION:" + lbl + "\r\n");
    fs.appendFileSync(calFile, "END:VEVENT\r\n");
  },

  getICS: function(matches, group, teams, team) {
    let content = "";

    content += "BEGIN:VCALENDAR\r\n";
    content += "VERSION:2.0\r\n";
    for (let l = 0; l < matches.length; l++) {
      let m = matches[l];
      if (m.local == team.Name || m.remote == team.Name) {
        content += this.getMatchEvent(m, teams, team);
      }
    }
    content += "END:VCALENDAR\r\n";
    return content;
  },

  getMatchEvent: function(match, teams, team) {
    let content = "\r\nBEGIN:VEVENT\r\n";
    let date = this.getMatchDate(match, teams);
    content += "DTSTART:" + date + "203000Z\r\n";
    content += "DTEND:" + date + "220000Z\r\n";
    let lbl = this.getMatchLabel(match, team);
    content += "SUMMARY:" + lbl + "\r\n";
    content += "DESCRIPTION:" + lbl + "\r\n";
    content += "END:VEVENT\r\n";
    return content;
  },

  /*
   * write ics file for a team
   */
  writeCalendar: function(matches, group, teams, team) {
    let calFile =
      "calendars/" +
      group +
      "/" +
      team.Name.replace(" ", "").toLocaleLowerCase() +
      ".ics";

    let dir = "./calendars";

    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir);
    }

    dir = "./calendars/" + group;

    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir);
    }

    fs.writeFileSync(calFile, getICS(matches, group, teams, team));
  }
};

const scrapper = {
  /*
   * from a node (node) extract all child node with name == tagName
   * apply mapping to create an object :
   * mmaping is an associative map int -> attribute name.
   * for each mapping i -> attributeName: select the ith child node and extract
   * value to attibuteName attribute in the resulting object.
   * Usefull to selectively extract data from a row to an object.
   */
  extractInnerTagsValueToObject: function(
    tagName,
    mapping,
    node,
    acceptMissingItems
  ) {
    let object = {};

    let chs = node.childNodes;
    let k = 0;
    for (let j = 0; j < chs.length; j++) {
      let child = chs[j];
      if (child.type == "tag" && child.name == tagName) {
        if (mapping["" + k] !== undefined) {
          if (child.childNodes[0] != undefined && child.childNodes[0] != null) {
            object[mapping["" + k]] = child.childNodes[0].data;
          } else {
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

  etxractdataFromNodeArray: function(html, selector) {
    let values = Array();
    let content = cheerio.load(html);
    let nodes = content(selector);
    for (let i = 0; i < nodes.length; i++) {
      let node = nodes[i];
      name = node.childNodes[0].data;
      values.push(name);
    }
    return values;
  }
};

 const fsgtScrapper = {
  getTeamDay: function(team) {
    let url =
      "http://t2t.29.fsgt.org/equipe/" + team.replace(/ /g, "-").toLowerCase();
    let res = request("GET", url);
    let day = "";

    if (res.statusCode == 200) {
      let html = res.getBody();

      var content = Utf8ArrayToStr(html);

      let i = content.indexOf("Reçoit le ");
      if (i > 0) {
        content = content.substring(i);
        i = content.indexOf("<");
        content = content.substring(0, i);
        content = content.trim().replace(".", "");
        let words = content.split(" ");

        day = words[words.length - 1];
      }
    }
    return day;
  },

  shortName(team) {
    return team != null ? team.Name.replace(" ", "").toLocaleLowerCase() : "";
  },

  /*
   * get the teams
   */

   

  getTeams: function(html) {
    let teamNames = scrapper.etxractdataFromNodeArray(
      html,
      "div#classement table tr td.nom"
    );
    let teams = [];

    for (let i = 0; i < teamNames.length; i++) {
      let team = {};
      team.Name = teamNames[i];
      team.Day = fsgtScrapper.getTeamDay(team.Name);
      teams.push(team);
    }

    return teams;
  },

  getTeamsByGroup: function(groups) {
    let teamsGrouped = {};
    for (let i = 0; i < groups.length; i++) {
      let url = groupe_url_schema + "-" + groups[i];

      if (groups[i] == "a") {
        url = groupe_url_schema;
      }

      let res = request("GET", url);

      if (res.statusCode == 200) {
        let html = res.getBody();

        let teams = fsgtScrapper.getTeams(html);
        teamsGrouped[groups[i]] = teams;        
      }      
    }
    return teamsGrouped;
  },

  extractMatchFromRow: function(row) {
    let mapping = {
      "0": "day",
      "1": "date",
      "5": "local",
      "8": "remote"
    };

    let match = scrapper.extractInnerTagsValueToObject(
      "td",
      mapping,
      row,
      false
    );

    return match;
  },

  /*
   * get the matches
   */
  getMatches: function(html) {
    let content = cheerio.load(html);
    let matches = content("div#matchs table.matchs tr.match");
    let matchArray = Array();

    for (let i = 0; i < matches.length; i++) {
      let day = matches[i];
      let match = {};

      match = this.extractMatchFromRow(day);

      if (match != null) {
        matchArray.push(match);
      }
    }
    return matchArray;
  }
};

/*
 * main call
 */

let groups = ["a", "b", "c", "d", "e", "f", "g"];

module.exports.scrapper = fsgtScrapper;

module.exports.GetCalendar = function(group, team) {
  let url = groupe_url_schema + "-" + group;

  if (group == "a") {
    url = groupe_url_schema;
  }

  let res = request("GET", url);

  if (res.statusCode == 200) {
    let html = res.getBody();

    let teams = fsgtScrapper.getTeams(html);

    let matchArray = fsgtScrapper.getMatches(html);

    if (team != null) {
      let te = iCalendarGeneration.getTeam(teams, team);
      if (te != null) {
        return iCalendarGeneration.getICS(matchArray, group, teams, te);
      }
    }
    return null;
  }

  module.exports.downloadGroup = function(group, team) {
    let url = groupe_url_schema + "-" + group;

    if (group == "a") {
      url = groupe_url_schema;
    }

    let res = request("GET", url);

    if (res.statusCode == 200) {
      let html = res.getBody();

      let teams = fsgtScrapper.getTeams(html);

      let matchArray = fsgtScrapper.getMatches(html);

      if (team != null) {
        let te = iCalendarGeneration.getTeam(teams, team);
        if (te != null) {
          iCalendarGeneration.writeCalendar(matchArray, group, teams, te);
        }
      } else {
        for (let t = 0; t < teams.length; t++) {
          iCalendarGeneration.writeCalendar(matchArray, group, teams, teams[t]);
        }
      }
    } else {
      console.log("error on (" + group + ") : " + url);
    }
  };
};

