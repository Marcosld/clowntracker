const {join} = require('path');
const {readFileSync} = require('fs');
const {once} = require('lodash');

const parseEnv = once(() =>
    Object.fromEntries(
        readFileSync(join(__dirname, '../.env'), 'utf8').split('\n').map(line => line.split('='))
    )
);

const get = key => parseEnv()[key]

module.exports = {
    get
};
