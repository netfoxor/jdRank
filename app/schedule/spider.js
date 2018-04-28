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
    const keywords = ['女童连衣裙', '女童连衣裙夏', '女童连衣裙夏装', '女童裙子', '儿童连衣裙', '儿童裙子', '亲子装', '亲子套装', '全家装', '亲子装全家装', '亲子装全家装 夏装'];
    for (let i = 0; i < keywords.length; i++) {
      const keyword = keywords[i];
      await this.ctx.service.ranks.list(now, keyword, 0, 1000);
      await this.ctx.service.ranks.list(now, keyword, 1, 1000);
    }
  }
}

module.exports = Spider;