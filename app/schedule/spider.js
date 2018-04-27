const Subscription = require('egg').Subscription;

class UpdateCache extends Subscription {
  // 通过 schedule 属性来设置定时任务的执行间隔等配置
  static get schedule() {
    return {
      cron: '0 */10 * * * *',
      type: 'worker',
    };
  }

  // subscribe 是真正定时任务执行时被运行的函数
  async subscribe() {
    const now = new Date();
    this.ctx.service.ranks.list(now, '女童连衣裙', 0, 1000);
    const res = await this.ctx.curl('http://www.api.com/cache', {
      dataType: 'json',
    });
    this.ctx.app.cache = res.data;
  }
}

module.exports = UpdateCache;