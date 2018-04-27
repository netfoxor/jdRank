const Subscription = require('egg').Subscription;

class UpdateCache extends Subscription {
  // 通过 schedule 属性来设置定时任务的执行间隔等配置
  static get schedule() {
    return {
      cron: '0 0 */1 * * *',
      type: 'worker',
    };
  }

  // subscribe 是真正定时任务执行时被运行的函数
  async subscribe() {
    const now = new Date();
    await this.ctx.service.ranks.list(now, '女童连衣裙', 0, 1000);
    await this.ctx.service.ranks.list(now, '女童连衣裙', 1, 1000);
    await this.ctx.service.ranks.list(now, '女童连衣裙夏', 0, 1000);
    await this.ctx.service.ranks.list(now, '女童连衣裙夏', 1, 1000);
  }
}

module.exports = UpdateCache;