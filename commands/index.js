const fetch = require("node-fetch");
const env = require("../utils/env");
const moment = require("moment");
const cache = require("../cache");

const AVG_QUEUE_TIME = 8 * 60;
const TWO_WEEKS = 60 * 60 * 24 * 15;

let numberOfRequests = 0;

setInterval(() => {
  numberOfRequests = 0;
}, 1500);

const getEndpointData = (endPoint) => {
  numberOfRequests++;
  if (numberOfRequests < 20) {
    return fetch(endPoint).then((res) => {
      if (res.ok || res.status === 404) {
        return res.json();
      }
      throw Error("Overclown");
    });
  }
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      numberOfRequests++;
      fetch(endPoint).then((res) => {
        if (res.ok) {
          resolve(res.json());
        }
        reject("Overclown");
      });
    }, Math.floor(numberOfRequests / 20) * 1500);
  });
};

const cacheFirst = (url, id, TTL) =>
  cache.has(id)
    ? Promise.resolve(cache.get(id))
    : getEndpointData(url).then((json) => {
        cache.set(id, json, TTL);
        return json;
      });

const getCacheable = (name, params) =>
  ({
    gameInfo: () =>
      cacheFirst(
        `https://euw1.api.riotgames.com/lol/match/v4/matches/${
          params.gameId
        }?api_key=${env.get("API_KEY")}`,
        params.gameId,
        TWO_WEEKS
      ),
    activeGame: () =>
      cacheFirst(
        `https://euw1.api.riotgames.com/lol/spectator/v4/active-games/by-summoner/2bRSuQ7DOyIecJfUjhzWikBuG-0WykG-JJq02cJowfEMxg0?api_key=${env.get(
          "API_KEY"
        )}`,
        "activeGame"
      ),
    lastGames: () =>
      cacheFirst(
        `https://euw1.api.riotgames.com/lol/match/v4/matchlists/by-account/L9Mv0MhyW8AakRctaI6n_Io6AMZ5bUIBV_1A9nie71cDpA?api_key=${env.get(
          "API_KEY"
        )}&beginIndex=${params.beginIndex}`,
        `lastGames-${params.beginIndex}`
      ),
  }[name]());

const getGamesUntil = async (conditionFn, games = []) => {
  const gamesJSON = [
    ...games,
    ...(await getCacheable("lastGames", { beginIndex: games.length })).matches,
  ];
  if (conditionFn(gamesJSON[gamesJSON.length - 1])) {
    return getGamesUntil(conditionFn, gamesJSON);
  }
  return Promise.resolve(gamesJSON.filter(conditionFn))
    .then((matches) => {
      return Promise.all(
        matches.map(({ gameId }) => getCacheable("gameInfo", { gameId }))
      );
    })
    .then((matchesInfo) => [
      matchesInfo.reduce(
        (sum, { gameDuration }) => sum + gameDuration + AVG_QUEUE_TIME,
        0
      ),
      matchesInfo.length,
    ]);
};

// Returns whether the clown is playing or not
const clownStatus = () => {
  return getCacheable("activeGame")
    .then((res) =>
      res.gameId
        ? "The Clown is down into the Summoner's Rift deeps"
        : "The Clown is just getting ready for the next game"
    )
    .catch(() => "clown not found");
};

// Returns the amount of time wasted by the clown today
const wastedToday = () => {
  const today = moment()
    .subtract(moment().hour() < 8 ? 1 : 0, "days")
    .hour(8);
  const isTodayMatch = ({ timestamp }) => moment(timestamp).isAfter(today);

  return getGamesUntil(isTodayMatch)
    .then(
      ([secondsPlayed, numberOfGames]) =>
        `The Clown has wasted ${Math.floor(
          secondsPlayed / 3600
        )} hours, ${Math.floor(
          (secondsPlayed % 3600) / 60
        )} minutes and ${Math.floor(
          (secondsPlayed % 3600) % 60
        )} seconds today, divided among ${numberOfGames} juicy games!`
    )
    .catch(
      () =>
        "The Clown has played too many games. Server is flooded. Try again later."
    );
};

// Returns the amount of time wasted by the clown this week
const wastedThisWeek = () => {
  const monday =
    moment().day() === 1 && moment().hour() < 8
      ? moment().subtract(7, "days").hour(8)
      : moment().day(1).hour(8);
  const isThisWeekMatch = ({ timestamp }) => moment(timestamp).isAfter(monday);

  return getGamesUntil(isThisWeekMatch)
    .then(
      ([secondsPlayed, numberOfGames]) =>
        `The Clown has wasted ${Math.floor(
          secondsPlayed / 3600
        )} hours, ${Math.floor(
          (secondsPlayed % 3600) / 60
        )} minutes and ${Math.floor(
          (secondsPlayed % 3600) % 60
        )} seconds this week, divided among ${numberOfGames} juicy games!`
    )
    .catch(
      () =>
        "The Clown has played too many games. Server is flooded. Try again later."
    );
};

module.exports = {
  clownStatus,
  wastedToday,
  wastedThisWeek,
};
