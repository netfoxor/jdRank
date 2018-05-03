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
    const keywords = [
      '女童连衣裙',
      '儿童连衣裙',
      '女童公主裙',
      '公主裙女童',
      '儿童裙子',
      '女大童连衣裙',
      '儿童夏装女',
      '童装女夏装',
      '女童连衣裙夏',

      '亲子装',
      '亲子套装',
      '亲子装夏装',

      '女童套装',
    ];
    for (let i = 0; i < keywords.length; i++) {
      const keyword = keywords[i];
      await this.ctx.service.ranks.list(now, keyword, 0, 500, true);
      await this.ctx.service.ranks.list(now, keyword, 1, 500, true);
    }
  }
}

module.exports = Spider;