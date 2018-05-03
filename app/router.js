'use strict';

/**
 * @param {Egg.Application} app - egg application
 */
module.exports = app => {
  const { router, controller } = app;
  router.get('/api', controller.home.index);
  router.get('/api.getKeywords', controller.home.getKeywords);
  router.get('/task.run', controller.home.taskRun);
  router.get('/task.getMyRank', controller.home.getMyRankTask);
};
