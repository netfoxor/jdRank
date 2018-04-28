'use strict';

module.exports = appInfo => {
  const config = exports = {};

  // use for cookie sign key, should change to your own and keep security
  config.keys = appInfo.name + '_1524744741813_9333';

  // add your config here
  config.middleware = [];

  config.jd = {
    serverUrl: 'https://so.m.jd.com',
    pageSize: 10,
  };

  //数据目录
  config.dataPath = './';

  config.static = {
    prefix: '/',
    dir: './app/public',
  };

  return config;
};
