const cheerio = require('cheerio');
var request = require('request');
const fs = require('fs');

var groupe = "f";
var groupe_url = "http://t2t.29.fsgt.org/groupe/groupe-" + groupe

var team = "PLABENNEC 4";


matcheArray = Array();


var jsonToCal = function (matches) {
    fs.writeFile("./matches.json", "[");
    for (l = 0; l < matches.length; l++) {
        m = matches[l];
        if (m.local == team || m.remote == team) {
            console.log(m);
            fs.appendFile("./matches.json", JSON.stringify(m) + ",");
        }
    }
    fs.appendFile("./matches.json", "]");
}


request.get(groupe_url, (error, response, html) => {

    content = cheerio.load(html);
    matches = content('div#matchs table.matchs tr.match')

    matchArray = Array();


    for (i = 0; i < matches.length; i++) {
        day = matches[i];
        console.log("");
        console.log("==========================");
        console.log("");
        //console.log(day.html());     
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

    jsonToCal(matchArray);

    // fs.writeFile("./matches.json","[");
    // for (l = 0; l < matcheArray.length; l++) {
    //     m = matcheArray[l];
    //     console.log(m);
    //     fs.appendFile("./matches.json", JSON.stringify(m)+",");
    // }
    // fs.appendFile("./matches.json","]");


})



request.get(groupe_url, process);


