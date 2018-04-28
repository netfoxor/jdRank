'use strict';

/**
 * @param {Egg.Application} app - egg application
 */
module.exports = app => {
  const { router, controller } = app;
  router.get('/api', controller.home.index);
  router.get('/task.run', controller.home.taskRun);
};
