const express = require('express')
const calendars = require('./calendars')
const path = require('path')
const PORT = process.env.PORT || 5000


 const GetCalendar = function(request, response, next) {
  var group = request.params.group;
  var team = request.params.team;
  let ics = calendars.GetCalendar(group,team);
  response.set('Content-Type', 'text/calendar')
  response.send(ics);
}

express()
  .use(express.static(path.join(__dirname, 'public')))
  .set('views', path.join(__dirname, 'views'))
  .set('view engine', 'ejs')
  .get('/', (req, res) => res.render('pages/index'))
  .get('/v1/calendars/:group/:team', GetCalendar)
  .listen(PORT, () => console.log(`Listening on ${ PORT }`))
