const Subscription = require('egg').Subscription;
const moment = require('moment');

class Spider extends Subscription {
  // 通过 schedule 属性来设置定时任务的执行间隔等配置
  static get schedule() {
    return {
      cron: '0 1 * * * *',
      type: 'worker',
      immediate: true,
    };
  }

  // subscribe 是真正定时任务执行时被运行的函数
  async subscribe() {
    const { ctx } = this;
    ctx.logger.info('spider task begin...');
    const now = new Date();
    const keywords = await this.ctx.service.ranks.getKeywords();
    for (let i = 0; i < keywords.length; i++) {
      const keyword = keywords[i];
      const dts = moment(now).format('YYYYMMDDHH');
      await this.ctx.service.ranks.spiderToDB({ keyword, dts, sort: 0 }, 1000);
      await this.ctx.service.ranks.spiderToDB({ keyword, dts, sort: 1 }, 1000);
    }
    ctx.logger.info('spider task finished...');
  }
}

module.exports = Spider;