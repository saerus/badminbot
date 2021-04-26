const TelegramBot = require('node-telegram-bot-api');
const token = '1788607247:AAFUQfiKWwheWvWvbamX8r9k_Wjv7kq0h2M';
// Create a bot that uses 'polling' to fetch new updates
const bot = new TelegramBot(token, {polling: true});
const emoji = require('node-emoji').emoji;
const fs = require('fs');
//
let frMonths = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
let frDays = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"];
let bad = "\u{1F3F8}";
//
let savedDates = {};
let validUsers = [];
//
try {
  let rawSavedDates = fs.readFileSync('savedDates.json');
  savedDates = JSON.parse(rawSavedDates);
} catch(err) {
  console.error(err)
}
//
try {
  let rawValidUsers = fs.readFileSync('validUsers.json');
  validUsers = JSON.parse(rawValidUsers);
} catch(err) {
  console.error(err)
}
function validateUser(id) {
  if(validUsers.includes(id)) {
    return true;
  }
  return false;
}
// ------------------------------------------------------------------- /play
bot.onText(/\/play/, (msg, match) => {
  if(!validateUser(msg.from.id)) return;
  let chatId = msg.chat.id;
  let datesButtons = proposeDays(msg.from);
  let options = {
    reply_markup : JSON.stringify({
      inline_keyboard: datesButtons,
    }),
  }
  let resp = "Prochaines dates: ";
  bot.sendMessage(chatId, resp, options);
});
// ------------------------------------------------------------------- /leave
bot.onText(/\/leave/, (msg, match) => {
  if(!validateUser(msg.from.id)) return;
  // console.log("leave");
  let chatId = msg.chat.id;
  let datesButtons = getSubDays(msg.from);
  let options = {
    reply_markup : JSON.stringify({
      inline_keyboard: datesButtons,
    }),
  }
  let resp = "Tu n'es inscrit-e à aucune date";
  if(datesButtons.length>0) {
    resp = "Tu es inscrit-e aux dates suivantes:";
  }
  bot.sendMessage(chatId, resp, options);
});
// ------------------------------------------------------------------- /subscribe
bot.onText(/\/subscribe/, (msg, match) => {
  let chatId = msg.chat.id;
  let resp = subscribe(msg.from.id);
  bot.sendMessage(chatId, resp);
});
//
bot.onText(/\/resetdates/, (msg, match) => {
  let chatId = msg.chat.id;
  savedDates = {};
  saveSavedDates();
  let resp = "reset dates";
  bot.sendMessage(chatId, resp);
});
bot.onText(/\/resetusers/, (msg, match) => {
  let chatId = msg.chat.id;
  validUsers = [];
  saveValidUsers
  let resp = "reset users";
  bot.sendMessage(chatId, resp);
});
// ------------------------------------------------------------------- /unsubsribe
bot.onText(/\/unsubscribe/, (msg, match) => {
  let chatId = msg.chat.id;
  let resp = unSubscribe(msg.from.id);
  bot.sendMessage(chatId, resp);
});
// ------------------------------------------------------------------- /who
bot.onText(/\/who/, (msg, match) => {
  if(!validateUser(msg.from.id)) return;
  let chatId = msg.chat.id;
  let list = [];
  Object.entries(savedDates).forEach(([k, v]) => {
    if(v.people.length>0) {
      let date = new Date(k*1);
      let line = "Inscrit-e-s du "+getFormatted(date)+":";
      let userList = [];
      v.people.forEach((p)=>{
        userList.push(bad+" "+p.first_name);
        // U+1F3F8
      });
      line += "\n"+userList.join(", ");
      list.push(line);
    }
  });
  let resp = "Aucune date";
  if(list.length>0) {
    resp = list.join("\n\n");
  }
  bot.sendMessage(chatId, resp);
});
//
// bot.onText(/(\+\d)/, (msg, match) => {
//   const chatId = msg.chat.id;
//   let options = {
//     reply_markup : JSON.stringify({
//       inline_keyboard: [datesButtons]
//     }),
//   }
//   let resp = msg.from.first_name+" "+msg.from.last_name+" vient jouer le: ";
//   bot.sendMessage(chatId, resp, options);
// });
//
bot.on('callback_query', function onCallbackQuery(c) {
  if(!validateUser(c.from.id)) return;
  // console.log("sssss");
  // console.log(c);
  let action = c.data;
  let splitted = action.split(":");
  let msg = c.message;
  let opts = {
    chat_id: msg.chat.id,
    message_id: msg.message_id,
  };
  if(splitted[0] === "/play") {
    // console.log(splitted[1]*1000);
    let date = new Date(splitted[1]*1);
    let resp = addPeopleToDate(splitted[1], c.from);
    resp += " "+getFormatted(date);
    resp += "\nInscrit-e-s ce jour: "+getParticipants(splitted[1]);
    bot.editMessageText(resp, opts);
  }
  if(splitted[0] === "/leave") {
    // console.log(splitted[1]*1000);
    let date = new Date(splitted[1]*1);
    removePeopleFromDate(splitted[1], c.from);
    let resp = "Désinscrit-e le "+getFormatted(date);
    resp += "\nInscrit-e-s ce jour: "+getParticipants(splitted[1]);
    bot.editMessageText(resp, opts);
  }
});
//
function subscribe(id) {
  // console.log(validUsers);
  if(validUsers.includes(id)) {
    return "Mais t'es déjà inscrit-e de dieu !";
  } else {
    validUsers.push(id);
    saveValidUsers();
    return "Noïce, bienvenue !";
  }
}
//
function unSubscribe(id) {
  // console.log(validUsers.indexOf(id));
  if(validUsers.includes(id)) {
    let pos = validUsers.indexOf(id);
    validUsers.splice(pos, 1);
    saveValidUsers();
    return "T'es désinscrit-e... shame...";
  } else {
    return "Mais t'es po inscrit-e";
  }
}
//
function cleanSavedDates() {

}
//
function saveSavedDates() {
  let toSave = JSON.stringify(savedDates);
  fs.writeFileSync('savedDates.json', toSave);
}
//
function saveValidUsers() {
  let toSave = JSON.stringify(validUsers);
  fs.writeFileSync('validUsers.json', toSave);
}
//
function removePeopleFromDate(date, from) {
  let d = savedDates[date];
  if(d != null) {
    for(let i=d.people.length-1; i>=0; i--) {
      let p = d.people[i];
      // console.log(from.id+"  "+p.id);
      if(from.id === p.id) {
        // console.log("same");
        d.people.splice(i, 1);
      }
    }
    // savedDates[date].people.forEach((p)=>{
    //
    // });
  }
  saveSavedDates();
}
//
function addPeopleToDate(date, from) {
  let resp = "";
  if(savedDates[date] != null) {
    if(containPeople(savedDates[date], from.id)) {
      resp = "T'es déjà inscrit-e";
    } else {
      resp = "Yes, t'es inscrit-e";
      savedDates[date].people.push(from);
    }
  } else {
    savedDates[date] = {};
    savedDates[date].people = [];
    savedDates[date].people.push(from);
    resp = "Yes, t'es inscrit-e";
  }
  saveSavedDates();
  return resp;
}
//
function getParticipants(date) {
  let list = [];
  if(savedDates[date] != null) {
    savedDates[date].people.forEach((p)=>{
      list.push(bad+" "+p.first_name);
    });
  }
  return list.join(", ")+" ("+list.length+")";
}
//
function getPeopleCount(date) {
  if(savedDates[date] != null && savedDates[date].people.length>0) {
    return " "+bad+" ("+savedDates[date].people.length+")";
  } else {
    return "";
  }
}
//
function containPeople(v, id) {
  let contain = false;
  v.people.forEach((p)=>{
    if(p.id == id) {
      contain = true;
    }
  });
  return contain;
}
//
function getSubDays(from) {
  let r = [];
  Object.entries(savedDates).forEach(([k, v]) => {
    // console.log(from.id);
    // containPeople(v, from.id);
    if(containPeople(v, from.id)) {
      let date = new Date(k*1);
      let countPeople = getPeopleCount(date.valueOf());
      let format = getFormatted(date);
      let dateCallback = "/leave:"+date.valueOf();
      let button = [{ text: format+countPeople, callback_data: dateCallback}];
      r.push(button);
    }
  });
  return r;
}
//
function proposeDays() {
  let r = [];
  for(let i=0; i<14; i++) {
    let date = new Date();
    date.setHours(0);
    date.setMinutes(0);
    date.setSeconds(0);
    date.setMilliseconds(0);
    date = addDays(date, i);
    let countPeople = getPeopleCount(date.valueOf());
    let format = getFormatted(date);
    let dateCallback = "/play:"+date.valueOf();
    let button = [{ text: format+countPeople, callback_data: dateCallback}];
    r.push(button);
  }
  return r;
}
//
function addDays(date, days) {
  var result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}
//
function getFormatted(date) {
  return frDays[date.getDay()]+" "+date.getDate()+" "+frMonths[date.getMonth()]+" "+date.getFullYear();
}
//
// function createPlayDate() {
//
// }


// bot.on('message', (msg) => {
//   const chatId = msg.chat.id;
//   // console.log(msg);
//   // send a message to the chat acknowledging receipt of their message
//   bot.sendMessage(chatId, 'Received your message');
// });
