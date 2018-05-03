const Subscription = require('egg').Subscription;

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
    const now = new Date();
    const keywords = await this.ctx.service.ranks.getKeywords();
    for (let i = 0; i < keywords.length; i++) {
      const keyword = keywords[i];
      await this.ctx.service.ranks.list(now, keyword, 0, 1000, true);
      await this.ctx.service.ranks.list(now, keyword, 1, 1000, true);
    }
  }
}

module.exports = Spider;