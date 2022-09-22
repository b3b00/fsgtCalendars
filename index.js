const express = require('express')
const calendars = require('./calendars')
const path = require('path')
const PORT = process.env.PORT || 5001


 const GetCalendar = function(request, response, next) {
  var group = request.params.group;
  var team = request.params.team;
  let ics = calendars.GetCalendar(group,team);
  response.set('Content-Type', 'text/calendar')
  response.send(ics);
}

const index = function(request,response,next) {
  const groups = ["a", "b", "c", "d", "e", "f", "g"];
  const teamsByGroup = calendars.scrapper.getTeamsByGroup(groups);  
  response.render('pages/choose.ejs',{"groups" : groups, "teamsByGroup" : teamsByGroup});
}

express()
  .use(express.static(path.join(__dirname, 'public')))
  .set('views', path.join(__dirname, 'views'))
  .set('view engine', 'ejs')
  .get('/', index)
  .get('/calendars/:group/:team', GetCalendar)
  .listen(PORT, () => console.log(`Listening on ${ PORT }`))
