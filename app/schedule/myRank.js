const Subscription = require('egg').Subscription;

class MyRank extends Subscription {
  // 通过 schedule 属性来设置定时任务的执行间隔等配置
  static get schedule() {
    return {
      cron: '0 */2 * * * *',
      type: 'worker',
      immediate: true,
    };
  }

  // subscribe 是真正定时任务执行时被运行的函数
  async subscribe() {
    const { ctx } = this;
    ctx.logger.info('myRank task begin...');
    const now = new Date();
    const keywords = this.ctx.service.ranks.getKeywords();
    for (let i = 0; i < keywords.length; i++) {
      const keyword = keywords[i];
      for (let sort = 0; sort <= 1; sort++) {
        await this.ctx.service.ranks.fromRankToMyRank(now, '派雅度', keyword, sort);
      }
    }
    ctx.logger.info('myRank task finished...');
  }
}

module.exports = MyRank;