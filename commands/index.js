const fetch = require("node-fetch");
const env = require("../utils/env");
const moment = require("moment");

const getEndPoint = ((apiKey) => (name, params) =>
  ({
    activeGame: () =>
      `https://euw1.api.riotgames.com/lol/spectator/v4/active-games/by-summoner/-8jXrz2RovRy1e3jKvKu1ZMq-5rcQFVH7GBhQI37H5GaflY?api_key=${apiKey}`,
    lastGames: () =>
      `https://euw1.api.riotgames.com/lol/match/v4/matchlists/by-account/CUY7rHRMe8I4YahIvbRozcmltQZ-aYuDsGSgwckmxuXTmA?api_key=${apiKey}`,
    gameInfo: () =>
      `https://euw1.api.riotgames.com/lol/match/v4/matches/${params.gameId}?api_key=${apiKey}`,
  }[name]()))(env.get("API_KEY"));

// Returns whether the clown is playing or not
const clownStatus = () => {
  return fetch(getEndPoint("activeGame"))
    .then((res) =>
      res.ok
        ? "The Clown is down into the Summoner's Rift deeps"
        : "The Clown is just getting ready for the next game"
    )
    .catch(() => "clown not found");
};

// Returns the amount of time wasted by the clown today
const wastedToday = () => {
  const isTodayMatch = ({ timestamp }) =>
    moment(timestamp).isAfter(
      moment()
        .subtract(moment().hour() < 8 ? 1 : 0, "days")
        .hour(8)
    );

  return fetch(getEndPoint("lastGames"))
    .then((res) => res.json())
    .then((body) => body.matches.filter(isTodayMatch))
    .then((todayMatches) => {
      return Promise.all(
        todayMatches.map(({ gameId }) =>
          fetch(getEndPoint("gameInfo", { gameId }))
        )
      );
    })
    .then((todayMatchesInfoGZip) =>
      Promise.all(todayMatchesInfoGZip.map((matchInfo) => matchInfo.json()))
    )
    .then((todayMatchesInfo) =>
      todayMatchesInfo.reduce((sum, { gameDuration }) => sum + gameDuration, 0)
    )
    .then(
      (secondsPlayed) =>
        `The Clown has wasted ${Math.floor(
          secondsPlayed / 3600
        )} hours, ${Math.floor(
          (secondsPlayed % 3600) / 60
        )} minutes and ${Math.floor(
          (secondsPlayed % 3600) % 60
        )} seconds today!`
    );
};

module.exports = {
  clownStatus,
  wastedToday,
};
